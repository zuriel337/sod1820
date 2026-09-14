-- G2 P0-B containment: private/lab graph rows now exist, so unguarded SECURITY DEFINER
-- graph readers must enforce the canonical graph-space predicate.
-- Preserve public/core output and keep admin/service owner-aware paths unchanged.

CREATE OR REPLACE FUNCTION public.fn_raziel_relevant_rules(
  p_query text DEFAULT NULL::text,
  p_domains text[] DEFAULT NULL::text[],
  p_limit integer DEFAULT 8
)
RETURNS TABLE(rule_id text, label text, description text, score integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH terms AS (
    SELECT DISTINCT lower(d) AS term
    FROM unnest(coalesce(p_domains, array[]::text[])) AS d
    WHERE length(d) >= 2
    UNION
    SELECT DISTINCT lower(t) AS term
    FROM unnest(regexp_split_to_array(coalesce(p_query, ''), '\s+')) AS t
    WHERE length(t) >= 3
  ),
  scored AS (
    SELECT
      n.rule_id, n.label, n.description,
      (
        SELECT coalesce(sum(
          (CASE WHEN n.rule_id ILIKE '%' || t.term || '%' THEN 5 ELSE 0 END) +
          (CASE WHEN n.label ILIKE '%' || t.term || '%' THEN 3 ELSE 0 END) +
          (CASE WHEN n.description ILIKE '%' || t.term || '%' THEN 1 ELSE 0 END)
        ), 0)::int
        FROM terms t
      ) AS score
    FROM public.nodes n
    WHERE n.type = 'rule'
      AND n.is_active
      AND n.rule_id IS NOT NULL
      AND public.fn_graph_space_is_public(n.metadata)
  )
  SELECT s.rule_id, s.label, left(s.description, 600) AS description, s.score
  FROM scored s
  WHERE s.score > 0
  ORDER BY s.score DESC, s.rule_id
  LIMIT greatest(1, least(coalesce(p_limit, 8), 20));
$function$;

CREATE OR REPLACE FUNCTION public.fn_rules_snapshot(p_rule_ids text[])
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('rule_id', n.rule_id, 'version', n.rule_version) ORDER BY n.rule_id),
    '[]'::jsonb
  )
  FROM public.nodes n
  WHERE n.type='rule'
    AND n.is_active
    AND n.rule_id = any(p_rule_ids)
    AND public.fn_graph_space_is_public(n.metadata);
$function$;

CREATE OR REPLACE FUNCTION public.get_graph_bridges(
  p_word text DEFAULT NULL::text,
  p_value integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.human_verified DESC, b.weight DESC), '[]'::jsonb)
  FROM (
    SELECT
      n.id AS bridge_id,
      n.metadata->>'he_word' AS hebrew,
      n.metadata->>'foreign_word' AS foreign_word,
      n.metadata->>'lang' AS lang,
      n.metadata->>'method' AS method,
      (n.metadata->>'value')::int AS gematria_he,
      n.metadata->>'relationship_type' AS relationship_type,
      n.metadata->>'evidence_level' AS evidence_level,
      (n.metadata->>'human_verified')::bool AS human_verified,
      n.metadata->>'translation_source' AS translation_source,
      n.description AS note,
      n.weight,
      CASE
        WHEN n.metadata->>'he_word' = btrim(coalesce(p_word,''))
          OR lower(n.metadata->>'foreign_word') = lower(btrim(coalesce(p_word,'')))
        THEN 'word'
        ELSE 'value'
      END AS match
    FROM public.nodes n
    WHERE n.type='language_bridge'
      AND n.is_active
      AND public.fn_graph_space_is_public(n.metadata)
      AND (
        n.metadata->>'he_word' = btrim(coalesce(p_word,''))
        OR lower(n.metadata->>'foreign_word') = lower(btrim(coalesce(p_word,'')))
        OR (p_value IS NOT NULL AND p_value > 0 AND (n.metadata->>'value')::int = p_value)
      )
  ) b;
$function$;

COMMENT ON FUNCTION public.fn_raziel_relevant_rules(text,text[],integer) IS
  'Public Raziel rule lookup. SECURITY DEFINER reader is graph-space aware per graph_privacy_foundation_law/security_definer_projection_boundary.';
COMMENT ON FUNCTION public.fn_rules_snapshot(text[]) IS
  'Public rules snapshot. SECURITY DEFINER reader is graph-space aware per graph_privacy_foundation_law/security_definer_projection_boundary.';
COMMENT ON FUNCTION public.get_graph_bridges(text,integer) IS
  'Public language-bridge graph read. SECURITY DEFINER reader is graph-space aware per graph_privacy_foundation_law/security_definer_projection_boundary.';
