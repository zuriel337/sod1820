-- STOP — «הגילוי היומי» back to the previous intake policy for every message not yet processed (ZURIEL decision required).
-- Effect from the next poll (≤ 5 minutes): admin_ids allowlist again, private rows, no new pins, display-name attribution on
-- private rows as before. Messages that were waiting in a backlog are decided by this state when processed.
-- NOT changed by this file:
--   * rows already published stay live (each until it expires: Kandro's after 24 hours by trg_gilui_shachar_24h; others stay).
--     To take them down see UNPUBLISH_20261111170500_gilui_yomi_published_rows.sql (separate approval).
--   * pins already set keep their pinned_until (at most pin_hours = 24 hours); UNPUBLISH also clears them.
--   * public media of published rows stays in the public bucket (removing objects is a separate storage action).
-- Read live_from (the activation moment) and keep it in the work_log BEFORE running this: UNPUBLISH needs it.

select channel, live_from as activated_at from public.channel_ingest_sources where channel = 'gilui-yomi';

update public.channel_ingest_sources
   set live_from = null,
       admin_only = true,
       pin_writers = '[]'::jsonb,
       pin_hours = 24
 where channel = 'gilui-yomi';

-- Stopping ALL intake of the group (also the private admin intake) is one more, separate statement:
--   update public.channel_ingest_sources set enabled = false where channel = 'gilui-yomi';
