-- Rollback of GILUI_YOMI_LIVE_ALL_MEMBERS_CONFIG: back to the 7-number admin allowlist (still stored in admin_ids), no pins.
-- Rows already published stay as they are; to take them out of Now, set status for the rows in question explicitly (separate approval).
update public.channel_ingest_sources
   set admin_only = true,
       pin_ids = '{}'::text[],
       pin_hours = 24
 where channel = 'gilui-yomi';
