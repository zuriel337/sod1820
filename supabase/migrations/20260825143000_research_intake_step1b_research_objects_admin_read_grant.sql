-- SOD1820 Research Intake — STEP 1B read-path fix: admin-only SELECT on research_objects
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: RESEARCH_INTAKE_STEP1B_READ_FIX (Zuriel GO, explicit column list + policy text supplied)
--
-- Found during STEP 1B's own E2E check: public.research_objects has RLS enabled (per the STEP 0
-- baseline, applied and verified as a no-op) but ZERO policies and ZERO SELECT grant to any
-- client-facing role — confirmed live via has_table_privilege('anon'/'authenticated', ...) = false
-- for both, and via a direct curl against the anon-key PostgREST endpoint returning
-- 42501 "permission denied for table research_objects". Only service_role could read it.
-- This predates STEP 1B (present since research_objects was first created out-of-band, before
-- any tracked migration) — it was never exercised because every prior consumer
-- (fn_persist_discovery, admin_research_review, research-extract edge fn) reads/writes via
-- service_role or SECURITY DEFINER, never a direct client select. PipelineCReview
-- (src/components/WarRoomTab.jsx, STEP 1B) is the first thing that needs one.
--
-- Fix, per rls_client_read_protocol (CLAUDE.md) and per Zuriel's explicit instruction:
--   1. Column-scoped GRANT SELECT to `authenticated` only, for exactly the 16 columns the
--      PipelineCReview UI reads or filters by. No `GRANT SELECT ON research_objects` (no
--      table-wide grant) — sensitive/internal columns (meta, owner_person_id, evidence,
--      parent_id, contributor as a free-text field is included since the UI displays it) stay
--      inaccessible via direct client select. `status` is included because the UI's
--      `.eq('status','candidate')` filter needs column-level SELECT on it even though it is not
--      in the returned column list.
--   2. RLS SELECT policy for `authenticated` only, admin-gated via the exact same
--      `users.role='admin'` check admin_research_review itself already uses — no new
--      authorization concept introduced.
--   3. No policy for `anon` — anon stays fully denied (no grant either, so RLS is moot for it,
--      but the absence of an anon policy is itself intentional and explicit here).
--   4. No INSERT/UPDATE/DELETE grant of any kind. admin_research_review (SECURITY DEFINER)
--      remains the only write path — this migration does not touch it.
--   5. No change to any other table, function, or the 192 historical research_objects rows.

GRANT SELECT (
  id, created_at, kind, statement, terms, value, relates, source, source_ref, contributor,
  confidence, engine_verified, engine_detail, status, privacy_scope, promoted_node_id
) ON public.research_objects TO authenticated;

CREATE POLICY ro_admin_read ON public.research_objects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );
