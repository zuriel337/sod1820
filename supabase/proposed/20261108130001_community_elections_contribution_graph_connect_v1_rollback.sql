-- PROPOSED — NOT APPLIED. Rollback for 20261108130000_community_elections_contribution_graph_connect_v1.sql.
-- Requires ZURIEL's explicit approval before it is ever run.
--
-- Removes ONLY what that migration created, identified by its tag and by exact ids:
--   * the two decision_ledger rows (one per relation),
--   * the two edges (mentions → 77, related → 5107),
--   * the contribution node, and the graph_node_id pointer on research_contributions.
-- Never touches Number 77, Post 5107, the video node, research_objects (incl. e882519e…), community_tree_hints,
-- or any node/edge it did not create. Fails closed if anything else has meanwhile attached to the node.
-- Idempotent: running it when nothing is projected is a no-op.

DO $rollback$
DECLARE
  c_id  constant uuid := 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
  tag   constant text := 'community_elections_contribution_graph_connect_v1';
  v_node uuid;
  v_edge_ids uuid[];
BEGIN
  LOCK TABLE public.research_contributions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.edges IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.decision_ledger IN SHARE ROW EXCLUSIVE MODE;

  SELECT id INTO v_node
    FROM public.nodes
   WHERE type = 'contribution'
     AND metadata ->> 'contribution_id' = c_id::text
     AND metadata -> 'projection_v1' ->> 'migration' = tag;

  IF v_node IS NULL THEN
    RAISE NOTICE 'nothing to roll back: no node created by % for %', tag, c_id;
    RETURN;
  END IF;

  -- Refuse to cut anything that was attached after the migration (another writer's edge, an incoming edge).
  IF EXISTS (SELECT 1 FROM public.edges
              WHERE (from_node = v_node AND coalesce(metadata ->> 'via', '') <> tag)
                 OR (to_node = v_node)) THEN
    RAISE EXCEPTION 'rollback refused: node % has relations that this migration did not create', v_node;
  END IF;

  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_edge_ids
    FROM public.edges WHERE from_node = v_node AND metadata ->> 'via' = tag;

  DELETE FROM public.decision_ledger
   WHERE decision_type = 'research_graph_relation'
     AND subject_type = 'relation'
     AND subject_ref = ANY (SELECT unnest(v_edge_ids)::text)
     AND provenance ->> 'migration' = tag;

  DELETE FROM public.edges WHERE id = ANY (v_edge_ids);

  UPDATE public.research_contributions SET graph_node_id = NULL
   WHERE id = c_id AND graph_node_id = v_node;

  DELETE FROM public.nodes
   WHERE id = v_node AND type = 'contribution' AND metadata -> 'projection_v1' ->> 'migration' = tag;

  IF EXISTS (SELECT 1 FROM public.nodes WHERE type = 'contribution' AND metadata ->> 'contribution_id' = c_id::text)
     OR (SELECT graph_node_id FROM public.research_contributions WHERE id = c_id) IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.edges WHERE id = ANY (v_edge_ids)) THEN
    RAISE EXCEPTION 'rollback postcondition failed';
  END IF;
END;
$rollback$;
