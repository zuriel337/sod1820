-- DEF-005 pre-apply read-only query (package P1, review finding CR-X1): run on the canonical project IMMEDIATELY BEFORE the apply.
-- The apply file holds no reviewed text of the twelve function BODIES, so it cannot detect a body that was replaced before it ran. This
-- query prints what is there: the operator compares `def_md5` with the md5 values of the reviewed definitions (the values read on
-- 12.11.2026 are in the approval request for this step). The apply then records exactly these md5 values in the comments of the functions.
-- Nothing is executed or written; the functions are not called.
select p.oid::regprocedure::text as signature, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_x, has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_x,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_x,
       obj_description(p.oid, 'pg_proc') is not null as has_comment, md5(pg_get_functiondef(p.oid)) as def_md5
from unnest(array['public.fn_edge_grant_audit()','public.fn_rls_grant_audit()','public.check_security_spike()','public.snapshot_seo_wave(integer,integer)',
  'public.fn_detect_patterns(integer,text)','public.fn_detect_pattern_contradictions()','public.fn_scan_reeval(text,text)','public.fn_outbox_bump(text)',
  'public.fn_raziel_claim(text)','public.fn_raziel_claims_gc()','public.ai_quota_check(text,text,integer)','public.router_rate_check(uuid,integer)']) s(sig)
join pg_proc p on p.oid = to_regprocedure(s.sig)
order by 1;
