-- NUMERIC LANGUAGE v1 — two base representation generators.
-- Pure, deterministic, IMMUTABLE, no AI, no corpus write. Mirrors the exact discipline
-- already proven for triangle_word_calc/triangle_reverse_calc/stair_triangle_calc.

-- ============================================================================
-- 1. fn_digit_by_digit_hebrew(n) — fixed cipher, Zuriel's closed v1 vocabulary.
--    NOT grammar-derived. No gender inference. General for any non-negative integer.
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
  'DIGIT_BY_DIGIT_HEBREW base representation. Fixed cipher per Zuriel Human-Gate (SOD1820 v1 canonical default), original digit order preserved, no reordering, no dropping zero, no arithmetic decomposition, no grammar inference. Fixture: fn_digit_by_digit_hebrew(1820) = ''אחד שמונה שתים אפס''.';

-- ============================================================================
-- 2. fn_full_hebrew_wording(n) — standard Hebrew cardinal number wording.
--    Deterministic grammar rules used where they exist (hundreds forced-feminine per
--    מאות being grammatically feminine plural; thousands use fixed construct forms;
--    tens/hundred/thousand base words are gender-invariant; vav appears only directly
--    before a nonzero ones-digit, matching both Zuriel's closed 1820 fixture -- no vav,
--    zero ones-digit -- and standard Hebrew number-naming convention).
--    ONE explicit, documented default where genuine ambiguity exists: ones-digit/teen
--    suffix gender with no noun context -- masculine, matching Zuriel's own precedent
--    for digit-1=אחד in the closed digit cipher. representation_variant='default';
--    feminine/alternate variants explicitly deferred (section 2, not built here).
--    Supports 0-999,999.
-- ============================================================================
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
  last_part text;
BEGIN
  IF n IS NULL OR n < 0 OR n > 999999 THEN RETURN NULL; END IF;
  IF n = 0 THEN RETURN 'אפס'; END IF;

  thousands := n / 1000;
  hundreds  := (n % 1000) / 100;
  tens      := (n % 100) / 10;
  ones      := n % 10;

  -- thousands
  IF thousands = 1 THEN parts := array_append(parts, 'אלף');
  ELSIF thousands = 2 THEN parts := array_append(parts, 'אלפיים');
  ELSIF thousands >= 3 THEN parts := array_append(parts, thousands_mult[thousands] || ' אלפים');
  END IF;

  -- hundreds
  IF hundreds = 1 THEN parts := array_append(parts, 'מאה');
  ELSIF hundreds = 2 THEN parts := array_append(parts, 'מאתיים');
  ELSIF hundreds >= 3 THEN parts := array_append(parts, hundreds_mult[hundreds] || ' מאות');
  END IF;

  -- tens + ones (handles 0, 10-19 teens, and 20-99)
  IF tens = 0 AND ones > 0 THEN
    last_part := ones_masc[ones + 1];
    parts := array_append(parts, last_part);
  ELSIF tens = 1 THEN
    -- teens: masculine suffix is the SHORT form עשר (reversed polarity vs standalone 10)
    IF ones = 0 THEN
      parts := array_append(parts, 'עשרה');  -- standalone 10, masculine default = long form
    ELSE
      parts := array_append(parts, ones_masc[ones + 1] || ' עשר');
      last_part := 'teen';
    END IF;
  ELSIF tens >= 2 THEN
    IF ones = 0 THEN
      parts := array_append(parts, tens_word[tens + 1]);
    ELSE
      parts := array_append(parts, tens_word[tens + 1]);
      last_part := ones_masc[ones + 1];
    END IF;
  END IF;

  -- vav conjunction: only directly before a nonzero ones-digit attached after tens>=2
  IF tens >= 2 AND ones > 0 THEN
    RETURN array_to_string(parts[1:array_length(parts,1)-1], ' ') || ' ו' || last_part;
  END IF;

  RETURN array_to_string(parts, ' ');
END;
$function$;

COMMENT ON FUNCTION public.fn_full_hebrew_wording(bigint) IS
  'FULL_HEBREW_WORDING base representation, representation_variant=default (masculine ones/teen-suffix, documented choice per Zuriel Human-Gate precedent, NOT a closed grammar rule -- feminine/alternate variants deferred). Deterministic rules used elsewhere (hundreds forced-feminine, thousands construct forms, vav only before nonzero ones-digit). Fixture: fn_full_hebrew_wording(1820) = ''אלף שמונה מאות עשרים''. Supports 0-999999.';
