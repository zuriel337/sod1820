-- DEF-005b - OPTIONAL, PROPOSED (not in supabase/migrations; needs its own explicit tick in the consolidated M0 approval).
--
-- These fifteen names were part of the 6.11 DEF-005 list but are NOT among the twelve system functions of the permissions map
-- (SOD1820_PERMISSIONS_MAP_20261112 §3.4-A), so M0 does not include them by default. They are kept here unchanged so the 6.11
-- analysis is not lost and no second list is created. Evidence: no caller in shipped code (src/, api/, public-reading-deploy/,
-- server/, middleware) - asserted by test/def005-rpc-grants-contract.test.mjs; their remaining callers are cron, SECURITY DEFINER
-- functions owned by postgres and service-role Edge functions.
-- Why it is still recommended: several are owner-rights writers or heavy jobs reachable by any anonymous caller although the
-- 2029 product never calls them, e.g. refresh_traffic_daily (refreshes aggregates on demand), enqueue_word_review (runs the corpus
-- admission gate and can create private research candidates), record_feedback / vote_translit / log_translit_query /
-- increment_post_share_by_slug (Legacy-era writes without a 2029 caller), trusted_contributor_uids (returns account ids).
-- Reads that are harmless under the public-world decision (push_sub_count, blocked_countries) are listed for completeness only.
--
-- Rollback: supabase/proposed/ROLLBACK_20261112132000_def005b.sql.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname = any (array[
        'refresh_traffic_daily', 'enqueue_word_review', 'trusted_contributor_uids', 'push_sub_count', 'fn_metatron_gaps',
        'fn_metatron_status', 'fn_cohort_acceptance', 'fn_decision_reeval_check', 'contrib_unlock', 'record_feedback',
        'vote_translit', 'log_translit_query', 'increment_post_share_by_slug', 'log_edge_geo', 'blocked_countries'])
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
