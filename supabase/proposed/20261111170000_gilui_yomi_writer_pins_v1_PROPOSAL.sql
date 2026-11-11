-- GILUI_YOMI_WRITER_PINS_V1 — schema (ZURIEL 11.11.2026)
-- «הגילוי היומי» enters automatically like Or HaGeula, from every member; the messages of the writers whose WhatsApp number is
-- listed are pinned at the top of "עכשיו" for a set number of hours.
-- EXTEND_EXISTING only: the existing WhatsApp source registry (channel_ingest_sources) gains the pin list and length, and
-- channel_updates gains the time a row stays pinned. No new table, reader, RPC, grant or policy.
-- Backward compatible: the ingest sends pinned_until only for a pinned row, and the "עכשיו" reader reads pins in a separate,
-- failure-isolated query, so both keep working before this file is applied (pins are simply absent).
-- Production DB change: needs explicit ZURIEL approval. Rollback: ROLLBACK_20261111170000_gilui_yomi_writer_pins_v1.sql

alter table public.channel_ingest_sources
  add column if not exists pin_ids text[] not null default '{}'::text[],
  add column if not exists pin_hours integer not null default 24;

alter table public.channel_ingest_sources
  drop constraint if exists channel_ingest_sources_pin_hours_check;
alter table public.channel_ingest_sources
  add constraint channel_ingest_sources_pin_hours_check check (pin_hours between 1 and 168);

comment on column public.channel_ingest_sources.pin_ids is
  'WhatsApp sender ids (number@c.us) whose incoming LIVE messages in this channel are pinned at the top of Now. Identity is the number only, never the display name. Private like admin_ids.';
comment on column public.channel_ingest_sources.pin_hours is
  'How long a pinned message stays pinned, counted from the message time (1-168 hours).';

alter table public.channel_updates
  add column if not exists pinned_until timestamptz null;

comment on column public.channel_updates.pinned_until is
  'Set only by wa-channel-ingest for a sender listed in channel_ingest_sources.pin_ids: the row is pinned in Now while this time is ahead, and while pinned Now shows the writer name (proved by the number).';

-- The Now pin read: live rows with an active pin, newest pin first (small partial index; most rows have no pin).
create index if not exists channel_updates_pinned_until_live_idx
  on public.channel_updates (pinned_until desc)
  where pinned_until is not null and status = 'live';
