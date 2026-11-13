-- Rollback of 20261106131000_def005_revoke_internal_rpcs_from_clients.sql (M0 revision 12.11.2026; exact-signature revision 13.11.2026).
-- Restores the previous behaviour for the SAME twelve reviewed signatures and for nothing else: every role can execute them through
-- PUBLIC (as before), and the explicit service_role grant added by the change is removed (service_role keeps execute through PUBLIC,
-- exactly as before).
-- Scope guard (review finding F2): the rollback selects by exact signature, never by name. A function that was created after the review
-- (for example a later service-only overload such as fn_outbox_bump(integer)) is NOT touched; the rollback verifies that its ACL is
-- exactly what it was before the rollback ran.
-- Stops before any change when a reviewed signature is missing or a reviewed function is neither in the "after" state (no client role,
-- service_role can execute) nor already in the "before" state (so a second run is safe and does nothing).
-- Note: the 12.11 live ACLs were NULL (implicit PUBLIC) for ten functions and "=X/postgres,postgres=X/postgres" for ai_quota_check
-- and fn_outbox_bump. GRANT cannot recreate a NULL ACL; "=X/postgres,postgres=X/postgres" is the functionally identical result, so the
-- tests compare EFFECTIVE permissions (has_function_privilege), not the ACL text.
do $$
declare
  v_expected constant text[] := array[
    'public.fn_edge_grant_audit()',
    'public.fn_rls_grant_audit()',
    'public.check_security_spike()',
    'public.snapshot_seo_wave(integer,integer)',
    'public.fn_detect_patterns(integer,text)',
    'public.fn_detect_pattern_contradictions()',
    'public.fn_scan_reeval(text,text)',
    'public.fn_outbox_bump(text)',
    'public.fn_raziel_claim(text)',
    'public.fn_raziel_claims_gc()',
    'public.ai_quota_check(text,text,integer)',
    'public.router_rate_check(uuid,integer)'];
  v_sig text;
  v_oid oid;
  v_oids oid[] := '{}';
  v_missing text[] := '{}';
  v_drift text[] := '{}';
  v_names text[];
  v_others_before text;
  v_others_after text;
  r record;
begin
  foreach v_sig in array v_expected loop
    v_oid := to_regprocedure(v_sig)::oid;
    if v_oid is null then v_missing := v_missing || v_sig; else v_oids := v_oids || v_oid; end if;
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'DEF-005 rollback: reviewed signature(s) missing, nothing was changed: %', array_to_string(v_missing, ', ');
  end if;

  for r in
    select p.oid::regprocedure::text as sig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s
    from pg_proc p where p.oid = any (v_oids)
  loop
    if not ((not r.a and not r.u and r.s) or (r.a and r.u and r.s)) then
      v_drift := v_drift || format('%s (execute: anon %s, authenticated %s, service_role %s)', r.sig, r.a, r.u, r.s);
    end if;
  end loop;
  if cardinality(v_drift) > 0 then
    raise exception 'DEF-005 rollback: reviewed function(s) are in neither the applied nor the original state, nothing was changed: %', array_to_string(v_drift, '; ');
  end if;

  -- the ACL of every other function that shares a reviewed name, before
  select array_agg(distinct p.proname) into v_names from pg_proc p where p.oid = any (v_oids);
  select coalesce(string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '<null>'), E'\n' order by p.oid::regprocedure::text), '') into v_others_before
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names) and p.oid <> all (v_oids);

  foreach v_oid in array v_oids loop
    execute format('grant execute on function %s to public', v_oid::regprocedure);
    execute format('revoke execute on function %s from service_role', v_oid::regprocedure);
  end loop;

  for r in
    select p.oid::regprocedure::text as sig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s
    from pg_proc p where p.oid = any (v_oids)
  loop
    if not (r.a and r.u and r.s) then
      raise exception 'DEF-005 rollback: post-state check failed for % (anon %, authenticated %, service_role %)', r.sig, r.a, r.u, r.s;
    end if;
  end loop;

  select coalesce(string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '<null>'), E'\n' order by p.oid::regprocedure::text), '') into v_others_after
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names) and p.oid <> all (v_oids);
  if v_others_after is distinct from v_others_before then
    raise exception 'DEF-005 rollback: a function outside the reviewed set changed its ACL, aborting';
  end if;
end $$;
