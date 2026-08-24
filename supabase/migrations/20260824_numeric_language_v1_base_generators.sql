-- ============================================================================
-- NUMERIC LANGUAGE v1 · BASE IMPLEMENTATION
-- ============================================================================
-- Two deterministic, pure, Hebrew-first base representation generators, per
-- Zuriel's closed Numeric Language v1 contract. Neither function writes to
-- corpus (gematria_words/bidim) during generation — generation is ephemeral
-- research output. Promotion to corpus material happens only via the
-- existing CORPUS_APPROVAL_LIFECYCLE.md Human-Gate path, unchanged by this
-- migration. No new engine, registry, reverse-index, or number->word table
-- is introduced: both functions produce plain Hebrew text that is then fed,
-- unmodified, into the EXISTING canonical method engine functions
-- (fn_ragil, fn_gadol, fn_misratar, ...) exactly like any other phrase.
--
-- A. DIGIT_BY_DIGIT_HEBREW(number) — fixed digit cipher, Zuriel's closed
--    0-9 vocabulary (0=אפס 1=אחד 2=שתים 3=שלוש 4=ארבע 5=חמש 6=שש 7=שבע
--    8=שמונה 9=תשע). This is a CIPHER, not a general Hebrew grammar rule —
--    do not infer masculine/feminine convention from it.
-- B. FULL_HEBREW_WORDING(number) — standard Hebrew cardinal wording,
--    representation_variant='default' (masculine ones/teen-suffix forms,
--    per the fixture Zuriel closed: 1820 -> "אלף שמונה מאות עשרים").
--    Other variants (feminine, construct-state, numeral-letter, grouped,
--    multilingual, ...) are explicitly deferred — extension point is a
--    future `representation_variant` parameter, not built here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_digit_by_digit_hebrew(n bigint)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  s text := n::text;
  ch text;
  words text[] := '{}';
  w text;
BEGIN
  IF n IS NULL OR n < 0 THEN RETURN NULL; END IF;
  FOR ch IN SELECT regexp_split_to_table(s, '') LOOP
    w := CASE ch
      WHEN '0' THEN 'אפס' WHEN '1' THEN 'אחד' WHEN '2' THEN 'שתים'
      WHEN '3' THEN 'שלוש' WHEN '4' THEN 'ארבע' WHEN '5' THEN 'חמש'
      WHEN '6' THEN 'שש'  WHEN '7' THEN 'שבע' WHEN '8' THEN 'שמונה'
      WHEN '9' THEN 'תשע' ELSE NULL
    END;
    words := array_append(words, w);
  END LOOP;
  RETURN array_to_string(words, ' ');
END;
$function$;

COMMENT ON FUNCTION public.fn_digit_by_digit_hebrew(bigint) IS
  'Numeric Language v1 base representation: DIGIT_BY_DIGIT_HEBREW. Fixed 0-9 cipher vocabulary closed by Zuriel -- NOT a general Hebrew grammar rule. representation_variant=default (only variant in v1). Fixture: fn_digit_by_digit_hebrew(1820) = ''אחד שמונה שתים אפס''. Pure, deterministic, no corpus write, no AI dependency.';

CREATE OR REPLACE FUNCTION public.fn_full_hebrew_wording(n bigint)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  thousands int; hundreds int; tens int; ones int;
  parts text[] := '{}';
  ones_masc text[] := ARRAY['','אחד','שניים','שלושה','ארבעה','חמישה','שישה','שבעה','שמונה','תשעה'];
  tens_word text[] := ARRAY['','עשר','עשרים','שלושים','ארבעים','חמישים','שישים','שבעים','שמונים','תשעים'];
  hundreds_mult text[] := ARRAY['','','שלוש','ארבע','חמש','שש','שבע','שמונה','תשע'];
  thousands_mult text[] := ARRAY['','','','שלושת','ארבעת','חמשת','ששת','שבעת','שמונת','תשעת'];
  needs_vav boolean := false;
  trailing_ones text;
BEGIN
  IF n IS NULL OR n < 0 OR n > 999999 THEN RETURN NULL; END IF;
  IF n = 0 THEN RETURN 'אפס'; END IF;
  thousands := n / 1000;
  hundreds  := (n % 1000) / 100;
  tens      := (n % 100) / 10;
  ones      := n % 10;
  IF thousands = 1 THEN parts := array_append(parts, 'אלף');
  ELSIF thousands = 2 THEN parts := array_append(parts, 'אלפיים');
  ELSIF thousands >= 3 THEN parts := array_append(parts, thousands_mult[thousands] || ' אלפים');
  END IF;
  IF hundreds = 1 THEN parts := array_append(parts, 'מאה');
  ELSIF hundreds = 2 THEN parts := array_append(parts, 'מאתיים');
  ELSIF hundreds >= 3 THEN parts := array_append(parts, hundreds_mult[hundreds] || ' מאות');
  END IF;
  IF tens = 0 AND ones > 0 THEN
    parts := array_append(parts, ones_masc[ones + 1]);
  ELSIF tens = 1 THEN
    IF ones = 0 THEN
      parts := array_append(parts, 'עשרה');
    ELSE
      parts := array_append(parts, ones_masc[ones + 1] || ' עשר');
    END IF;
  ELSIF tens >= 2 THEN
    parts := array_append(parts, tens_word[tens + 1]);
    IF ones > 0 THEN
      needs_vav := true;
      trailing_ones := ones_masc[ones + 1];
    END IF;
  END IF;
  IF needs_vav THEN
    RETURN array_to_string(parts, ' ') || ' ו' || trailing_ones;
  END IF;
  RETURN array_to_string(parts, ' ');
END;
$function$;

COMMENT ON FUNCTION public.fn_full_hebrew_wording(bigint) IS
  'Numeric Language v1 base representation: FULL_HEBREW_WORDING, representation_variant=default (masculine ones/teen-suffix, documented choice per Zuriel Human-Gate precedent, NOT a closed grammar rule -- feminine/alternate variants deferred). Deterministic rules used (hundreds forced-feminine per מאות being feminine plural, thousands construct forms, vav only directly before a nonzero trailing ones-digit). Fixture: fn_full_hebrew_wording(1820) = ''אלף שמונה מאות עשרים''; fn_full_hebrew_wording(776) = ''שבע מאות שבעים ושישה''. Supports 0-999999. Pure, deterministic, no corpus write, no AI dependency.';

-- Self-check (read-only, run manually after applying):
--   select n, fn_full_hebrew_wording(n) as full_wording, fn_digit_by_digit_hebrew(n) as digit_read
--   from unnest(ARRAY[0,1,2,3,8,10,18,20,100,776,1820]::bigint[]) as n order by n;
