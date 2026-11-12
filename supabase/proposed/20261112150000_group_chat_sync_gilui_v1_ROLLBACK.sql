-- ROLLBACK for 20261112150000_group_chat_sync_gilui_v1_PROPOSAL.sql
-- Step 1 (stop): update public.group_chat_sync_channels set enabled = false;  and: select cron.unschedule('group-chat-sync-v1');
-- Step 2 (remove what was synced, soft): update public.research_contributions set deleted_at = now()
--   where deleted_at is null and (id in (select contribution_id from public.group_chat_sync_map) or id in (select root_id from public.group_chat_daily_roots));
begin;
drop trigger if exists trg_group_chat_sync_v1 on public.channel_update_group_proof;
drop trigger if exists trg_group_chat_sync_v1 on public.group_source_public_media;
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_update_group_proof;
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_updates;
drop function if exists public.group_chat_sync_pending_v1(integer);
drop function if exists public.tg_group_chat_unsync_v1();
drop function if exists public.tg_group_chat_sync_v1();
drop function if exists public.group_chat_sync_update_v1(uuid);
drop function if exists public.group_chat_safe_text_v1(text);
-- tables are kept for the audit trail (map of which chat row came from which update); drop only if explicitly requested:
-- drop table public.group_chat_sync_map, public.group_chat_daily_roots, public.group_chat_sync_writers, public.group_chat_sync_channels;
commit;
