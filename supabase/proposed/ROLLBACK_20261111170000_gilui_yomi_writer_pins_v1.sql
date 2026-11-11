-- Rollback of GILUI_YOMI_WRITER_PINS_V1 (schema). Production DB change: needs explicit ZURIEL approval.
-- Order: stop the activation first (STOP_20261111170500_gilui_yomi_live_all_members.sql), then this file.
-- The current wa-channel-ingest keeps working without these columns (it reads them from the source row and sends pinned_until only
-- for a pinned row, which cannot happen once pin_writers is gone). The "עכשיו" pin read then reports "pins: failed" and keeps every
-- channel row. Rows already published stay published: removing the columns does not unpublish anything.

drop index if exists public.channel_updates_pinned_until_live_idx;
alter table public.channel_updates drop column if exists pinned_until;

alter table public.channel_ingest_sources drop constraint if exists channel_ingest_sources_pin_hours_check;
alter table public.channel_ingest_sources drop constraint if exists channel_ingest_sources_pin_writers_check;
alter table public.channel_ingest_sources
  drop column if exists live_from,
  drop column if exists pin_writers,
  drop column if exists pin_hours;
