-- DEF-005 regression for the PROPOSED grants change, on a DISPOSABLE PostgreSQL. Fixture functions carry the production default (PUBLIC execute).
-- Scope (13.11.2026): DEF-005 = the twelve system functions, by EXACT SIGNATURE. The apply and the rollback are tested for
--   * the effect (only the twelve change; real calls are refused or still work),
--   * the exact-signature guards (review findings F1 and F2): an unreviewed overload, a missing signature, a drifted function,
--   * safe re-run (apply twice, rollback twice) and
--   * the rollback scope (a later service-only overload keeps its ACL; the effective permissions of everything else are identical).
-- Needs psql 15+ (the variables ERROR and LAST_ERROR_MESSAGE).
\set ON_ERROR_STOP on
\set QUIET on
\set VERBOSITY terse
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'def005_other_owner') then create role def005_other_owner nologin; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create table public.sink (v text);
grant insert, select on public.sink to anon, authenticated, service_role;

-- the twelve reviewed functions with their EXACT live signatures (default PUBLIC execute, SECURITY DEFINER, owner = the superuser)
create function public.fn_edge_grant_audit() returns int language sql security definer as $$ select 1 $$;
create function public.fn_rls_grant_audit() returns int language sql security definer as $$ select 1 $$;
create function public.check_security_spike() returns int language sql security definer as $$ select 1 $$;
create function public.snapshot_seo_wave(integer, integer) returns int language sql security definer as $$ select 1 $$;
create function public.fn_detect_patterns(integer, text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_detect_pattern_contradictions() returns int language sql security definer as $$ select 1 $$;
create function public.fn_scan_reeval(text, text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_outbox_bump(text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_raziel_claim(text) returns int language sql security definer as $$ select 1 $$;
create function public.fn_raziel_claims_gc() returns int language sql security definer as $$ select 1 $$;
create function public.ai_quota_check(text, text, integer) returns int language sql security definer as $$ select 1 $$;
create function public.router_rate_check(uuid, integer) returns int language sql security definer as $$ select 1 $$;
-- the two live ACLs that are the explicit "=X/postgres" form instead of NULL
grant execute on function public.ai_quota_check(text, text, integer), public.fn_outbox_bump(text) to public;

-- everything that must stay public (callers exist) and the names that moved out of DEF-005 (they are not named by it)
do $$
declare n text;
begin
  foreach n in array array['ingest_event','track_visit','log_crawl','log_edge','log_security','log_journey_ab','log_journey_save','fn_log_name_research','recent_number_opens',
    'propose_community_word','lang_link_add','ai_signal','increment_post_share','add_wall_word','save_wall_word_private','fn_els_search','community_feed_page',
    'refresh_traffic_daily','enqueue_word_review','trusted_contributor_uids','push_sub_count','fn_metatron_gaps','fn_metatron_status',
    'fn_cohort_acceptance','fn_decision_reeval_check','contrib_unlock','record_feedback','vote_translit','log_translit_query','increment_post_share_by_slug','blocked_countries']
  loop
    execute format('create function public.%I() returns int language sql security definer set search_path = public as $f$ select 1 $f$', n);
  end loop;
end $$;
create function public.log_edge_geo(p_country text) returns void language sql security definer set search_path = public as $$ insert into public.sink values (p_country) $$;
-- INVOKER function that calls fn_els_search (as fn_els_for_name does in production): must keep working for anon
create function public.fn_els_for_name_stub() returns int language sql security invoker as $$ select public.fn_els_search() $$;
grant execute on function public.fn_els_for_name_stub() to anon, authenticated;
-- owner-rights callers that must keep working (as admin_candidate_decide / fn_edge_grant_gaps / fn_capability_execution_gate_v1)
create function public.owner_caller_stub() returns int language sql security definer as
  $$ select public.fn_detect_patterns(1, 'x') + public.fn_outbox_bump('k') + public.ai_quota_check('i', 't', 1) $$;
revoke all on function public.owner_caller_stub() from public;
grant execute on function public.owner_caller_stub() to authenticated;

create function pg_temp.can(p_role text, p_sig text) returns boolean language sql as $$ select has_function_privilege(p_role, p_sig::regprocedure, 'EXECUTE') $$;
create function pg_temp.expect(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin if not coalesce(p_ok, false) then raise exception 'DEF-005 TEST FAILED: %', p_msg; end if; end $$;
-- the EFFECTIVE permissions of every function in schema public (not the ACL text: a NULL ACL cannot be recreated by GRANT)
create function pg_temp.perms() returns text language sql as $$
  select coalesce(string_agg(p.oid::regprocedure::text || ':' || has_function_privilege('anon', p.oid, 'EXECUTE')::int::text
      || has_function_privilege('authenticated', p.oid, 'EXECUTE')::int::text || has_function_privilege('service_role', p.oid, 'EXECUTE')::int::text, E'\n'
      order by p.oid::regprocedure::text), '')
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' $$;
-- the signatures of the functions whose effective permissions differ between two snapshots
create function pg_temp.changed(p_before text, p_after text) returns text[] language sql as $$
  select coalesce(array_agg(sig order by sig), '{}')
  from (select distinct split_part(l, ':', 1) as sig
        from (select l from unnest(string_to_array(p_before, E'\n')) l except select l from unnest(string_to_array(p_after, E'\n')) l) d) s $$;
create function pg_temp.expect_denied(p_role text, p_sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; reset role; raise exception 'EXPECTED DENIED but succeeded for role % : %', p_role, p_sql;
  exception when insufficient_privilege then reset role; end;
end $$;
-- the apply / rollback file text, executed inside an exception block so that an EXPECTED refusal is observed (message) without ending the script
\set apply_sql `cat supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql`
\set rollback_sql `cat supabase/proposed/ROLLBACK_20261106131000_def005.sql`
create function pg_temp.try_sql(p text) returns text language plpgsql as $$ begin execute p; return 'OK'; exception when others then return sqlerrm; end $$;
select pg_temp.perms() as perms_before \gset

-- ===== BEFORE: the exposures exist (the fixture reproduces the production default) =====
select pg_temp.expect(pg_temp.can('anon', 'public.check_security_spike()') and pg_temp.can('anon', 'public.snapshot_seo_wave(integer,integer)')
  and pg_temp.can('anon', 'public.ai_quota_check(text,text,integer)') and pg_temp.can('authenticated', 'public.fn_raziel_claim(text)'), 'BASELINE: the fixture must reproduce PUBLIC execute');

-- ===== APPLY =====
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
select pg_temp.perms() as perms_applied \gset

-- the twelve - no client role; service_role keeps them
do $$
declare s text;
begin
  foreach s in array array['public.fn_edge_grant_audit()','public.fn_rls_grant_audit()','public.check_security_spike()','public.snapshot_seo_wave(integer,integer)',
    'public.fn_detect_patterns(integer,text)','public.fn_detect_pattern_contradictions()','public.fn_scan_reeval(text,text)','public.fn_outbox_bump(text)',
    'public.fn_raziel_claim(text)','public.fn_raziel_claims_gc()','public.ai_quota_check(text,text,integer)','public.router_rate_check(uuid,integer)']
  loop
    if pg_temp.can('anon', s) then raise exception 'DEF-005: anon can still execute %', s; end if;
    if pg_temp.can('authenticated', s) then raise exception 'DEF-005: authenticated can still execute %', s; end if;
    if not pg_temp.can('service_role', s) then raise exception 'DEF-005: service_role lost %', s; end if;
  end loop;
end $$;
-- ONLY the twelve changed: the diff between the two snapshots is exactly twelve functions (all other functions - the kept-public ones and the
-- names that moved out of DEF-005 - have identical effective permissions)
select pg_temp.expect(pg_temp.changed(:'perms_before', :'perms_applied') = (select array_agg(to_regprocedure(x)::text order by to_regprocedure(x)::text) from unnest(array[
  'public.fn_edge_grant_audit()', 'public.fn_rls_grant_audit()', 'public.check_security_spike()', 'public.snapshot_seo_wave(integer,integer)',
  'public.fn_detect_patterns(integer,text)', 'public.fn_detect_pattern_contradictions()', 'public.fn_scan_reeval(text,text)', 'public.fn_outbox_bump(text)',
  'public.fn_raziel_claim(text)', 'public.fn_raziel_claims_gc()', 'public.ai_quota_check(text,text,integer)', 'public.router_rate_check(uuid,integer)']) x),
  'exactly the twelve reviewed signatures changed, got ' || array_to_string(pg_temp.changed(:'perms_before', :'perms_applied'), ', '));
do $$
declare n text; sig text;
begin
  -- the optional names are untouched by DEF-005 itself
  foreach n in array array['refresh_traffic_daily','enqueue_word_review','trusted_contributor_uids','push_sub_count','fn_metatron_gaps','fn_metatron_status',
    'fn_cohort_acceptance','fn_decision_reeval_check','contrib_unlock','record_feedback','vote_translit','log_translit_query','increment_post_share_by_slug','blocked_countries']
  loop
    if not pg_temp.can('anon', format('public.%I()', n)) then raise exception 'DEF-005 must not touch %', n; end if;
  end loop;
  if not pg_temp.can('anon', 'public.log_edge_geo(text)') then raise exception 'DEF-005 must not touch log_edge_geo'; end if;
  -- everything with a client or middleware caller stays executable for anon and authenticated; so does fn_els_search (INVOKER dependent)
  foreach n in array array['ingest_event','track_visit','log_crawl','log_edge','log_security','log_journey_ab','log_journey_save','fn_log_name_research','recent_number_opens',
    'propose_community_word','lang_link_add','ai_signal','increment_post_share','add_wall_word','save_wall_word_private','fn_els_search','community_feed_page']
  loop
    sig := format('public.%I()', n);
    if not pg_temp.can('anon', sig) then raise exception 'must stay public (anon): %', n; end if;
    if not pg_temp.can('authenticated', sig) then raise exception 'must stay public (authenticated): %', n; end if;
  end loop;
end $$;
begin;
  -- the INVOKER chain through fn_els_search still works for anon
  set local role anon;
  select public.fn_els_for_name_stub();
  reset role;
  -- real calls (not just catalog flags) are refused for the revoked functions
  select pg_temp.expect_denied('anon', 'select public.check_security_spike()');
  select pg_temp.expect_denied('authenticated', 'select public.snapshot_seo_wave(1, 2)');
  select pg_temp.expect_denied('anon', $q$select public.ai_quota_check('i', 't', 1)$q$);
  select pg_temp.expect_denied('anon', $q$select public.fn_outbox_bump('k')$q$);
  -- the service role (the Edge functions) and the owner-rights callers still run them
  set local role service_role;
  select public.check_security_spike(), public.fn_raziel_claim('k'), public.router_rate_check('00000000-0000-4000-8000-000000000001', 1);
  reset role;
  set local role authenticated;
  select pg_temp.expect(public.owner_caller_stub() = 3, 'owner-rights callers (admin_candidate_decide, the gate) are unaffected');
  reset role;
  -- an unrelated public function still works for anon
  set local role anon;
  select public.log_edge_geo('IL');
  reset role;
rollback;

-- ===== RE-RUN: the applied state is accepted and left exactly as it is =====
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
select pg_temp.expect(pg_temp.perms() = :'perms_applied', 're-running the apply changes nothing');

-- ===== GUARDS: every refusal happens BEFORE any change (the effective permissions stay exactly what they were) =====
-- G1 (review finding F1): an unreviewed overload next to the twelve - the old name-based file changed thirteen functions and succeeded
begin;
  create function public.fn_outbox_bump(integer) returns int language sql security definer as $$ select 2 $$;
  revoke all on function public.fn_outbox_bump(integer) from public;
  grant execute on function public.fn_outbox_bump(integer) to service_role;
  select pg_temp.perms() as perms_g1_before \gset
  select pg_temp.try_sql(:'apply_sql') as g1_msg \gset
  select pg_temp.expect(:'g1_msg' like '%unreviewed function(s) with a reviewed name%fn_outbox_bump(integer)%', 'F1: the apply refuses an unreviewed overload: ' || :'g1_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g1_before', 'F1: the refused apply changed nothing');
rollback;
-- G2: a reviewed signature is missing AND an unreviewed overload exists - both faults, still refused, still nothing changed
begin;
  drop function public.fn_rls_grant_audit();
  create function public.fn_outbox_bump(integer) returns int language sql security definer as $$ select 2 $$;
  select pg_temp.perms() as perms_g2_before \gset
  select pg_temp.try_sql(:'apply_sql') as g2_msg \gset
  select pg_temp.expect(:'g2_msg' like '%reviewed signature(s) missing%fn_rls_grant_audit()%', 'F1b: a missing reviewed signature is refused: ' || :'g2_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g2_before', 'F1b: nothing changed');
rollback;
-- G3: a function that was dropped and re-created with another argument list is a missing signature plus an unreviewed overload
begin;
  drop function public.router_rate_check(uuid, integer);
  create function public.router_rate_check(text, integer) returns int language sql security definer as $$ select 3 $$;
  select pg_temp.perms() as perms_g3_before \gset
  select pg_temp.try_sql(:'apply_sql') as g3_msg \gset
  select pg_temp.expect(:'g3_msg' like '%reviewed signature(s) missing%router_rate_check(uuid,integer)%', 'a changed argument list is refused: ' || :'g3_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g3_before', 'a changed argument list: nothing changed');
rollback;
-- G4/G5: a reviewed function is no longer SECURITY DEFINER / is owned by someone else
begin;
  alter function public.router_rate_check(uuid, integer) security invoker;
  select pg_temp.perms() as perms_g4_before \gset
  select pg_temp.try_sql(:'apply_sql') as g4_msg \gset
  select pg_temp.expect(:'g4_msg' like '%drifted from the reviewed baseline%router_rate_check(uuid,integer)%security definer f%', 'drift (security invoker) is refused: ' || :'g4_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g4_before', 'drift (security invoker): nothing changed');
rollback;
begin;
  alter function public.fn_scan_reeval(text, text) owner to def005_other_owner;
  select pg_temp.perms() as perms_g5_before \gset
  select pg_temp.try_sql(:'apply_sql') as g5_msg \gset
  select pg_temp.expect(:'g5_msg' like '%drifted from the reviewed baseline%fn_scan_reeval(text,text)%owner def005_other_owner%', 'drift (owner) is refused: ' || :'g5_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g5_before', 'drift (owner): nothing changed');
rollback;
-- G6: a PARTIAL ACL (neither the live "before" nor the "after" state) is refused too. Starting from the ORIGINAL state: the rollback first.
\i supabase/proposed/ROLLBACK_20261106131000_def005.sql
select pg_temp.expect(pg_temp.perms() = :'perms_before', 'the rollback restores the effective permissions of every function exactly');
begin;
  revoke all on function public.fn_raziel_claim(text) from public;
  grant execute on function public.fn_raziel_claim(text) to anon, service_role;   -- authenticated lost it, anon kept it
  select pg_temp.perms() as perms_g6_before \gset
  select pg_temp.try_sql(:'apply_sql') as g6_msg \gset
  select pg_temp.expect(:'g6_msg' like '%drifted from the reviewed baseline%fn_raziel_claim(text)%', 'a partial ACL is refused: ' || :'g6_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_g6_before', 'a partial ACL: nothing changed');
rollback;
-- the refusals did not leave the apply half done anywhere: still the original state
select pg_temp.expect(pg_temp.perms() = :'perms_before', 'after all refusals the database is in its original state');

-- ===== ROLLBACK (from the applied state) =====
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
select pg_temp.expect(pg_temp.perms() = :'perms_applied', 'applied again for the rollback tests');
-- R1 (review finding F2): a later service-only overload outside the reviewed set must keep its ACL when the rollback runs
begin;
  create function public.fn_outbox_bump(integer) returns int language sql security definer as $$ select 2 $$;
  revoke all on function public.fn_outbox_bump(integer) from public;
  grant execute on function public.fn_outbox_bump(integer) to service_role;
  select pg_temp.expect(not pg_temp.can('anon', 'public.fn_outbox_bump(integer)') and pg_temp.can('service_role', 'public.fn_outbox_bump(integer)'), 'fixture: the later overload is service-only');
  \i supabase/proposed/ROLLBACK_20261106131000_def005.sql
  select pg_temp.expect(not pg_temp.can('anon', 'public.fn_outbox_bump(integer)') and not pg_temp.can('authenticated', 'public.fn_outbox_bump(integer)')
    and pg_temp.can('service_role', 'public.fn_outbox_bump(integer)'), 'F2: the rollback leaves the later overload service-only (the old name-based rollback gave PUBLIC execute to it)');
  select pg_temp.expect(pg_temp.can('anon', 'public.fn_outbox_bump(text)') and pg_temp.can('authenticated', 'public.fn_outbox_bump(text)') and pg_temp.can('service_role', 'public.fn_outbox_bump(text)'),
    'F2: the reviewed fn_outbox_bump(text) is restored');
rollback;
\i supabase/proposed/ROLLBACK_20261106131000_def005.sql
select pg_temp.expect(pg_temp.perms() = :'perms_before', 'rollback: every function has exactly its original effective permissions');
-- R2: the rollback can be run again
\i supabase/proposed/ROLLBACK_20261106131000_def005.sql
select pg_temp.expect(pg_temp.perms() = :'perms_before', 'rollback twice: unchanged');
-- R3/R4: the rollback refuses a missing reviewed signature and a drifted state, before any change
\i supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql
begin;
  drop function public.fn_raziel_claims_gc();
  select pg_temp.perms() as perms_r3_before \gset
  select pg_temp.try_sql(:'rollback_sql') as r3_msg \gset
  select pg_temp.expect(:'r3_msg' like '%reviewed signature(s) missing%fn_raziel_claims_gc()%', 'the rollback refuses a missing reviewed signature: ' || :'r3_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_r3_before', 'rollback refusal: nothing changed');
rollback;
begin;
  grant execute on function public.fn_outbox_bump(text) to authenticated;   -- authenticated only: neither the applied nor the original state
  select pg_temp.perms() as perms_r4_before \gset
  select pg_temp.try_sql(:'rollback_sql') as r4_msg \gset
  select pg_temp.expect(:'r4_msg' like '%neither the applied nor the original state%fn_outbox_bump(text)%', 'the rollback refuses a drifted state: ' || :'r4_msg');
  select pg_temp.expect(pg_temp.perms() = :'perms_r4_before', 'rollback drift refusal: nothing changed');
rollback;
\echo DEF-005 SQL regression: PASS
