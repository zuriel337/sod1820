-- DEF-005 regression for the PROPOSED grants change, on a DISPOSABLE PostgreSQL. Fixture functions carry the production default (PUBLIC execute).
-- Revised 12.11.2026 (M0): DEF-005 = the twelve system functions; the other fifteen 6.11 names are the optional DEF-005b file.
\set ON_ERROR_STOP on
\set QUIET on
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create table public.sink (v text);
grant insert, select on public.sink to anon, authenticated, service_role;

-- every function named by the migration, plus the ones that must stay public and the INVOKER dependent of fn_els_search
do $$
declare n text;
begin
  foreach n in array array['check_security_spike','fn_detect_pattern_contradictions','fn_detect_patterns','fn_raziel_claims_gc','fn_rls_grant_audit','fn_scan_reeval',
    'snapshot_seo_wave','refresh_traffic_daily','enqueue_word_review','trusted_contributor_uids','push_sub_count','fn_metatron_gaps','fn_metatron_status',
    'fn_cohort_acceptance','fn_decision_reeval_check','contrib_unlock','record_feedback','vote_translit','log_translit_query','increment_post_share_by_slug',
    'log_edge_geo','fn_outbox_bump','fn_raziel_claim','router_rate_check','blocked_countries','ai_quota_check','fn_edge_grant_audit',
    'ingest_event','track_visit','log_crawl','log_edge','log_security','log_journey_ab','log_journey_save','fn_log_name_research','recent_number_opens',
    'propose_community_word','lang_link_add','ai_signal','increment_post_share','add_wall_word','save_wall_word_private','fn_els_search','community_feed_page']
  loop
    execute format('create function public.%I() returns int language sql security definer set search_path = public as $f$ select 1 $f$', n);
  end loop;
end $$;
create function public.log_edge_geo(p_country text) returns void language sql security definer set search_path = public as $$ insert into public.sink values (p_country) $$;
-- INVOKER function that calls fn_els_search (as fn_els_for_name does in production): must keep working for anon
create function public.fn_els_for_name_stub() returns int language sql security invoker as $$ select public.fn_els_search() $$;
grant execute on function public.fn_els_for_name_stub() to anon, authenticated;

create function pg_temp.can(p_role text, p_sig text) returns boolean language sql as $$ select has_function_privilege(p_role, p_sig::regprocedure, 'EXECUTE') $$;

-- baseline: everything is executable by anon (the production default)
do $$ begin
  if not (pg_temp.can('anon', 'public.check_security_spike()') and pg_temp.can('anon', 'public.snapshot_seo_wave()') and pg_temp.can('anon', 'public.log_edge_geo(text)'))
    then raise exception 'BASELINE: fixture must reproduce PUBLIC execute'; end if;
end $$;

\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql

-- DEF-005 (M0): the twelve system functions - no client role; service_role keeps them
do $$
declare n text; sig text;
begin
  foreach n in array array['fn_edge_grant_audit','fn_rls_grant_audit','check_security_spike','snapshot_seo_wave','fn_detect_patterns',
    'fn_detect_pattern_contradictions','fn_scan_reeval','fn_outbox_bump','fn_raziel_claim','fn_raziel_claims_gc','ai_quota_check','router_rate_check']
  loop
    sig := format('public.%I()', n);
    if pg_temp.can('anon', sig) then raise exception 'DEF-005: anon can still execute %', n; end if;
    if pg_temp.can('authenticated', sig) then raise exception 'DEF-005: authenticated can still execute %', n; end if;
    if not pg_temp.can('service_role', sig) then raise exception 'DEF-005: service_role lost %', n; end if;
  end loop;
  -- the optional names are untouched by DEF-005 itself
  foreach n in array array['refresh_traffic_daily','enqueue_word_review','trusted_contributor_uids','push_sub_count','fn_metatron_gaps','fn_metatron_status',
    'fn_cohort_acceptance','fn_decision_reeval_check','contrib_unlock','record_feedback','vote_translit','log_translit_query','increment_post_share_by_slug','blocked_countries']
  loop
    if not pg_temp.can('anon', format('public.%I()', n)) then raise exception 'DEF-005 must not touch optional %', n; end if;
  end loop;
  if not pg_temp.can('anon', 'public.log_edge_geo(text)') then raise exception 'DEF-005 must not touch optional log_edge_geo'; end if;
end $$;

\i supabase/proposed/20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql

-- DEF-005b (optional): the fifteen uncalled helpers - no client role; service_role keeps them
do $$
declare n text; sig text;
begin
  foreach n in array array['refresh_traffic_daily','enqueue_word_review','trusted_contributor_uids','push_sub_count','fn_metatron_gaps','fn_metatron_status',
    'fn_cohort_acceptance','fn_decision_reeval_check','contrib_unlock','record_feedback','vote_translit','log_translit_query','increment_post_share_by_slug','blocked_countries']
  loop
    sig := format('public.%I()', n);
    if pg_temp.can('anon', sig) then raise exception 'DEF-005b: anon can still execute %', n; end if;
    if pg_temp.can('authenticated', sig) then raise exception 'DEF-005b: authenticated can still execute %', n; end if;
    if not pg_temp.can('service_role', sig) then raise exception 'DEF-005b: service_role lost %', n; end if;
  end loop;
  -- both overloads of log_edge_geo
  foreach sig in array array['public.log_edge_geo()', 'public.log_edge_geo(text)'] loop
    if pg_temp.can('anon', sig) or pg_temp.can('authenticated', sig) then raise exception 'DEF-005b: % still client-executable', sig; end if;
    if not pg_temp.can('service_role', sig) then raise exception 'DEF-005b: service_role lost %', sig; end if;
  end loop;
end $$;

-- Everything with a client or middleware caller stays executable for anon and authenticated; so does fn_els_search (INVOKER dependent)
do $$
declare n text;
begin
  foreach n in array array['ingest_event','track_visit','log_crawl','log_edge','log_security','log_journey_ab','log_journey_save','fn_log_name_research','recent_number_opens',
    'propose_community_word','lang_link_add','ai_signal','increment_post_share','add_wall_word','save_wall_word_private','fn_els_search','community_feed_page']
  loop
    if not pg_temp.can('anon', format('public.%I()', n)) then raise exception 'must stay public (anon): %', n; end if;
    if not pg_temp.can('authenticated', format('public.%I()', n)) then raise exception 'must stay public (authenticated): %', n; end if;
  end loop;
end $$;
create function pg_temp.expect_denied(p_role text, p_sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; reset role; raise exception 'EXPECTED DENIED but succeeded for role % : %', p_role, p_sql;
  exception when insufficient_privilege then reset role; end;
end $$;
begin;
  -- the INVOKER chain through fn_els_search still works for anon
  set local role anon;
  select public.fn_els_for_name_stub();
  reset role;
  -- real calls (not just catalog flags) are rejected for the revoked functions
  select pg_temp.expect_denied('anon', 'select public.check_security_spike()');
  select pg_temp.expect_denied('authenticated', 'select public.snapshot_seo_wave()');
  select pg_temp.expect_denied('anon', $q$select public.log_edge_geo('IL')$q$);
  select pg_temp.expect_denied('anon', 'select public.ai_quota_check()');
  -- service role still runs them
  set local role service_role;
  select public.check_security_spike();
  select public.log_edge_geo('IL');
  reset role;
rollback;
\echo DEF-005 SQL regression: PASS
