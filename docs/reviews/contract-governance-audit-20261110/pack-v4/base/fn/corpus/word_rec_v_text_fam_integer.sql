CREATE OR REPLACE FUNCTION public._word_rec(v text, fam integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when _word_is_spam(v) then 'reject'
    when coalesce(array_length(regexp_split_to_array(btrim(v),'\s+'),1),1) >= 5 then 'reject'
    when coalesce(array_length(regexp_split_to_array(btrim(v),'\s+'),1),1) <= 2 and fam >= 1 then 'approve'
    when coalesce(array_length(regexp_split_to_array(btrim(v),'\s+'),1),1) <= 3 and fam >= 3 then 'approve'
    else 'review'
  end;
$function$
