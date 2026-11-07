-- Isolated PostgreSQL regression suite: simulated, trusted PostgREST JWT claims.
-- Never run in a live project. Fixture users contain no credentials.
create function public.test_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %',label; end if; end $$;
create function public.test_denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege or raise_exception then return; end;
  raise exception 'Expected denial: %',statement;
end $$;
create function public.test_login(uid uuid, aal text, sid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'aal',aal,'session_id',sid,
    'exp',extract(epoch from now()+interval '1 hour')::bigint,
    'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,false);
end $$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004');
insert into auth.mfa_factors
  select ('30000000-0000-0000-0000-00000000000' || n)::uuid, ('00000000-0000-0000-0000-00000000000' || n)::uuid,'verified','totp' from generate_series(1,4) n;
insert into vault_private.approved_factors select user_id,id from auth.mfa_factors;
insert into public.workspace_members(user_id,role) values
 ('00000000-0000-0000-0000-000000000001','team_lead'),('00000000-0000-0000-0000-000000000002','team_lead'),
 ('00000000-0000-0000-0000-000000000003','developer'),('00000000-0000-0000-0000-000000000004','security_analyst');
insert into vault_private.bootstrap_tokens(user_id,token_hash,expires_at) values
 ('00000000-0000-0000-0000-000000000001',encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'),now()+interval '30 minutes');
insert into auth.mfa_factors values('30000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','unverified','totp');
set role anon;
select public.test_denied('select public.vault_list()');
reset role;
set role authenticated;
select public.test_login('00000000-0000-0000-0000-000000000001','aal1','10000000-0000-0000-0000-000000000001');
select public.test_assert(not public.authorize_mfa_bootstrap(repeat('b',64)),'wrong bootstrap token rejected');
select public.test_assert(public.authorize_mfa_bootstrap(repeat('a',64)),'bootstrap token accepted once');
select public.test_assert(not public.authorize_mfa_bootstrap(repeat('a',64)),'bootstrap replay rejected');
select public.test_assert(public.register_mfa_factor('30000000-0000-0000-0000-000000000010'),'authorized factor registration');
select public.test_assert(not public.register_mfa_factor('30000000-0000-0000-0000-000000000010'),'registration authorization single use');
select public.test_denied('select public.vault_list()');
select public.test_denied('select * from vault_private.secrets');
select public.test_denied('update public.workspace_members set role=''security_analyst''');
select public.test_login('00000000-0000-0000-0000-000000000001','aal2','10000000-0000-0000-0000-000000000001');
select public.vault_create('20000000-0000-0000-0000-000000000001','test record','{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}'::jsonb);
select public.test_assert((select count(*)=1 from public.vault_list()),'owner list');
select public.test_denied('select public.vault_create(''20000000-0000-0000-0000-000000000099'',''invalid'',''{"v":1,"plaintext":"not allowed"}''::jsonb)');
select public.test_assert(public.vault_read('20000000-0000-0000-0000-000000000001')->>'owner_id'='00000000-0000-0000-0000-000000000001','owner read');
select public.vault_replace('20000000-0000-0000-0000-000000000001',1,'{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}'::jsonb);
select public.test_denied('select public.vault_replace(''20000000-0000-0000-0000-000000000001'',1,''{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}''::jsonb)');
select public.test_login('00000000-0000-0000-0000-000000000002','aal2','10000000-0000-0000-0000-000000000002');
select public.test_assert((select count(*)=0 from public.vault_list()),'other lead cannot list');
select public.test_denied('select public.vault_read(''20000000-0000-0000-0000-000000000001'')');
select public.test_denied('select public.vault_delete(''20000000-0000-0000-0000-000000000001'')');
select public.test_denied('select public.vault_replace(''20000000-0000-0000-0000-000000000001'',2,''{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}''::jsonb)');
select public.test_denied('select public.vault_grant(''20000000-0000-0000-0000-000000000001'',''00000000-0000-0000-0000-000000000002'',now()+interval ''1 hour'')');
select public.test_login('00000000-0000-0000-0000-000000000001','aal2','10000000-0000-0000-0000-000000000001');
select public.vault_grant('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',now()+interval '1 hour');
select public.test_login('00000000-0000-0000-0000-000000000003','aal2','10000000-0000-0000-0000-000000000003');
select public.test_assert((select count(*)=1 from public.vault_list()),'grantee list');
select public.test_assert(public.vault_read('20000000-0000-0000-0000-000000000001') is not null,'grantee read');
select public.test_denied('select public.vault_create(''20000000-0000-0000-0000-000000000002'',''forbidden'',''{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}''::jsonb)');
reset role;
update vault_private.grants set expires_at=now()-interval '1 minute';
set role authenticated;
select public.test_denied('select public.vault_read(''20000000-0000-0000-0000-000000000001'')');
reset role;
update public.workspace_members set active=false where user_id='00000000-0000-0000-0000-000000000003';
set role authenticated;
select public.test_denied('select public.vault_list()');
select public.test_login('00000000-0000-0000-0000-000000000001','aal2','10000000-0000-0000-0000-000000000001');
select public.test_assert((select count(*)=1 from public.workspace_sessions()),'own session inventory');
select public.revoke_workspace_sessions();
select public.test_assert(not public.check_workspace_session(),'revoked session denied immediately');
select public.test_denied('select public.vault_list()');
-- A copied token with a previously unseen session ID must also be rejected.
select set_config('request.jwt.claims',jsonb_set(jsonb_set(auth.jwt(),'{session_id}','"10000000-0000-0000-0000-000000000099"'),'{amr}',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()-interval '10 minutes')::bigint)))::text,false);
select public.test_assert(not public.check_workspace_session(),'unseen stale session denied');
select public.test_login('00000000-0000-0000-0000-000000000004','aal2','10000000-0000-0000-0000-000000000004');
select public.test_assert((select count(*)>0 from public.vault_events()),'analyst sees real events');
select public.test_assert((select count(*)=0 from public.vault_list()),'analyst has no implicit secret access');
reset role;
-- Direct-provider enrollment without a bootstrap approval must deny even AAL2.
insert into auth.mfa_factors values('30000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000004','verified','totp');
set role authenticated;
select public.test_assert(not public.check_mfa_approval(),'unapproved factor rejected');
select public.test_denied('select public.vault_list()');
reset role;
delete from auth.mfa_factors where id='30000000-0000-0000-0000-000000000099';
set role authenticated;
select public.test_denied('delete from vault_private.events');
reset role;
-- Failure of the audit sink must roll back a vault mutation.
create function vault_private.test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'test audit unavailable'; end $$;
create trigger test_audit_failure before insert on vault_private.events for each row execute function vault_private.test_audit_failure();
set role authenticated;
select public.test_login('00000000-0000-0000-0000-000000000002','aal2','10000000-0000-0000-0000-000000000002');
select public.test_denied('select public.vault_create(''20000000-0000-0000-0000-000000000002'',''rollback-test'',''{"v":1,"keyId":"test-v1","wrappedKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","iv":"AAAAAAAAAAAAAAAA","tag":"AAAAAAAAAAAAAAAAAAAAAA==","ciphertext":"AA=="}''::jsonb)');
reset role;
select public.test_assert(not exists(select 1 from vault_private.secrets where id='20000000-0000-0000-0000-000000000002'),'audit failure rolls back creation');
drop trigger test_audit_failure on vault_private.events;
select 'SQL SECURITY TESTS PASSED' as result;
