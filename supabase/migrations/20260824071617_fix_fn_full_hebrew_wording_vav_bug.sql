-- Bug fix: the tens>=2/ones>0 branch appended tens_word into `parts` and then the
-- final vav-assembly line did parts[1:length-1], which stripped the just-appended
-- tens_word instead of the (not-yet-appended) ones word -- dropping the tens
-- component entirely (776 produced "שבע מאות ושישה" instead of "שבע מאות שבעים ושישה").
-- Fix: track last_part consistently as "the not-yet-appended trailing word" only for
-- the tens>=2/ones>0 case, and assemble parts (unstripped) + vav + last_part.

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

  -- tens + ones (handles 0, 10-19 teens, and 20-99). Only the tens>=2/ones>0 case
  -- gets a vav-joined trailing ones-word; every other case appends its complete
  -- word directly into `parts` with no vav (teens and standalone 1-9 never take vav).
  IF tens = 0 AND ones > 0 THEN
    parts := array_append(parts, ones_masc[ones + 1]);
  ELSIF tens = 1 THEN
    IF ones = 0 THEN
      parts := array_append(parts, 'עשרה');  -- standalone 10, masculine default (long form)
    ELSE
      parts := array_append(parts, ones_masc[ones + 1] || ' עשר');  -- teens: masc suffix = short עשר
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
  'FULL_HEBREW_WORDING base representation, representation_variant=default (masculine ones/teen-suffix, documented choice per Zuriel Human-Gate precedent, NOT a closed grammar rule -- feminine/alternate variants deferred). Deterministic rules used elsewhere (hundreds forced-feminine, thousands construct forms, vav only before nonzero ones-digit after tens>=2). Fixture: fn_full_hebrew_wording(1820) = ''אלף שמונה מאות עשרים''; fn_full_hebrew_wording(776) = ''שבע מאות שבעים ושישה''. Supports 0-999999. Bug-fixed 2026-08-24: prior version dropped the tens component for numbers like 776 due to an array-slicing error.';

-- verify full fixture set again after the fix
select n, fn_full_hebrew_wording(n) as full_wording, fn_digit_by_digit_hebrew(n) as digit_read
from unnest(ARRAY[0,1,2,3,8,10,18,20,100,776,1820]::bigint[]) as n order by n;
