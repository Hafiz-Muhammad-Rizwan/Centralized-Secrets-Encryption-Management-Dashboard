-- Administrator only, AFTER independently verifying the person's identity.
-- Replace the UUID with the intended auth.users ID. Do not expose this as an RPC.
-- Deliver the returned token privately, separately from the account password.
-- Token is single use, expires in 30 minutes. Never commit or log its value.
with issued as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id,
         replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') as token
), stored as (
  insert into vault_private.bootstrap_tokens(user_id,token_hash,expires_at)
  select user_id,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '30 minutes' from issued
  on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,consumed_at=null
  returning user_id
)
select token from issued join stored using(user_id);
