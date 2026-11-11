-- Rollback of GILUI_YOMI_WRITER_PINS_V1 (schema). Apply the config rollback
-- (ROLLBACK_20261111170500_gilui_yomi_live_all_members_config.sql) first.
-- Removing pinned_until ends every pin; the "עכשיו" reader then reports the pin read as failed and keeps every channel row.
-- Deploy the previous wa-channel-ingest first if the current one is still sending pinned_until for listed senders.

drop index if exists public.channel_updates_pinned_until_live_idx;
alter table public.channel_updates drop column if exists pinned_until;

alter table public.channel_ingest_sources drop constraint if exists channel_ingest_sources_pin_hours_check;
alter table public.channel_ingest_sources
  drop column if exists pin_ids,
  drop column if exists pin_hours;
