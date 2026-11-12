-- GILUI_YOMI_KANDRO_MEDIA_BACKFILL_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261111234500_gilui_yomi_kandro_media_backfill_v1.sql · Test: bash scripts/run-group-source-media-sql-test.sh
-- Order: AFTER 20261111234000_group_source_media_v1 AND after the wa-channel-ingest deploy that carries the media path.
--
-- ZURIEL 11.11.2026: "להציג גם את ההודעה מ־10.11". The message of שחר יצחק קנדרו in «הגילוי היומי» of 10.11.2026 22:41:49 UTC is an image
-- with a caption (its private original is in submission-inbox). It arrived before the media path existed, so it carries the closed intake
-- marker, no proof, and the 24-hour expiry the old trigger gave it (it expired on 11.11.2026 22:41 UTC).
-- This file opens THAT ROW ONLY for the media path: intake marker true, expiry removed. It proves and publishes nothing by itself.
-- Step 2 below (a separate approval) asks the ingest to re-read that one message from WhatsApp (targeted recovery): the proof comes from
-- the sender id exactly as for a new message (Kandro's bound number), and the public copy is written and recorded only if every gate holds.
-- If the sender does not verify, the row stays private, and this file can be rolled back.
-- Expected result: the image appears in the group stream and in the opened Now panel at its own time (10.11), NOT pinned (the 24-hour pin
-- counts from the arrival and ended on 11.11 22:41 UTC).
begin;

do $$
declare r record;
begin
  if to_regprocedure('public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)') is null
     or to_regprocedure('public.record_group_source_public_media_v1(uuid,text)') is null
     or to_regclass('public.group_source_public_media') is null then
    raise exception 'KANDRO_MEDIA_BACKFILL precondition: GROUP_SOURCE_MEDIA_V1 is not applied; nothing changed';
  end if;
  select cu.* into r from public.channel_updates cu where cu.id = '8d30aba8-e510-443b-9de0-456df8875a22';
  if not found or r.channel is distinct from 'gilui-yomi' or r.source is distinct from 'auto' or r.status is distinct from 'private'
     or r.group_source_intake_public is not false or r.thumb_url is not null
     or coalesce(r.image_url, '') !~ '^storage-object:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or r.created_at is distinct from '2026-11-10 22:41:49+00'::timestamptz
     or r.expires_at is distinct from r.created_at + interval '24 hours'
     or coalesce(r.ext_msg_id, '') !~ '^[A-Za-z0-9_-]{8,64}$'
     or (select count(*) from public.channel_updates x where x.ext_msg_id = r.ext_msg_id) <> 1
     or exists (select 1 from public.channel_update_group_proof g where g.update_id = r.id or g.ext_msg_id = r.ext_msg_id) then
    raise exception 'KANDRO_MEDIA_BACKFILL precondition: the 10.11 row is not in the state read on 11.11.2026 (already opened, proved or changed); nothing changed';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'submission-inbox' and o.id = substr(r.image_url, 16)::uuid
                  and o.metadata ->> 'mimetype' = 'image/jpeg') then
    raise exception 'KANDRO_MEDIA_BACKFILL precondition: the private original image is missing; nothing changed';
  end if;
end $$;

update public.channel_updates
   set group_source_intake_public = true, expires_at = null
 where id = '8d30aba8-e510-443b-9de0-456df8875a22';

do $$
begin
  if (select count(*) from public.channel_updates
       where id = '8d30aba8-e510-443b-9de0-456df8875a22' and group_source_intake_public is true and expires_at is null and status = 'private') <> 1 then
    raise exception 'KANDRO_MEDIA_BACKFILL postcondition: the 10.11 row is not open for the media path';
  end if;
end $$;

commit;

-- Step 2 — a SEPARATE approval, after this file AND the Edge deploy: one targeted recovery of that message. It changes nothing if a gate does
-- not hold, and it never advances the ingest checkpoints. The admin key is read inside the database from Vault and never printed:
--
--   select net.http_get(
--     url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-channel-ingest?recover_channel=gilui-yomi&recover_message_id='
--            || (select ext_msg_id from public.channel_updates where id = '8d30aba8-e510-443b-9de0-456df8875a22'),
--     headers := jsonb_build_object('x-fb-admin-key',
--                  (select decrypted_secret from vault.decrypted_secrets where name = 'FB_ADMIN_KEY' order by created_at desc limit 1)),
--     timeout_milliseconds := 50000);
--
-- Read-only check afterwards (expect one row, media_kind = image):
--   select id, media_kind, media_url is not null as has_public_copy
--     from public.world_group_source_arrivals_v2(40, '2026-11-10 22:42:00+00') where id = '8d30aba8-e510-443b-9de0-456df8875a22';
