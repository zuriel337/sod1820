-- behaviour assertions run on a scratch DB after the migration. Any failure raises and aborts.
do $$
declare r jsonb; n int;
begin
  -- dead-man: no data at all -> alert (no-data != healthy)
  perform public.fn_health_watch();
  select count(*) into n from work_log where topic like '%ingest אירועים%'; assert n = 1, 'no-data must alert';
  assert exists (select 1 from analytics_cache where cache_key='reliability_heartbeat:health_watch'), 'heartbeat written';
  -- canary/runtime_error/issue_report rows do NOT prove ingest alive
  insert into events(surface,event_type,sod_id,session_id,props) values ('canary','pass','c','c','{}'),('runtime_error','window_error','r','r','{"message":"x"}'),('x','issue_report','i','i','{}');
  delete from work_log; perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%ingest אירועים%'; assert n = 1, 'excluded surfaces must not count as alive';
  -- fresh normal event within threshold -> no dead-man alert; 60m gap (<90) still no alert
  insert into events(surface,event_type,sod_id,session_id,ts) values ('home','view','a','a', now() - interval '60 minutes');
  delete from work_log; perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%ingest אירועים%'; assert n = 0, '60m gap is inside measured threshold';
  delete from events where surface='home'; insert into events(surface,event_type,sod_id,session_id,ts) values ('home','view','a','a', now() - interval '100 minutes');
  delete from work_log; perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%ingest אירועים%'; assert n = 1, '100m gap alerts';
  perform public.fn_reliability_watch();  -- dedupe 3h
  select count(*) into n from work_log where topic like '%ingest אירועים%'; assert n = 1, 'dead-man deduped';
  -- runtime_error incident: 5 sessions -> work_log + notify_admin + suggestion; privacy stripped
  delete from work_log; delete from notify_log; delete from events;
  insert into events(surface,event_type,sod_id,session_id,props) select 'runtime_error','window_error','s'||g,'s'||g, jsonb_build_object('message','boom at https://x.co/p?token=SECRETSECRETSECRETSECRETSECRET12345 mail a@b.com') from generate_series(1,5) g;
  insert into events(surface,event_type,sod_id,session_id) values ('home','view','a','a');
  perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%תקרית-ריצה%'; assert n = 1, 'incident logged';
  select count(*) into n from notify_log where t like '%תקרית-ריצה%'; assert n = 1, 'incident reaches notify_admin';
  select count(*) into n from suggestions_log where detector='runtime_error_incident'; assert n = 1, 'incident reaches system_suggestions';
  select count(*) into n from work_log where what_we_did ~ 'SECRET|a@b\.com|token='; assert n = 0, 'no payload leakage';
  select count(*) into n from notify_log where t ~ 'SECRET|a@b\.com|token='; assert n = 0, 'no payload leakage in notify';
  perform public.fn_reliability_watch(); select count(*) into n from work_log where topic like '%תקרית-ריצה%'; assert n = 1, 'incident deduped 6h';
  -- 4 sessions is below threshold; bots ignored
  delete from work_log; delete from events;
  insert into events(surface,event_type,sod_id,session_id,props) select 'runtime_error','window_error','s'||g,'s'||g,'{"message":"few"}' from generate_series(1,4) g;
  insert into events(surface,event_type,sod_id,session_id,props,is_bot) select 'runtime_error','window_error','b'||g,'b'||g,'{"message":"few"}',true from generate_series(1,20) g;
  insert into events(surface,event_type,sod_id,session_id) values ('home','view','a','a');
  perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%תקרית-ריצה%'; assert n = 0, 'below threshold / bots ignored';
  -- IssueReport (event_type=issue_report) reaches the same incident tree with 2 sessions
  delete from events; insert into events(surface,event_type,sod_id,session_id,props) values ('checkout','issue_report','u1','u1','{"message":"login broken"}'),('checkout','issue_report','u2','u2','{"message":"login broken"}'),('home','view','a','a',null);
  perform public.fn_reliability_watch();
  select count(*) into n from work_log where topic like '%תקרית-ריצה%'; assert n = 1, 'issue_report reaches incident path';
  -- canary gate
  r := public.fn_release_canary_gate(null); assert (r->>'allowed')='false' and r->>'reason'='no_canary_evidence', 'missing evidence blocks';
  begin perform public.fn_release_canary_report('abc','1','https://github.com/zuriel337/sod1820/actions/runs/1',true); assert false; exception when others then assert sqlerrm like 'sha must%', 'bad sha rejected'; end;
  begin perform public.fn_release_canary_report(repeat('a',40),'1','https://evil.example/x',true); assert false; exception when others then assert sqlerrm like 'run_url%', 'foreign run url rejected'; end;
  perform public.fn_release_canary_report(repeat('a',40),'11','https://github.com/zuriel337/sod1820/actions/runs/11',false,'["home_200"]');
  r := public.fn_release_canary_gate(repeat('a',40)); assert r->>'reason'='latest_canary_failed' and (r->>'allowed')='false', 'failed canary blocks next release';
  select count(*) into n from work_log where topic like '%Canary פרודקשן נכשל%'; assert n = 1, 'failure alerts';
  perform public.fn_release_canary_report(repeat('a',40),'12','https://github.com/zuriel337/sod1820/actions/runs/12',true);
  r := public.fn_release_canary_gate(repeat('a',40)); assert (r->>'allowed')='true', 'exact-sha success allows';
  r := public.fn_release_canary_gate(repeat('b',40)); assert r->>'reason'='canary_not_for_current_production_sha', 'sha mismatch blocks';
  begin perform public.fn_release_canary_override('short'); assert false; exception when others then assert sqlerrm like 'override needs%', 'override needs reason'; end;
  perform public.fn_release_canary_override('Human Gate ZURIEL: explicit release despite canary mismatch, audited', 1);
  r := public.fn_release_canary_gate(repeat('b',40)); assert r->>'reason'='human_gate_override' and (r->>'allowed')='true', 'override explicit';
  select count(*) into n from work_log where topic like '%override%'; assert n = 1, 'override audited';
  -- synthetic budget <=4/day for scheduled/manual; deploy always allowed
  r := public.fn_release_canary_slot('scheduled'); r := public.fn_release_canary_slot('scheduled'); r := public.fn_release_canary_slot('manual'); r := public.fn_release_canary_slot('scheduled');
  assert (r->>'allowed')='true' and (r->>'used')='4', 'fourth allowed';
  r := public.fn_release_canary_slot('scheduled'); assert (r->>'allowed')='false', 'fifth scheduled blocked';
  r := public.fn_release_canary_slot('deploy'); assert (r->>'allowed')='true', 'deploy evidence run allowed';
  -- deploy_on_request v3 extends v2, v2 deactivated
  assert (select count(*) from nodes where rule_id='deploy_on_request' and is_active)=1 and (select rule_version from nodes where rule_id='deploy_on_request' and is_active)=3, 'v3 active';
  assert (select description from nodes where rule_id='deploy_on_request' and rule_version=3) like 'v2 text%fn_release_canary_gate%', 'v3 extends v2 verbatim';
end $$;
-- ACL: not callable by anon/authenticated, callable by service_role
do $$ begin
  assert not has_function_privilege('anon','public.fn_release_canary_report(text,text,text,boolean,jsonb,text)','execute'), 'anon blocked';
  assert not has_function_privilege('authenticated','public.fn_release_canary_gate(text)','execute'), 'authenticated blocked';
  assert not has_function_privilege('authenticated','public.fn_reliability_watch()','execute'), 'watch internal';
  assert has_function_privilege('service_role','public.fn_release_canary_gate(text)','execute'), 'service_role allowed';
end $$;
