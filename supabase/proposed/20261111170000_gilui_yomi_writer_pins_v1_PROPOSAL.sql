-- GILUI_YOMI_WRITER_PINS_V1 — schema only (ZURIEL 11.11.2026). Production DB change: needs explicit ZURIEL approval.
-- EXTEND_EXISTING: the WhatsApp source registry (channel_ingest_sources) gains the activation moment and the writer pins;
-- channel_updates gains the time a row stays pinned. No new table, reader, RPC, grant or policy.
--
-- Applying this file publishes NOTHING and changes no behavior: live_from is NULL and pin_writers is empty for every source, so
-- wa-channel-ingest keeps the previous policy for every channel, and the "עכשיו" pin read returns nothing.
-- Publication starts only with the separate activation file (20261111170500_…), at the moment it sets live_from.
-- Rollback: ROLLBACK_20261111170000_gilui_yomi_writer_pins_v1.sql

alter table public.channel_ingest_sources
  add column if not exists live_from timestamptz null,
  add column if not exists pin_writers jsonb not null default '[]'::jsonb,
  add column if not exists pin_hours integer not null default 24;

alter table public.channel_ingest_sources drop constraint if exists channel_ingest_sources_pin_hours_check;
alter table public.channel_ingest_sources add constraint channel_ingest_sources_pin_hours_check check (pin_hours between 1 and 168);
alter table public.channel_ingest_sources drop constraint if exists channel_ingest_sources_pin_writers_check;
alter table public.channel_ingest_sources add constraint channel_ingest_sources_pin_writers_check check (jsonb_typeof(pin_writers) = 'array');

comment on column public.channel_ingest_sources.live_from is
  'Approved activation moment. A message whose provider time is at or after it is admitted from every member and published live (regular members without name or contributor link). Earlier messages keep the previous policy (admin_ids allowlist, private), also when processed later. NULL = not opened.';
comment on column public.channel_ingest_sources.pin_writers is
  'Writers pinned at the top of Now: [{"jid":"<number>@c.us","name":"<public name>"}]. Matched by sender number only, never by display name; the public name comes from here. Private like admin_ids.';
comment on column public.channel_ingest_sources.pin_hours is
  'How long a writer pin lasts, counted from the message time (1-168 hours).';

alter table public.channel_updates
  add column if not exists pinned_until timestamptz null;

comment on column public.channel_updates.pinned_until is
  'Set only by wa-channel-ingest for an incoming live message of a number listed in channel_ingest_sources.pin_writers: pinned in Now while this time is ahead.';

-- The Now pin read: live rows with an active pin, newest pin first (small partial index; most rows have no pin).
create index if not exists channel_updates_pinned_until_live_idx
  on public.channel_updates (pinned_until desc)
  where pinned_until is not null and status = 'live';
