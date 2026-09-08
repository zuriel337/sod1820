-- H3 — pin search_path on the ONLY four client-callable SECURITY DEFINER functions that
-- still had a role-mutable search_path. Deliberately NOT a sweep: the advisor's 145
-- function_search_path_mutable findings are overwhelmingly SECURITY INVOKER functions,
-- which run with the caller's own privileges and are a different risk class.
-- Verified before pinning: none of the four uses an extension operator or references the
-- `extensions` schema; pg_trgm and vector are installed in public anyway, so pinning to
-- public resolves every object each function actually uses. Behaviour-preserving.
-- Reversible: alter function ... reset search_path;

alter function public.admin_promote_contrib_card(p_slug text, p_card_key text, p_phrases text[]) set search_path = public;
alter function public.contrib_unlock(p_key text, p_code text) set search_path = public;
alter function public.fn_en_search(p_word text, p_max_matches integer) set search_path = public;
alter function public.trg_wrq_emit_contribution() set search_path = public;
