CREATE OR REPLACE FUNCTION public.fn_wa_phone_digits(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case
    when d is null or d = '' then null
    when d like '0%' then '972' || substr(d, 2)            -- local IL form 05x… -> 9725x…
    else d end
  from (select regexp_replace(coalesce(split_part(p, '@', 1), ''), '\D', '', 'g') as d) t
$function$
;
