-- DEF-005 - PROPOSED (not in supabase/migrations on purpose; needs explicit ZURIEL approval: production grants change).
--
-- REVISED 12.11.2026 for M0 (permissions map SOD1820_PERMISSIONS_MAP_20261112 §3.4-A / §6 item 1, owner decision
-- "public world by default"). The original 6.11 list mixed the system functions with uncalled public-write / public-read
-- helpers. Under the owner decision only the twelve SYSTEM functions below are protected by M0. The remaining fifteen names of
-- the 6.11 list (no caller in shipped code, proven by test/def005-rpc-grants-contract.test.mjs) moved unchanged to the
-- separate, optional proposal 20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql, so each can be decided on its own.
-- Changes against 6.11: + fn_edge_grant_audit (writes work_log; was missing), + ai_quota_check moved from "signed-in keep" to
-- server-only (its only callers use the service role: ai-analyze checkQuota() with svcHeaders(), and the SECURITY DEFINER
-- fn_capability_execution_gate_v1, which runs as the owner).
--
-- What each does when an anonymous caller runs it today (all SECURITY DEFINER, owner postgres, no caller check):
--   fn_edge_grant_audit, fn_rls_grant_audit ......... write rows to work_log (coordination ledger flooding)
--   check_security_spike, snapshot_seo_wave ......... create monitoring alerts / SEO snapshots (monitoring pollution)
--   fn_detect_patterns, fn_detect_pattern_contradictions, fn_scan_reeval ... run analysis jobs that write (cost / DoS)
--   fn_outbox_bump, fn_raziel_claim, fn_raziel_claims_gc ..................... change bot outbox / de-duplication state
--   ai_quota_check, router_rate_check ................ bump quota counters for ANY identity passed as a parameter
--
-- Callers that keep working (verified 12.11.2026, read-only):
--   * cron (runs as postgres = owner): security_spike_hourly -> check_security_spike, edge-grant-audit-daily -> fn_edge_grant_audit,
--     rls-grant-audit-weekly -> fn_rls_grant_audit;
--   * SECURITY DEFINER callers owned by postgres: admin_candidate_decide -> fn_detect_patterns / fn_detect_pattern_contradictions,
--     fn_edge_grant_gaps -> fn_outbox_bump, fn_capability_execution_gate_v1 -> ai_quota_check;
--   * Edge functions with SUPABASE_SERVICE_ROLE_KEY: wa-raziel (fn_raziel_claim, fn_outbox_bump), wa-michael / wa-gabriel /
--     wa-uriel / wa-hatishbi (fn_outbox_bump), field-router (router_rate_check), ai-analyze (ai_quota_check);
--   * no caller in src/, api/, public-reading-deploy/, server/, middleware (test/def005-rpc-grants-contract.test.mjs).
-- The live grants come from the default PUBLIC execute (proacl NULL or "=X/postgres"), so PUBLIC is revoked and service_role is
-- granted explicitly; the owner keeps execute.
--
-- Rollback: supabase/proposed/ROLLBACK_20261106131000_def005.sql.
-- Test: tests/sql/def005_public_rpc_guards_v1.sql (scripts/run-def001-sql-test.sh) and tests/sql/m0a_db_permissions_v1.sql.

do $$
declare r record; n int := 0;
begin
  -- Set A (M0): server-side only. No client role may execute them; service_role keeps access (cron and the owner are unaffected).
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname = any (array[
        'fn_edge_grant_audit', 'fn_rls_grant_audit', 'check_security_spike', 'snapshot_seo_wave', 'fn_detect_patterns',
        'fn_detect_pattern_contradictions', 'fn_scan_reeval', 'fn_outbox_bump', 'fn_raziel_claim', 'fn_raziel_claims_gc',
        'ai_quota_check', 'router_rate_check'])
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    n := n + 1;
  end loop;
  if n < 12 then raise exception 'DEF-005: expected at least 12 functions, found %', n; end if;
end $$;

-- Deliberately kept public (client or middleware callers exist; product writes / reads under the public-world decision; rate limits
-- are M0-B / map §6 item 7):
--   telemetry sinks: ingest_event, track_visit, log_crawl, log_edge, log_security, log_journey_ab, log_journey_save, fn_log_name_research, recent_number_opens
--   community writes: propose_community_word, lang_link_add, ai_signal, increment_post_share, add_wall_word, save_wall_word_private
--   public reads: the feed / number / name / ELS / people readers listed in the README
