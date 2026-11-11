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
$function$
