-- DEF-003 DB step - PROPOSED (needs explicit ZURIEL approval: new production relation + pg_cron job; no existing object is altered or dropped).
--
-- Measured 2026-11-06 (read-only EXPLAIN ANALYZE): one read of public.video_media_assets_v1 costs 1.29 s because the view recomputes every video
-- placement (regexp scans over ~1,300 posts, 14.6k buffer hits, window functions) on each query. Production: 2,311 asset rows, 2,384 placements,
-- ~2.8 MB of result data. The view is security_invoker=true (owner postgres) and contains only public-content columns.
--
-- Solution: a materialized snapshot of the unchanged view, indexed for the two access paths (by public_id, and by source for sitemap/search),
-- refreshed every 5 minutes without blocking readers. NOTHING reads it until the code switch SOD_VIDEO_ASSETS_MV=1 is set (api/og.js; the code
-- falls back to the live view on "relation missing", on an empty answer — i.e. a video newer than the last refresh — and never on other errors).
--
-- Impact: data = a copy (~3 MB incl. indexes); cost = one 1.3 s refresh per 5 min (~0.4 % of one CPU core), well below the current per-request cost
-- (about 2.6 s of DB time per /video page view today); freshness = up to 5 min for asset metadata (the page still re-validates the source row —
-- status, expiry, page_only — on every request, so a stale snapshot cannot publish something the source no longer allows).
-- Semantics note: the snapshot is built by the owner and therefore sees channel_updates rows that anon RLS would hide once `expires_at` passed; that
-- gate is repeated in fetchPublicVideo2029 (source.expires_at), so such an asset is still refused. The live view keeps full anon semantics.
-- RLS cannot be attached to a materialized view; its columns are the same non-sensitive public columns the view already returns to anon.
--
-- Rollback (lossless, nothing depends on the MV):
--   select cron.unschedule('video-assets-mv-refresh');
--   drop materialized view public.video_media_assets_mv;
--   (and unset SOD_VIDEO_ASSETS_MV; with the variable unset the code never touches the MV)

create materialized view if not exists public.video_media_assets_mv as
  select * from public.video_media_assets_v1
with no data;

-- required for REFRESH ... CONCURRENTLY; public_id = md5(asset_key) is unique per asset
create unique index if not exists video_media_assets_mv_public_id_uidx on public.video_media_assets_mv (public_id);
-- sitemap / search path: google_indexable = true ordered by last_seen_at
create index if not exists video_media_assets_mv_indexable_idx on public.video_media_assets_mv (last_seen_at desc) where google_indexable;
-- source gate lookups (primary_source_type + primary_source_id)
create index if not exists video_media_assets_mv_source_idx on public.video_media_assets_mv (primary_source_type, primary_source_id);

revoke all on public.video_media_assets_mv from public;
grant select on public.video_media_assets_mv to anon, authenticated, service_role;

refresh materialized view public.video_media_assets_mv;   -- first population (blocking, ~1.3 s, nothing reads it yet)
analyze public.video_media_assets_mv;

select cron.schedule('video-assets-mv-refresh', '*/5 * * * *', $cron$refresh materialized view concurrently public.video_media_assets_mv$cron$);
