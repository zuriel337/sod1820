-- G4 admin video health: evaluate the two canonical video views once per read.
-- Based on live admin_video_map_health prosrc MD5 8d07edf915fe518ae603b401ef6d009f.
-- Preserve the live JSON contract, role check and existing publication/storage semantics.
create or replace function public.admin_video_map_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
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

  -- The canonical views are expensive. Reuse each projection within this single
  -- statement instead of evaluating assets three times and placements twice.
  with assets as materialized (
    select asset_key, google_indexable, uses_generic_page, is_duplicate_asset,
           has_unresolved_placement, cipher_slugs, series_keys, media_url, video_kind
    from public.video_media_assets_v1
  ),
  placements as materialized (
    select source_type from public.video_media_placements_v1
  ),
  asset_summary as (
    select jsonb_build_object(
      'unique_assets', count(*),
      'google_indexable_assets', count(*) filter (where google_indexable),
      'generic_google_pages', count(*) filter (where google_indexable and uses_generic_page),
      'duplicate_assets', count(*) filter (where is_duplicate_asset),
      'assets_with_unresolved_placement', count(*) filter (where has_unresolved_placement),
      'cipher_assets', count(*) filter (where cardinality(cipher_slugs) > 0),
      'mah_kore_habora_assets', count(*) filter (where 'mah-kore-habora' = any(series_keys)),
      'or_geula_assets', count(*) filter (where 'or-geula' = any(series_keys)),
      'torat_haremez_assets', count(*) filter (where 'torat-haremez' = any(series_keys)),
      'dimension_five_assets', count(*) filter (where 'dimension-five' = any(series_keys)),
      'legacy_storage_assets', count(*) filter (where media_url not like '%/sod1820/2029/video/%' and video_kind = 'selfhost'),
      'native_2029_storage_assets', count(*) filter (where media_url like '%/sod1820/2029/video/%')
    ) as payload
    from assets
  ),
  placement_count as (select count(*) as n from placements),
  source_counts as (
    select coalesce(jsonb_object_agg(source_type, n), '{}'::jsonb) as payload
    from (select source_type, count(*) as n from placements group by source_type) s
  ),
  kind_counts as (
    select coalesce(jsonb_object_agg(video_kind, n), '{}'::jsonb) as payload
    from (select video_kind, count(*) as n from assets group by video_kind) s
  ),
  series_counts as (
    select coalesce(jsonb_object_agg(series_key, n), '{}'::jsonb) as payload
    from (
      select series_key, count(distinct asset_key) as n
      from assets a cross join lateral unnest(a.series_keys) as series_key
      group by series_key
    ) s
  )
  select asset_summary.payload || jsonb_build_object('placements', placement_count.n),
         source_counts.payload, kind_counts.payload, series_counts.payload
  into v_summary, v_sources, v_kinds, v_series
  from asset_summary, placement_count, source_counts, kind_counts, series_counts;

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
$function$;

revoke all on function public.admin_video_map_health() from public, anon;
grant execute on function public.admin_video_map_health() to authenticated, service_role;
