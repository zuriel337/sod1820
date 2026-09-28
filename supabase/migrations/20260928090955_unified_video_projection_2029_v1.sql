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
    (regexp_match(coalesce(p.content,''), '(https?://[^"''[:space:]<>]+\.(?:mp4|webm|m4v)(?:\?[^"''[:space:]<>]*)?)', 'i'))[1] as direct_url,
    (regexp_match(coalesce(p.content,''), '(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{11})', 'i'))[1] as youtube_id,
    (regexp_match(coalesce(p.content,''), 'drive\.google\.com/(?:file/d/|open\?id=)([A-Za-z0-9_-]+)', 'i'))[1] as drive_id,
    (regexp_match(coalesce(p.content,''), 'vimeo\.com/(?:video/)?([0-9]{5,})', 'i'))[1] as vimeo_id,
    (regexp_match(coalesce(p.content,''), '<iframe[^>]+src=["'']([^"'']+)["'']', 'i'))[1] as iframe_url
  from public.posts p
  where not ('טיוטה'=any(coalesce(p.tags,'{}'::text[])))
    and not ('פורום'=any(coalesce(p.tags,'{}'::text[])))
),
post_rows as (
  select
    'post'::text as source_type,
    p.id::text as source_id,
    p.date as created_at,
    p.modified as updated_at,
    p.title,
    p.slug,
    case
      when p.direct_url is not null then 'selfhost'
      when p.youtube_id is not null then 'youtube'
      when p.vimeo_id is not null then 'vimeo'
      when p.drive_id is not null then 'gdrive'
      when 'וידאו'=any(coalesce(p.categories,'{}'::text[])) and p.iframe_url is not null then 'legacy_external'
      else null
    end as video_kind,
    case
      when p.direct_url is not null then regexp_replace(p.direct_url, '[?#].*$', '')
      when p.youtube_id is not null then 'https://www.youtube.com/watch?v='||p.youtube_id
      when p.vimeo_id is not null then 'https://vimeo.com/'||p.vimeo_id
      when p.drive_id is not null then 'https://drive.google.com/file/d/'||p.drive_id
      when 'וידאו'=any(coalesce(p.categories,'{}'::text[])) then p.iframe_url
      else null
    end as media_url,
    p.youtube_id,
    p.image_url as poster_url,
    p.thumb_url,
    'https://sod1820.co.il/'||p.slug as page_url,
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
    (p.direct_url is not null or p.youtube_id is not null or p.vimeo_id is not null) as google_indexable,
    p.direct_url is null and p.youtube_id is null and p.vimeo_id is null as needs_review
  from post_base p
  where p.direct_url is not null
     or p.youtube_id is not null
     or p.vimeo_id is not null
     or p.drive_id is not null
     or ('וידאו'=any(coalesce(p.categories,'{}'::text[])) and p.iframe_url is not null)
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
    case
      when c.channel='or-geula' then coalesce(c.link_url,'https://sod1820.co.il/or-geula/video/'||c.id::text)
      else c.link_url
    end as page_url,
    c.seo_title,
    c.speaker,
    coalesce(c.topics,'{}'::text[]) as topics,
    array_remove(array[
      case when c.channel='or-geula' then 'or-geula' end
    ],null)::text[] as series_keys,
    null::text as cipher_slug,
    array[c.channel]::text[] as categories,
    case when c.channel='or-geula' then 15 else 60 end as placement_priority,
    (c.channel='or-geula' or c.link_url is not null) as dedicated_page,
    (c.channel='or-geula' or c.link_url is not null) as google_indexable,
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
    case when nullif(h.slug,'') is not null then 'https://sod1820.co.il/'||h.slug end as page_url,
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
  'VIDEO_MEDIA_PROJECTION_2029_V1 placement projection over existing public source owners; no new media store/registry.';

create or replace view public.video_media_assets_v1
with (security_invoker=true)
as
with ranked as (
  select p.*,
    row_number() over (
      partition by p.asset_key
      order by case when p.google_indexable and p.dedicated_page then 0 else 1 end,
               p.placement_priority,p.created_at desc nulls last,p.source_type,p.source_id
    ) rn
  from public.video_media_placements_v1 p
),
agg as (
  select r.asset_key,count(*)::int placement_count,
    count(*) filter(where r.google_indexable and r.dedicated_page)::int google_candidate_placements,
    bool_or(r.needs_review) has_unresolved_placement,
    min(r.created_at) first_seen_at,max(r.created_at) last_seen_at,
    array_agg(distinct r.source_type order by r.source_type) source_types,
    jsonb_agg(jsonb_build_object(
      'source_type',r.source_type,'source_id',r.source_id,'page_url',r.page_url,'title',r.title,
      'video_kind',r.video_kind,'cipher_slug',r.cipher_slug,'series_keys',r.series_keys,
      'google_indexable',r.google_indexable,'needs_review',r.needs_review
    ) order by r.placement_priority,r.created_at desc nulls last) placements
  from ranked r group by r.asset_key
),
series_source as (
  select p.asset_key,s as series_key
  from public.video_media_placements_v1 p
  cross join lateral unnest(coalesce(p.series_keys,'{}'::text[])) s
  union all
  select p.asset_key,'torat-haremez'::text
  from public.video_media_placements_v1 p
  where 'torat-haremez'=any(coalesce(p.categories,'{}'::text[]))
),
series as (
  select asset_key,array_agg(distinct series_key order by series_key) series_keys
  from series_source group by asset_key
),
ciphers as (
  select p.asset_key,array_agg(distinct p.cipher_slug order by p.cipher_slug) cipher_slugs
  from public.video_media_placements_v1 p
  where p.cipher_slug is not null
  group by p.asset_key
),
topics as (
  select p.asset_key,array_agg(distinct t order by t) topics
  from public.video_media_placements_v1 p
  cross join lateral unnest(coalesce(p.topics,'{}'::text[])) t
  where nullif(btrim(t),'') is not null
  group by p.asset_key
)
select
  a.asset_key,pr.video_kind,pr.media_url,pr.youtube_id,
  coalesce(nullif(pr.seo_title,''),nullif(pr.title,''),'סרטון') as title,
  pr.poster_url,pr.thumb_url,
  case when pr.google_indexable and pr.dedicated_page and pr.page_url is not null then pr.page_url
       else 'https://sod1820.co.il/video/'||md5(a.asset_key) end as primary_page_url,
  pr.source_type as primary_source_type,
  pr.source_id as primary_source_id,
  (pr.video_kind in ('selfhost','youtube','vimeo')) as google_indexable,
  a.placement_count,a.google_candidate_placements,a.placement_count>1 as is_duplicate_asset,a.has_unresolved_placement,
  a.first_seen_at,a.last_seen_at,a.source_types,
  case when c.cipher_slugs is not null and not ('cipher'=any(coalesce(s.series_keys,'{}'::text[])))
       then array_append(coalesce(s.series_keys,'{}'::text[]),'cipher')
       else coalesce(s.series_keys,'{}'::text[]) end as series_keys,
  coalesce(c.cipher_slugs,'{}'::text[]) as cipher_slugs,
  coalesce(t.topics,'{}'::text[]) as topics,
  a.placements,
  md5(a.asset_key) as public_id,
  not (pr.google_indexable and pr.dedicated_page and pr.page_url is not null) as uses_generic_page
from agg a
join ranked pr on pr.asset_key=a.asset_key and pr.rn=1
left join series s on s.asset_key=a.asset_key
left join ciphers c on c.asset_key=a.asset_key
left join topics t on t.asset_key=a.asset_key;

comment on view public.video_media_assets_v1 is
  'VIDEO_MEDIA_PROJECTION_2029_V1 deduplicated asset projection with deterministic public id and primary Google placement.';

revoke all on public.video_media_placements_v1 from public;
revoke all on public.video_media_assets_v1 from public;
grant select on public.video_media_placements_v1 to anon,authenticated,service_role;
grant select on public.video_media_assets_v1 to anon,authenticated,service_role;

create or replace function public.admin_video_map_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt()->>'role','');
  v_summary jsonb;
  v_sources jsonb;
  v_kinds jsonb;
  v_series jsonb;
  v_cron jsonb;
  v_ai jsonb;
  v_channel jsonb;
  v_unresolved_category bigint := 0;
begin
  if v_role <> 'service_role' and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'placements',(select count(*) from public.video_media_placements_v1),
    'unique_assets',count(*),
    'google_indexable_assets',count(*) filter(where google_indexable),
    'generic_google_pages',count(*) filter(where google_indexable and uses_generic_page),
    'duplicate_assets',count(*) filter(where is_duplicate_asset),
    'assets_with_unresolved_placement',count(*) filter(where has_unresolved_placement),
    'cipher_assets',count(*) filter(where cardinality(cipher_slugs)>0),
    'mah_kore_habora_assets',count(*) filter(where 'mah-kore-habora'=any(series_keys)),
    'or_geula_assets',count(*) filter(where 'or-geula'=any(series_keys)),
    'torat_haremez_assets',count(*) filter(where 'torat-haremez'=any(series_keys)),
    'dimension_five_assets',count(*) filter(where 'dimension-five'=any(series_keys)),
    'legacy_storage_assets',count(*) filter(where media_url not like '%/sod1820/2029/video/%' and video_kind='selfhost'),
    'native_2029_storage_assets',count(*) filter(where media_url like '%/sod1820/2029/video/%')
  )
  into v_summary
  from public.video_media_assets_v1;

  select coalesce(jsonb_object_agg(source_type,n),'{}'::jsonb)
  into v_sources
  from (
    select source_type,count(*) n
    from public.video_media_placements_v1
    group by source_type order by source_type
  ) s;

  select coalesce(jsonb_object_agg(video_kind,n),'{}'::jsonb)
  into v_kinds
  from (
    select video_kind,count(*) n
    from public.video_media_assets_v1
    group by video_kind order by video_kind
  ) s;

  select coalesce(jsonb_object_agg(series_key,n),'{}'::jsonb)
  into v_series
  from (
    select series_key,count(distinct asset_key) n
    from public.video_media_assets_v1 a
    cross join lateral unnest(a.series_keys) series_key
    group by series_key order by series_key
  ) s;

  select count(*) into v_unresolved_category
  from public.posts p
  where 'וידאו'=any(coalesce(p.categories,'{}'::text[]))
    and not ('טיוטה'=any(coalesce(p.tags,'{}'::text[])))
    and not ('פורום'=any(coalesce(p.tags,'{}'::text[])))
    and not (
      coalesce(p.content,'') ~* '\.(mp4|webm|m4v)(["''[:space:]<>?]|$)'
      or coalesce(p.content,'') ~* '(youtube\.com|youtu\.be|vimeo\.com)'
      or coalesce(p.content,'') ~* 'drive\.google\.com/'
      or coalesce(p.content,'') ~* '<iframe'
    );

  begin
    select jsonb_build_object(
      'job_name',j.jobname,'schedule',j.schedule,'active',j.active,
      'last_status',x.last_status,'last_run_at',x.last_run_at,'failures_24h',coalesce(x.failures_24h,0)
    )
    into v_cron
    from cron.job j
    left join lateral (
      select
        (array_agg(d.status order by d.start_time desc))[1] last_status,
        max(d.start_time) last_run_at,
        count(*) filter(where d.status='failed' and d.start_time>now()-interval '24 hours') failures_24h
      from cron.job_run_details d where d.jobid=j.jobid
    ) x on true
    where j.jobname='video-map-enrich'
    limit 1;
  exception when others then v_cron := null;
  end;

  with usage as (
    select l.model,count(*) calls,
           coalesce(sum(l.input_tokens),0)::bigint input_tokens,
           coalesce(sum(l.output_tokens),0)::bigint output_tokens
    from public.ai_token_log l
    where l.source in ('wa-video-enrich','video-map-enrich')
      and l.created_at>now()-interval '7 days'
    group by l.model
  ),
  priced as (
    select u.*,p.usd_per_m_input,p.usd_per_m_output,p.usd_to_ils,
      ((u.input_tokens::numeric*p.usd_per_m_input)+(u.output_tokens::numeric*p.usd_per_m_output))/1000000.0 cost_usd
    from usage u
    left join lateral (
      select ap.usd_per_m_input,ap.usd_per_m_output,ap.usd_to_ils
      from public.api_pricing ap
      where ap.model=u.model and ap.valid_from<=current_date and (ap.valid_until is null or ap.valid_until>=current_date)
      order by ap.valid_from desc limit 1
    ) p on true
  )
  select jsonb_build_object(
    'calls_7d',coalesce(sum(calls),0),
    'input_tokens_7d',coalesce(sum(input_tokens),0),
    'output_tokens_7d',coalesce(sum(output_tokens),0),
    'estimated_cost_usd_7d',round(coalesce(sum(cost_usd),0),6),
    'estimated_cost_ils_7d',round(coalesce(sum(cost_usd*usd_to_ils),0),6),
    'cost_basis','ESTIMATED_FROM_API_PRICING',
    'models',coalesce(jsonb_agg(jsonb_build_object(
      'model',model,'calls',calls,'input_tokens',input_tokens,'output_tokens',output_tokens,
      'cost_usd',round(coalesce(cost_usd,0),6)
    ) order by model),'[]'::jsonb)
  )
  into v_ai
  from priced;

  select jsonb_build_object(
    'pending',count(*) filter(where enrichment_status='pending'),
    'enriched',count(*) filter(where enrichment_status='enriched'),
    'retry_stt',count(*) filter(where enrichment_status='retry_stt'),
    'with_seo_title',count(*) filter(where seo_title is not null and btrim(seo_title)<>''),
    'with_topics',count(*) filter(where cardinality(topics)>0),
    'with_speaker',count(*) filter(where speaker is not null and btrim(speaker)<>''),
    'by_channel',(
      select coalesce(jsonb_object_agg(channel,payload),'{}'::jsonb)
      from (
        select channel,jsonb_build_object(
          'videos',count(*),
          'pending',count(*) filter(where enrichment_status='pending'),
          'enriched',count(*) filter(where enrichment_status='enriched'),
          'retry_stt',count(*) filter(where enrichment_status='retry_stt'),
          'with_seo_title',count(*) filter(where seo_title is not null and btrim(seo_title)<>'')
        ) payload
        from public.channel_updates
        where channel in ('or-geula','torat-haremez')
          and status='live'
          and image_url ~* '\.(mp4|webm|m4v)(\?|$)'
        group by channel
      ) q
    )
  )
  into v_channel
  from public.channel_updates
  where channel in ('or-geula','torat-haremez')
    and status='live'
    and image_url ~* '\.(mp4|webm|m4v)(\?|$)';

  return jsonb_build_object(
    'contract','VIDEO_MEDIA_PROJECTION_2029_V1',
    'owners',jsonb_build_object(
      'projection','public.video_media_placements_v1 + public.video_media_assets_v1',
      'enrichment_worker','wa-video-enrich',
      'google','api/sitemap.js + src/lib/seo.js + /video/:assetId',
      'research_2029','src/lib/researchAdmission.js',
      'storage_2029','media/sod1820/2029/video/<YYYY>/<MM>/<asset-id>/...'
    ),
    'ai_policy',jsonb_build_object(
      'deterministic_mapping_tokens',0,
      'metadata_provider','Anthropic','metadata_model','claude-haiku-4-5',
      'metadata_token_log_source','wa-video-enrich',
      'stt_provider','OpenAI','stt_model','gpt-transcribe','stt_mode','MANUAL_ONLY','stt_runs_from_cron',false
    ),
    'summary',v_summary || jsonb_build_object('video_category_without_detectable_media',v_unresolved_category),
    'source_placements',v_sources,
    'asset_kinds',v_kinds,
    'series',v_series,
    'channel_enrichment',v_channel,
    'cron',coalesce(v_cron,'{}'::jsonb),
    'ai',coalesce(v_ai,'{}'::jsonb),
    'generated_at',now()
  );
end;
$$;

revoke all on function public.admin_video_map_health() from public,anon;
grant execute on function public.admin_video_map_health() to authenticated,service_role;

comment on function public.admin_video_map_health() is
  'VIDEO_MEDIA_PROJECTION_2029_V1 admin/service-only health + AI usage projection.';

do $$
declare v_id bigint;
begin
  select jobid into v_id from cron.job where jobname='wa-video-enrich';
  if v_id is not null then perform cron.unschedule(v_id); end if;
  select jobid into v_id from cron.job where jobname='video-map-enrich';
  if v_id is not null then perform cron.unschedule(v_id); end if;
end $$;

select cron.schedule(
  'video-map-enrich',
  '*/30 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
      from vault.decrypted_secrets
      where name='FB_ADMIN_KEY'
      order by created_at desc
      limit 1
    )
    select net.http_post(
      url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-video-enrich',
      headers:=jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body:='{"limit":8}'::jsonb,
      timeout_milliseconds:=50000
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);
