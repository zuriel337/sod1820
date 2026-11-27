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
  t0 timestamptz; t1 timestamptz; res jsonb; load jsonb;
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
