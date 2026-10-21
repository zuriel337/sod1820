-- #1142 · Isolated, read-only grammar smoke.
-- No DDL, no fn_raziel_plan EXECUTE, no production writes, no personal data.
-- Uses only existing fn_raziel_norm and PostgreSQL regex semantics.
WITH fixtures(question, should_match, anchor) AS (
  VALUES
    ('מה זה 776?', true, 776),
    ('מהו המספר 1820?', true, 1820),
    ('ספר לי על 776', true, 776),
    ('מה ידוע על 776?', true, 776),
    ('מה הוא 1820?', true, 1820),
    ('מה זה שבע שש?', false, NULL::int),
    ('מה זה 776 ו-1820?', false, NULL::int),
    ('מה זה 0000000?', false, NULL::int)
), checks AS (
  SELECT question, should_match, anchor,
         ' ' || public.fn_raziel_norm(question) || ' ' AS normalized,
         (' ' || public.fn_raziel_norm(question) || ' ') ~
           '^ (מה זה|מהו|מה הוא|ספר לי על|מה ידוע על) (המספר )?[0-9]{1,6} $' AS actual
  FROM fixtures
)
SELECT question, normalized, should_match, actual,
       CASE WHEN actual = should_match THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks ORDER BY question;

-- DB source existence smoke only; never infer these records are publicly readable.
SELECT type, label FROM public.nodes
WHERE label IN ('776', '776 — הכל מתחבר כאן', '776 — שנת יהוה')
ORDER BY type, label;

-- Full fn_raziel_plan invocation and downstream number_map/dossier_json
-- must be tested separately using the authorized scoped application role.
