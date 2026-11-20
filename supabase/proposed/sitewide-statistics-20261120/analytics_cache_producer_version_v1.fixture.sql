CREATE OR REPLACE FUNCTION public.analytics_cache_producer_version_v1(p_producer text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_n int;
  v_hash text;
begin
  select count(*), min(md5(pg_catalog.pg_get_functiondef(p.oid)))
    into v_n,v_hash
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=p_producer and p.prokind='f';
  if v_n <> 1 then return null; end if;
  return v_hash;
end
$function$

