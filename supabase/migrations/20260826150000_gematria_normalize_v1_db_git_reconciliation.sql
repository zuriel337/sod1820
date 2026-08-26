-- ============================================================================
-- Gematria Normalization v1 — DB↔Git reconciliation (26.8.2026)
-- ============================================================================
-- BACKGROUND: fn_normalize_for_calc has been LIVE on Supabase since ~22.8.2026
-- (open PR #164's own scope), and gw_enforce_engine has called it before all
-- 14 *_calc functions ever since — but neither function's body was ever
-- committed to any migration file in this repo (confirmed via `git grep` across
-- all of supabase/migrations/: zero hits for "fn_normalize_for_calc"; every
-- "gw_enforce_engine" hit is a COMMENT referencing its existing behavior, never
-- its definition). This migration closes that gap.
--
-- THIS MIGRATION CHANGES NO BEHAVIOR. Both bodies below were pulled verbatim
-- via `pg_get_functiondef` from the live database on 2026-08-26 and are
-- reproduced here byte-for-byte (CREATE OR REPLACE, idempotent) purely so git
-- history matches live truth. If applied to a fresh/staging database, the
-- resulting function bodies are identical to what production has been running
-- since 22.8.2026 — nothing to test for "before vs after" because there is no
-- behavioral change, only a provenance record.
--
-- Companion: src/lib/gematria.js now exports normalizeForCalc(), a JS mirror of
-- fn_normalize_for_calc, ported in the same branch/PR — see
-- test/normalize-parity.test.mjs (574/574 value-checks against a live-DB-
-- captured fixture, re-verified live 26.8.2026 with zero drift).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_normalize_for_calc(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(input,''), '[֑-ׇ]', '', 'g'),      -- niqqud + teamim
      '[׳״‘’“”"'']', '', 'g'),                                       -- geresh/gershayim/quotes (ascii+unicode)
    '[,.;:()?!]', ' ', 'g'),                                          -- punctuation -> space (preserves word boundaries)
  '\s+', ' ', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.gw_enforce_engine()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_calc text;
begin
  v_calc := fn_normalize_for_calc(NEW.phrase);

  if v_calc ~ '^[א-ת]+( [א-ת]+)*$' then
    NEW.ragil         := ragil_calc(v_calc);
    NEW.misratar      := mistater_calc(v_calc);
    NEW.miluy         := miluy_calc(v_calc);
    NEW.kadmi         := kadmi_calc(v_calc);
    NEW.gadol         := gadol_calc(v_calc);
    NEW.siduri        := siduri_calc(v_calc);
    NEW.atbash        := atbash_calc(v_calc);
    NEW.albam         := albam_calc(v_calc);
    NEW.miluy_demiluy := miluy_demiluy_calc(v_calc);
    NEW.kadmi_gadol   := kadmi_gadol_calc(v_calc);
    NEW.ribua         := ribua_calc(v_calc);
    NEW.ribua_gadol   := ribua_gadol_calc(v_calc);
    NEW.hakpala       := hakpala_calc(v_calc);
    NEW.hakpala_gadol := hakpala_gadol_calc(v_calc);
  end if;

  NEW.all_values := (
    select array_agg(distinct v order by v)
    from unnest(array[NEW.ragil, NEW.misratar, NEW.gadol, NEW.siduri, NEW.miluy, NEW.kadmi,
                       NEW.atbash, NEW.albam, NEW.ribua, NEW.kadmi_gadol, NEW.miluy_demiluy,
                       NEW.ribua_gadol, NEW.hakpala, NEW.hakpala_gadol]) v
    where v is not null
  );

  return NEW;
end; $function$;

COMMENT ON FUNCTION public.fn_normalize_for_calc(text) IS
  'Calc-time normalization (Normalization v1): strips niqqud/teamim/geresh/gershayim/quotes, turns approved punctuation into a space, collapses whitespace. Never touches NEW.phrase itself — only the calc-time representation gw_enforce_engine feeds to the 14 *_calc functions. Reconciled into git 26.8.2026 (live since ~22.8.2026, no behavior change) — see src/lib/gematria.js normalizeForCalc() for the JS mirror.';
