-- Read-only inspection for the project administrator in Supabase SQL Editor.
-- Run after the membership migration. This does not modify users or policies.
-- Every passed value in the first result must be true. Inspect the second result:
-- expect ONLY the own-assignment SELECT policy for authenticated, constrained by
-- user_id = (select auth.uid()). Additional permissive policies need review.
-- These catalog checks do not replace live tests with two different user sessions.
begin read only;

select 'RLS enabled and forced' as check_name,
       coalesce((select relrowsecurity and relforcerowsecurity
                 from pg_class where oid = to_regclass('public.workspace_members')), false) as passed
union all
select 'authenticated can SELECT',
       coalesce(has_table_privilege('authenticated', to_regclass('public.workspace_members'), 'SELECT'), false)
union all
select 'application roles cannot bypass RLS',
       count(*) = 2 and bool_and(not rolbypassrls and not rolsuper)
       from pg_roles where rolname in ('anon', 'authenticated')
union all
select 'anon has no table privileges',
       not coalesce(has_table_privilege('anon', to_regclass('public.workspace_members'),
                                       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), true)
union all
select 'authenticated has no table mutation privileges',
       not coalesce(has_table_privilege('authenticated', to_regclass('public.workspace_members'),
                                       'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), true)
union all
select 'no anonymous column reads or application column writes',
       not exists (
         select 1 from pg_attribute
         where attrelid = to_regclass('public.workspace_members')
           and attnum > 0 and not attisdropped
           and (has_column_privilege('anon', attrelid, attnum, 'SELECT,INSERT,UPDATE,REFERENCES')
                or has_column_privilege('authenticated', attrelid, attnum, 'INSERT,UPDATE,REFERENCES'))
       );

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'workspace_members';

rollback;
