-- MF-X1 — CONVERGENCE CANDIDATE WRITER SECURITY CLOSURE (ACL-only)
--
-- ROOT CAUSE
--   public.fn_generate_convergence_candidates(integer, text) was created without an
--   explicit ACL. In PostgreSQL, proacl IS NULL means the default applies:
--   EXECUTE TO PUBLIC. The function is SECURITY DEFINER, owned by postgres, and its
--   body INSERTs into public.research_candidates with NO internal auth/admin check.
--   Net effect: any anonymous caller could inject rows into the Human-Gate review
--   queue. This is the identical failure mode closed for the graph writers in MF-G2.
--
--   Proven live (probe rolled back, 30.8.2026): as role anon,
--     before=42  after=43  inserted=1  result={"generated": 1}  error=(none)
--
-- CALLER MATRIX (exhaustive, established before this change)
--   client/browser JS ....... 0 direct callers (repo-wide grep js/jsx/ts/tsx/sql/json)
--   Edge Functions .......... 0
--   pg_cron ................. 0  (jobs 27/28/29/49 call fn_metatron_* only)
--   in-DB ................... 1  — public.admin_generate_candidates(integer)
--   real product path ....... browser admin
--                             -> supabase.rpc('admin_generate_candidates')   [src/lib/visits.js:327]
--                             -> admin_generate_candidates  (SECURITY DEFINER, owner postgres,
--                                enforces: users.id = auth.uid() AND role='admin', else
--                                raise exception 'not authorized')
--                             -> fn_generate_convergence_candidates(p_limit,'metatron')
--
--   => Intended caller class is the SECURITY DEFINER wrapper plus server-side
--      (postgres / service_role). NO client role requires direct EXECUTE.
--
-- WHY ACL-ONLY IS SUFFICIENT AND SAFE
--   admin_generate_candidates is SECURITY DEFINER owned by postgres, so its nested
--   call to this function is permission-checked against the OWNER, not against the
--   invoking client role. Revoking client EXECUTE on the inner function therefore
--   cannot break the admin flow — the same nested-chain property proven in MF-G2.
--
--   Deliberately NOT adding an internal auth check: the real Human-Gate already
--   exists one level up in admin_generate_candidates, and duplicating it inside would
--   change behaviour for the legitimate server-side/service_role path. Security is
--   restored by removing an accidental grant, not by inventing a second gate.
--
-- SCOPE
--   ACL only. The function body is NOT modified (verified byte-identical:
--   md5(prosrc) = a6493774e1f5fb8b0fe4eca1325b4cef, length 3288, before and after).
--   No change to calculation or candidate-generation semantics, candidate truth
--   states, convergence semantics, method participation, or the Human-Gate workflow.
--
-- IDEMPOTENT: REVOKE/GRANT are declarative and may be replayed safely.

revoke all on function public.fn_generate_convergence_candidates(integer, text) from public;
revoke all on function public.fn_generate_convergence_candidates(integer, text) from anon;
revoke all on function public.fn_generate_convergence_candidates(integer, text) from authenticated;

-- Preserve the one genuinely required non-owner caller class: server-side automation.
grant execute on function public.fn_generate_convergence_candidates(integer, text) to service_role;

comment on function public.fn_generate_convergence_candidates(integer, text) is
  'Generates convergence candidates into research_candidates (Human-Gate review queue). SECURITY DEFINER, no internal auth check by design: the Human Gate is enforced one level up by admin_generate_candidates (auth.uid() + users.role=admin). EXECUTE is restricted to postgres (owner) and service_role — MF-X1, 30.8.2026. Do not grant to anon/authenticated/PUBLIC.';
