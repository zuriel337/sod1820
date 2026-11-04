-- Observed definition; no grants, ownership or options changes. Preserve table history.
CREATE OR REPLACE VIEW public.rules_active AS
 SELECT DISTINCT ON (rule_id) rule_id AS "מזהה_חוק",
    rule_version AS "גרסה",
    label AS "חוק",
    description AS "תיאור",
    depends_on AS "תלוי_ב",
    created_at
   FROM nodes
  WHERE ((type = 'rule'::text) AND (rule_id IS NOT NULL))
  ORDER BY rule_id, rule_version DESC;
