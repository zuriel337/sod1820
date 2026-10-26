-- LOCAL DISPOSABLE TEST DATABASE ONLY. Never apply this fixture to Supabase.
-- Minimal private table plus the unchanged live edge_rate_limit_check definition.
CREATE SCHEMA private;
CREATE TABLE private.edge_rate_limit_buckets (
  key_hash text NOT NULL,
  bucket bigint NOT NULL,
  count integer NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, bucket)
);

CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer DEFAULT 300, p_limit integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_window integer := greatest(60, least(coalesce(p_window_seconds, 300), 3600));
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 120));
  v_bucket bigint;
  v_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate-limit key';
  end if;

  v_bucket := floor(extract(epoch from clock_timestamp()) / v_window)::bigint;

  insert into private.edge_rate_limit_buckets(key_hash, bucket, count, updated_at)
  values (p_key_hash, v_bucket, 1, clock_timestamp())
  on conflict (key_hash, bucket)
  do update set
    count = private.edge_rate_limit_buckets.count + 1,
    updated_at = clock_timestamp()
  returning count into v_count;

  if random() < 0.01 then
    delete from private.edge_rate_limit_buckets
    where updated_at < clock_timestamp() - interval '2 hours';
  end if;

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'count', v_count,
    'limit', v_limit,
    'window_seconds', v_window
  );
end;
$function$;
