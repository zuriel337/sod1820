-- DEF-005 - PROPOSED (not in supabase/migrations on purpose; needs explicit ZURIEL approval: production grants change).
--
-- Audit finding: 295 SECURITY DEFINER functions in schema public are executable by the anonymous role (default PUBLIC EXECUTE).
-- ~200 are admin-guarded or public reads. The functions below are different: maintenance / telemetry-maintenance / secret-gated helpers that
-- run with owner rights, write or compute heavily and have NO client caller. Evidence for each (2026-11-06):
--   * grep of src/, api/, public-reading-deploy/, middleware*.js, server/, public/ finds no call (the middleware calls only log_crawl / log_edge /
--     log_security and the client only the kept sinks listed at the end);
--   * pg_depend / pg_policies / pg_views / pg_proc: the only dependents are SECURITY DEFINER functions (they run as the owner and are unaffected),
--     scheduled jobs (pg_cron runs as postgres) and the edge functions that call with SUPABASE_SERVICE_ROLE_KEY (wa-*, field-router);
--   * fn_els_search is NOT in the list: the SECURITY INVOKER function fn_els_for_name (anon-callable) calls it, so revoking would break it.
-- Full classification table: docs/reviews/audit-remediation-20261106/README.md section DEF-005.
--
-- Rollback for one function:  grant execute on function public.<name>(<args>) to anon, authenticated;   (the previous behaviour was PUBLIC execute)

do $$
declare r record;
begin
  -- Set A: server-side only. No client role may execute them; service_role keeps access (scheduled jobs and the owner are unaffected).
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname = any (array[
        'check_security_spike', 'fn_detect_pattern_contradictions', 'fn_detect_patterns', 'fn_raziel_claims_gc', 'fn_rls_grant_audit',
        'fn_scan_reeval', 'snapshot_seo_wave', 'refresh_traffic_daily', 'enqueue_word_review', 'trusted_contributor_uids', 'push_sub_count',
        'fn_metatron_gaps', 'fn_metatron_status', 'fn_cohort_acceptance', 'fn_decision_reeval_check', 'contrib_unlock', 'record_feedback',
        'vote_translit', 'log_translit_query', 'increment_post_share_by_slug', 'log_edge_geo', 'fn_outbox_bump', 'fn_raziel_claim',
        'router_rate_check', 'blocked_countries'])
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;

  -- Set B: signed-in callers keep access (the edge function that uses it passes the caller's token and has not been verified to use the service role).
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.proname = any (array['ai_quota_check'])
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end $$;

-- Deliberately kept public (client or middleware callers exist; each is an abuse surface that needs rate limiting / size caps at the edge, tracked as follow-up):
--   telemetry sinks: ingest_event, track_visit, log_crawl, log_edge, log_security, log_journey_ab, log_journey_save, fn_log_name_research, recent_number_opens
--   community writes: propose_community_word, lang_link_add, ai_signal, increment_post_share, add_wall_word, save_wall_word_private
--   public reads: the feed / number / name / ELS / people readers listed in the README
