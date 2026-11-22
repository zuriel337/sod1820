-- Review only. The guard binds this change to the live reader inspected on 2026-11-22.
DO $proposal$
DECLARE
  definition text := pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure);
  old_filter constant text := $fragment$from measured where surface='page' and event_type='view'
        and props->'measurement'->>'page_path' ~ '^/number/[0-9]{1,5}$'$fragment$;
  new_filter constant text := $fragment$from classified where traffic_class='human' and not is_bot
        and surface='page' and event_type='view'
        and props->'measurement'->>'page_path' ~ '^/number/[0-9]{1,12}$'$fragment$;
BEGIN
  IF md5(definition) <> 'e4b28fe52f4c8cf5a75b67df528169ff'
      OR cardinality(string_to_array(definition, old_filter)) <> 2 THEN
    RAISE EXCEPTION 'The reviewed analytics reader changed';
  END IF;
  EXECUTE replace(definition, old_filter, new_filter);
END
$proposal$;
