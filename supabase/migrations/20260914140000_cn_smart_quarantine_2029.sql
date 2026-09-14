-- CN_SMART_QUARANTINE_2029_V1
-- Additive policy vocabulary only. No country is switched by this migration.
-- Existing owner stays public.edge_blocked_countries; strict_level remains 1..3.
-- `quarantine` means risk-adaptive browser friction, not a country hard-block.

alter table public.edge_blocked_countries
  drop constraint if exists edge_blocked_countries_mode_chk;

alter table public.edge_blocked_countries
  add constraint edge_blocked_countries_mode_chk
  check (mode = any (array['blocked'::text, 'strict'::text, 'monitor'::text, 'quarantine'::text]));

comment on column public.edge_blocked_countries.mode is
  'Country edge policy: monitor=no extra enforcement; strict=uniform JS challenge; quarantine=risk-adaptive browser challenge while goodbot/ai bypass and bad bot remains denied; blocked=country hard-block for browser/bot. Human Gate required for policy changes.';
