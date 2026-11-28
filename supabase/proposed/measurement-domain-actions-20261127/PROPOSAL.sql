-- PROPOSAL ONLY - NOT APPLIED (S3, 27.11.2026). Needs ZURIEL's explicit approval for this exact file AND contract v14 (MEASURED ACTION TRIAD, measurement-reliability-20261127/CONTRACT_V14.md).
-- Adds ONE admin-only read-side producer in the Traffic Intelligence family, over tables and events that already exist: no collection, no new table, no new event.
-- Why: registration, sign-in, community messages, reactions, subscriptions, push and issue reports happen in DOMAIN tables and produce no analytics event (coverage map rows S02..S05, S07).
-- Counts only, settled Jerusalem days (today excluded). No identity, no text, no per-person row. Heavy-visitor load is a distribution (shares), never an identifier and never a classification.
-- Admin-only: the wrapper checks the caller is an administrator (the same check as the feedback read policy); anyone else gets {"state":"forbidden"}.
\set ON_ERROR_STOP on
begin;
do $pre$ begin
  if to_regclass('public.events') is null or to_regclass('auth.users') is null or to_regclass('public.research_contributions') is null
     or to_regclass('public.subscribers') is null or to_regclass('public.subscribe_events') is null or to_regclass('public.push_subscriptions') is null
     or to_regclass('public.feedback') is null or to_regclass('public.users') is null or to_regprocedure('public.fn_ti_clean_classification(date,date)') is null then
    raise exception 'domain-actions: a dependency is missing';
  end if;
  if to_regprocedure('public.fn_ti_domain_actions2029(text)') is not null or to_regprocedure('public.research_domain_actions_2029(text)') is not null then
    raise exception 'domain-actions: already applied';
  end if;
end $pre$;

create function public.fn_ti_domain_actions2029(p_window text default 'week')
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  w text := case when p_window in ('day','week','month') then p_window else 'week' end;
  to_d date := (now() at time zone 'Asia/Jerusalem')::date;
  from_d date := ((now() at time zone 'Asia/Jerusalem')::date) - (case when p_window='day' then 1 when p_window='month' then 30 else 7 end);
  t0 timestamptz; t1 timestamptz; res jsonb; load jsonb; silence jsonb;
begin
  t0 := from_d::timestamp at time zone 'Asia/Jerusalem'; t1 := to_d::timestamp at time zone 'Asia/Jerusalem';
  with clean as materialized (select session_id, clean_classification from public.fn_ti_clean_classification(from_d, to_d)),
  v as (select coalesce(e.sod_id, e.session_id) vid, e.session_id, e.person_id from public.events e join clean c using(session_id)
        where e.ts >= t0 and e.ts < t1 and not e.is_bot and e.surface='page' and e.event_type='view' and c.clean_classification='human'),
  per as (select vid, count(*) views from v group by 1),
  tot as (select coalesce(sum(views),0) total_views, count(*) visitors from per),
  top as (select views, row_number() over (order by views desc) rk from per)
  select jsonb_build_object(
    'visitors',(select visitors from tot),
    'sessions',(select count(distinct session_id) from v),
    'identified_persons',(select count(distinct person_id) from v where person_id is not null),
    'views',(select total_views from tot),
    -- distribution only: how concentrated the views are. No identifier. NEVER a bot or suspicion signal.
    'top1_share_pct',(select case when (select total_views from tot)>0 then round(100.0*coalesce(max(views),0)/(select total_views from tot),1) end from top where rk=1),
    'top3_share_pct',(select case when (select total_views from tot)>0 then round(100.0*coalesce(sum(views),0)/(select total_views from tot),1) end from top where rk<=3)
  ) into load;
  res := jsonb_build_object('version',1,'window',w,'from',from_d,'to',to_d-1,'timezone','Asia/Jerusalem','state','measured',
    'registrations',(select count(*) from auth.users where created_at >= t0 and created_at < t1),
    'signed_in_users',(select count(*) from auth.users where last_sign_in_at >= t0 and last_sign_in_at < t1),
    'community_messages',(select count(*) from public.research_contributions where origin='community_2029' and created_at >= t0 and created_at < t1),
    'contributions',(select count(*) from public.research_contributions where coalesce(origin,'')<>'community_2029' and created_at >= t0 and created_at < t1),
    'messages_with_reactions',(select count(*) from public.research_contributions where origin='community_2029' and created_at >= t0 and created_at < t1 and reactions is not null and reactions::text not in ('{}','null','[]')),
    'subscribers',(select count(*) from public.subscribers where created_at >= t0 and created_at < t1),
    'subscribe_events',(select count(*) from public.subscribe_events where created_at >= t0 and created_at < t1),
    'push_subscriptions',(select count(*) from public.push_subscriptions where created_at >= t0 and created_at < t1),
    'issue_reports',(select count(*) from public.feedback where context='issue_report' and created_at >= t0 and created_at < t1),
    'visitor_load',load,
    'coverage','counts from the domain tables (the truth of each action); aggregated, no identity, no text; load shares are a distribution and never a classification');
  -- EXPECTED BUT NOT ARRIVING (S3, 27.11.2026): the events the system is built to receive (docs/reviews/measurement-closure-20261127/expected-events.json) that had
  -- NO arrival in the last 30 days, with the last day one was seen (a day, never a time). A preserved capability (stories, journey) is listed as "preserved, not active": never a failure.
  with cat(surface,event_type,status) as (values
    ('page','view','expected'),
    ('page','engagement','expected'),
    ('arrival','source','expected'),
    ('performance','web_vital','expected'),
    ('content','view','expected'),
    ('calculator_2029','calculator_view','expected'),
    ('calculator_2029','result_selected','expected'),
    ('calculator_2029','first_compute','expected'),
    ('calculator_2029','new_compute_from_share','expected'),
    ('calculator_2029','raziel_opened','expected'),
    ('calculator_2029','method_opened','expected'),
    ('calculator_2029','share_created','expected'),
    ('calculator_2029','classic_tile_opened','expected'),
    ('calculator_2029','words_bar_pick','expected'),
    ('calculator_2029','equals_preview_phrase_opened','expected'),
    ('calculator_2029','shared_result_opened','expected'),
    ('calculator_2029','ai_analysis_requested','expected'),
    ('activity_2029','typing','expected'),
    ('activity_2029','search','expected'),
    ('activity_2029','compute','expected'),
    ('activity_2029','select','expected'),
    ('activity_2029','save','expected'),
    ('activity_2029','view','expected'),
    ('els','search','expected'),
    ('els','cross_search','expected'),
    ('els','ui_action','expected'),
    ('els','operation_started','expected'),
    ('els','operation_phase','expected'),
    ('els','operation_finished','expected'),
    ('els','cancel_requested','expected'),
    ('entry_2029','orientation_shown','expected'),
    ('entry_2029','orientation_expanded','expected'),
    ('entry_2029','orientation_dismissed','expected'),
    ('entry_2029','first_action','expected'),
    ('entry_2029','exact_return','expected'),
    ('entry_2029','post_media_open','expected'),
    ('entry_2029','post_number_open','expected'),
    ('entry_2029','post_source_open','expected'),
    ('entry_2029','post_source_check_open','expected'),
    ('entry_2029','post_writer_open','expected'),
    ('entry_2029','learn_opened','expected'),
    ('entry_2029','learn_layer','expected'),
    ('entry_2029','learn_help_requested','expected'),
    ('entry_2029','example_tried','expected'),
    ('entry_2029','method_tried','expected'),
    ('entry_2029','continued_to_research','expected'),
    ('share','share','expected'),
    ('join','click','expected'),
    ('video_2029','play_requested','expected'),
    ('video_2029','player_ready','expected'),
    ('video_2029','embed_refused','expected'),
    ('video_2029','watch_opened','expected'),
    ('app_health','save_started','awaiting_release'),
    ('app_health','save_confirmed','awaiting_release'),
    ('app_health','save_failed','awaiting_release'),
    ('app_health','auth_failed','awaiting_release'),
    ('app_health','load_failed','awaiting_release'),
    ('app_health','runtime_error','awaiting_release'),
    ('nav_2029','number_link_open','awaiting_release'),
    ('nav_2029','panel_open','awaiting_release'),
    ('nav_2029','panel_close','awaiting_release'),
    ('nav_2029','search_submit','awaiting_release'),
    ('nav_2029','share_bar_open','awaiting_release'),
    ('nav_2029','media_play','awaiting_release'),
    ('nav_2029','gallery_open','awaiting_release'),
    ('nav_2029','study_action','awaiting_release'),
    ('item_2029','view','awaiting_release'),
    ('calc_outcome_2029','ai_analysis_result','awaiting_release'),
    ('calc_outcome_2029','compute_failed','awaiting_release'),
    ('calc_outcome_2029','compute_empty','awaiting_release'),
    ('calc_outcome_2029','equals_preview_shown','awaiting_release'),
    ('calc_outcome_2029','equals_preview_all_opened','awaiting_release'),
    ('story_2029','impression','preserved'),
    ('story_2029','viewer_open','preserved'),
    ('story_2029','item_view','preserved'),
    ('story_2029','next','preserved'),
    ('story_2029','prev','preserved'),
    ('story_2029','close','preserved'),
    ('story_2029','complete','preserved'),
    ('journey_2029','start','preserved'),
    ('journey_2029','step','preserved'),
    ('journey_2029','save','preserved'),
    ('journey_2029','resume','preserved'),
    ('journey_2029','fork','preserved'),
    ('activity_2029','share','preserved')),
  seen as (select e.surface,e.event_type,count(*) filter (where e.ts >= now() - interval '30 days') as n30,max(e.ts)::date as last_day
    from public.events e where e.ts >= now() - interval '120 days' and not e.is_bot and (e.surface,e.event_type) in (select surface,event_type from cat) group by 1,2)
  select coalesce(jsonb_agg(jsonb_build_object('surface',c.surface,'event',c.event_type,'status',c.status,'last_seen',s.last_day) order by c.status,c.surface,c.event_type) filter (where coalesce(s.n30,0)=0),'[]'::jsonb)
    into silence from cat c left join seen s on s.surface=c.surface and s.event_type=c.event_type;
  res := res || jsonb_build_object('expected_silence',silence,'expected_catalog_size',(select count(*) from (values (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29),(30),(31),(32),(33),(34),(35),(36),(37),(38),(39),(40),(41),(42),(43),(44),(45),(46),(47),(48),(49),(50),(51),(52),(53),(54),(55),(56),(57),(58),(59),(60),(61),(62),(63),(64),(65),(66),(67),(68),(69),(70),(71),(72),(73),(74),(75),(76),(77),(78),(79),(80),(81),(82),(83),(84)) v));
  return res;
end $fn$;
revoke all on function public.fn_ti_domain_actions2029(text) from public, anon, authenticated;

create function public.research_domain_actions_2029(p_window text default 'week')
returns jsonb language sql security definer set search_path to 'public','pg_temp' as
$w$ select case when exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
       then public.fn_ti_domain_actions2029(case when p_window in ('day','week','month') then p_window else 'week' end)
       else jsonb_build_object('version',1,'state','forbidden') end $w$;
revoke all on function public.research_domain_actions_2029(text) from public, anon;
grant execute on function public.research_domain_actions_2029(text) to authenticated;

do $post$ begin
  if has_function_privilege('anon','public.fn_ti_domain_actions2029(text)','execute') or has_function_privilege('authenticated','public.fn_ti_domain_actions2029(text)','execute')
     or has_function_privilege('anon','public.research_domain_actions_2029(text)','execute')
     or not has_function_privilege('authenticated','public.research_domain_actions_2029(text)','execute') then
    raise exception 'domain-actions: grant drift after apply';
  end if;
end $post$;
commit;
