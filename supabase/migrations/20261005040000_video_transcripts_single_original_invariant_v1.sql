-- POST_PUBLISHING_2029_CHAIN_V1_ORIGINAL_INVARIANT — one and only one is_original=true row per video_key.
-- BRANCH-ONLY: NOT applied to live. No new table/store/registry; an invariant on the EXISTING public.video_transcripts.
-- (video_key, lang) uniqueness is unchanged. FAILS CLOSED: if duplicate originals exist at apply time the migration
-- raises and changes nothing — it never deletes, demotes or dedupes rows. Live check 2026-10-05: 6 originals / 6 keys.
do $$
declare v_dups text;
begin
  select string_agg(video_key || ' x' || n, ', ') into v_dups
  from (select video_key, count(*) n from public.video_transcripts where is_original group by video_key having count(*) > 1) d;
  if v_dups is not null then
    raise exception 'video_transcripts_duplicate_originals: % — resolve manually (no silent dedupe), then re-apply', v_dups;
  end if;
end $$;

create unique index if not exists video_transcripts_one_original_per_key_uidx
  on public.video_transcripts (video_key) where is_original;
