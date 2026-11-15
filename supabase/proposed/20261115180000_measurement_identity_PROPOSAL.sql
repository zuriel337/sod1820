-- Owner: traffic_intelligence_law v11; identity dependency: person_foundation_contract_law v6.
-- PROPOSAL ONLY. No new tables, grants, historical merges, or public reports.
-- Apply this file before the new website; rollback website before SQL.
-- One coordinated DDL writer; send this entire file once, no outer transaction.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
do $guard$ begin
  if exists(select 1 from pg_proc where oid in ('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure,'public.admin_2029_analytics(integer,text)'::regprocedure) and pg_get_userbyid(proowner)<>'postgres') or not has_function_privilege('anon','public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)','EXECUTE') or not has_function_privilege('authenticated','public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)','EXECUTE') or has_function_privilege('anon','public.admin_2029_analytics(integer,text)','EXECUTE') or not has_function_privilege('authenticated','public.admin_2029_analytics(integer,text)','EXECUTE') then raise exception 'measurement authority drift'; end if;
  if md5(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure)) <> 'ed1d68fee90d27818219a0c18121bace' then raise exception 'measurement definition drift: ingest_event'; end if;
  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> '8f2a62223a8da2b5ef66ca49e09a1432' then raise exception 'measurement definition drift: admin_2029_analytics'; end if;
end $guard$;
do $grants$ begin if has_table_privilege('anon','public.events','INSERT') or has_table_privilege('authenticated','public.events','INSERT') then raise exception 'direct event writes require review'; end if; end $grants$;
do $reserved$ begin if exists(select 1 from public.events where props ? '_measurement_verified' or props ? '_measurement_account') then raise exception 'reserved measurement keys already exist; review before apply'; end if; end $reserved$;
CREATE OR REPLACE FUNCTION public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text, p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint, p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb, p_is_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_person uuid;
  v_account uuid;
  v_props jsonb := p_props - '_measurement_account' - '_measurement_verified';
  m jsonb := p_props->'measurement';
  action jsonb;
  field record;
  kind text;
  v_expected text;
  v_spec jsonb := '{"calculator_2029":{"events":["calculator_view","result_selected","first_compute","new_compute_from_share","raziel_opened","method_opened","share_created","classic_tile_opened","words_bar_pick","equals_preview_phrase_opened","shared_result_opened","ai_analysis_requested"],"fields":{"surface":"token","method":"token","entry":"token","kind":"token","channel":"token","reason":"token","from_share":"bool","has_discovery":"bool","count":"int","expression_length":"int"}},"entry_2029":{"events":"token","fields":{"entry_surface":"token","arrival":"token","concept_key":"token","layer":"token","action_id":"token","target_surface":"token","availability":"token","mode":"token","guided_id":"token","ms_bucket":"token","manifest_version":"int","step_index":"int"}},"journey_2029":{"events":"token","fields":{"journey_kind":"token","journey_mode":"token","source_surface":"token","root_type":"token","has_path":"bool"}},"share":{"events":["share"],"fields":{"platform":"token"}},"join":{"events":["click"],"fields":{"surface":"token"}},"arrival":{"events":["source"],"fields":{"source":"token","tag":"token","tagged":"bool"}},"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}}}'::jsonb;
begin
  if coalesce(p_is_bot,false) then return; end if;
  if m is not null then
    -- Versioned client projection. Authentication is supplied by PostgREST,
    -- never by sod_id, a props field, an e-mail, or a client account UUID.
    if jsonb_typeof(m) is distinct from 'object' or m->'version' is distinct from '2'::jsonb
      or (select array_agg(k order by k) from jsonb_object_keys(m) k) is distinct from array['page_path','version','visitor_id']
      or jsonb_typeof(v_props) is distinct from 'object' or octet_length(v_props::text)>2000
      or p_app_context is null or p_app_context not in ('facebook','instagram','whatsapp','telegram','line','chrome-ios','edge','opera','firefox','android-webview','chrome','safari','other')
      or p_path is null or length(p_path)>512 or p_path !~ '^/([a-z0-9][a-z0-9/-]*(/:(item|value))?)?$'
      or p_sod_id is not null and p_sod_id !~ '^[a-zA-Z0-9-]{8,64}$'
      or p_session_id is not null and p_session_id !~ '^[a-zA-Z0-9-]{8,64}$'
      or m->'visitor_id' <> 'null'::jsonb and (jsonb_typeof(m->'visitor_id') <> 'string' or m->>'visitor_id' !~ '^[a-zA-Z0-9-]{8,64}$')
      or jsonb_typeof(m->'page_path') is distinct from 'string' or length(m->>'page_path')>512
      or p_ref_host is not null or p_via is not null or p_device is not null
      or p_journey_id is not null or p_depth is not null or p_utm is not null then
      raise exception 'invalid measurement envelope';
    end if;
    v_expected := m->>'page_path';
    if v_expected ~ '^/(post|tag|category|book|video)/[[:alnum:]_-]+$' and length(split_part(v_expected,'/',3))<=256 then
      v_expected := '/' || split_part(v_expected,'/',2) || '/:item';
    elsif v_expected ~ '^/number/[0-9]{1,12}$' then v_expected := '/number/:value';
    elsif v_expected <> p_path then raise exception 'invalid measurement page'; end if;
    if v_expected <> p_path or p_path ~ '^/(api|auth|admin|login|me|profile|traffic|reports|editor|edit|unsubscribe|updates|credits|buy)(/|$)'
      or p_path ~ '^/2029/(me|control|preview)(/|$)' or p_path ~ '^/community/(researcher/me|whatsapp)(/|$)' then raise exception 'private measurement page'; end if;
    v_props := v_props - 'measurement';
    if p_surface='page' and p_event_type='view' then
      if v_props <> '{}'::jsonb then raise exception 'invalid page view'; end if;
    elsif p_surface='page' and p_event_type='engagement' then
      if (select array_agg(k order by k) from jsonb_object_keys(v_props) k) is distinct from
        array['engaged_ms','engagement_version','flush_reason','idle_threshold_ms','max_scroll_pct','visible_ms']
        or v_props->'engagement_version' is distinct from '1'::jsonb
        or coalesce(v_props->>'flush_reason' not in ('route_change','pagehide'),true) then raise exception 'invalid engagement'; end if;
      foreach kind in array array['engaged_ms','visible_ms','idle_threshold_ms','max_scroll_pct'] loop
        if jsonb_typeof(v_props->kind) is distinct from 'number' or (v_props->>kind) !~ '^[0-9]+$'
          or (v_props->>kind)::numeric > 86400000 then raise exception 'invalid engagement counter'; end if;
      end loop;
      if (v_props->>'engaged_ms')::numeric > (v_props->>'visible_ms')::numeric
        or (v_props->>'max_scroll_pct')::numeric>100 or (v_props->>'idle_threshold_ms')::numeric not between 1000 and 600000 then
        raise exception 'invalid engagement bounds'; end if;
    else
      action := v_spec->p_surface;
      if action is null or p_event_type is null or v_props->'action_version' is distinct from '1'::jsonb
        or octet_length(v_props::text)>800 then raise exception 'invalid measurement action'; end if;
      if jsonb_typeof(action->'events')='array' then
        if not (action->'events') ? p_event_type then raise exception 'unknown measurement event'; end if;
      elsif p_event_type !~ '^[a-z][a-z0-9_]{0,47}$' then raise exception 'invalid event token'; end if;
      for field in select key,value from jsonb_each(v_props - 'action_version') loop
        kind := action->'fields'->>field.key;
        if kind='token' then
          if jsonb_typeof(field.value)<>'string' or (field.value #>> '{}') !~ '^[a-zA-Z0-9][a-zA-Z0-9_:.-]{0,47}$' then raise exception 'invalid action token'; end if;
        elsif kind='bool' then
          if jsonb_typeof(field.value)<>'boolean' then raise exception 'invalid action boolean'; end if;
        elsif kind='int' then
          if jsonb_typeof(field.value)<>'number' or (field.value #>> '{}') !~ '^[0-9]+$' or (field.value #>> '{}')::numeric>1000000000000 then raise exception 'invalid action integer'; end if;
        else raise exception 'unknown action field'; end if;
      end loop;
    end if;
    v_account := auth.uid();
    if v_account is not null then
      -- Same canonical persons and account lock as fn_get_or_create_my_person.
      -- No device-to-account stitching, reassignment, or historical rewrites.
      perform pg_advisory_xact_lock(hashtextextended('person_account:' || v_account::text,1820));
      select person_id into v_person from public.persons where account_user_id=v_account order by created_at asc,person_id limit 1;
      if v_person is null then
        insert into public.persons(account_user_id,first_seen,last_seen,first_source)
        values(v_account,now(),now(),'public_reading_measurement') returning person_id into v_person;
      end if;
    end if;
    -- Guests intentionally have no inferred account/person, including a shared
    -- browser that was linked historically. Browser/session identifiers remain.
    v_props := v_props || jsonb_build_object('measurement',m,'_measurement_verified',2,'_measurement_account',v_account);
  else
    -- Preserve old clients, but strip reserved attribution keys even here.
    v_person := public.resolve_person(p_sod_id,p_app_context,p_via);
  end if;
  insert into public.events(ts,sod_id,person_id,session_id,surface,event_type,path,ref_host,
    via,app_context,device,journey_id,depth_reached,utm,is_bot,props)
  values(now(),p_sod_id,v_person,p_session_id,p_surface,p_event_type,p_path,p_ref_host,
    p_via,p_app_context,p_device,p_journey_id,p_depth,p_utm,false,v_props);
end;

$function$;

CREATE OR REPLACE FUNCTION public.admin_2029_analytics(p_hours integer DEFAULT 24, p_path_prefix text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hours integer := greatest(1, least(coalesce(p_hours, 24), 24 * 90));
  v_to timestamptz := now();
  v_from timestamptz := v_to - make_interval(hours => v_hours);
  v_payload jsonb;
begin
  if not public.rd_is_admin() then
    raise exception 'not authorized';
  end if;

  with clean as (
    select *
    from public.fn_ti_clean_classification(
      (v_from at time zone 'Asia/Jerusalem')::date,
      (v_to at time zone 'Asia/Jerusalem')::date
    )
  ),
  base as (
    select
      e.event_id,
      e.ts,
      e.sod_id,
      e.person_id,
      e.session_id,
      e.surface,
      e.event_type,
      e.path,
      e.device,
      e.via,
      e.app_context,
      e.props,
      pe.account_user_id,
      u.role,
      coalesce(nullif(u.display_name,''), nullif(u.username,'')) as account_name,
      case
        when u.role = 'admin' then 'internal_admin'
        when pe.account_user_id is not null then 'known_user'
        else 'anonymous'
      end as audience_kind,
      coalesce(e.person_id::text, 'sod:' || e.sod_id) as audience_key,
      coalesce(c.clean_classification, 'unknown') as clean_classification,
      coalesce(c.clean_eligible, false) as clean_eligible
    from public.events e
    left join public.persons pe on pe.person_id = e.person_id
    left join public.users u on u.id = pe.account_user_id
    left join clean c on c.session_id = e.session_id
    where e.ts >= v_from
      and e.ts < v_to
      and (
        p_path_prefix is null
        or e.path = p_path_prefix
        or e.path like rtrim(p_path_prefix, '/') || '/%'
      )
  ),
  page_views as (
    select *
    from base
    where surface = 'page' and event_type = 'view'
  ),
  session_rollup as (
    select
      session_id,
      max(audience_kind) as audience_kind,
      max(clean_classification) as clean_classification,
      bool_or(clean_eligible) as clean_eligible
    from base
    where session_id is not null
    group by session_id
  ),
  vital_raw as (
    select *
    from base
    where surface = 'performance'
      and event_type = 'web_vital'
      and audience_kind <> 'internal_admin'
      and coalesce(props->>'vitals_version','') = '1'
      and nullif(props->>'sample_id','') is not null
  ),
  vital_samples as (
    -- One document navigation may emit one 15s checkpoint and one final row.
    -- sample_id is the document identity; the latest row wins.
    select distinct on (props->>'sample_id')
      props->>'sample_id' as sample_id,
      path,
      ts,
      device,
      clean_classification,
      props->>'phase' as phase,
      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
      case when (props->>'cls') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'cls')::double precision end as cls,
      case when (props->>'lcp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'lcp_ms')::double precision end as lcp_ms,
      case when (props->>'inp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'inp_ms')::double precision end as inp_ms,
      case when (props->>'fcp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'fcp_ms')::double precision end as fcp_ms,
      case when (props->>'ttfb_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'ttfb_ms')::double precision end as ttfb_ms
    from vital_raw
    order by
      props->>'sample_id',
      ts desc,
      case when props->>'phase' = 'final' then 1 else 0 end desc
  ),
  vital_route_rollup as (
    select
      coalesce(path,'(unknown)') as path,
      count(*)::bigint as samples,
      percentile_cont(0.75) within group (order by cls)
        filter (where cls is not null) as cls_p75,
      percentile_cont(0.75) within group (order by lcp_ms)
        filter (where lcp_ms is not null) as lcp_p75,
      percentile_cont(0.75) within group (order by inp_ms)
        filter (where inp_ms is not null) as inp_p75,
      percentile_cont(0.75) within group (order by fcp_ms)
        filter (where fcp_ms is not null) as fcp_p75,
      percentile_cont(0.75) within group (order by ttfb_ms)
        filter (where ttfb_ms is not null) as ttfb_p75,
      count(*) filter (where cls > 0.1)::bigint as cls_not_good,
      count(*) filter (where cls > 0.25)::bigint as cls_poor
    from vital_samples
    group by coalesce(path,'(unknown)')
  ),
  visitor_rollup as (
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
      max(b.account_name) as account_name,
      max(b.role) as role,
      count(*) filter (where b.surface='page' and b.event_type='view')::bigint as page_views,
      count(distinct b.session_id) filter (where b.session_id is not null)::bigint as sessions,
      coalesce(sum(
        case
          when b.event_type='engagement'
            and (b.props->>'engaged_ms') ~ '^[0-9]+$'
          then (b.props->>'engaged_ms')::bigint
          else 0
        end
      ),0)::bigint as engaged_ms,
      min(b.ts) as first_seen,
      max(b.ts) as last_seen,
      array_remove(array_agg(distinct b.device), null) as devices,
      array_agg(distinct b.clean_classification) as clean_classifications
    from base b
    where exists (
      select 1 from page_views p where p.audience_key = b.audience_key
    )
    group by b.audience_key
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'hours', v_hours,
      'from', v_from,
      'to', v_to,
      'path_prefix', p_path_prefix,
      'owner', 'traffic_intelligence_law',
      'identity_resolution', 'events.person_id -> persons.account_user_id -> users.role',
      'human_classification', 'fn_ti_clean_classification',
      'engagement_source', 'events.engagement.props.engaged_ms',
      'web_vitals_source', 'events.performance.web_vital',
      'web_vitals_scope', 'document_navigation_hard_load_rum_not_crux',
      'telemetry_identity', 'semantic_shared_not_renderer_specific',
      'legacy_analytics_changed', false
    ),
    'summary', jsonb_build_object(
      'page_views', (select count(*) from page_views),
      'people', (select count(*) from visitor_rollup),
      'sessions', (select count(*) from session_rollup),
      'identified_people', (select count(*) from visitor_rollup where account_user_id is not null),
      'anonymous_people', (select count(*) from visitor_rollup where audience_kind='anonymous'),
      'internal_admin_people', (select count(*) from visitor_rollup where audience_kind='internal_admin'),
      'external_people', (select count(*) from visitor_rollup where audience_kind <> 'internal_admin'),
      'internal_admin_page_views', (select count(*) from page_views where audience_kind='internal_admin'),
      'external_page_views', (select count(*) from page_views where audience_kind <> 'internal_admin'),
      'engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'internal_admin_engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and audience_kind='internal_admin'
                    and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'external_engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and audience_kind <> 'internal_admin'
                    and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'clean_human_sessions', (select count(*) from session_rollup where clean_classification='human'),
      'clean_unknown_sessions', (select count(*) from session_rollup where clean_classification='unknown'),
      'clean_bot_sessions', (select count(*) from session_rollup where clean_classification='bot')
    ),
    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
      'classification', jsonb_build_object(
        'human', (select count(*) from vital_samples where clean_classification='human'),
        'unknown', (select count(*) from vital_samples where clean_classification='unknown'),
        'bot', (select count(*) from vital_samples where clean_classification='bot')
      ),
      'p75', jsonb_build_object(
        'cls', (
          select percentile_cont(0.75) within group (order by cls)
          from vital_samples where cls is not null
        ),
        'lcp_ms', (
          select percentile_cont(0.75) within group (order by lcp_ms)
          from vital_samples where lcp_ms is not null
        ),
        'inp_ms', (
          select percentile_cont(0.75) within group (order by inp_ms)
          from vital_samples where inp_ms is not null
        ),
        'fcp_ms', (
          select percentile_cont(0.75) within group (order by fcp_ms)
          from vital_samples where fcp_ms is not null
        ),
        'ttfb_ms', (
          select percentile_cont(0.75) within group (order by ttfb_ms)
          from vital_samples where ttfb_ms is not null
        )
      ),
      'good_rate_pct', jsonb_build_object(
        'cls', (
          select round((
            100.0 * count(*) filter (where cls is not null and cls <= 0.1)
            / nullif(count(cls),0)
          )::numeric, 1)
          from vital_samples
        ),
        'lcp', (
          select round((
            100.0 * count(*) filter (where lcp_ms is not null and lcp_ms <= 2500)
            / nullif(count(lcp_ms),0)
          )::numeric, 1)
          from vital_samples
        ),
        'inp', (
          select round((
            100.0 * count(*) filter (where inp_ms is not null and inp_ms <= 200)
            / nullif(count(inp_ms),0)
          )::numeric, 1)
          from vital_samples
        )
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
        'cls_poor_above', 0.25,
        'lcp_good_max_ms', 2500,
        'lcp_poor_above_ms', 4000,
        'inp_good_max_ms', 200,
        'inp_poor_above_ms', 500
      ),
      'routes', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'path', r.path,
            'samples', r.samples,
            'cls_p75', r.cls_p75,
            'lcp_p75_ms', r.lcp_p75,
            'inp_p75_ms', r.inp_p75,
            'fcp_p75_ms', r.fcp_p75,
            'ttfb_p75_ms', r.ttfb_p75,
            'cls_not_good', r.cls_not_good,
            'cls_poor', r.cls_poor
          )
          order by coalesce(r.cls_p75,0) desc, r.samples desc, r.path
        )
        from (
          select *
          from vital_route_rollup
          order by coalesce(cls_p75,0) desc, samples desc, path
          limit 20
        ) r
      ), '[]'::jsonb),
      'latest_cls_issue', (
        select jsonb_build_object(
          'path', v.path,
          'cls', v.cls,
          'phase', v.phase,
          'at', v.ts,
          'sources', coalesce(v.cls_shift_sources, '[]'::jsonb)
        )
        from vital_samples v
        where v.cls > 0.1
        order by v.ts desc
        limit 1
      )
    ),
    'visitors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'audience_kind', v.audience_kind,
          'person_id', v.person_id,
          'account_user_id', v.account_user_id,
          'account_name', v.account_name,
          'role', v.role,
          'page_views', v.page_views,
          'sessions', v.sessions,
          'engaged_ms', v.engaged_ms,
          'first_seen', v.first_seen,
          'last_seen', v.last_seen,
          'devices', to_jsonb(v.devices),
          'clean_classifications', to_jsonb(v.clean_classifications),
          'paths', (
            select coalesce(jsonb_agg(
              jsonb_build_object('path', x.path, 'views', x.views)
              order by x.views desc, x.path
            ), '[]'::jsonb)
            from (
              select p.path, count(*)::bigint as views
              from page_views p
              where p.audience_key = v.audience_key
              group by p.path
              order by views desc, p.path
              limit 8
            ) x
          )
        )
        order by v.last_seen desc
      )
      from (
        select * from visitor_rollup order by last_seen desc limit 100
      ) v
    ), '[]'::jsonb)
  ) into v_payload;

  -- Only server-stamped v2 rows belong to this forward-only report. Legacy
  -- anonymous rows are not guessed into people/sessions and are never rewritten.
  with measured as (
    select e.*, e.props->>'_measurement_account' as account_id,
      e.props->'measurement'->>'visitor_id' as browser_id,
      e.props->'measurement'->>'page_path' as page_path,
      case when e.props->>'_measurement_account' is not null then 'account:' || (e.props->>'_measurement_account')
        when e.props->'measurement'->>'visitor_id' is not null then 'browser:' || (e.props->'measurement'->>'visitor_id') end as audience
    from public.events e where e.ts >= v_from and e.ts < v_to and not e.is_bot
      and e.props->'_measurement_verified' = '2'::jsonb
      and (p_path_prefix is null or e.path=p_path_prefix or e.path like rtrim(p_path_prefix,'/')||'/%')
  ), visits as (
    select * from measured where surface='page' and event_type='view'
  ), people as (
    select audience, max(account_id) as account_id, count(distinct browser_id) as browsers,
      count(distinct session_id) as sessions,
      count(*) filter(where surface='page' and event_type='view') as views,
      count(*) filter(where surface not in ('page','arrival')) as actions,
      sum(case when surface='page' and event_type='engagement' then (props->>'engaged_ms')::bigint else 0 end) as engaged_ms,
      max(ts) as last_seen
    from measured where audience is not null group by audience
  )
  select v_payload || jsonb_build_object('identified_traffic',jsonb_build_object(
    'version',2,'source','events','timezone','Asia/Jerusalem','from',v_from,'to',v_to,
    'first_event',(select min(ts) from measured),
    'summary',jsonb_build_object('views',(select count(*) from visits),
      'sessions',(select count(distinct session_id) from measured),
      'browsers',(select count(distinct browser_id) from measured),
      'accounts',(select count(distinct account_id) from measured),
      'actions',(select count(*) from measured where surface not in ('page','arrival')),
      'unidentified_events',(select count(*) from measured where audience is null)),
    'pages',coalesce((select jsonb_agg(to_jsonb(x) order by views desc,page_path) from
      (select page_path,count(*) as views from visits group by page_path order by views desc,page_path limit 40) x),'[]'::jsonb),
    'arrivals',coalesce((select jsonb_agg(to_jsonb(x) order by sessions desc,source) from
      (select props->>'source' as source,count(distinct session_id) as sessions from measured
       where surface='arrival' and event_type='source' group by props->>'source' order by sessions desc,source limit 20) x),'[]'::jsonb),
    'actions',coalesce((select jsonb_agg(to_jsonb(x) order by count desc,surface,event_type) from
      (select surface,event_type,count(*) as count from measured where surface not in ('page','arrival')
       group by surface,event_type order by count desc,surface,event_type limit 40) x),'[]'::jsonb),
    'visitors',coalesce((select jsonb_agg(to_jsonb(x) order by last_seen desc,audience) from
      (select p.*, coalesce(nullif(u.display_name,''),nullif(u.username,'')) as account_name,
        (select jsonb_agg(to_jsonb(q) order by views desc,page_path) from
          (select v.page_path,count(*) as views from visits v where v.audience=p.audience group by v.page_path order by views desc,v.page_path limit 8) q) as pages
       from people p left join public.users u on u.id::text=p.account_id order by p.last_seen desc,p.audience limit 100) x),'[]'::jsonb)
  )) into v_payload;

  return v_payload;
end;
$function$;

commit;
