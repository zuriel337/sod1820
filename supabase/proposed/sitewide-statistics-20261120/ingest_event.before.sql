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
  v_spec jsonb := '{"calculator_2029":{"events":["calculator_view","result_selected","first_compute","new_compute_from_share","raziel_opened","method_opened","share_created","classic_tile_opened","words_bar_pick","equals_preview_phrase_opened","shared_result_opened","ai_analysis_requested"],"fields":{"surface":"token","method":"token","entry":"token","kind":"token","channel":"token","reason":"token","from_share":"bool","has_discovery":"bool","count":"int","expression_length":"int"}},"entry_2029":{"events":"token","fields":{"entry_surface":"token","arrival":"token","concept_key":"token","layer":"token","action_id":"token","target_surface":"token","availability":"token","mode":"token","guided_id":"token","ms_bucket":"token","manifest_version":"int","step_index":"int"}},"journey_2029":{"events":"token","fields":{"journey_kind":"token","journey_mode":"token","source_surface":"token","root_type":"token","has_path":"bool"}},"share":{"events":["share"],"fields":{"platform":"token"}},"join":{"events":["click"],"fields":{"surface":"token"}},"arrival":{"events":["source"],"fields":{"source":"token","tag":"token","tagged":"bool"}},"content":{"events":["view"],"fields":{"kind":"token","item_id":"int"}},"els":{"events":["search","cross_search","ui_action","operation_started","operation_phase","operation_finished","cancel_requested"],"fields":{"kind":"token","scope":"token","skip":"int","mode":"token","region":"token","control":"token","control_index":"int","gesture":"token","operation":"token","operation_id":"token","phase":"token","outcome":"token","elapsed_ms":"int","count":"int"}}}'::jsonb;
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

$function$

