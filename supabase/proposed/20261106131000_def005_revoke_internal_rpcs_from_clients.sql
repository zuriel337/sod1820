-- DEF-005 - PROPOSED (not in supabase/migrations on purpose; needs explicit ZURIEL approval: production grants change).
--
-- REVISED 12.11.2026 for M0 (permissions map SOD1820_PERMISSIONS_MAP_20261112 §3.4-A / §6 item 1, owner decision
-- "public world by default"): only the twelve SYSTEM functions below are protected. The other fifteen names of the original 6.11
-- list (no caller in shipped code, proven by test/def005-rpc-grants-contract.test.mjs) are NOT in this file and are not part of
-- this step; they were moved to a separate optional proposal (DEF-005b) that is outside this package.
-- REVISED 13.11.2026 (extraction, review findings F1/F2 of Codex): the file works on the EXACT reviewed signatures, never on names.
--   * the apply stops BEFORE any change when a reviewed signature is missing, when ANY other function in schema public carries one of
--     the twelve names (a new overload, e.g. fn_outbox_bump(integer), is unreviewed and must be added here explicitly), or when a
--     reviewed function drifted: not a plain SECURITY DEFINER function owned by postgres, an ACL that is neither the live "before"
--     state nor the "after" state, or the twelve are not all in ONE of those two states;
--   * it changes exactly the twelve reviewed oids and then checks the result;
--   * it is safe to run again: the "after" state is accepted and left as it is (and re-checked, see the record below).
-- REVISED 13.11.2026 (review finding CR-X1 of Codex, #1334 head a4312a4a2): what the file does NOT check, and the record that closes the gap.
--   * The file holds no reviewed text of the twelve BODIES, so the apply cannot tell whether a body was replaced BEFORE it ran (a function
--     with the same signature, owner and SECURITY DEFINER but another body is accepted). Before the apply the operator compares the md5 of
--     the twelve definitions with the reviewed values (tests/live/def005_pre_apply_definitions.sql prints them; after the apply,
--     row A1c of tests/live/m0_post_apply_verification.sql checks that the records are intact).
--   * What the apply does instead: it records, in a COMMENT on each of the twelve functions, the md5 of the definition it found and the
--     original comment ("DEF-005 applied; def_md5=<md5>; orig_b64=<original comment, base64, or ->"). The comment is metadata of the same
--     objects; it does not change a definition, an owner or a privilege. A re-run of the apply refuses when a definition changed since.
--   * The ROLLBACK uses that record: it refuses, before changing any privilege, a function whose owner, kind, SECURITY DEFINER or
--     definition is not the recorded one, a function that was dropped and re-created (no record), and a mixed state; then it restores
--     the privileges and the original comment, so the record is gone and the state is exactly the original.
--
-- What each does when an anonymous caller runs it today (all SECURITY DEFINER, owner postgres, no caller check):
--   fn_edge_grant_audit, fn_rls_grant_audit ......... write rows to work_log (coordination ledger flooding)
--   check_security_spike, snapshot_seo_wave ......... create monitoring alerts / SEO snapshots (monitoring pollution)
--   fn_detect_patterns, fn_detect_pattern_contradictions, fn_scan_reeval ... run analysis jobs that write (cost / DoS)
--   fn_outbox_bump, fn_raziel_claim, fn_raziel_claims_gc ..................... change bot outbox / de-duplication state
--   ai_quota_check, router_rate_check ................ bump quota counters for ANY identity passed as a parameter
--
-- Callers that keep working (verified 12.11.2026, read-only; Codex re-read 13.11.2026):
--   * cron (runs as postgres = owner): security_spike_hourly -> check_security_spike, edge-grant-audit-daily -> fn_edge_grant_audit,
--     rls-grant-audit-weekly -> fn_rls_grant_audit;
--   * SECURITY DEFINER callers owned by postgres: admin_candidate_decide -> fn_detect_patterns / fn_detect_pattern_contradictions,
--     fn_edge_grant_gaps -> fn_outbox_bump, fn_capability_execution_gate_v1 -> ai_quota_check;
--   * Edge functions with SUPABASE_SERVICE_ROLE_KEY: wa-raziel (fn_raziel_claim, fn_outbox_bump), wa-michael / wa-gabriel /
--     wa-uriel / wa-hatishbi (fn_outbox_bump), field-router (router_rate_check), ai-analyze (ai_quota_check);
--   * no caller in src/, api/, public-reading-deploy/, server/, middleware (test/def005-rpc-grants-contract.test.mjs; dynamic
--     construction of a function name cannot be excluded by a text scan - a limitation, see the package README).
-- The live grants come from the default PUBLIC execute (proacl NULL or "=X/postgres"), so PUBLIC is revoked and service_role is
-- granted explicitly; the owner keeps execute.
--
-- Rollback: supabase/proposed/ROLLBACK_20261106131000_def005.sql (the same twelve signatures, nothing else).
-- Tests: tests/sql/def005_public_rpc_guards_v1.sql (scripts/run-def001-sql-test.sh) and tests/sql/m0a_db_permissions_v1.sql.

do $$
declare
  -- the reviewed set: schema-qualified, with the exact argument types (live 12.11.2026)
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
  v_extra text[];
  v_drift text[] := '{}';
  v_names text[];
  v_before int := 0;
  v_after int := 0;
  v_md5 text;
  v_orig text;
  r record;
begin
  -- 1. every reviewed signature exists
  foreach v_sig in array v_expected loop
    v_oid := to_regprocedure(v_sig)::oid;
    if v_oid is null then v_missing := v_missing || v_sig; else v_oids := v_oids || v_oid; end if;
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'DEF-005: reviewed signature(s) missing, nothing was changed: %', array_to_string(v_missing, ', ');
  end if;

  -- 2. no OTHER function in schema public carries a reviewed name (an unreviewed overload is outside this approval)
  select array_agg(distinct p.proname) into v_names from pg_proc p where p.oid = any (v_oids);
  select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text) into v_extra
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names) and p.oid <> all (v_oids);
  if v_extra is not null then
    raise exception 'DEF-005: unreviewed function(s) with a reviewed name, nothing was changed: %. Review them and add them to this file explicitly.', array_to_string(v_extra, ', ');
  end if;

  -- 3. baseline of each reviewed function: a plain SECURITY DEFINER function owned by postgres, in the live "before" state (anon,
  --    authenticated and service_role can execute, no apply record) or in the "after" state (no client role, service_role can, and the
  --    apply record of THIS file with the md5 of the definition that is there now). All twelve must be in the same state.
  for r in
    select p.oid::regprocedure::text as sig, p.prokind, p.prosecdef, pg_get_userbyid(p.proowner) as owner_name,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s,
           obj_description(p.oid, 'pg_proc') as cmt, md5(pg_get_functiondef(p.oid)) as def_md5
    from pg_proc p where p.oid = any (v_oids)
  loop
    if r.prokind <> 'f' or not r.prosecdef or r.owner_name <> 'postgres' then
      v_drift := v_drift || format('%s (kind %s, security definer %s, owner %s)', r.sig, r.prokind, r.prosecdef, r.owner_name);
    elsif r.a and r.u and r.s then
      v_before := v_before + 1;
      if r.cmt like v_prefix || '%' then
        v_drift := v_drift || format('%s (open, but it carries an apply record of this file: a manual change after an apply)', r.sig);
      end if;
    elsif not r.a and not r.u and r.s then
      v_after := v_after + 1;
      if r.cmt is null or r.cmt not like v_prefix || '%' then
        v_drift := v_drift || format('%s (server-only without the apply record of this file: not applied by this file, or the record was removed)', r.sig);
      elsif substring(r.cmt from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64=') is distinct from r.def_md5 then
        v_drift := v_drift || format('%s (definition changed since the apply: recorded md5 %s, now %s)', r.sig,
          coalesce(substring(r.cmt from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64='), 'unreadable'), r.def_md5);
      end if;
    else
      v_drift := v_drift || format('%s (execute: anon %s, authenticated %s, service_role %s)', r.sig, r.a, r.u, r.s);
    end if;
  end loop;
  if cardinality(v_drift) = 0 and v_before > 0 and v_after > 0 then
    v_drift := v_drift || format('mixed state: %s of the twelve are open and %s are server-only', v_before, v_after);
  end if;
  if cardinality(v_drift) > 0 then
    raise exception 'DEF-005: reviewed function(s) drifted from the reviewed baseline, nothing was changed: %', array_to_string(v_drift, '; ');
  end if;

  -- 4. change exactly the reviewed oids that are still open: record the definition md5 and the original comment, then server-side
  --    only. No client role may execute them; service_role keeps access (scheduled jobs and the owner are unaffected).
  foreach v_oid in array v_oids loop
    continue when not (has_function_privilege('anon', v_oid, 'EXECUTE') and has_function_privilege('authenticated', v_oid, 'EXECUTE'));
    v_md5 := md5(pg_get_functiondef(v_oid));
    v_orig := obj_description(v_oid, 'pg_proc');
    execute format('comment on function %s is %L', v_oid::regprocedure,
      v_prefix || v_md5 || '; orig_b64=' || coalesce(replace(encode(convert_to(v_orig, 'UTF8'), 'base64'), E'\n', ''), '-'));
    execute format('revoke all on function %s from public', v_oid::regprocedure);
    execute format('revoke all on function %s from anon, authenticated', v_oid::regprocedure);
    execute format('grant execute on function %s to service_role', v_oid::regprocedure);
  end loop;

  -- 5. post-state guard
  for r in
    select p.oid::regprocedure::text as sig,
           has_function_privilege('anon', p.oid, 'EXECUTE') as a, has_function_privilege('authenticated', p.oid, 'EXECUTE') as u,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as s,
           obj_description(p.oid, 'pg_proc') as cmt, md5(pg_get_functiondef(p.oid)) as def_md5
    from pg_proc p where p.oid = any (v_oids)
  loop
    if r.a or r.u or not r.s
       or substring(r.cmt from '^DEF-005 applied; def_md5=([0-9a-f]{32}); orig_b64=') is distinct from r.def_md5 then
      raise exception 'DEF-005: post-state check failed for % (anon %, authenticated %, service_role %)', r.sig, r.a, r.u, r.s;
    end if;
  end loop;
end $$;

-- Deliberately kept public (client or middleware callers exist; product writes / reads under the public-world decision; rate limits
-- are a separate step):
--   telemetry sinks: ingest_event, track_visit, log_crawl, log_edge, log_security, log_journey_ab, log_journey_save, fn_log_name_research, recent_number_opens
--   community writes: propose_community_word, lang_link_add, ai_signal, increment_post_share, add_wall_word, save_wall_word_private
--   public reads: the feed / number / name / ELS / people readers listed in the README
