-- ROLLBACK for 20261112150000_group_chat_sync_gilui_v2_PROPOSAL.sql
-- Stop first:  select cron.unschedule('group-chat-sync-v1');  (if scheduled)
-- Remove what was copied (soft):  update public.research_contributions set deleted_at = now()
--   where deleted_at is null and origin = 'community_2029' and target_type in ('channel_update','group_day');
drop trigger if exists trg_group_chat_sync_v1 on public.channel_update_group_proof;
drop trigger if exists trg_group_chat_sync_v1 on public.group_source_public_media;
drop trigger if exists trg_group_chat_sync_v1 on public.channel_updates;
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_update_group_proof;
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_updates;
drop function if exists public.group_chat_sync_pending_v1(integer);
drop function if exists public.tg_group_chat_unsync_v1();
drop function if exists public.tg_group_chat_sync_v1();
drop function if exists public.group_chat_sync_update_v1(uuid);
drop index if exists public.research_contributions_group_source_copy_uq;
drop index if exists public.research_contributions_group_day_uq;
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure);
  if position($q$'shimon-haimov','r-b6ce542a2b0747498aba532c886f6de7')$q$ in d) > 0 then
    execute replace(d, $q$'shimon-haimov','r-b6ce542a2b0747498aba532c886f6de7')$q$, $q$'shimon-haimov')$q$);
  end if;
end
$do$;
update public.contributors set dossier_settings = dossier_settings - 'general_feed_enabled' where id = 'fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf';
