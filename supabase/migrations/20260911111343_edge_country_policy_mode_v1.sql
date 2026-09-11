-- ADAPTIVE EDGE COUNTRY POLICY V1
-- Extends the existing edge_blocked_countries owner; no parallel policy store.

alter table public.edge_blocked_countries
  add column if not exists mode text not null default 'blocked';

alter table public.edge_blocked_countries
  add column if not exists strict_level smallint not null default 1;

-- Backward-compatible: old middleware continues to consume only hard-blocked countries.
create or replace function public.blocked_countries()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(code order by code), '{}')
  from public.edge_blocked_countries
  where enabled and mode = 'blocked';
$$;
