-- Rollback of 20261106131000_def005_revoke_internal_rpcs_from_clients.sql (M0 revision, 12.11.2026).
-- Restores the previous behaviour: every role can execute the twelve functions through PUBLIC (as before), and the explicit
-- service_role grant added by the change is removed (service_role keeps execute through PUBLIC, exactly as before).
-- Note: the 12.11 live ACLs were NULL (implicit PUBLIC) for ten functions and "=X/postgres,postgres=X/postgres" for ai_quota_check
-- and fn_outbox_bump. GRANT cannot recreate a NULL ACL; "=X/postgres,postgres=X/postgres" is the functionally identical result.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname = any (array[
        'fn_edge_grant_audit', 'fn_rls_grant_audit', 'check_security_spike', 'snapshot_seo_wave', 'fn_detect_patterns',
        'fn_detect_pattern_contradictions', 'fn_scan_reeval', 'fn_outbox_bump', 'fn_raziel_claim', 'fn_raziel_claims_gc',
        'ai_quota_check', 'router_rate_check'])
  loop
    execute format('grant execute on function %s to public', r.sig);
    execute format('revoke execute on function %s from service_role', r.sig);
  end loop;
end $$;
