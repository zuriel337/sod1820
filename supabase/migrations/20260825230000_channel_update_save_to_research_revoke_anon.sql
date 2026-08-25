-- SOD1820 — Zvi Human-Gate Workflow: close default PUBLIC/anon EXECUTE exposure
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: ZVI_HUMAN_GATE_WORKFLOW_SECURITY_FIX (Zuriel explicit live-verification finding)
--
-- Found live (verified via information_schema.role_routine_grants before writing this): creating
-- the function with CREATE OR REPLACE FUNCTION (20260825220000 migration) left the Postgres default
-- EXECUTE-to-PUBLIC grant in place — the migration's own explicit "GRANT EXECUTE ... TO authenticated"
-- was additive, not a replacement, so PUBLIC (and therefore anon, which is a member of PUBLIC) could
-- still call the RPC directly. Same class of bug as wa_word_review / fn_mem_add / fn_raziel_fact
-- (fixed earlier this session in 20260823_security_fix_anon_execute_revoke_and_null_bypass.sql and
-- 20260825150000_person_security_fn_mem_add_fn_raziel_fact_acl_fix.sql) — the function's own internal
-- users.role='admin' check already prevents any actual unauthorized write (a non-admin/anon caller
-- gets {ok:false,error:'admin_only'} and no row is touched), so this is an ACL-hygiene fix closing an
-- unnecessary attack surface, not a fix for a data breach that occurred.
--
-- No function body change (not needed and not requested) — this is ACL-only.
--
-- service_role intentionally NOT granted here: the only live caller of this RPC is the browser admin
-- client (authenticated role, gated by auth.uid()); a service_role caller would have no auth.uid()
-- and would hit the same internal admin_only refusal regardless of EXECUTE grant, so granting it would
-- add surface with zero functional benefit.

REVOKE ALL ON FUNCTION public.channel_update_save_to_research(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.channel_update_save_to_research(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.channel_update_save_to_research(uuid) TO authenticated;
