-- SOD1820 — MF-G2 Security fix: close PUBLIC/anon EXECUTE exposure on the 4 SECURITY DEFINER
-- canonical graph writers.
-- Actor: CLAUDE. Date: 2026-08-30. Human-Gate authorized (narrow security fix, separate from the
-- One Tree build). work_log BEFORE 3d218382-c64a-4324-b858-672ec42b0d3c.
--
-- FOUND LIVE (verified this session, not assumed):
--   get_or_create_entity_node(text,text,jsonb) · upsert_edge(uuid,uuid,text,jsonb) ·
--   graph_wire_all() · graph_wire_number(integer)
-- are all SECURITY DEFINER, owned by postgres, with `proacl IS NULL` — i.e. no explicit ACL was ever
-- set, so PostgreSQL's DEFAULT "EXECUTE TO PUBLIC" applies and Supabase's `anon` role inherits it.
-- has_function_privilege('anon', ..., 'EXECUTE') = true on all four.
--
-- (Diagnostic note for future passes: an aclexplode-based probe reports public_grants=0 here, which
-- is a FALSE NEGATIVE — aclexplode over a NULL proacl yields no rows even though the effective grant
-- is PUBLIC. Use has_function_privilege, not aclexplode, to test effective EXECUTE.)
--
-- WHY THIS IS A LIVE DEFECT, not a future concern: none of the four contains any auth.uid()/admin
-- gate before writing to `nodes`/`edges`, and being SECURITY DEFINER they BYPASS RLS — so the
-- SELECT-only RLS policies on nodes/edges (0 anon write grants) are NOT a mitigating control. An
-- anonymous caller could create arbitrary canonical One Tree nodes and edges. `graph_wire_all` is
-- additionally unbounded (it iterates every number 1..100000), making it a denial-of-service and
-- graph-pollution vector.
--
-- CALLER ANALYSIS PERFORMED BEFORE CHOOSING THE GRANT LIST (per the fn_mem_add / fn_raziel_fact /
-- wa_word_review precedent — "use the minimum privilege the live callers actually need"):
--   * grep across src/, api/ and supabase/functions/ for all four names → ZERO client RPC call
--     sites. No supabase.rpc(...) anywhere in the codebase.
--   * Internal SQL callers: project_contribution_to_graph (SECURITY DEFINER, anon EXECUTE=false)
--     calls get_or_create_entity_node + upsert_edge; graph_wire_all calls graph_wire_number.
--   * Server callers: cron.job id 43 `graph-wire-daily` ('30 3 * * *', active) runs
--     `select public.graph_wire_all();` as postgres.
--   * No Edge Function calls any of the four.
--
-- WHY REVOKING IS SAFE FOR THE INTERNAL CHAIN: all four, and project_contribution_to_graph, are
-- owned by postgres and are SECURITY DEFINER. Inside a SECURITY DEFINER function current_user is the
-- OWNER, so the nested calls are permission-checked against postgres, which retains EXECUTE as owner.
-- pg_cron likewise runs as postgres. Revoking from PUBLIC/anon/authenticated therefore cannot break
-- any live path. This is proven by execution in the verification pass, not merely asserted.
--
-- INTENDED CALLER MATRIX:
--   get_or_create_entity_node  -> internal only (project_contribution_to_graph, as owner)
--   upsert_edge                -> internal only (project_contribution_to_graph, as owner)
--   graph_wire_number          -> internal only (graph_wire_all, as owner)
--   graph_wire_all             -> server/automation only (cron job 43, as owner)
--
-- SCOPE: ACL-only. No function body changed, no logic changed, no schema change, no data mutation,
-- no duplicate cleanup, no graph semantics change. service_role is granted explicitly to preserve
-- the existing server-automation capability exactly as it stands today (service_role already held
-- EXECUTE via the PUBLIC default) — this is preservation, NOT widening. anon and authenticated lose
-- EXECUTE; that is the entire client-reachable attack surface.
--
-- Deliberately NOT done: no in-body admin assertion was added. These are internal/server helpers
-- with zero client callers; adding a gate would change function semantics (out of scope for this
-- task) and is redundant once no client role can reach them.
--
-- NOT part of this fix: MF-G1 (graph identity invariant / 215 duplicate nodes) and MF-G3 (graph
-- privacy dimension) remain OPEN and untouched.

REVOKE ALL ON FUNCTION public.get_or_create_entity_node(p_type text, p_label text, p_meta jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_entity_node(p_type text, p_label text, p_meta jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.get_or_create_entity_node(p_type text, p_label text, p_meta jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_entity_node(p_type text, p_label text, p_meta jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.graph_wire_all() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.graph_wire_all() FROM anon;
REVOKE ALL ON FUNCTION public.graph_wire_all() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.graph_wire_all() TO service_role;

REVOKE ALL ON FUNCTION public.graph_wire_number(n integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.graph_wire_number(n integer) FROM anon;
REVOKE ALL ON FUNCTION public.graph_wire_number(n integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.graph_wire_number(n integer) TO service_role;

-- ── SIBLING EXACT-PATTERN MATCH (narrow check, same defect class, mechanical fix) ────────────────
-- fn_ti_project_demand(date,date,text,integer) matched the SAME pattern exactly: SECURITY DEFINER,
-- owned by postgres, proacl IS NULL (default PUBLIC EXECUTE, anon=true), and NO auth.uid()/admin gate.
-- It is strictly WORSE than a write-only exposure: it DELETEs canonical rows —
--   `delete from public.edges where relation_type='demand_signal' and metadata->>'period'=p_period;`
-- plus `delete from public.ti_demand_signals where period=p_period;` — so an anonymous caller could
-- destroy canonical graph edges, not merely add to them.
--
-- Caller analysis (same method): ZERO callers in src/, api/, supabase/functions/ and zero in
-- migrations. Sole SQL caller is fn_ti_daily, run by cron.job id 48 `ti-demand-daily`
-- ('40 3 * * *', active) as postgres — the identical server/automation shape as graph_wire_all.
-- Intended caller: SERVER/AUTOMATION ONLY. Same ACL correction therefore applies unchanged.
--
-- Deliberately NOT included (checked and excluded as NOT the same defect class):
--   * add_entity — anon EXECUTE=true BUT contains an internal admin check (auth.uid() + role='admin'),
--     so it is already guarded; defense-in-depth, not an exposure.
--   * wire_image_meaningful / wire_number_to_images — anon EXECUTE=true BUT they are SECURITY
--     INVOKER, so they run as the caller and RLS applies; nodes/edges have SELECT-only policies with
--     0 anon write grants, so anon writes are already blocked. Different class.
--   * Everything else writing nodes/edges already had anon EXECUTE=false.

REVOKE ALL ON FUNCTION public.fn_ti_project_demand(p_from date, p_to date, p_period text, p_min integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_ti_project_demand(p_from date, p_to date, p_period text, p_min integer) FROM anon;
REVOKE ALL ON FUNCTION public.fn_ti_project_demand(p_from date, p_to date, p_period text, p_min integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ti_project_demand(p_from date, p_to date, p_period text, p_min integer) TO service_role;
