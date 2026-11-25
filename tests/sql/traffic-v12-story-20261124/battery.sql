-- One battery of ingest_event calls; each run is recorded per phase (before / after_v12 / after_rollback).
create table t_cases (n int primary key, kind text, label text, surface text, event_type text, props jsonb, measured boolean,
  headers text default null, is_bot boolean default false);
create table t_results (phase text, n int, outcome text, rows_added int, primary key (phase, n));
insert into t_cases (n, kind, label, surface, event_type, props, measured, headers, is_bot) values
 (1,'existing','page view','page','view','{}',true,null,false),
 (2,'existing','page engagement','page','engagement','{"engaged_ms":5000,"visible_ms":9000,"idle_threshold_ms":30000,"max_scroll_pct":40,"engagement_version":1,"flush_reason":"pagehide"}',true,null,false),
 (3,'existing','calculator view','calculator_2029','calculator_view','{"action_version":1,"surface":"home","count":3}',true,null,false),
 (4,'existing','calculator unknown event','calculator_2029','nope','{"action_version":1}',true,null,false),
 (5,'existing','content view','content','view','{"action_version":1,"kind":"post","item_id":12}',true,null,false),
 (6,'existing','entry token event','entry_2029','door_open','{"action_version":1,"entry_surface":"home"}',true,null,false),
 (7,'existing','share','share','share','{"action_version":1,"platform":"copy"}',true,null,false),
 (8,'existing','journey start','journey_2029','start','{"action_version":1,"journey_kind":"name"}',true,null,false),
 (9,'existing','els search','els','search','{"action_version":1,"kind":"term","count":2}',true,null,false),
 (10,'existing','activity with address','activity_2029','compute','{"action_version":1,"operation_id":"11111111-1111-4111-8111-111111111111","number":26}',true,'{"cf-connecting-ip":"1.2.3.4"}',false),
 (11,'existing','activity same operation again','activity_2029','compute','{"action_version":1,"operation_id":"11111111-1111-4111-8111-111111111111","number":26}',true,'{"cf-connecting-ip":"1.2.3.4"}',false),
 (12,'existing','activity without address','activity_2029','compute','{"action_version":1,"operation_id":"22222222-2222-4222-8222-222222222222"}',true,null,false),
 (13,'existing','legacy client (no envelope)','performance','lcp','{"value":1200}',false,null,false),
 (14,'existing','bot dropped','page','view','{}',true,null,true),
 (15,'existing','page view with extra props','page','view','{"item_ref":"x"}',true,null,false),
 (16,'existing','private page refused','page','view','{}',true,null,false),
 (21,'story','story impression','story_2029','impression','{"action_version":1,"content_world":"or_geula","entry_surface":"chat","item_ref":"1e777c07-fb3b-446b-bd60-91a5bb94bd77","index":0}',true,null,false),
 (22,'story','story viewer_open','story_2029','viewer_open','{"action_version":1,"content_world":"or_geula","entry_surface":"chat"}',true,null,false),
 (23,'story','story item_view','story_2029','item_view','{"action_version":1,"content_world":"or_geula","entry_surface":"chat","item_ref":"1e777c07-fb3b-446b-bd60-91a5bb94bd77","index":0,"dwell_ms":4200}',true,null,false),
 (24,'story','story next','story_2029','next','{"action_version":1,"entry_surface":"chat","index":1}',true,null,false),
 (25,'story','story prev','story_2029','prev','{"action_version":1,"entry_surface":"chat","index":0}',true,null,false),
 (26,'story','story close','story_2029','close','{"action_version":1,"entry_surface":"chat"}',true,null,false),
 (27,'story','story complete','story_2029','complete','{"action_version":1,"entry_surface":"chat"}',true,null,false),
 (31,'story-refused','story named view','story_2029','view','{"action_version":1,"entry_surface":"chat"}',true,null,false),
 (32,'story-refused','story named open','story_2029','open','{"action_version":1,"entry_surface":"chat"}',true,null,false),
 (33,'story-refused','story with a title','story_2029','item_view','{"action_version":1,"title":"x"}',true,null,false),
 (34,'story-refused','story with free text token','story_2029','item_view','{"action_version":1,"item_ref":"שלום עולם"}',true,null,false),
 (35,'story-refused','story with index as text','story_2029','item_view','{"action_version":1,"index":"2"}',true,null,false),
 (36,'story-refused','story with an e-mail','story_2029','item_view','{"action_version":1,"email":"a@b.c"}',true,null,false),
 (37,'story-refused','story without action_version','story_2029','item_view','{"entry_surface":"chat"}',true,null,false),
 (38,'story-refused','story with page_view type','story_2029','page_view','{"action_version":1}',true,null,false);

create function t_run(p_phase text) returns void language plpgsql as $$
declare c record; v_before bigint; v_after bigint; v_out text; v_props jsonb; v_path text;
begin
  for c in select * from t_cases order by n loop
    v_path := case when c.n = 16 then '/me' else '/community/chat' end;
    v_props := case when c.measured then c.props || jsonb_build_object('measurement', jsonb_build_object('version', 2, 'visitor_id', 'v1234567', 'page_path', v_path)) else c.props end;
    if v_props ? 'operation_id' then  -- a fresh operation per phase (the dedupe window is 2 days, across sessions)
      v_out := md5(p_phase || (v_props->>'operation_id'));
      v_props := v_props || jsonb_build_object('operation_id', substr(v_out,1,8)||'-'||substr(v_out,9,4)||'-4'||substr(v_out,14,3)||'-8'||substr(v_out,18,3)||'-'||substr(v_out,21,12));
    end if;
    perform set_config('request.headers', coalesce(c.headers, ''), true);
    select count(*) into v_before from public.events;
    begin
      perform public.ingest_event(case when c.measured then null else 'sod12345' end, c.surface, c.event_type, v_path, null, null,
        'chrome', null, 's-' || replace(p_phase, '_', '-') || '-' || c.n, null, null, null, v_props, c.is_bot);
      v_out := 'ok';
    exception when others then v_out := 'refused: ' || sqlerrm;
    end;
    select count(*) into v_after from public.events;
    insert into t_results values (p_phase, c.n, v_out, v_after - v_before);
  end loop;
end $$;

-- The live session readers' own expressions (fn_human_entrances / fn_ti_session_metrics, read 24.11.2026), over one session.
create function t_session(p_session text) returns table (views bigint, page_views bigint, interactions bigint, page_bounce boolean)
language sql as $$
  select count(*) filter (where event_type='view'),
         count(*) filter (where surface='page' and event_type='view'),
         count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')),
         (count(*) filter (where surface='page' and event_type='view') = 1
          and count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')) = 0)
  from public.events where session_id = p_session $$;
