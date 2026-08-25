-- SOD1820 — Security fix: close PUBLIC/anon EXECUTE exposure on fn_mem_add + fn_raziel_fact
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: PERSON_SECURITY_FIX (flagged live, unfixed, in Master State §23.7 — PERSONAL_FOUNDATION_CANONICALIZATION)
--
-- Found live (verified this session): both functions are SECURITY DEFINER with EXECUTE granted to
-- anon AND authenticated (in addition to service_role). Neither function checks any caller identity
-- against its own p_user/p_user_ref parameter — both accept an arbitrary free-text identifier and
-- write into agent_user_memory under it. Today this means literally any unauthenticated caller can
-- write (fn_mem_add) or overwrite (fn_raziel_fact, which UPDATEs an existing row keyed on
-- user_ref+agent+memory_type+topic before falling back to INSERT) another person's memory/profile
-- record, and any authenticated non-owner could do the same for fn_raziel_fact specifically since it
-- has no ownership check at all. Same class of bug as wa_word_review (fixed in
-- 20260823_security_fix_anon_execute_revoke_and_null_bypass.sql), but here the ACL exposure is wider
-- (anon too, not just a null-bypass) and there is no internal check to fall back on.
--
-- Caller analysis performed before choosing the grant list (not assumed):
--   grep across src/ and supabase/functions/ for fn_mem_add / fn_raziel_fact found exactly 3 call
--   sites, all in WhatsApp-bot Edge Functions, ALL using the service_role client
--   (createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)), never the anon-key client that some of
--   those same files also happen to instantiate for unrelated purposes:
--     - supabase/functions/wa-raziel/index.ts:105,109  -> sb.rpc('fn_raziel_fact', {p_user_ref: userRef, ...})
--     - supabase/functions/wa-uriel/index.ts:214,216    -> sb.rpc('fn_mem_add', {p_user: CHRISTINA, ...})
--     - supabase/functions/wa-hatishbi/index.ts:119,120 -> sb.rpc('fn_mem_add', {p_user: YISKA, ...})
--   Zero call sites found in src/ (browser/client code) or in any admin surface (AdminPage.jsx,
--   WarRoomTab.jsx). No authenticated (non-service-role) caller is live today.
--
-- Per instruction: do not grant `authenticated` automatically just because that is the shape of the
-- wa_word_review precedent — use the minimum privilege the live callers actually need. Since every
-- real caller already runs as service_role, and no ownership check exists that would make direct
-- authenticated-client calls safe, the correct minimum here is service_role only. This is an ACL-only
-- fix: no function body changed, no new check added, no schema change — sufficient because removing
-- anon/authenticated EXECUTE removes the entire client-reachable attack surface (a function nobody
-- but service_role can call has no caller to spoof p_user/p_user_ref against).

REVOKE ALL ON FUNCTION public.fn_mem_add(
  p_user text, p_agent text, p_memory_type text, p_content text, p_topic text,
  p_visibility text, p_status text, p_source text, p_confidence smallint, p_channel text, p_data jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_raziel_fact(
  p_user_ref text, p_channel text, p_kind text, p_value text, p_data jsonb, p_visibility text, p_confidence smallint
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_mem_add(
  p_user text, p_agent text, p_memory_type text, p_content text, p_topic text,
  p_visibility text, p_status text, p_source text, p_confidence smallint, p_channel text, p_data jsonb
) TO service_role;

GRANT EXECUTE ON FUNCTION public.fn_raziel_fact(
  p_user_ref text, p_channel text, p_kind text, p_value text, p_data jsonb, p_visibility text, p_confidence smallint
) TO service_role;
