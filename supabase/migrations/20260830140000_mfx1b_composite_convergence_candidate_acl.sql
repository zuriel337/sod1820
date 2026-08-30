-- MF-X1b — COMPOSITE CONVERGENCE CANDIDATE AUTHORIZATION CLOSURE (ACL-only)
--
-- SEPARATE DEFECT. This is NOT part of MF-X1's history and must not be read as such.
--   MF-X1  (fn_generate_convergence_candidates): proacl IS NULL — an ACCIDENTAL default
--           EXECUTE TO PUBLIC, exploitable by anon.
--   MF-X1b (this one):                            an EXPLICIT but OVER-BROAD grant to the
--           authenticated role on a SECURITY DEFINER function that carries no internal
--           authorization. anon was already blocked; the exposure is to every logged-in user.
--
-- ROOT CAUSE
--   public.fn_composite_convergence_candidate(integer, uuid[], text) is SECURITY DEFINER,
--   owned by postgres, with ACL:
--       postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres
--   and NO auth.uid()/admin gate anywhere in its body. Because SECURITY DEFINER executes
--   with the owner's rights, ANY ordinary authenticated non-admin user held a direct write
--   path into the shared Human-Gate candidate queue.
--
-- WHAT THE FUNCTION CAN ACTUALLY DO (the three capabilities, deliberately not conflated)
--   1. DIRECT CANDIDATE CREATION — yes.
--      Branch NEW_COMPOSITE_CANDIDATE: insert into research_candidates (... status='pending').
--   2. ENRICHMENT / UPDATE OF AN EXISTING PENDING CANDIDATE — yes, and this is the more
--      serious capability. Branch ENRICH_EXISTING_CANDIDATE:
--          update public.research_candidates
--             set why = why || jsonb_build_object('enriched_at', now()::text, 'enrichment', ...),
--                 evidence_refs = (...)
--          where id = v_existing_pending_id
--      i.e. it mutates a row it did not create. An arbitrary logged-in user could therefore
--      tamper with the evidence a human reviewer sees on someone else's pending candidate.
--   3. HUMAN-GATE DECISION — no. It never writes decision_ledger and never changes status.
--      That separation is correct and is preserved untouched here. Being logged in must not
--      confer authority over the shared queue; but the function itself does not decide.
--
-- CALLER MATRIX (exhaustive, established before this change)
--   source callers in src/ api/ supabase/ scripts/ .... 0
--   Edge Functions ................................... 0
--   pg_cron .......................................... 0
--   in-DB SQL callers ................................ 0
--   FALSE POSITIVE RESOLVED: dist/assets/AdminPage-*.js contains the literal string, which
--   looked like a live admin-UI caller. It is not. dist is an untracked build artifact and the
--   surrounding bytes are verbatim Hebrew Roadmap prose (§106/§440) — SOD1820_MASTER_ROADMAP.md
--   is bundled as raw text for the Roadmap Command Center (src/lib/roadmapParser.js consumes
--   that markdown). It is DOCUMENTATION, not an RPC call.
--
-- LEGITIMATE CALLER CONTRACT (from canonical docs, not inference)
--   Master State §946 and Roadmap §106 define it verbatim:
--     Sequence Finding (ephemeral) -> explicit human save -> candidate research_objects row
--     -> explicit/controlled selection of IDs -> fn_composite_convergence_candidate
--        ("הגשר של Claude — חתימתו החיה דורשת p_target_value+p_research_object_ids+p_by,
--          לעולם לא-אוטומטי" / never automatic)
--     -> research_candidate -> Human Gate.
--   Roadmap §894 records it as MERGED-DB-live from branch claude/composite-convergence-bridge-v1.
--   => The intended caller is an AGENT/SERVER-OPERATED BRIDGE, invoked deliberately with
--      explicit research_object IDs. No ordinary authenticated product flow exists or is
--      intended, so revoking `authenticated` breaks nothing.
--
-- SCOPE
--   ACL only. Body NOT modified (verified byte-identical: md5(prosrc) =
--   d1782a0b0554bb3b91950aad5e79898a, length 10778, before and after). Candidate scoring
--   semantics, convergence classification, dependency-group calculation, candidate truth
--   states and the Human-Gate workflow are all provably unchanged.
--
-- IDEMPOTENT: REVOKE/GRANT are declarative and may be replayed safely.

revoke all on function public.fn_composite_convergence_candidate(integer, uuid[], text) from authenticated;
-- Defensive: these were already absent, restated so a replay on any environment converges.
revoke all on function public.fn_composite_convergence_candidate(integer, uuid[], text) from public;
revoke all on function public.fn_composite_convergence_candidate(integer, uuid[], text) from anon;

-- Preserve the one genuinely required non-owner caller class: the agent/server-side bridge.
grant execute on function public.fn_composite_convergence_candidate(integer, uuid[], text) to service_role;

comment on function public.fn_composite_convergence_candidate(integer, uuid[], text) is
  'Composite convergence bridge: proposes or enriches a pending research_candidates row from explicitly selected research_object IDs. SECURITY DEFINER with no internal auth gate by design — it is never automatic and is invoked deliberately by an agent/server bridge (Master State §946, Roadmap §106). It can create AND enrich candidates, so EXECUTE is restricted to postgres (owner) and service_role. It never writes decision_ledger and never changes candidate status — the Human Gate stays separate. MF-X1b, 30.8.2026. Do not grant to anon/authenticated/PUBLIC.';
