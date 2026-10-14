-- HUMAN GATE: review-only composition of existing canonical read RPCs.
-- NOT an applied migration, NOT a new engine, NOT wired to the client.
-- Keep the guard/ROLLBACK until approval, permission review, live equality,
-- error-path parity and measured preview benefit have all passed.
BEGIN;
DO $gate$ BEGIN
  RAISE EXCEPTION 'DRAFT ONLY: public enrichment batch requires explicit Human Gate';
END $gate$;

CREATE OR REPLACE FUNCTION public.public_enrichment_2029_batch(
  p_numbers integer[] DEFAULT ARRAY[]::integer[],
  p_traces jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $body$
DECLARE
  item record;
  result jsonb;
  numbers jsonb := '[]';
  traces jsonb := '[]';
BEGIN
  p_numbers := coalesce(p_numbers, ARRAY[]::integer[]);
  p_traces := coalesce(p_traces, '[]'::jsonb);
  IF cardinality(p_numbers) > 9 OR octet_length(p_traces::text) > 16384 OR jsonb_typeof(p_traces) <> 'array'
    OR jsonb_array_length(p_traces) > 6 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Batch exceeds 9 numbers / 6 traces';
  END IF;
  -- Validate the full payload before invoking any existing engine.
  FOR item IN SELECT value FROM jsonb_array_elements(p_traces) LOOP
    IF jsonb_typeof(item.value) <> 'object'
      OR NOT (item.value ? 'p_method_key' AND item.value ? 'p_phrase')
      OR jsonb_typeof(item.value->'p_method_key') NOT IN ('string', 'null')
      OR jsonb_typeof(item.value->'p_phrase') NOT IN ('string', 'null')
      OR length(item.value->>'p_phrase') > 500 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid bounded trace arguments';
    END IF;
  END LOOP;
  FOR item IN SELECT value, ordinality FROM unnest(p_numbers) WITH ORDINALITY AS n(value, ordinality) LOOP
    BEGIN
      result := public.convergence_meter(item.value);
      numbers := numbers || jsonb_build_array(jsonb_build_object('index', item.ordinality - 1,
        'p_n', item.value, 'status', 'ok', 'data', result));
    EXCEPTION WHEN OTHERS THEN
      numbers := numbers || jsonb_build_array(jsonb_build_object('index', item.ordinality - 1,
        'p_n', item.value, 'status', 'error', 'error_code', SQLSTATE));
    END;
  END LOOP;
  FOR item IN SELECT value, ordinality FROM jsonb_array_elements(p_traces) WITH ORDINALITY LOOP
    BEGIN
      result := public.gematria_method_trace(item.value->>'p_method_key', item.value->>'p_phrase');
      traces := traces || jsonb_build_array(jsonb_build_object('index', item.ordinality - 1,
        'args', item.value, 'status', 'ok', 'data', result));
    EXCEPTION WHEN OTHERS THEN
      traces := traces || jsonb_build_array(jsonb_build_object('index', item.ordinality - 1,
        'args', item.value, 'status', 'error', 'error_code', SQLSTATE));
    END;
  END LOOP;
  RETURN jsonb_build_object('numbers', numbers, 'traces', traces);
END;
$body$;
REVOKE ALL ON FUNCTION public.public_enrichment_2029_batch(integer[], jsonb) FROM PUBLIC;
-- Proposed only: grant no broader audience than both underlying invoker RPCs.
-- GRANT EXECUTE ON FUNCTION public.public_enrichment_2029_batch(integer[], jsonb) TO anon, authenticated;
ROLLBACK;

-- Review gates still OPEN:
-- 1. Execute the exact deployed candidate only AFTER Human Gate in a suitable test DB.
-- 2. Compare individual native values and each indexed data field under anon AND
--    signed-in RLS contexts: zero differences and identical md5(value::text).
-- 3. Compare null/unknown methods, per-item failures, cancellation/retry, result
--    order and the new 500-character bound with existing client behavior.
-- 4. Measure cold/warm hosted traffic. Fewer HTTP calls is not proof of faster SQL.
-- 5. Retain the original RPCs and a client rollback path; no caller is replaced now.
