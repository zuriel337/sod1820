-- Keep policy values bounded and tunable.
alter table public.edge_blocked_countries
  drop constraint if exists edge_blocked_countries_mode_chk;
alter table public.edge_blocked_countries
  add constraint edge_blocked_countries_mode_chk
  check (mode in ('blocked','strict','monitor'));

alter table public.edge_blocked_countries
  drop constraint if exists edge_blocked_countries_strict_level_chk;
alter table public.edge_blocked_countries
  add constraint edge_blocked_countries_strict_level_chk
  check (strict_level between 1 and 3);
