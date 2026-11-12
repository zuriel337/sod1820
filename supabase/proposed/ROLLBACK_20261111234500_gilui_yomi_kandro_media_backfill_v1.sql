-- ROLLBACK of GILUI_YOMI_KANDRO_MEDIA_BACKFILL_V1 (supabase/proposed/20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql).
-- Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4). Test: bash scripts/run-group-source-media-sql-test.sh
-- To HIDE the image without undoing anything, the lighter path is the existing admin hold: admin_hold_group_source_v1(<id>, true).
--
-- Returns the 10.11 row to the state read on 11.11.2026: closed intake marker, the 24-hour expiry, no proof (the media proof made by the
-- targeted recovery, if any, is removed, and with it the public-copy record). Not undone: the public object in the media bucket, if one was
-- written — read `select object_path from public.group_source_public_media where update_id = '8d30aba8-e510-443b-9de0-456df8875a22'`
-- BEFORE running this file and delete that path in Storage; and the contributor attribution the proof made on the row.
begin;

do $$
begin
  if (select count(*) from public.channel_updates
       where id = '8d30aba8-e510-443b-9de0-456df8875a22' and channel = 'gilui-yomi' and group_source_intake_public is true and expires_at is null) <> 1
     or exists (select 1 from public.channel_update_group_proof
                 where update_id = '8d30aba8-e510-443b-9de0-456df8875a22' and text_only is not false) then
    raise exception 'KANDRO_MEDIA_BACKFILL rollback precondition: the 10.11 row is not in the state the backfill left; nothing changed';
  end if;
end $$;

delete from public.channel_update_group_proof where update_id = '8d30aba8-e510-443b-9de0-456df8875a22' and text_only is false;
update public.channel_updates
   set group_source_intake_public = false, expires_at = created_at + interval '24 hours'
 where id = '8d30aba8-e510-443b-9de0-456df8875a22';

do $$
begin
  if exists (select 1 from public.channel_update_group_proof where update_id = '8d30aba8-e510-443b-9de0-456df8875a22')
     or exists (select 1 from public.group_source_public_media where update_id = '8d30aba8-e510-443b-9de0-456df8875a22')
     or (select count(*) from public.channel_updates where id = '8d30aba8-e510-443b-9de0-456df8875a22'
          and group_source_intake_public is false and expires_at = created_at + interval '24 hours') <> 1 then
    raise exception 'KANDRO_MEDIA_BACKFILL rollback postcondition: the 10.11 row is not back to its state of 11.11.2026';
  end if;
end $$;

commit;
