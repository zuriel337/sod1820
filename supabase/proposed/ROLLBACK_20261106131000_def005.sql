-- Rollback of 20261106131000_def005_revoke_internal_rpcs_from_clients.sql (M0 revision 12.11.2026; exact-signature revision 13.11.2026;
-- state check against the apply record, review finding CR-X1 of Codex, 13.11.2026).
-- Restores the previous behaviour for the SAME twelve reviewed signatures and for nothing else: every role can execute them through
-- PUBLIC (as before), the explicit service_role grant added by the change is removed (service_role keeps execute through PUBLIC,
-- exactly as before) and the original comment of each function is put back (the apply replaced it by its record).
-- Scope guard (review finding F2): the rollback selects by exact signature, never by name. A function that was created after the review
-- (for example a later service-only overload such as fn_outbox_bump(integer)) is NOT touched; the rollback verifies that its ACL is
-- exactly what it was before the rollback ran.
-- State guard (review finding CR-X1): the rollback changes NO privilege unless every one of the twelve functions is exactly the function
-- the apply recorded. It refuses, before any change:
--   * a missing reviewed signature;
--   * a function that is not a plain SECURITY DEFINER function owned by postgres (kind, security mode or owner changed since the apply);
--   * a function whose definition md5 is not the one in its apply record (a body replaced with CREATE OR REPLACE);
--   * a function without the apply record while it is server-only (dropped and re-created, or the record removed);
--   * a mixed state (some of the twelve open, some server-only: for example one function dropped and re-created);
--   * an ACL that is neither the applied nor the original state.
-- If all twelve are open and carry no record (the state before the apply, or after a rollback) it does nothing, so it can be run again.
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
  v_prefix constant text := 'DEF-005 applied; def_md5=';
  v_sig text;
  v_oid oid;
  v_oids oid[] := '{}';
  v_missing text[] := '{}';
  v_drift text[] := '{}';
  v_names text[];
  v_open int := 0;
  v_server_only int := 0;
  v_orig_b64 text;
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
    select p.oid::regprocedure::text as sig, p.prokind, p.prosecdef, pg_get_userbyid(p.proowner) as owner_name,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s,
           obj_description(p.oid, 'pg_proc') as cmt, md5(pg_get_functiondef(p.oid)) as def_md5
    from pg_proc p where p.oid = any (v_oids)
  loop
    if r.prokind <> 'f' or not r.prosecdef or r.owner_name <> 'postgres' then
      v_drift := v_drift || format('%s (changed since the apply: kind %s, security definer %s, owner %s)', r.sig, r.prokind, r.prosecdef, r.owner_name);
    elsif not r.a and not r.u and r.s then
      v_server_only := v_server_only + 1;
      if r.cmt is null or r.cmt not like v_prefix || '%' then
        v_drift := v_drift || format('%s (server-only but without the apply record: dropped and re-created, or the record was removed)', r.sig);
      elsif substring(r.cmt from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64=') is distinct from r.def_md5 then
        v_drift := v_drift || format('%s (definition changed since the apply: recorded md5 %s, now %s)', r.sig,
          coalesce(substring(r.cmt from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64='), 'unreadable'), r.def_md5);
      end if;
    elsif r.a and r.u and r.s then
      v_open := v_open + 1;
      if r.cmt like v_prefix || '%' then
        v_drift := v_drift || format('%s (open but it still carries the apply record: a manual change after the apply)', r.sig);
      end if;
    else
      v_drift := v_drift || format('%s (execute: anon %s, authenticated %s, service_role %s)', r.sig, r.a, r.u, r.s);
    end if;
  end loop;
  if cardinality(v_drift) = 0 and v_open > 0 and v_server_only > 0 then
    v_drift := v_drift || format('mixed state: %s of the twelve are open and %s are server-only', v_open, v_server_only);
  end if;
  if cardinality(v_drift) > 0 then
    raise exception 'DEF-005 rollback: reviewed function(s) are not in the state the apply recorded, nothing was changed: %', array_to_string(v_drift, '; ');
  end if;
  if v_server_only = 0 then
    return;   -- all twelve are open and carry no record: already rolled back (or never applied)
  end if;

  -- the ACL of every other function that shares a reviewed name, before
  select array_agg(distinct p.proname) into v_names from pg_proc p where p.oid = any (v_oids);
  select coalesce(string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '<null>'), E'\n' order by p.oid::regprocedure::text), '') into v_others_before
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names) and p.oid <> all (v_oids);

  foreach v_oid in array v_oids loop
    v_orig_b64 := substring(obj_description(v_oid, 'pg_proc') from '; orig_b64=(.*)$');
    execute format('grant execute on function %s to public', v_oid::regprocedure);
    execute format('revoke execute on function %s from service_role', v_oid::regprocedure);
    if v_orig_b64 is null or v_orig_b64 = '-' then
      execute format('comment on function %s is null', v_oid::regprocedure);
    else
      execute format('comment on function %s is %L', v_oid::regprocedure, convert_from(decode(v_orig_b64, 'base64'), 'UTF8'));
    end if;
  end loop;

  for r in
    select p.oid::regprocedure::text as sig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s,
           obj_description(p.oid, 'pg_proc') as cmt
    from pg_proc p where p.oid = any (v_oids)
  loop
    if not (r.a and r.u and r.s) or r.cmt like v_prefix || '%' then
      raise exception 'DEF-005 rollback: post-state check failed for % (anon %, authenticated %, service_role %)', r.sig, r.a, r.u, r.s;
    end if;
  end loop;

  select coalesce(string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '<null>'), E'\n' order by p.oid::regprocedure::text), '') into v_others_after
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names) and p.oid <> all (v_oids);
  if v_others_after is distinct from v_others_before then
    raise exception 'DEF-005 rollback: a function outside the reviewed set changed its ACL, aborting';
  end if;
end $$;
