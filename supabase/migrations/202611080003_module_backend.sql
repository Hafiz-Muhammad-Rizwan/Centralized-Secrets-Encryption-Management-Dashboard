-- Activity 6 Task 2: backend persistence for the two Activity 3 modules.
-- Apply after 202611070002_vault_security.sql. Additive only; existing vault
-- functions remain available for the /vault operations page.
begin;

alter table vault_private.secrets
  add column if not exists secret_type text not null default 'API Key'
    check (length(secret_type) between 1 and 40),
  add column if not exists environment text not null default 'PROD'
    check (environment in ('PROD','STAGING','DEV')),
  add column if not exists service text not null default ''
    check (length(service) <= 100),
  add column if not exists rotation_policy text not null default '30 Days'
    check (length(rotation_policy) between 1 and 40);

create index if not exists idx_vault_events_object_event on vault_private.events(object_id, event);

-- Module 1 (Secret Provisioning): validated, role-gated insert.
create or replace function public.vault_create_module(
  secret_id uuid,
  secret_name text,
  sealed jsonb,
  p_secret_type text,
  p_environment text,
  p_service text,
  p_rotation_policy text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access() <> 'team_lead' then
    raise exception 'Access denied' using errcode='42501';
  end if;
  if secret_id is null or not vault_private.valid_envelope(sealed) then
    raise exception 'Invalid secret';
  end if;
  if secret_name is null or btrim(secret_name) !~ '^[a-z0-9_-]{3,50}$' then
    raise exception 'Invalid name';
  end if;
  if p_secret_type is null or p_secret_type not in
     ('API Key','DB Credential','SSH Key','TLS Certificate','OAuth Token',
      'Webhook Secret','IAM Key','API Token','Password') then
    raise exception 'Invalid type';
  end if;
  if p_environment is null or p_environment not in ('PROD','STAGING','DEV') then
    raise exception 'Invalid environment';
  end if;
  if p_service is null or btrim(p_service) !~ '^[A-Za-z0-9 ._/&-]{3,100}$' then
    raise exception 'Invalid service';
  end if;
  if p_rotation_policy is null or p_rotation_policy not in ('30 Days','60 Days','90 Days','180 Days') then
    raise exception 'Invalid rotation policy';
  end if;
  if (select count(*) from vault_private.secrets where owner_id = auth.uid()) >= 100 then
    raise exception 'Secret quota reached';
  end if;
  insert into vault_private.secrets(
    id, owner_id, name, envelope, secret_type, environment, service, rotation_policy
  ) values (
    secret_id, auth.uid(), btrim(secret_name), sealed, p_secret_type,
    p_environment, btrim(p_service), p_rotation_policy
  );
  insert into vault_private.events(actor,event,object_id)
    values(auth.uid(),'secret_created',secret_id);
end $$;

-- Module 2 (Secrets Directory): retrieve visible records without ciphertext.
create or replace function public.vault_list_modules() returns table(
  id uuid,
  name text,
  owner_id uuid,
  version integer,
  updated_at timestamptz,
  secret_type text,
  environment text,
  service text,
  rotation_policy text,
  access_count integer
)
language plpgsql security definer set search_path = '' as $$
begin
  perform vault_private.require_access();
  return query
    select s.id, s.name, s.owner_id, s.version, s.updated_at,
           s.secret_type, s.environment, s.service, s.rotation_policy,
           (select count(*)::integer from vault_private.events e
             where e.object_id = s.id and e.event = 'secret_read_authorized')
      from vault_private.secrets s
     where vault_private.can_read(s)
     order by s.updated_at desc
     limit 100;
end $$;

-- Module 2 rotation: re-encrypt an owned record with optimistic concurrency.
create or replace function public.vault_rotate_module(
  secret_id uuid,
  expected_version integer,
  sealed jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if vault_private.require_access() <> 'team_lead' then
    raise exception 'Access denied' using errcode='42501';
  end if;
  if secret_id is null or expected_version is null or expected_version < 1
     or not vault_private.valid_envelope(sealed) then
    raise exception 'Invalid rotation';
  end if;
  update vault_private.secrets
     set envelope = sealed, version = version + 1, updated_at = now()
   where id = secret_id and owner_id = auth.uid() and version = expected_version;
  if not found then
    raise exception 'Access denied or record changed' using errcode='42501';
  end if;
  insert into vault_private.events(actor,event,object_id)
    values(auth.uid(),'secret_rotated',secret_id);
end $$;

revoke all on function public.vault_create_module(uuid,text,jsonb,text,text,text,text),
  public.vault_list_modules(), public.vault_rotate_module(uuid,integer,jsonb)
  from public,anon,authenticated;
grant execute on function public.vault_create_module(uuid,text,jsonb,text,text,text,text),
  public.vault_list_modules(), public.vault_rotate_module(uuid,integer,jsonb)
  to authenticated;

commit;
