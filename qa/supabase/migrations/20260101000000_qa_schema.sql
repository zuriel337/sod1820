-- QA-ONLY schema. Never applied to production. Slice 1: what a login needs (profile row read by the real client, own row only).
-- The ELS tiers and the personal-area modules are added in the next slice, from the repository's existing definitions.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  tier text not null default 'free',
  role text not null default 'member',
  community_moderator boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.users enable row level security;
create policy users_read_own on public.users for select to authenticated using (id = auth.uid());
create policy users_update_own_profile on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'member');
grant select, update on public.users to authenticated;
