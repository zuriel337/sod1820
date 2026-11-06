-- DEF-003 DB step regression (PROPOSED materialized projection), on a DISPOSABLE PostgreSQL only.
-- Mechanics test: video_media_placements_v1 is a plain stub table with the production column list; video_media_assets_v1 is the production
-- definition (pg_get_viewdef, 2026-11-06) so the materialized copy is checked column-for-column against the real projection logic.
\set ON_ERROR_STOP on
\set QUIET on
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists cron;
create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as
  $$ insert into cron.job(jobname, schedule, command) values (p_name, p_schedule, p_command) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create function cron.unschedule(p_name text) returns boolean language sql as $$ with d as (delete from cron.job where jobname = p_name returning 1) select exists(select 1 from d) $$;
grant usage on schema public to anon, authenticated, service_role;

create table public.video_media_placements_v1 (
  source_type text, source_id text, created_at timestamptz, updated_at timestamptz, title text, slug text, video_kind text, media_url text, youtube_id text,
  poster_url text, thumb_url text, page_url text, seo_title text, speaker text, topics text[], series_keys text[], cipher_slug text, categories text[],
  placement_priority int, dedicated_page boolean, google_indexable boolean, needs_review boolean, asset_key text);
grant select on public.video_media_placements_v1 to anon, authenticated;

create view public.video_media_assets_v1 with (security_invoker = true) as
 WITH ranked AS (
         SELECT p.source_type, p.source_id, p.created_at, p.updated_at, p.title, p.slug, p.video_kind, p.media_url, p.youtube_id, p.poster_url, p.thumb_url,
            p.page_url, p.seo_title, p.speaker, p.topics, p.series_keys, p.cipher_slug, p.categories, p.placement_priority, p.dedicated_page,
            p.google_indexable, p.needs_review, p.asset_key,
            row_number() OVER (PARTITION BY p.asset_key ORDER BY (CASE WHEN p.google_indexable AND p.dedicated_page THEN 0 ELSE 1 END), p.placement_priority, p.created_at DESC NULLS LAST, p.source_type, p.source_id) AS rn
           FROM video_media_placements_v1 p
        ), agg AS (
         SELECT r.asset_key, count(*)::integer AS placement_count,
            count(*) FILTER (WHERE r.google_indexable AND r.dedicated_page)::integer AS google_candidate_placements,
            bool_or(r.needs_review) AS has_unresolved_placement, min(r.created_at) AS first_seen_at, max(r.created_at) AS last_seen_at,
            array_agg(DISTINCT r.source_type ORDER BY r.source_type) AS source_types,
            jsonb_agg(jsonb_build_object('source_type', r.source_type, 'source_id', r.source_id, 'page_url', r.page_url, 'title', r.title, 'video_kind', r.video_kind, 'cipher_slug', r.cipher_slug, 'series_keys', r.series_keys, 'google_indexable', r.google_indexable, 'needs_review', r.needs_review) ORDER BY r.placement_priority, r.created_at DESC NULLS LAST) AS placements
           FROM ranked r GROUP BY r.asset_key
        ), series_source AS (
         SELECT p.asset_key, s_1.s AS series_key FROM video_media_placements_v1 p CROSS JOIN LATERAL unnest(COALESCE(p.series_keys, '{}'::text[])) s_1(s)
        UNION ALL
         SELECT p.asset_key, 'torat-haremez'::text AS text FROM video_media_placements_v1 p WHERE 'torat-haremez'::text = ANY (COALESCE(p.categories, '{}'::text[]))
        ), series AS (
         SELECT series_source.asset_key, array_agg(DISTINCT series_source.series_key ORDER BY series_source.series_key) AS series_keys FROM series_source GROUP BY series_source.asset_key
        ), ciphers AS (
         SELECT p.asset_key, array_agg(DISTINCT p.cipher_slug ORDER BY p.cipher_slug) AS cipher_slugs FROM video_media_placements_v1 p WHERE p.cipher_slug IS NOT NULL GROUP BY p.asset_key
        ), topics AS (
         SELECT p.asset_key, array_agg(DISTINCT t_1.t ORDER BY t_1.t) AS topics FROM video_media_placements_v1 p CROSS JOIN LATERAL unnest(COALESCE(p.topics, '{}'::text[])) t_1(t)
          WHERE NULLIF(btrim(t_1.t), ''::text) IS NOT NULL GROUP BY p.asset_key
        )
 SELECT a.asset_key, pr.video_kind, pr.media_url, pr.youtube_id,
    COALESCE(NULLIF(pr.seo_title, ''::text), NULLIF(pr.title, ''::text), 'סרטון'::text) AS title,
    pr.poster_url, pr.thumb_url,
        CASE WHEN pr.google_indexable AND pr.dedicated_page AND pr.page_url IS NOT NULL THEN pr.page_url ELSE 'https://sod1820.co.il/video/'::text || md5(a.asset_key) END AS primary_page_url,
    pr.source_type AS primary_source_type, pr.source_id AS primary_source_id,
    (pr.video_kind = ANY (ARRAY['selfhost'::text, 'youtube'::text, 'vimeo'::text])) AND (pr.google_indexable AND pr.dedicated_page AND pr.page_url IS NOT NULL OR (COALESCE(NULLIF(btrim(pr.seo_title), ''::text), NULLIF(btrim(pr.title), ''::text), ''::text) <> ALL (ARRAY[''::text, '🎬 עדכון וידאו'::text, '📷 עדכון'::text]))) AS google_indexable,
    a.placement_count, a.google_candidate_placements, a.placement_count > 1 AS is_duplicate_asset, a.has_unresolved_placement, a.first_seen_at, a.last_seen_at, a.source_types,
        CASE WHEN c.cipher_slugs IS NOT NULL AND NOT ('cipher'::text = ANY (COALESCE(s.series_keys, '{}'::text[]))) THEN array_append(COALESCE(s.series_keys, '{}'::text[]), 'cipher'::text) ELSE COALESCE(s.series_keys, '{}'::text[]) END AS series_keys,
    COALESCE(c.cipher_slugs, '{}'::text[]) AS cipher_slugs, COALESCE(t.topics, '{}'::text[]) AS topics, a.placements, md5(a.asset_key) AS public_id,
    NOT (pr.google_indexable AND pr.dedicated_page AND pr.page_url IS NOT NULL) AS uses_generic_page
   FROM agg a JOIN ranked pr ON pr.asset_key = a.asset_key AND pr.rn = 1
     LEFT JOIN series s ON s.asset_key = a.asset_key LEFT JOIN ciphers c ON c.asset_key = a.asset_key LEFT JOIN topics t ON t.asset_key = a.asset_key;

grant select on public.video_media_assets_v1 to anon, authenticated;
insert into public.video_media_placements_v1 values
 ('post','1',now()-interval '3 day',now(),'פוסט וידאו','slug-1','selfhost','https://m.example.invalid/a.mp4',null,'p.jpg','t.jpg','https://sod1820.co.il/post/slug-1','פוסט וידאו','דובר',array['נושא א','נושא ב'],array['mah-kore-habora'],'cipher-1',array['וידאו'],10,true,true,false,'url:https://m.example.invalid/a.mp4'),
 ('home_video','7',now()-interval '2 day',now(),'אותו קובץ','slug-1','selfhost','https://m.example.invalid/a.mp4',null,'p2.jpg','t2.jpg','https://sod1820.co.il/post/slug-1','אותו קובץ',null,'{}',array['cipher'],'cipher-1','{}',30,true,true,false,'url:https://m.example.invalid/a.mp4'),
 ('channel_update','c1',now()-interval '1 day',now(),'עדכון ערוץ',null,'selfhost','https://m.example.invalid/b.mp4',null,'p3.jpg','t3.jpg',null,null,'מרצה',array['נושא ב'],array['or-geula'],null,array['or-geula'],60,false,false,false,'url:https://m.example.invalid/b.mp4'),
 ('post','2',now(),now(),'יוטיוב','slug-2','youtube','https://www.youtube.com/watch?v=abcdefghijk','abcdefghijk','p4.jpg','t4.jpg','https://sod1820.co.il/post/slug-2','יוטיוב',null,'{}','{}',null,'{}',20,true,true,false,'youtube:abcdefghijk');

-- baseline: live view answers
do $$ begin if (select count(*) from public.video_media_assets_v1) <> 3 then raise exception 'fixture view must expose 3 assets'; end if; end $$;

\i supabase/proposed/20261106140000_def003_video_assets_materialized.sql

-- 1. snapshot equals the live view, both directions, all columns
do $$
declare a int; b int;
begin
  select count(*) into a from (select * from public.video_media_assets_v1 except select * from public.video_media_assets_mv) x;
  select count(*) into b from (select * from public.video_media_assets_mv except select * from public.video_media_assets_v1) x;
  if a <> 0 or b <> 0 then raise exception 'MV differs from the view (% missing, % extra)', a, b; end if;
  if (select count(*) from public.video_media_assets_mv) <> 3 then raise exception 'MV row count'; end if;
end $$;

-- 2. indexes and scheduled refresh exist, refresh is CONCURRENT (needs the unique index)
do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'video_media_assets_mv_public_id_uidx' and indexdef ilike '%unique%') then raise exception 'unique index missing'; end if;
  if not exists (select 1 from pg_indexes where indexname = 'video_media_assets_mv_source_idx') then raise exception 'source index missing'; end if;
  if not exists (select 1 from cron.job where jobname = 'video-assets-mv-refresh' and command ilike '%concurrently%' and schedule = '*/5 * * * *') then raise exception 'refresh job missing'; end if;
end $$;
refresh materialized view concurrently public.video_media_assets_mv;

-- 3. a source change shows up after a refresh and not before (documented freshness), and the lookup uses the unique index
insert into public.video_media_placements_v1 values ('post','3',now(),now(),'חדש','slug-3','selfhost','https://m.example.invalid/c.mp4',null,'p5.jpg','t5.jpg','https://sod1820.co.il/post/slug-3','חדש',null,'{}','{}',null,'{}',20,true,true,false,'url:https://m.example.invalid/c.mp4');
do $$ begin
  if exists (select 1 from public.video_media_assets_mv where primary_source_id = '3') then raise exception 'MV must not change before a refresh'; end if;
  if not exists (select 1 from public.video_media_assets_v1 where primary_source_id = '3') then raise exception 'live view must show the new asset at once'; end if;
end $$;
refresh materialized view concurrently public.video_media_assets_mv;
do $$ begin if not exists (select 1 from public.video_media_assets_mv where primary_source_id = '3') then raise exception 'MV must show the new asset after the refresh'; end if; end $$;
set enable_seqscan = off;
do $$
declare plan text;
begin
  for plan in execute 'explain select public_id from public.video_media_assets_mv where public_id = md5(''url:https://m.example.invalid/c.mp4'')' loop
    if plan ilike '%video_media_assets_mv_public_id_uidx%' then return; end if;
  end loop;
  raise exception 'lookup by public_id does not use the unique index';
end $$;
reset enable_seqscan;

-- 4. grants: clients read, nobody writes, PUBLIC has nothing
begin;
  set local role anon;
  do $$ begin if (select count(*) from public.video_media_assets_mv) <> 4 then raise exception 'anon must read the MV'; end if; end $$;
  do $$ begin
    begin insert into public.video_media_assets_mv select * from public.video_media_assets_mv limit 1; raise exception 'anon wrote to the MV';
    exception when insufficient_privilege then null; end;
  end $$;
rollback;

-- 5. rollback leaves the original view untouched
select cron.unschedule('video-assets-mv-refresh');
drop materialized view public.video_media_assets_mv;
do $$ begin
  if (select count(*) from public.video_media_assets_v1) <> 4 then raise exception 'live view changed by the rollback'; end if;
  if exists (select 1 from cron.job where jobname = 'video-assets-mv-refresh') then raise exception 'cron job survived the rollback'; end if;
end $$;
\echo DEF-003 SQL regression: PASS
