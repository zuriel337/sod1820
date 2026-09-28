-- G3_2029_VIDEO_SEARCH_CUTOVER_V1
-- 2029 FIRST: Legacy remains source/provenance only. Public video landing identity
-- converges on the 2029 runtime: /post/:slug when a Post owns the placement,
-- otherwise the unified /video/:assetId fallback.
-- UNIFIED_VIDEO_PROJECTION_2029_V1
-- One read-only projection over existing public video owners. No new Media store/registry.
-- Asset identity is deterministic from the public media locator; placements remain owned by Posts,
-- WhatsApp channel_updates, home_videos and stories. 2029 Research/Google project from this layer.

create or replace view public.video_media_placements_v1
with (security_invoker=true)
as
with post_base as (
  select
    p.*,
    (regexp_match(coalesce(p.content,''), '<iframe[^>]+src=["'']([^"'']+)["'']', 'i'))[1] as iframe_url
  from public.posts p
  where not ('טיוטה'=any(coalesce(p.tags,'{}'::text[])))
    and not ('פורום'=any(coalesce(p.tags,'{}'::text[])))
),
post_media_raw as (
  select
    p.id as post_id,
    'selfhost'::text as video_kind,
    regexp_replace(m[1], '[?#].*$', '') as media_url,
    null::text as youtube_id
  from post_base p
  cross join lateral regexp_matches(
    coalesce(p.content,''),
    '(https?://[^"''[:space:]<>]+\.(?:mp4|webm|m4v)(?:\?[^"''[:space:]<>]*)?)',
    'gi'
  ) m

  union all

  select
    p.id,
    'youtube',
    'https://www.youtube.com/watch?v='||m[1],
    m[1]
  from post_base p
  cross join lateral regexp_matches(
    coalesce(p.content,''),
    '(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{11})',
    'gi'
  ) m

  union all

  select
    p.id,
    'vimeo',
    'https://vimeo.com/'||m[1],
    null::text
  from post_base p
  cross join lateral regexp_matches(
    coalesce(p.content,''),
    'vimeo\.com/(?:video/)?([0-9]{5,})',
    'gi'
  ) m

  union all

  select
    p.id,
    'gdrive',
    'https://drive.google.com/file/d/'||m[1],
    null::text
  from post_base p
  cross join lateral regexp_matches(
    coalesce(p.content,''),
    'drive\.google\.com/(?:file/d/|open\?id=)([A-Za-z0-9_-]+)',
    'gi'
  ) m
),
post_media_refs as (
  select distinct post_id,video_kind,media_url,youtube_id
  from post_media_raw

  union all

  select
    p.id,
    'legacy_external'::text,
    p.iframe_url,
    null::text
  from post_base p
  where 'וידאו'=any(coalesce(p.categories,'{}'::text[]))
    and p.iframe_url is not null
    and not exists (select 1 from post_media_raw r where r.post_id=p.id)
),
post_rows as (
  select
    'post'::text as source_type,
    p.id::text as source_id,
    p.date as created_at,
    p.modified as updated_at,
    p.title,
    p.slug,
    r.video_kind,
    r.media_url,
    r.youtube_id,
    p.image_url as poster_url,
    p.thumb_url,
    'https://sod1820.co.il/post/'||p.slug as page_url,
    p.title as seo_title,
    p.author as speaker,
    coalesce(p.tags,'{}'::text[]) as topics,
    array_remove(array[
      case when 'מה קורה הבורא'=any(coalesce(p.tags,'{}'::text[])) then 'mah-kore-habora' end,
      case when 'מימד חמש'=any(coalesce(p.categories,'{}'::text[])) then 'dimension-five' end
    ],null)::text[] as series_keys,
    p.cipher_slug,
    coalesce(p.categories,'{}'::text[]) as categories,
    case when 'וידאו'=any(coalesce(p.categories,'{}'::text[])) then 10 else 20 end as placement_priority,
    true as dedicated_page,
    (r.video_kind in ('selfhost','youtube','vimeo')) as google_indexable,
    (r.video_kind not in ('selfhost','youtube','vimeo')) as needs_review
  from post_base p
  join post_media_refs r on r.post_id=p.id
),
channel_rows as (
  select
    'channel_update'::text as source_type,
    c.id::text as source_id,
    c.created_at,
    c.enriched_at as updated_at,
    coalesce(nullif(c.seo_title,''),nullif(c.text,''),'סרטון') as title,
    null::text as slug,
    'selfhost'::text as video_kind,
    regexp_replace(c.image_url,'[?#].*$','') as media_url,
    null::text as youtube_id,
    c.thumb_url as poster_url,
    c.thumb_url,
    null::text as page_url,
    c.seo_title,
    c.speaker,
    coalesce(c.topics,'{}'::text[]) as topics,
    array_remove(array[
      case when c.channel='or-geula' then 'or-geula' end
    ],null)::text[] as series_keys,
    null::text as cipher_slug,
    array[c.channel]::text[] as categories,
    60 as placement_priority,
    false as dedicated_page,
    false as google_indexable,
    false as needs_review
  from public.channel_updates c
  where c.status='live'
    and c.image_url ~* '\.(mp4|webm|m4v)(\?|$)'
),
home_rows as (
  select
    'home_video'::text as source_type,
    h.id::text as source_id,
    h.created_at,
    h.updated_at,
    h.title,
    h.slug,
    case when nullif(h.video_url,'') is not null then 'selfhost' else 'youtube' end as video_kind,
    case
      when nullif(h.video_url,'') is not null then regexp_replace(h.video_url,'[?#].*$','')
      when nullif(h.yt,'') is not null then 'https://www.youtube.com/watch?v='||h.yt
      else null
    end as media_url,
    h.yt as youtube_id,
    h.poster_url,
    h.poster_url as thumb_url,
    case when nullif(h.slug,'') is not null then 'https://sod1820.co.il/post/'||h.slug end as page_url,
    h.title as seo_title,
    null::text as speaker,
    '{}'::text[] as topics,
    array_remove(array[
      case when h.cipher_slug is not null then 'cipher' end
    ],null)::text[] as series_keys,
    h.cipher_slug,
    '{}'::text[] as categories,
    30 as placement_priority,
    nullif(h.slug,'') is not null as dedicated_page,
    nullif(h.slug,'') is not null as google_indexable,
    false as needs_review
  from public.home_videos h
  where h.is_active=true
    and (nullif(h.video_url,'') is not null or nullif(h.yt,'') is not null)
),
story_rows as (
  select
    'story'::text as source_type,
    s.id::text as source_id,
    s.created_at,
    s.created_at as updated_at,
    s.title,
    null::text as slug,
    'selfhost'::text as video_kind,
    regexp_replace(s.video_url,'[?#].*$','') as media_url,
    null::text as youtube_id,
    s.image_url as poster_url,
    s.image_url as thumb_url,
    case
      when s.link ~ '^https?://' then s.link
      when s.link is not null then 'https://sod1820.co.il'||case when s.link like '/%' then s.link else '/'||s.link end
      else null
    end as page_url,
    s.title as seo_title,
    null::text as speaker,
    '{}'::text[] as topics,
    '{}'::text[] as series_keys,
    null::text as cipher_slug,
    '{}'::text[] as categories,
    70 as placement_priority,
    s.link is not null as dedicated_page,
    false as google_indexable,
    false as needs_review
  from public.stories s
  where s.active=true and nullif(s.video_url,'') is not null
),
all_rows as (
  select * from post_rows
  union all select * from channel_rows
  union all select * from home_rows
  union all select * from story_rows
)
select
  source_type,source_id,created_at,updated_at,title,slug,video_kind,media_url,youtube_id,poster_url,thumb_url,page_url,
  seo_title,speaker,topics,series_keys,cipher_slug,categories,placement_priority,dedicated_page,google_indexable,needs_review,
  case
    when video_kind='youtube' and youtube_id is not null then 'youtube:'||youtube_id
    when video_kind='vimeo' then 'vimeo:'||regexp_replace(media_url,'.*/','','g')
    when video_kind='gdrive' then 'gdrive:'||regexp_replace(media_url,'.*/','','g')
    when video_kind='legacy_external' then 'external:'||md5(media_url)
    when media_url is not null then 'url:'||regexp_replace(media_url,'[?#].*$','')
    else source_type||':'||source_id
  end as asset_key
from all_rows
where media_url is not null;


comment on view public.video_media_placements_v1 is
  'G3_2029_VIDEO_SEARCH_CUTOVER_V1: placements project existing sources into 2029 product routes; Legacy routes are not primary landing identities.';
