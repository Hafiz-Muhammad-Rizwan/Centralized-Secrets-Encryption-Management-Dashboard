-- Run once in Supabase SQL Editor as the project administrator.
-- No passwords, secret payloads, or self-service role escalation are stored here.
begin;
create table public.workspace_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('team_lead', 'developer', 'security_analyst')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.workspace_members enable row level security;
alter table public.workspace_members force row level security;
revoke all on public.workspace_members from public, anon, authenticated;
grant select on public.workspace_members to authenticated;
create policy "Members can read only their own assignment"
  on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));
-- No INSERT/UPDATE/DELETE policy or grant for application users.
-- Role assignments are made only through trusted administrative SQL.
commit;
