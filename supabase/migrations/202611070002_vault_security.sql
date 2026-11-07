-- Apply after 202611060001. Review in staging first; no existing memberships are changed.
begin;
create schema if not exists vault_private;
revoke all on schema vault_private from public, anon, authenticated;

create table vault_private.bootstrap_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null check (length(token_hash) = 64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  authorized_session uuid
);
create table vault_private.approved_factors (
  user_id uuid not null references auth.users(id) on delete cascade,
  factor_id uuid primary key
);
-- Preserve factors already verified before rollout. Review this inventory first.
insert into vault_private.approved_factors(user_id,factor_id)
  select user_id,id from auth.mfa_factors where status='verified';
create table vault_private.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revoked_before timestamptz not null
);
create table vault_private.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index on vault_private.sessions(user_id);
create function vault_private.valid_envelope(e jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(e)='object' and e->'v'='1'::jsonb
    and (e - 'v' - 'keyId' - 'wrappedKey' - 'iv' - 'tag' - 'ciphertext')='{}'::jsonb
    and jsonb_typeof(e->'keyId')='string' and e->>'keyId' ~ '^[A-Za-z0-9_-]{1,40}$'
    and jsonb_typeof(e->'iv')='string' and e->>'iv' ~ '^[A-Za-z0-9+/]{16}$'
    and jsonb_typeof(e->'tag')='string' and e->>'tag' ~ '^[A-Za-z0-9+/]{22}==$'
    and jsonb_typeof(e->'wrappedKey')='string' and e->>'wrappedKey' ~ '^[A-Za-z0-9+/]{82}==$'
    and jsonb_typeof(e->'ciphertext')='string'
    and length(e->>'ciphertext') between 4 and 10924
    and e->>'ciphertext' ~ '^[A-Za-z0-9+/]+={0,2}$',false)
$$;
create table vault_private.secrets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  name text not null check (length(name) between 1 and 120),
  envelope jsonb not null check (octet_length(envelope::text) <= 24000 and vault_private.valid_envelope(envelope)),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on vault_private.secrets(owner_id);
create table vault_private.grants (
  secret_id uuid references vault_private.secrets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  primary key(secret_id, user_id)
);
create table vault_private.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  event text not null,
  object_id uuid,
  subject uuid
);
create index on vault_private.events(at desc);
-- Append-only to application roles; database administrators remain trusted.
revoke all on all tables in schema vault_private from public, anon, authenticated;
alter table vault_private.approved_factors enable row level security;
alter table vault_private.approved_factors force row level security;
alter table vault_private.bootstrap_tokens enable row level security;
alter table vault_private.bootstrap_tokens force row level security;
alter table vault_private.account_security enable row level security;
alter table vault_private.account_security force row level security;
alter table vault_private.sessions enable row level security;
alter table vault_private.sessions force row level security;
alter table vault_private.secrets enable row level security;
alter table vault_private.secrets force row level security;
alter table vault_private.grants enable row level security;
alter table vault_private.grants force row level security;
alter table vault_private.events enable row level security;
alter table vault_private.events force row level security;
-- No direct-table policies: only narrowly scoped, checked functions below.

create function vault_private.member_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.workspace_members where user_id = auth.uid() and active
$$;

create function public.authorize_mfa_bootstrap(token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or vault_private.member_role() is null or token !~ '^[a-f0-9]{64}$' then return false; end if;
  update vault_private.bootstrap_tokens set consumed_at = now(), authorized_session=(auth.jwt()->>'session_id')::uuid
    where user_id = auth.uid() and consumed_at is null and expires_at > now()
      and token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if not found then return false; end if;
  insert into vault_private.events(actor,event) values(auth.uid(),'mfa_bootstrap_authorized');
  return true;
end $$;

create function public.register_mfa_factor(factor uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or vault_private.member_role() is null then return false; end if;
  -- Consume the session-bound enrollment authorization exactly once.
  update vault_private.bootstrap_tokens set authorized_session=null
    where user_id=auth.uid() and authorized_session=(auth.jwt()->>'session_id')::uuid
      and consumed_at>now()-interval '10 minutes'
      and exists(select 1 from auth.mfa_factors where id=factor and user_id=auth.uid() and status='unverified' and factor_type='totp');
  if not found then return false; end if;
  insert into vault_private.approved_factors values(auth.uid(),factor);
  return true;
end $$;

create function public.check_mfa_approval() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists(select 1 from auth.mfa_factors f join vault_private.approved_factors a on a.factor_id=f.id and a.user_id=f.user_id
      where f.user_id=auth.uid() and f.status='verified')
    and not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'
      and not exists(select 1 from vault_private.approved_factors a where a.factor_id=f.id and a.user_id=f.user_id))
$$;

create function public.check_workspace_session() returns boolean
language plpgsql security definer set search_path = '' as $$
declare sid uuid; started timestamptz; cutoff timestamptz; expiry timestamptz;
begin
  if auth.uid() is null or vault_private.member_role() is null then return false; end if;
  sid := (auth.jwt()->>'session_id')::uuid;
  expiry := to_timestamp((auth.jwt()->>'exp')::double precision);
  select to_timestamp(min((a->>'timestamp')::double precision)) into started
    from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a;
  if sid is null or started is null or expiry is null or expiry <= now() then return false; end if;
  -- Serialize registration/revocation for this user to avoid a race on unseen sessions.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select revoked_before into cutoff from vault_private.account_security where user_id=auth.uid();
  if cutoff is not null and started <= cutoff then return false; end if;
  if exists(select 1 from vault_private.sessions where id=sid and (user_id<>auth.uid() or revoked_at is not null)) then return false; end if;
  insert into vault_private.sessions(id,user_id,expires_at) values(sid,auth.uid(),expiry)
    on conflict(id) do update set last_seen=now(), expires_at=excluded.expires_at;
  return true;
end $$;

create function vault_private.require_access() returns text
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  r := vault_private.member_role();
  if r is null or auth.jwt()->>'aal' is distinct from 'aal2' or not public.check_mfa_approval() or not public.check_workspace_session() then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return r;
end $$;

create function public.workspace_sessions() returns table(id uuid,first_seen timestamptz,last_seen timestamptz,expires_at timestamptz,revoked_at timestamptz,is_current boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform vault_private.require_access();
  return query select s.id,s.first_seen,s.last_seen,s.expires_at,s.revoked_at,s.id=(auth.jwt()->>'session_id')::uuid
    from vault_private.sessions s where s.user_id=auth.uid() order by s.last_seen desc limit 100;
end $$;

create function public.revoke_workspace_sessions() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Own-session containment is permitted even in an AAL1 recovery session.
  if auth.uid() is null then raise exception 'Access denied' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  insert into vault_private.account_security values(auth.uid(),now())
    on conflict(user_id) do update set revoked_before=now();
  update vault_private.sessions set revoked_at=now() where user_id=auth.uid() and revoked_at is null;
  insert into vault_private.events(actor,event) values(auth.uid(),'sessions_revoked');
end $$;

create function vault_private.can_read(s vault_private.secrets) returns boolean
language sql stable security definer set search_path = '' as $$
  select s.owner_id=auth.uid() or exists(select 1 from vault_private.grants g
    where g.secret_id=s.id and g.user_id=auth.uid() and g.expires_at>now())
$$;

create function public.vault_list() returns table(id uuid,name text,owner_id uuid,version integer,updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform vault_private.require_access();
  return query select s.id,s.name,s.owner_id,s.version,s.updated_at from vault_private.secrets s
    where vault_private.can_read(s) order by s.updated_at desc limit 100;
end $$;

create function public.vault_create(secret_id uuid,secret_name text,sealed jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access()<>'team_lead' then raise exception 'Access denied' using errcode='42501'; end if;
  if not vault_private.valid_envelope(sealed) then raise exception 'Invalid envelope'; end if;
  if (select count(*) from vault_private.secrets where owner_id=auth.uid())>=100 then raise exception 'Secret quota reached'; end if;
  insert into vault_private.secrets(id,owner_id,name,envelope) values(secret_id,auth.uid(),secret_name,sealed);
  insert into vault_private.events(actor,event,object_id) values(auth.uid(),'secret_created',secret_id);
end $$;

create function public.vault_read(secret_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s vault_private.secrets;
begin
  perform vault_private.require_access();
  select * into s from vault_private.secrets where id=secret_id for share;
  if not found or not vault_private.can_read(s) then raise exception 'Access denied' using errcode='42501'; end if;
  -- Log before returning ciphertext; audit failure aborts retrieval.
  insert into vault_private.events(actor,event,object_id) values(auth.uid(),'secret_read_authorized',secret_id);
  return jsonb_build_object('id',s.id,'owner_id',s.owner_id,'envelope',s.envelope);
end $$;

create function public.vault_replace(secret_id uuid,expected_version integer,sealed jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access()<>'team_lead' then raise exception 'Access denied' using errcode='42501'; end if;
  if not vault_private.valid_envelope(sealed) then raise exception 'Invalid envelope'; end if;
  update vault_private.secrets set envelope=sealed,version=version+1,updated_at=now()
    where id=secret_id and owner_id=auth.uid() and version=expected_version;
  if not found then raise exception 'Access denied or record changed'; end if;
  insert into vault_private.events(actor,event,object_id) values(auth.uid(),'secret_replaced',secret_id);
end $$;

create function public.vault_delete(secret_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access()<>'team_lead' then raise exception 'Access denied' using errcode='42501'; end if;
  delete from vault_private.secrets where id=secret_id and owner_id=auth.uid();
  if not found then raise exception 'Access denied' using errcode='42501'; end if;
  insert into vault_private.events(actor,event,object_id) values(auth.uid(),'secret_deleted',secret_id);
end $$;

create function public.vault_grant(secret_id uuid,recipient uuid,until_time timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access()<>'team_lead' then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from vault_private.secrets where id=secret_id and owner_id=auth.uid() for update;
  if not found or not exists(select 1 from public.workspace_members where user_id=recipient and active) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  if until_time is not null and not exists(select 1 from vault_private.grants g where g.secret_id=vault_grant.secret_id and g.user_id=recipient)
     and (select count(*) from vault_private.grants g where g.secret_id=vault_grant.secret_id)>=100 then raise exception 'Grant quota reached'; end if;
  if until_time is null then
    delete from vault_private.grants where grants.secret_id=vault_grant.secret_id and user_id=recipient;
    insert into vault_private.events(actor,event,object_id,subject) values(auth.uid(),'secret_grant_revoked',secret_id,recipient);
  else
    if until_time<=now() or until_time>now()+interval '24 hours' then raise exception 'Invalid expiry'; end if;
    insert into vault_private.grants values(secret_id,recipient,until_time)
      on conflict on constraint grants_pkey do update set expires_at=excluded.expires_at;
    insert into vault_private.events(actor,event,object_id,subject) values(auth.uid(),'secret_granted',secret_id,recipient);
  end if;
end $$;

create function public.vault_events() returns table(id bigint,at timestamptz,actor uuid,event text,object_id uuid,subject uuid)
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  r:=vault_private.require_access();
  return query select e.id,e.at,e.actor,e.event,e.object_id,e.subject from vault_private.events e
    where r='security_analyst' or e.actor=auth.uid() order by e.id desc limit 100;
end $$;

revoke all on all functions in schema vault_private from public,anon,authenticated;
-- Explicit grants, never default PUBLIC execute for security-definer entry points.
revoke all on function public.authorize_mfa_bootstrap(text),public.register_mfa_factor(uuid),public.check_mfa_approval(),public.check_workspace_session(),public.workspace_sessions(),
 public.revoke_workspace_sessions(),public.vault_list(),public.vault_create(uuid,text,jsonb),public.vault_read(uuid),
 public.vault_replace(uuid,integer,jsonb),public.vault_delete(uuid),public.vault_grant(uuid,uuid,timestamptz),public.vault_events()
 from public,anon,authenticated;
grant execute on function public.authorize_mfa_bootstrap(text),public.register_mfa_factor(uuid),public.check_mfa_approval(),public.check_workspace_session(),public.workspace_sessions(),
 public.revoke_workspace_sessions(),public.vault_list(),public.vault_create(uuid,text,jsonb),public.vault_read(uuid),
 public.vault_replace(uuid,integer,jsonb),public.vault_delete(uuid),public.vault_grant(uuid,uuid,timestamptz),public.vault_events()
 to authenticated;
commit;
