-- Correct conservative over-classification from v1 while preserving hidden/private containment.
-- Legacy missing-space targets follow the current graph predicate default ('core'); explicit lab/private remains non-public.

UPDATE public.edges e
SET metadata = jsonb_set(
  coalesce(e.metadata,'{}'::jsonb),
  '{space}',
  to_jsonb(CASE
    WHEN coalesce(fn.metadata->>'space','core')='core'
     AND coalesce(tn.metadata->>'space','core')='core' THEN 'core'
    ELSE 'private'
  END::text),
  true
)
FROM public.nodes fn, public.nodes tn
WHERE fn.id=e.from_node AND tn.id=e.to_node
  AND (fn.type='contribution' OR tn.type='contribution');

CREATE OR REPLACE FUNCTION public.project_contribution_to_graph(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.research_contributions;
  v_node uuid;
  v_target uuid;
  v_lt uuid;
  l record;
  v_rel text;
  v_source_space text;
  v_edge_space text;
BEGIN
  IF NOT public.rd_is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO c FROM public.research_contributions WHERE id=p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_source_space := CASE WHEN c.status='approved' THEN 'core' ELSE 'private' END;
  v_node := c.graph_node_id;

  IF v_node IS NULL THEN
    INSERT INTO public.nodes(type,label,is_active,metadata)
    VALUES(
      'contribution',
      coalesce(nullif(c.title,''),left(c.body,60),'תרומה'),
      true,
      jsonb_build_object(
        'intent',c.intent,'origin',c.origin,'state',c.research_state,'author',c.author_name,
        'contribution_id',c.id,'space',v_source_space
      )
    ) RETURNING id INTO v_node;
    UPDATE public.research_contributions SET graph_node_id=v_node WHERE id=p_id;
  ELSE
    UPDATE public.nodes
       SET metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{space}',to_jsonb(v_source_space),true)
     WHERE id=v_node;
  END IF;

  IF c.target_id IS NOT NULL THEN
    IF c.target_type='number' AND c.target_id ~ '^[0-9]+$' THEN
      v_target := public.get_or_create_entity_node('number',c.target_id,jsonb_build_object('value',c.target_id::bigint));
    ELSE
      v_target := public.get_or_create_entity_node(coalesce(c.target_type,'entity'),c.target_id,'{}'::jsonb);
    END IF;
    v_rel := CASE WHEN c.intent='תגובה' THEN 'related' ELSE 'contributes_to' END;
    v_edge_space := CASE
      WHEN v_source_space='core' AND coalesce((SELECT metadata->>'space' FROM public.nodes WHERE id=v_target),'core')='core' THEN 'core'
      ELSE 'private'
    END;
    PERFORM public.upsert_edge(v_node,v_target,v_rel,jsonb_build_object('via','contribution','space',v_edge_space));
    UPDATE public.edges
       SET metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{space}',to_jsonb(v_edge_space),true)
     WHERE from_node=v_node AND to_node=v_target AND relation_type=v_rel;
  END IF;

  FOR l IN SELECT * FROM public.contribution_links WHERE from_contribution_id=p_id LOOP
    v_lt := NULL;
    IF l.target_type='number' AND l.target_id ~ '^[0-9]+$' THEN
      v_lt := public.get_or_create_entity_node('number',l.target_id,jsonb_build_object('value',l.target_id::bigint));
    ELSIF l.target_type='contribution' THEN
      IF l.target_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
         AND l.target_id::uuid <> p_id THEN
        SELECT graph_node_id INTO v_lt FROM public.research_contributions WHERE id=l.target_id::uuid;
        IF NOT FOUND THEN
          v_lt := NULL;
        ELSIF v_lt IS NULL THEN
          v_lt := public.project_contribution_to_graph(l.target_id::uuid);
        END IF;
      END IF;
    ELSE
      v_lt := public.get_or_create_entity_node(coalesce(l.target_type,'entity'),l.target_id,'{}'::jsonb);
    END IF;

    IF v_lt IS NOT NULL THEN
      v_rel := coalesce(nullif(l.relation_type,''),'related');
      v_edge_space := CASE
        WHEN v_source_space='core' AND coalesce((SELECT metadata->>'space' FROM public.nodes WHERE id=v_lt),'core')='core' THEN 'core'
        ELSE 'private'
      END;
      PERFORM public.upsert_edge(v_node,v_lt,v_rel,jsonb_build_object('via','found_connection','space',v_edge_space));
      UPDATE public.edges
         SET metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{space}',to_jsonb(v_edge_space),true)
       WHERE from_node=v_node AND to_node=v_lt AND relation_type=v_rel;
    END IF;
  END LOOP;

  RETURN v_node;
END
$function$;
