-- MF-X2 — METHOD LIFECYCLE ENFORCEMENT IN THE CANONICAL DISPATCHER
--
-- Fixes the EXISTING dispatcher. No new dispatcher, registry, engine, router or store.
--
-- DEFECT (proven live before the change)
--   public.fn_dispatch_method(text, text) resolved the registry with:
--       WHERE method_key = p_method_key AND function IS NOT NULL
--   and never checked `active`. A method explicitly DISABLED by the Human Gate could
--   therefore still execute through the canonical dispatch path:
--       fn_dispatch_method('מילוי גדול','אמת') = 1887   while active = false
--       fn_dispatch_method('רגיל','אמת')       = 441    (control, active = true)
--   Exactly one method is affected today: 'מילוי גדול' -> fn_miluy_gadol
--   (execution_kind='sql_function', category='depth', active=false, function present).
--
-- CANONICAL ELIGIBILITY RULE — derived from live governance, not assumed
--   canonical_methods_registry_law v2:
--     "registered, active, in_engine, stored ו-displayed הם מצבים נפרדים ונמדדים live"
--     — these states are explicitly NOT synonyms.
--   engine_governance_registry_authority_law v1, HG-E1 (29.8.2026):
--     "ACTIVE != SCANNABLE. SCANNABLE הוא שער-Human-Gate עצמאי ומפורש
--      (gematria_methods.scannable, default false). אינו נגזר."
--     with the law's own live proof: 'אות רבתי' is active + in_engine + executable +
--     dependency-verified and still NOT scannable.
--   src/lib/supabase.js:3181 confirms the WRITE/scan contract is the quadruple
--     "scannable ∧ active ∧ executable ∧ engine_verified" — that gates CORPUS SCANNING
--     and automatic writes, NOT direct calculation.
--
--   => FORWARD DIRECT-DISPATCH ELIGIBILITY = REGISTERED ∧ ACTIVE ∧ FUNCTION WIRED.
--      scannable / engine_verified / stored / displayed are deliberately NOT added here:
--      they are separate axes with their own Human Gates, and conflating them would
--      silently widen this gate beyond what governance actually says.
--
-- INACTIVE-RETURN CONTRACT — derived from existing callers, NOT invented
--   The dispatcher already returns NULL for "unknown method" and "no function wired":
--       IF v_fn IS NULL THEN RETURN NULL; END IF;
--   All six in-DB callers already handle NULL explicitly:
--     fn_composite_calc, fn_composite_calc_all_ops .. "if v is null then return; end if"
--     fn_deep_cross ......................... "is_match = (va IS NOT NULL AND va = vb)"
--     fn_deep_cross_reverse ................. consumes the value-or-NULL result
--     fn_method_value ....................... propagates it
--     fn_method_profile ..................... pre-filters `active` before dispatching
--   Raising an exception instead would BREAK fn_deep_cross and fn_composite_calc, which
--   expect value-or-NULL rather than an error. NULL is therefore the correct, existing,
--   backward-compatible "not dispatchable" signal, and an inactive method now joins the
--   same class as an unknown one. No new error contract is introduced.
--
-- SCOPE
--   One predicate added to one SELECT. Signature, return type, volatility (STABLE),
--   security mode (INVOKER) and ACL are all unchanged; CREATE OR REPLACE preserves the
--   existing ACL. This is a pure, read-only calculator, so its ACL is out of scope here.
--
-- DECLARED LIMITATION (stated, not hidden)
--   The raw per-method SQL functions remain directly callable — fn_miluy_gadol carries
--   "=X/postgres | postgres | anon | authenticated", so a direct call still returns 1887.
--   This migration closes the REGISTRY-DRIVEN execution boundary, which is what governance
--   controls and what every engine caller uses; it cannot prevent a direct raw-function
--   call. Same shape as the declared SECURITY DEFINER projection boundary in MF-G3.
--
-- REPORTED, NOT FIXED HERE
--   fn_method_is_executable(text) has the same omission in its ATOMIC branch: for
--   execution_kind in ('sql_function','context_activated') it returns
--   "function is not null and to_regproc(...) is not null" with no `active` check, so
--   fn_method_is_executable('מילוי גדול') answers TRUE. Its COMPOSITE branch does require
--   component `active`. With the dispatcher fixed the real execution boundary is closed
--   regardless, so this is a consistency follow-up needing its own Human-Gate decision.
--
-- IDEMPOTENT: CREATE OR REPLACE may be replayed safely.

create or replace function public.fn_dispatch_method(p_method_key text, p_phrase text)
returns bigint
language plpgsql
stable
set search_path to 'public'
as $function$
DECLARE
  v_fn text; v_result bigint;
BEGIN
  -- MF-X2: `active` is the Human-Gate lifecycle flag for direct dispatch. A method that
  -- governance has disabled must not execute, and is reported through the SAME existing
  -- NULL signal already used for unknown/unwired methods (see migration header).
  SELECT function INTO v_fn
    FROM public.gematria_methods
   WHERE method_key = p_method_key
     AND active = true
     AND function IS NOT NULL;
  IF v_fn IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT (%I($1))::bigint', v_fn) INTO v_result USING p_phrase;
  RETURN v_result;
END;
$function$;

comment on function public.fn_dispatch_method(text, text) is
  'Canonical registry-driven method dispatcher. Eligibility = registered AND active AND function wired (canonical_methods_registry_law v2; engine_governance_registry_authority_law HG-E1: ACTIVE != SCANNABLE, so scannable/engine_verified are NOT dispatch gates). Returns NULL when the method is unknown, unwired, or DISABLED by the Human Gate — the existing backward-compatible unavailable signal that all callers already handle. MF-X2, 30.8.2026.';
