CREATE OR REPLACE FUNCTION public._word_is_spam(v text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select
    v ~* '(https?://|www\.|\.co\.il|\.com|\.net|@)'          -- URL / מייל
    or v ~ '[0-9]'                                            -- כל ספרה = תא-אקסל עם מספרים = זבל
    or coalesce(array_length(regexp_split_to_array(btrim(v), '\s+'), 1), 1) > 6;  -- משפט שלם
$function$
