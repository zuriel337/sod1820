-- SOD1820 2029 — World admin graph read visibility
-- EXTEND_EXISTING graph privacy + root-of-trust authorization only.
-- Public/anon graph visibility remains owned by the existing fn_graph_space_is_public policies.
-- This migration adds no write capability and does not change graph/truth semantics.

DROP POLICY IF EXISTS nodes_admin_read ON public.nodes;
CREATE POLICY nodes_admin_read
ON public.nodes
FOR SELECT
TO authenticated
USING (public.rd_is_admin());

DROP POLICY IF EXISTS edges_admin_read ON public.edges;
CREATE POLICY edges_admin_read
ON public.edges
FOR SELECT
TO authenticated
USING (public.rd_is_admin());

COMMENT ON POLICY nodes_admin_read ON public.nodes IS
'Admin read visibility for the canonical Reality Graph; extends existing root-of-trust authorization without changing public graph visibility.';

COMMENT ON POLICY edges_admin_read ON public.edges IS
'Admin read visibility for the canonical Reality Graph; extends existing root-of-trust authorization without changing public graph visibility.';
