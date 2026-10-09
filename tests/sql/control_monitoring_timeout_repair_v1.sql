-- Throwaway-local-Postgres test for 20261009030000_control_monitoring_timeout_repair_v1.sql.
-- Synthetic stubs only; never run against a live project.
create schema auth; create schema cron; create schema storage;
create function auth.role() returns text language sql as $$ select coalesce(current_setting('t.role', true),'service_role') $$;
create function auth.jwt() returns jsonb language sql as $$ select jsonb_build_object('role', coalesce(current_setting('t.role', true),'service_role')) $$;
create function public.rd_is_admin() returns boolean language sql as $$ select coalesce(current_setting('t.admin', true),'false')::boolean $$;
create table cron.job(jobid bigint primary key, jobname text, schedule text default '* * * * *', active boolean default true);
create table cron.job_run_details(runid bigserial primary key, jobid bigint, status text, start_time timestamptz);
create table storage.objects(bucket_id text, metadata jsonb);
create table public.research_objects(id serial primary key, source_ref text);
create table public.channel_updates(id uuid primary key default gen_random_uuid(), status text, created_at timestamptz default now(), image_url text, thumb_url text, channel text, seo_title text, text text, enriched_at timestamptz, speaker text, topics text[], enrichment_status text);
create table public.wa_bot_log(id bigint primary key, created_at timestamptz default now());
create table public.wa_deep_queue(id bigint primary key, created_at timestamptz default now());
create table public.wa_vip_inbox(id bigint primary key, created_at timestamptz default now());
create table public.wa_msg_ext(id bigint primary key, created_at timestamptz default now());
create table public.wa_message_status(id bigint primary key, incoming_at timestamp default now());
create table public.visitor_events(created_at timestamptz default now());
create table public.site_visits(ts timestamptz default now());
create table public.work_log(created_at timestamptz default now(), archived boolean, superseded_by_id uuid);
create table public.events(created_at timestamptz) partition by range (created_at);
create table public.events_default partition of public.events default;
create table public.bot_outbox(status text);
create table public.media_migration_queue(status text, size bigint);
create table public.gallery_images(published int, curator_hidden boolean, thumb_url text, image_url text);
create table public.analytics_cache(cache_key text, computed_at timestamptz, payload jsonb);
create table public.security_alerts(acked boolean, ts timestamptz);
create table public.agent_token_costs(cost_usd numeric, created_at timestamptz);
create table public.vercel_usage_estimate(est_vercel_bandwidth_mb numeric, day date);
create table public.ai_token_log(model text, source text, input_tokens int, output_tokens int, created_at timestamptz);
create table public.api_pricing(model text, usd_per_m_input numeric, usd_per_m_output numeric, usd_to_ils numeric, valid_from date, valid_until date);
create table public.posts(categories text[], tags text[], content text);
-- stub assets/placements views with the columns the function reads
create table _pl(source_type text, source_id text, asset_key text, series_keys text[], cipher_slug text, kind text, media_url text, gi boolean, generic boolean, unresolved boolean);
create view public.video_media_placements_v1 as select * from _pl;
create view public.video_media_assets_v1 as
  select asset_key, min(kind) video_kind, min(media_url) media_url, bool_or(gi) google_indexable, bool_or(generic) uses_generic_page,
         count(*)>1 is_duplicate_asset, bool_or(unresolved) has_unresolved_placement,
         coalesce(array_agg(distinct cipher_slug) filter (where cipher_slug is not null),'{}') cipher_slugs,
         coalesce((select array_agg(distinct s) from _pl q, unnest(q.series_keys) s where q.asset_key=p.asset_key),'{}') series_keys,
         count(*)::int placement_count,
         jsonb_agg(jsonb_build_object('source_type',source_type,'source_id',source_id)) placements
  from _pl p group by asset_key;

\i supabase/migrations/20261009030000_control_monitoring_timeout_repair_v1.sql

-- synthetic data
insert into public.channel_updates(id,status) values
 ('00000000-0000-0000-0000-000000000001','live'),('00000000-0000-0000-0000-000000000002','draft'),
 ('00000000-0000-0000-0000-000000000003','draft'),('00000000-0000-0000-0000-000000000004',null);
insert into public.wa_bot_log(id) select g from generate_series(1,30) g;
insert into public.wa_deep_queue(id) select g from generate_series(1,15) g;
insert into public.research_objects(source_ref) values
 ('channel_updates:00000000-0000-0000-0000-000000000002'),
 ('channel_updates:00000000-0000-0000-0000-000000000003#frag'),
 ('channel_updates:short'),
 ('wa_bot_log:1'),('wa_bot_log:12#x'),('wa_bot_log:2+wa_bot_log:3+wa_deep_queue:4'),('x+wa_bot_log:5'),
 ('wa_bot_log:07'),('wa_bot_log:13x'),('twa_bot_log:9'),('wa_deep_queue:1+wa_deep_queue:15'),(null);
insert into cron.job values (1,'gallery-thumbs'),(2,'post-thumbs'),(3,'video-map-enrich'),(4,'wa-x'),(5,'idle');
insert into cron.job_run_details(jobid,status,start_time) values
 (1,'succeeded',now()-interval '3 hours'),(1,'failed',now()-interval '1 hour'),(1,'failed',now()-interval '30 hours'),
 (2,'succeeded',now()-interval '2 hours'),(3,'failed',now()-interval '5 minutes'),(4,'succeeded',now());
insert into _pl values
 ('post','1','a','{mah-kore-habora}',null,'selfhost','http://x/sod1820/2029/video/1',true,false,false),
 ('channel_update','u','a','{or-geula}','c1','selfhost','http://x/sod1820/2029/video/1',false,true,true),
 ('home_video','h','b','{}',null,'youtube','yt',true,true,false),
 ('story','s','c','{torat-haremez}',null,'selfhost','http://old/v.mp4',false,false,false);

do $t$
declare r jsonb; o int; nn int; bad int;
begin
  -- 1) retention parity: ORIGINAL correlated expressions vs the new set-membership forms
  select count(*) filter (where status in ('live','published','active') or exists (select 1 from public.research_objects ro where ro.source_ref like ('channel_updates:'||c.id::text||'%'))),
         count(*) filter (where coalesce(status,'') not in ('live','published','active') and not exists (select 1 from public.research_objects ro where ro.source_ref like ('channel_updates:'||c.id::text||'%')))
    into o, nn from public.channel_updates c;
  select * into r from (select public.admin_retention_preview() j) q;
  assert (select (e->>'protected_rows')::int from jsonb_array_elements(r->'tables') e where e->>'table_name'='channel_updates') = o, 'channel_updates protected parity';
  assert (select (e->>'unknown_dependency_rows')::int from jsonb_array_elements(r->'tables') e where e->>'table_name'='channel_updates') = nn, 'channel_updates unknown parity';
  foreach r in array array['"wa_bot_log"'::jsonb,'"wa_deep_queue"'::jsonb] loop
    execute format($q$select count(*) filter (where exists (select 1 from public.research_objects ro where ro.source_ref ~ ('(^|[+])%1$s:' || t.id::text || '(#|[+]|$)'))),
                             count(*) filter (where not exists (select 1 from public.research_objects ro where ro.source_ref ~ ('(^|[+])%1$s:' || t.id::text || '(#|[+]|$)'))) from public.%1$s t$q$, trim(both '"' from r::text)) into o, nn;
    assert (select (e->>'protected_rows')::int from jsonb_array_elements(public.admin_retention_preview()->'tables') e where e->>'table_name'=trim(both '"' from r::text)) = o, 'protected parity '||r;
    assert (select (e->>'unknown_dependency_rows')::int from jsonb_array_elements(public.admin_retention_preview()->'tables') e where e->>'table_name'=trim(both '"' from r::text)) = nn, 'unknown parity '||r;
  end loop;
  assert (select (e->>'purge_candidates')::int from jsonb_array_elements(public.admin_retention_preview()->'tables') e where e->>'table_name'='wa_bot_log') = 0;
  assert (public.admin_retention_preview()->>'delete_authorized')::boolean = false;

  -- 2) health: cron/thumb_cron parity with ORIGINAL per-job lateral form
  r := public.admin_system_health();
  select count(*) into bad from (
    select j.jobname, lr.last_status, lr.last_run_at, coalesce(lr.failures_24h,0) f
    from cron.job j left join lateral (select (array_agg(d.status order by d.start_time desc))[1] last_status, max(d.start_time) last_run_at,
         count(*) filter (where d.status='failed' and d.start_time>now()-interval '24 hours') failures_24h from cron.job_run_details d where d.jobid=j.jobid) lr on true
  ) x where not exists (select 1 from jsonb_array_elements(r->'cron') c where c->>'job_name'=x.jobname and c->>'last_status' is not distinct from x.last_status
        and (c->>'last_run_at')::timestamptz is not distinct from x.last_run_at and (c->>'failures_24h')::bigint = x.f);
  assert bad = 0, 'cron parity';
  assert jsonb_array_length(r->'cron') = 5 and jsonb_array_length(r->'media'->'thumb_cron') = 2, 'cron counts';
  assert (r->'retention'->>'tables_assessed')::int >= 4 and r->'retention'->>'error' is null, 'retention summary';

  -- 3) video: summary/sources/kinds/series parity with ORIGINAL direct-view queries
  r := public.admin_video_map_health();
  assert (r->'summary'->>'placements')::int = (select count(*) from public.video_media_placements_v1), 'placements';
  assert (r->'summary'->>'unique_assets')::int = (select count(*) from public.video_media_assets_v1), 'unique';
  assert (r->'summary'->>'duplicate_assets')::int = (select count(*) from public.video_media_assets_v1 where is_duplicate_asset), 'dups';
  assert r->'source_placements' = (select jsonb_object_agg(source_type,cnt) from (select source_type,count(*) cnt from public.video_media_placements_v1 group by 1) s), 'sources';
  assert r->'asset_kinds' = (select jsonb_object_agg(video_kind,cnt) from (select video_kind,count(*) cnt from public.video_media_assets_v1 group by 1) s), 'kinds';
  assert r->'series' = (select jsonb_object_agg(k,cnt) from (select k,count(distinct asset_key) cnt from public.video_media_assets_v1 a cross join lateral unnest(a.series_keys) k group by 1) s), 'series';

  -- 4) guards preserved: non-admin authenticated is rejected by all three
  perform set_config('t.role','authenticated',false); perform set_config('t.admin','false',false);
  begin perform public.admin_retention_preview(); assert false,'retention open'; exception when others then assert sqlerrm='not authorized', sqlerrm; end;
  begin perform public.admin_system_health(); assert false,'health open'; exception when others then assert sqlerrm='not authorized', sqlerrm; end;
  begin perform public.admin_video_map_health(); assert false,'video open'; exception when others then assert sqlerrm='not authorized', sqlerrm; end;
  perform set_config('t.admin','true',false);
  perform public.admin_retention_preview();
  raise notice 'ALL PARITY + GUARD CHECKS PASSED';
end $t$;
