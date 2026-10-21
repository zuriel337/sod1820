-- #1142 · Raziel Hebrew number-definition regression (read-only test; no DDL)
-- Run with an authorized SQL test role where fn_raziel_plan EXECUTE is permitted.
-- Do not GRANT execute to anon/authenticated just to run these tests.
-- Expected AFTER targeted versioned change to existing planner; fails on baseline.
DO $test$
DECLARE p jsonb; q text; n int;
BEGIN
  FOREACH q IN ARRAY ARRAY['מה זה 776?', 'מהו המספר 776?', 'ספר לי על 776', 'מה ידוע על 776?', 'מה זה 1820?'] LOOP
    p := public.fn_raziel_plan(q, 'public_user', NULL);
    n := (regexp_match(q, '[0-9]+'))[1]::int;
    IF p->>'availability' IS DISTINCT FROM 'number_context'
       OR p->'number_context'->>'anchor' IS DISTINCT FROM 'explicit'
       OR (p->'number_context'->>'number')::int IS DISTINCT FROM n THEN
      RAISE EXCEPTION 'Number intent not routed: %, plan=%', q, p;
    END IF;
  END LOOP;
  -- Ambiguity guard: do not silently choose one number or guess a spoken-number spelling.
  FOREACH q IN ARRAY ARRAY['מה זה 776 ו-1820?', 'מה זה שבע שש?'] LOOP
    p := public.fn_raziel_plan(q, 'public_user', NULL);
    IF p->>'availability' = 'number_context'
       AND p->'number_context'->>'anchor' = 'explicit' THEN
      RAISE EXCEPTION 'Ambiguous phrase incorrectly anchored: %, plan=%', q, p;
    END IF;
  END LOOP;
END
$test$;

-- Acceptance must also verify that ai-analyze actually consumes the descriptor
-- and retrieves number_map / number_dossier_json under the caller's allowed scope,
-- returning source-bound evidence, not invented meaning. A planner-only PASS is insufficient.
