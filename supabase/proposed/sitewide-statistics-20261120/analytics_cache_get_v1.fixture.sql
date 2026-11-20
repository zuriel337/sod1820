CREATE OR REPLACE FUNCTION public.analytics_cache_get_v1(p_key text, p_producer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_payload jsonb;
  v_version text;
begin
  v_version := public.analytics_cache_producer_version_v1(p_producer);
  if v_version is null then return null; end if;

  select c.payload into v_payload
  from public.analytics_cache c
  where c.cache_key=p_key
    and c.cache_kind='memoized_result'
    and c.producer=p_producer
    and c.producer_version=v_version
    and c.input_identity=p_key
    and c.invalidated_at is null
    and c.expires_at > now();

  if v_payload is not null then
    update public.analytics_cache
       set hit_count=hit_count+1,last_hit_at=now()
     where cache_key=p_key
       and producer_version=v_version
       and invalidated_at is null;
  end if;
  return v_payload;
end
$function$

