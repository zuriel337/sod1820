\set ON_ERROR_STOP on
\i live_rule_v11_20261124.sql
\i base.sql
\i cl16.sql
\i stubs.sql
\i live_ingest_event_20261124.sql
\i battery.sql
\pset pager off
\echo == LIVE COPY CHECK (must equal live: guard 90b5917b, ingest_event 1b0f1f4b, v11 525452c0, v11 meta 888a9535)
do $c$ begin
  if md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure)) <> '90b5917b1412be02f66d1f805241018c'
     or md5(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure)) <> '1b0f1f4bb05d0424df3a54f28f385fc1'
     or (select md5(description) from nodes where rule_id='traffic_intelligence_law' and is_active) <> '525452c03d65967626336d65ac95cf83'
     or (select md5(metadata::text) from nodes where rule_version=11) <> '888a9535b14a3439a20ab28c3e15148f' then
    raise exception 'the fixtures are not the exact live copy'; end if; end $c$;
select md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'::regprocedure)) guard,
       md5(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure)) ingest,
       (select md5(description) from nodes where rule_id='traffic_intelligence_law' and is_active) law,
       (select md5(metadata::text) from nodes where rule_version=11) law_meta;
create table t_fn (phase text, md5 text, acl text, secdef boolean, config text);
insert into t_fn select 'before', md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text,'(default: PUBLIC)'), p.prosecdef, p.proconfig::text from pg_proc p where proname='ingest_event';
select t_run('before');

\echo == APPLY v12 (the exact migration file, guards untouched)
\i migration.sql
insert into t_fn select 'after_v12', md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text,'(default: PUBLIC)'), p.prosecdef, p.proconfig::text from pg_proc p where proname='ingest_event';
select rule_version v, is_active, supersedes_version sup, md5(description) text_md5, left(description, 22832) = (select description from nodes where rule_version=11) starts_with_v11,
  metadata ? 'story_2029_v1' story_meta, metadata #>> '{story_2029_v1,event_types}' types, (metadata->'rule_guard') guard_stamp
  from nodes where rule_id='traffic_intelligence_law' order by rule_version;
select t_run('after_v12');

\echo == ONE SESSION: page view + every story event (session readers must still see 1 view, 0 interactions, a bounce)
select public.ingest_event(null,'page','view','/or-geula',null,null,'chrome',null,'s-reader',null,null,null,'{"measurement":{"version":2,"visitor_id":"v1234567","page_path":"/or-geula"}}'::jsonb,false);
select public.ingest_event(null,'story_2029',t,'/or-geula',null,null,'chrome',null,'s-reader',null,null,null,
  jsonb_build_object('action_version',1,'entry_surface','or_geula','measurement',jsonb_build_object('version',2,'visitor_id','v1234567','page_path','/or-geula'))
  ,false) from unnest(array['impression','viewer_open','item_view','next','prev','close','complete']) t;
select 'renamed (as proposed)' names, * from t_session('s-reader');
\echo -- counter-example: the same session if the story events had been named view/open (rows written directly, never through ingest_event)
insert into public.events(session_id,surface,event_type,props) values ('s-old','page','view','{}'),
  ('s-old','story_2029','impression','{}'),('s-old','story_2029','open','{}'),('s-old','story_2029','view','{}');
select 'original names view/open' names, * from t_session('s-old');

\echo == APPLY v12 AGAIN (must be refused, nothing changes)
\set ON_ERROR_STOP off
\i migration.sql
\set ON_ERROR_STOP on
select count(*) filter (where is_active) active, max(rule_version) max_v from nodes where rule_id='traffic_intelligence_law';

\echo == ROLLBACK (the exact proposed file)
\i rollback.sql
insert into t_fn select 'after_rollback', md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text,'(default: PUBLIC)'), p.prosecdef, p.proconfig::text from pg_proc p where proname='ingest_event';
select rule_version v, is_active, supersedes_version sup, md5(description) text_md5, left(description, 22832) = (select description from nodes where rule_version=11) starts_with_v11,
  metadata ? 'story_2029_withdrawn_v1' withdrawn, (metadata->'rule_guard') is not null guard_stamp from nodes where rule_id='traffic_intelligence_law' order by rule_version;
select t_run('after_rollback');
\echo == ROLLBACK AGAIN (must be refused)
\set ON_ERROR_STOP off
\i rollback.sql
\echo == v12 AFTER ROLLBACK (must be refused: the law is no longer v11)
\i migration.sql
\set ON_ERROR_STOP on
select count(*) filter (where is_active) active, max(rule_version) max_v, (select md5(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure))) ingest from nodes where rule_id='traffic_intelligence_law';
\echo == story rows written while v12 was active are kept
select count(*) story_rows from events where surface='story_2029';

\echo == FUNCTION: md5 / grants / security definer / search_path per phase
select * from t_fn order by phase;
\echo == RESULTS per case and phase
select c.n, c.kind, c.label,
  b.outcome || ' (+' || b.rows_added || ')' before, a.outcome || ' (+' || a.rows_added || ')' after_v12, r.outcome || ' (+' || r.rows_added || ')' after_rollback
from t_cases c join t_results b on b.n=c.n and b.phase='before' join t_results a on a.n=c.n and a.phase='after_v12'
join t_results r on r.n=c.n and r.phase='after_rollback' order by c.n;
\echo == VERDICTS
select
  bool_and(a.outcome = b.outcome and a.rows_added = b.rows_added) filter (where c.kind='existing') existing_unchanged_v12,
  bool_and(r.outcome = b.outcome and r.rows_added = b.rows_added) filter (where c.kind='existing') existing_unchanged_rollback,
  bool_and(a.outcome = 'ok' and a.rows_added = 1) filter (where c.kind='story') story_admitted_once_each,
  bool_and(b.outcome like 'refused%' and r.outcome like 'refused%' and b.rows_added = 0 and r.rows_added = 0) filter (where c.kind='story') story_refused_before_and_after_rollback,
  bool_and(a.outcome like 'refused%' and a.rows_added = 0) filter (where c.kind='story-refused') bad_story_refused,
  bool_and(b.rows_added <= 1 and a.rows_added <= 1 and r.rows_added <= 1) at_most_one_row_per_call
from t_cases c join t_results b on b.n=c.n and b.phase='before' join t_results a on a.n=c.n and a.phase='after_v12' join t_results r on r.n=c.n and r.phase='after_rollback';

do $v$ declare v record; begin
  select
    bool_and(a.outcome = b.outcome and a.rows_added = b.rows_added) filter (where c.kind='existing') e1,
    bool_and(r.outcome = b.outcome and r.rows_added = b.rows_added) filter (where c.kind='existing') e2,
    bool_and(a.outcome = 'ok' and a.rows_added = 1) filter (where c.kind='story') s1,
    bool_and(b.outcome like 'refused%' and r.outcome like 'refused%' and b.rows_added = 0 and r.rows_added = 0) filter (where c.kind='story') s2,
    bool_and(a.outcome like 'refused%' and a.rows_added = 0) filter (where c.kind='story-refused') s3,
    bool_and(b.rows_added <= 1 and a.rows_added <= 1 and r.rows_added <= 1) one
  into v from t_cases c join t_results b on b.n=c.n and b.phase='before' join t_results a on a.n=c.n and a.phase='after_v12' join t_results r on r.n=c.n and r.phase='after_rollback';
  if not (v.e1 and v.e2 and v.s1 and v.s2 and v.s3 and v.one) then raise exception 'battery verdict failed: %', v; end if;
  if (select views from t_session('s-reader')) <> 1 or (select interactions from t_session('s-reader')) <> 0 or not (select page_bounce from t_session('s-reader')) then
    raise exception 'story events changed the session readers'; end if;
  if (select md5 from t_fn where phase='after_rollback') <> '1b0f1f4bb05d0424df3a54f28f385fc1'
     or (select count(distinct acl || secdef::text || config) from t_fn) <> 1 then raise exception 'ingest_event not restored exactly'; end if;
  if (select count(*) from nodes where rule_id='traffic_intelligence_law' and is_active) <> 1
     or (select rule_version from nodes where rule_id='traffic_intelligence_law' and is_active) <> 13
     or (select left(description, 22832) from nodes where rule_id='traffic_intelligence_law' and is_active) <> (select description from nodes where rule_version=11) then
    raise exception 'rollback did not leave v13 with the exact v11 text'; end if;
end $v$;
\echo traffic_v12_story: PASS
