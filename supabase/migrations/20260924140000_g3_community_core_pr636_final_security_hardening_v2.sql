-- G3 Community Core — PR #636 final security hardening v2 (BRANCH-ONLY, NOT APPLIED LIVE).
-- Assignment work_log.id=50a9b27d-d22e-47e2-9089-81441342baff, task_key=
-- G3_COMMUNITY_CORE_PR636_FINAL_SECURITY_HARDENING_V2, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
-- Verified live (2026-09-24): none of the functions touched below exist on
-- linswmnnkjxvweumprav yet, so this closes a branch-only evidence gap, not a live drift.
--
-- Drift found: every function this PR's earlier migrations added under
-- 20260923200000_g3_community_core_2029_phase2_shadow.sql and
-- 20260924101400_g3_community_core_pr636_search_index_gate.sql was left on Postgres'
-- CREATE FUNCTION default ACL (EXECUTE granted to PUBLIC), unlike
-- g3_openweb_import_message (20260924103000 / 20260924125000 / 20260924130000), which already
-- carries an explicit revoke/grant pair on every redefinition, and unlike the
-- fn_raziel_research_intel_scoped root-of-trust pattern
-- (20260911120000_w2_2b_raziel_intel_root_of_trust_v1.sql) this file's own §3 comment says it
-- extends. This migration closes that gap with one explicit revoke + grant per function; no
-- function body changes.
--
-- EXTEND_EXISTING only: grants only, on the exact signatures already live in this branch's own
-- migrations. No new table/function/store.
--
-- Split by intended caller:
--   * Public read projections (approved-only, no PII column, fail-closed internally on
--     auth.uid()) stay reachable by anon/authenticated, exactly as their own header comments
--     already describe ("safe to expose more broadly") — community_stream_projection,
--     community_search_facts, fn_raziel_community_intel_scoped, post_conversation_projection.
--   * community_contribution_index_eligible is an internal decision_ledger reader only ever
--     called from inside the SECURITY DEFINER functions above — never called directly by a
--     client — so it is locked to service_role/postgres, mirroring g3_openweb_import_message's
--     existing lockdown. A nested call from those SECURITY DEFINER callers still works: it runs
--     as the calling function's owner, not the original client role.
--   * contributors_claim_legacy performs a write gated on auth.uid() and email confirmation
--     (raise exception 'not_authenticated' when auth.uid() is null); anon can never satisfy that
--     check, so anon execute is revoked, leaving only authenticated (and service_role for
--     trusted server-side relink tooling, matching g3_openweb_import_message's operational
--     grant), never anon or public.

revoke execute on function public.community_stream_projection(text, text, timestamptz, integer) from public;
grant execute on function public.community_stream_projection(text, text, timestamptz, integer) to anon, authenticated, service_role;

revoke execute on function public.community_search_facts(text, integer) from public;
grant execute on function public.community_search_facts(text, integer) to anon, authenticated, service_role;

revoke execute on function public.fn_raziel_community_intel_scoped(text, text, timestamptz, integer) from public;
grant execute on function public.fn_raziel_community_intel_scoped(text, text, timestamptz, integer) to anon, authenticated, service_role;

revoke execute on function public.post_conversation_projection(bigint, integer) from public;
grant execute on function public.post_conversation_projection(bigint, integer) to anon, authenticated, service_role;

revoke execute on function public.community_contribution_index_eligible(uuid) from public, anon, authenticated;
grant execute on function public.community_contribution_index_eligible(uuid) to service_role, postgres;

revoke execute on function public.contributors_claim_legacy(uuid) from public, anon;
grant execute on function public.contributors_claim_legacy(uuid) to authenticated, service_role;
