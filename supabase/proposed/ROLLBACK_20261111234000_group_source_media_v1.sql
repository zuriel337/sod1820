-- ROLLBACK of GROUP_SOURCE_MEDIA_V1 (supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql).
-- Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4). Test: bash scripts/run-group-source-media-sql-test.sh
-- Deploy the previous wa-channel-ingest FIRST (the Edge function calls the two recorders removed here; without them it keeps every media
-- message private, so the order is safe either way, but the Edge rollback is the clean first step).
--
-- Restores the public reader byte for byte (the definition read on 11.11.2026, md5 5e5168904f67f73c1ad1fcb6ecceb5bb, execute for anon,
-- authenticated and service_role), removes the two recorders, the rule and the public-copy table, deletes the media proof rows
-- (text_only = false; their channel_updates rows stay private as before) and restores the text-only check.
-- Not undone here: (1) objects already written to the public media bucket — after this rollback nothing lists them; to remove them, export
-- `select object_path from public.group_source_public_media` BEFORE running this file and delete those paths in Storage;
-- (2) contributor_id attributions the media recorder made on its own rows (the same first-proof attribution rule as the text recorder).
begin;

do $$
begin
  if md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) <> 'd36f8a4bb2f87e61249c41c3499c6bd4'
     or to_regclass('public.group_source_public_media') is null
     or to_regprocedure('public.group_source_media_publishable_v1(uuid)') is null
     or to_regprocedure('public.record_channel_update_group_media_proof_v1(uuid,uuid,text,text,text,boolean,text)') is null
     or to_regprocedure('public.record_group_source_public_media_v1(uuid,text)') is null
     or not exists (select 1 from pg_constraint where conrelid = 'public.channel_update_group_proof'::regclass and conname = 'channel_update_group_proof_payload_check') then
    raise exception 'GROUP_SOURCE_MEDIA rollback precondition: GROUP_SOURCE_MEDIA_V1 is not the state in the database (not applied, or changed since); nothing changed';
  end if;
end $$;

drop function public.world_group_source_arrivals_v2(integer, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.world_group_source_arrivals_v2(p_limit integer DEFAULT 12, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, body text, created_at timestamp with time zone, contributor_slug text, contributor_name text, group_proof boolean, proof_basis text, group_channel text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
     select cu.id,
              left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(cu.text, '((https?://)?(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])\S*', '\1', 'gi'), '(https?://|www\.)(?!(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-]))\S+', '[קישור]', 'gi'),
                            '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
                                          '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200),
                                                   cu.created_at, c.slug, c.display_name, true, g.identity_basis, cu.channel
                                                       from public.channel_update_group_proof g
                                                           join public.channel_updates cu on cu.id = g.update_id
                                                               join public.channel_ingest_sources s
                                                                     on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
                                                                          and s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria','blaze-888')
                                                                               and s.enabled is true and coalesce(s.intake_mode,'') <> 'off'
                                                                                    and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
                                                                                        join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
                                                                                           where g.held_at is null
                                                                                                and g.identity_basis = 'verified_phone_unique'
                                                                                                     and cu.source = 'auto' and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_'
                                                                                                          and cu.group_source_intake_public is true
                                                                                                               and cu.status in ('live','private')
                                                                                                                    and (cu.expires_at is null or cu.expires_at > now())
                                                                                                                         and cu.image_url is null and cu.thumb_url is null
                                                                                                                              and cu.text is not null and length(btrim(cu.text)) > 0
                                                                                                                                   and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'
                                                                                                                                        and c.active is true
                                                                                                                                             and c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')
                                                                                                                                                  and coalesce(c.dossier_settings ->> 'general_feed_enabled','false') = 'true'
                                                                                                                                                       and (p_before is null or cu.created_at < p_before)
                                                                                                                                                          order by cu.created_at desc, cu.id
                                                                                                                                                             limit greatest(1, least(coalesce(p_limit,12), 40));
                                                                                                                                                             $function$
;
revoke all on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) from public;
grant execute on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) to anon, authenticated, service_role;

drop function public.record_group_source_public_media_v1(uuid, text);
drop function public.record_channel_update_group_media_proof_v1(uuid, uuid, text, text, text, boolean, text);
drop function public.group_source_media_publishable_v1(uuid);
drop table public.group_source_public_media;
delete from public.channel_update_group_proof where text_only is false;
alter table public.channel_update_group_proof drop constraint channel_update_group_proof_payload_check;
alter table public.channel_update_group_proof add constraint channel_update_group_proof_text_only_check check (text_only is true);
alter table public.channel_update_group_proof drop column media_kind;

do $$
begin
  if md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) <> '5e5168904f67f73c1ad1fcb6ecceb5bb' then
    raise exception 'GROUP_SOURCE_MEDIA rollback postcondition: the reader is not the definition read on 11.11.2026';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.channel_update_group_proof'::regclass
                  and conname = 'channel_update_group_proof_text_only_check' and pg_get_constraintdef(oid) = 'CHECK ((text_only IS TRUE))')
     or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'channel_update_group_proof' and column_name = 'media_kind') then
    raise exception 'GROUP_SOURCE_MEDIA rollback postcondition: the proof table is not back to text-only';
  end if;
  if not has_function_privilege('anon', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute')
     or not has_function_privilege('authenticated', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute')
     or not has_function_privilege('service_role', 'public.world_group_source_arrivals_v2(integer,timestamp with time zone)', 'execute') then
    raise exception 'GROUP_SOURCE_MEDIA rollback postcondition: reader grants are not restored';
  end if;
end $$;

commit;
