-- ============================================================================
-- PART A — number_anchors TEMPORARY ACCESS FREEZE (ANCHOR_RESEARCH_DEFERRED_BY_ZURIEL)
-- Zuriel decision: Number Anchors reconciliation is deferred until Methods/Composites/
-- Deep Cross/convergence work closes. The table + its 35 rows are preserved research/
-- provenance data — NOT dropped, NOT deleted, NOT rewritten. Only direct client
-- (anon/authenticated) read access is revoked. service_role/postgres keep full access.
-- ============================================================================
REVOKE ALL ON public.number_anchors FROM anon, authenticated;

-- ============================================================================
-- PART B — AIQ BEKAR (אי"ק בכ"ר) — verified external classical cipher.
-- Same "Nine Chambers" family already documented in public sources (chabadpedia.co.il
-- and the Western/Hermetic "Qabalah of Nine Chambers" tradition), same cipher-family as
-- the already-active אטב"ש/אלב"ם/אח"ס בט"ע. 9 chambers of 3 letters, grouped by shared
-- digit-root after removing zeros (units/tens/hundreds): 1-10-100, 2-20-200, ... 9-90-900.
-- Direction verified against the task's own published fixture (שלום -> גשסו -> 369):
-- cyclic forward within each chamber (units -> tens -> hundreds -> units).
--
-- Table (27 symbols, finals distinct per Q1):
--   א י ק  |  ב כ ר  |  ג ל ש
--   ד מ ת  |  ה נ ך  |  ו ס ם
--   ז ע ן  |  ח פ ף  |  ט צ ץ
-- ============================================================================
CREATE OR REPLACE FUNCTION public.aiq_bekar_transform(p text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  -- Character-by-character substitution across the WHOLE phrase; spaces/punctuation/
  -- niqqud/non-Hebrew characters pass through untouched (translate() leaves unmapped
  -- characters as-is) — word boundaries are irrelevant to this transform (Q4).
  SELECT translate(p,
    'איקבכרגלשדמתהנךוסםזעןחפףטצץ',
    'יקאכרבלשגמתדנךהסםוענזפףחצץט'
  );
$$;

COMMENT ON FUNCTION public.aiq_bekar_transform(text) IS
  'AIQ BEKAR (Nine Chambers) letter substitution only — the transform half of the cipher. Verified against the published fixture שלום->גשסו. Final letters (ךםןףץ) are distinct table members per the source-confirmed 27-symbol structure, not normalized. Feeds into fn_ragil for the numeric value (aiq_bekar_calc) — this function never computes a numeric result itself, per Q3 (no separate invented numeric table).';

CREATE OR REPLACE FUNCTION public.aiq_bekar_calc(p text)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  -- Q3: the transformed text is scored through the CANONICAL ordinary gematria engine
  -- (fn_ragil) — never a separate hand-built numeric table. Verified fixture:
  -- aiq_bekar_calc('שלום') = 369 (ג=3+ש=300+ס=60+ו=6).
  SELECT fn_ragil(public.aiq_bekar_transform(p));
$$;

COMMENT ON FUNCTION public.aiq_bekar_calc(text) IS
  'AIQ BEKAR (אי"ק בכ"ר) — Nine Chambers cipher, external classical method (not Zuriel-invented). Definition verified from public sources this session + the task''s own published fixture (שלום=369). Computes aiq_bekar_transform(p) through canonical fn_ragil — no independent numeric table, no second engine. version=1.';

-- Registry entry — NO existing row was found for איק בכר despite Decision G referencing
-- it as HOLD (DRIFT, documented in the BEFORE work_log memo) — this INSERT is the first
-- registry row for it, following the exact same pattern as every prior atomic method
-- (base category, public access per Part D: no Premium invented without a prior canonical
-- decision). Dependency metadata populated in the same columns this session's prior pass
-- added to gematria_methods (mathematical_family/order_sensitive/etc.) — same structural
-- class as אטב"ח (substitution + pure sum): order-independent overall, but final-letter-
-- sensitive because the substitution table itself treats finals as distinct members.
INSERT INTO public.gematria_methods
  (method_key, display_label, category, sub, sort_order, db_column, in_engine, function,
   active, deterministic, source_of_truth, required_entitlement, version,
   mathematical_family, order_sensitive, word_boundary_sensitive, final_letter_sensitive,
   whitespace_normalization, punctuation_normalization, dependency_version, dependency_verified_at)
VALUES
  ('איק בכר', 'אי"ק בכ"ר', 'base', 'תשעה חדרים', 29, NULL, false, 'aiq_bekar_calc',
   true, true, 'external classical cipher (Nine Chambers / תשעה חדרים family, same tradition as אטב"ש/אלב"ם/אח"ס בט"ע) — verified this session via public sources + fixture שלום=369, not Zuriel-invented',
   'public', 1,
   'base_additive_substitution', false, false, true,
   'irrelevant_pure_sum', 'irrelevant_pure_sum', 1, now())
ON CONFLICT (method_key) DO UPDATE SET
  function = excluded.function, active = excluded.active, source_of_truth = excluded.source_of_truth,
  mathematical_family = excluded.mathematical_family, order_sensitive = excluded.order_sensitive,
  word_boundary_sensitive = excluded.word_boundary_sensitive, final_letter_sensitive = excluded.final_letter_sensitive,
  whitespace_normalization = excluded.whitespace_normalization, punctuation_normalization = excluded.punctuation_normalization,
  dependency_version = excluded.dependency_version, dependency_verified_at = excluded.dependency_verified_at;

-- Backfill bidim for the full approved corpus (registry-driven: reuses the SAME dynamic
-- dispatch pattern as the prior session's depth-method backfills, not a bespoke path).
DO $$
DECLARE
  r record; v int;
BEGIN
  FOR r IN SELECT id, phrase, category FROM public.gematria_words WHERE is_verified = true LOOP
    v := public.aiq_bekar_calc(r.phrase);
    IF v IS NOT NULL THEN
      INSERT INTO public.bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
      VALUES (r.id, r.phrase, 'איק בכר', v, 4, r.category, true, md5(r.id::text || ':איק בכר'))
      ON CONFLICT (bid_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   select aiq_bekar_transform('שלום'), aiq_bekar_calc('שלום');            -- expect 'גשסו', 369
--   select * from fn_dispatch_method('איק בכר','שלום');                    -- expect 369 (registry-driven path works)
--   select count(*) from bidim where method='איק בכר';                    -- expect ~12,592
--   select * from fn_deep_cross_reverse('שלום','איק בכר') limit 5;         -- reverse lookup works
-- ============================================================================
