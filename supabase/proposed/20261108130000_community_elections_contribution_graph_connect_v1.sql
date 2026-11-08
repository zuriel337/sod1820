-- PROPOSED — NOT APPLIED. Requires ZURIEL's separate, explicit approval of this exact file and commit.
--
-- COMMUNITY → REALITY GRAPH: ELECTIONS 77 CONTRIBUTION (projection only)
--
-- Human Gate (ZURIEL, 8.11.2026):
--   1. Project the public community contribution ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f with the EXISTING
--      projector public.project_contribution_to_graph(uuid) (one `contribution` node, full provenance).
--   2. Edge contribution --mentions--> Number 77 (62603405-…).
--   3. Edge contribution --related--> Post 5107 (792eb8d4-…), recorded as a research assignment approved by
--      ZURIEL, NOT as a relation stated in the source message.
--   4. The documented observation and the author's interpretation are stored as two separate things; the
--      interpretation is never presented as fact.
--   5. Policy: deleting the community message does NOT remove or hide a hint already approved into the tree.
--      Removal only by an explicit research/admin decision. No trigger, no demotion is created here.
--
-- Owner check: EXTEND_EXISTING reality_graph_law v8 + research_intake_foundation_contract_law v13.
--   No new table, graph, taxonomy, trigger or function. Uses the existing projector, upsert_edge,
--   nodes / edges / decision_ledger (§4: relation promoted through a Human Gate → decision_ledger row with
--   subject_type='relation', subject_ref=<edges.id>, and edges.metadata.decision_ledger_id back-link).
--   Not touched: research_objects (incl. e882519e…, which stays a private candidate), Number 77 node,
--   Post 5107 node, the video node 5128, community_tree_hints, any RLS policy.
--
-- Idempotent: a second run creates no node, no edge and no ledger row, and leaves all metadata identical.
-- Fail-closed: every precondition is asserted before any write; any drift raises and rolls back the whole batch.
-- Rollback: 20261108130001_community_elections_contribution_graph_connect_v1_rollback.sql
--
-- The batch runs in ONE transaction (DO block). It does not change research_contributions other than the
-- graph_node_id pointer that the existing projector already writes.

DO $batch$
DECLARE
  c_id            constant uuid := 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
  n77_id          constant uuid := '62603405-f044-4bd2-b586-9fe6c113f774';
  post5107_id     constant uuid := '792eb8d4-4945-4428-8220-2503e1d74c42';
  -- Operational admin that already owns the decision_ledger history (988 rows). rd_is_admin() is evaluated
  -- against it for the projector; the human decision itself is recorded as ZURIEL in every record below.
  admin_id        constant uuid := 'b6ce542a-2b07-4749-8aba-532c886f6de7';
  expected_md5    constant text := 'c5e2b1105837e8d57516b1385cca7656';
  expected_len    constant int  := 831;
  gate_date       constant text := '2026-11-08';
  tag             constant text := 'community_elections_contribution_graph_connect_v1';

  c               public.research_contributions;
  v_node          uuid;
  v_created       boolean;
  m_interp_head   int;
  m_bullets       int;
  m_interp_tail   int;
  v_observation   text;
  v_interpretation text;
  v_label         text;
  v_source_path   text;
  v_edge_77       uuid;
  v_edge_5107     uuid;
  v_ledger_77     uuid;
  v_ledger_5107   uuid;

  n_nodes_before  bigint;
  n_edges_before  bigint;
  n_number_before bigint;
  n_post_before   bigint;
  n77_digest_before text;
  p5107_digest_before text;
  contrib_digest_before text;
  contrib_digest_after  text;
  links_digest_before text;
  links_digest_after  text;
  n_links_before bigint;
  n_links_after  bigint;
BEGIN
  -- ---------------------------------------------------------------- 0. locks and actor
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'operational admin % is not an admin', admin_id;
  END IF;

  LOCK TABLE public.research_contributions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.edges IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.decision_ledger IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.contribution_links IN SHARE ROW EXCLUSIVE MODE;

  -- ---------------------------------------------------------------- 1. source preconditions (privacy gate)
  SELECT * INTO c FROM public.research_contributions WHERE id = c_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contribution % not found', c_id;
  END IF;

  IF c.status IS DISTINCT FROM 'approved'
     OR c.deleted_at IS NOT NULL
     OR c.thread_hidden_at IS NOT NULL
     OR c.origin NOT IN ('openweb', 'community_2029')
     OR c.parent_id IS NOT NULL
     OR c.body IS NULL
     OR length(c.body) <> expected_len
     OR md5(c.body) <> expected_md5 THEN
    RAISE EXCEPTION
      'contribution drift: status %, deleted %, hidden %, origin %, parent %, length %, md5 %',
      c.status, c.deleted_at, c.thread_hidden_at, c.origin, c.parent_id, length(c.body), md5(coalesce(c.body, ''));
  END IF;

  -- If a node already exists it must be OURS (idempotent re-run); a foreign node is never adopted.
  IF c.graph_node_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.nodes
       WHERE id = c.graph_node_id AND type = 'contribution'
         AND metadata ->> 'contribution_id' = c_id::text
         AND metadata -> 'projection_v1' ->> 'migration' = tag) THEN
    RAISE EXCEPTION 'contribution % already points to a node that this migration did not create: %', c_id, c.graph_node_id;
  END IF;
  IF c.graph_node_id IS NULL AND EXISTS (
       SELECT 1 FROM public.nodes WHERE type = 'contribution' AND metadata ->> 'contribution_id' = c_id::text) THEN
    RAISE EXCEPTION 'a contribution node for % already exists but is not linked; refusing to create a duplicate', c_id;
  END IF;

  -- ---------------------------------------------------------------- 2. target preconditions (no duplicates, public, active)
  IF (SELECT count(*) FROM public.nodes WHERE type = 'number' AND (label = '77' OR metadata ->> 'value' = '77')) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.nodes WHERE id = n77_id AND type = 'number' AND label = '77'
                      AND is_active AND coalesce(metadata ->> 'space', 'core') = 'core') THEN
    RAISE EXCEPTION 'Number 77 target drift';
  END IF;

  IF (SELECT count(*) FROM public.nodes WHERE type = 'post' AND metadata ->> 'post_id' = '5107') <> 1
     OR NOT EXISTS (SELECT 1 FROM public.nodes WHERE id = post5107_id AND type = 'post'
                      AND metadata ->> 'post_id' = '5107'
                      AND is_active AND coalesce(metadata ->> 'space', 'core') = 'core') THEN
    RAISE EXCEPTION 'Post 5107 target drift';
  END IF;

  -- The existing projector turns EVERY contribution_links row into a public entity node + edge. This message's links
  -- are only import identifiers (openweb_message / openweb_user: an external user id and a placeholder message id).
  -- They are provenance, not research connections, and must not become public graph entities. Any other link type
  -- would be a real research connection that needs its own review, so it fails closed here.
  IF EXISTS (SELECT 1 FROM public.contribution_links
              WHERE from_contribution_id = c_id AND target_type NOT IN ('openweb_message', 'openweb_user')) THEN
    RAISE EXCEPTION 'contribution % has research links that need their own review', c_id;
  END IF;

  -- ---------------------------------------------------------------- 3. observation vs interpretation (verbatim split)
  m_interp_head := position('עם זאת, בולטת לעין' IN c.body);
  m_bullets     := position('* שיעור ההצבעה' IN c.body);
  m_interp_tail := position('ריבוי כזה של הספרה 7' IN c.body);
  IF NOT (m_interp_head > 1 AND m_bullets > m_interp_head AND m_interp_tail > m_bullets) THEN
    RAISE EXCEPTION 'body markers not found in the expected order: %, %, %', m_interp_head, m_bullets, m_interp_tail;
  END IF;

  -- Observation = what the author states happened (intro + the four bullets), verbatim.
  v_observation := btrim(substr(c.body, 1, m_interp_head - 1), E' \n\r\t') || E'\n\n'
                   || btrim(substr(c.body, m_bullets, m_interp_tail - m_bullets), E' \n\r\t');
  -- Interpretation = the author's numerological framing and the quoted prophecy, verbatim, never admitted as fact.
  v_interpretation := btrim(substr(c.body, m_interp_head, m_bullets - m_interp_head), E' \n\r\t') || E'\n\n'
                      || btrim(substr(c.body, m_interp_tail), E' \n\r\t');

  v_label := 'תצפית קהילה — בחירות לכנסת ה־26 ו־77 (' || coalesce(nullif(btrim(c.author_name), ''), 'אנונימי')
             || ', ' || to_char(c.created_at AT TIME ZONE 'Asia/Jerusalem', 'DD.MM.YYYY') || ')';
  v_source_path := '/community/chat?thread=' || c_id::text;

  -- ---------------------------------------------------------------- 4. pre-state snapshot
  SELECT count(*) INTO n_nodes_before FROM public.nodes;
  SELECT count(*) INTO n_edges_before FROM public.edges;
  SELECT count(*) INTO n_number_before FROM public.nodes WHERE type = 'number';
  SELECT count(*) INTO n_post_before FROM public.nodes WHERE type = 'post';
  SELECT md5(to_jsonb(n)::text) INTO n77_digest_before FROM public.nodes n WHERE id = n77_id;
  SELECT md5(to_jsonb(n)::text) INTO p5107_digest_before FROM public.nodes n WHERE id = post5107_id;
  SELECT md5(concat_ws('|', status, origin, intent, research_state, coalesce(target_type, ''), coalesce(target_id, ''),
                       coalesce(parent_id::text, ''), author_name, created_at::text, coalesce(deleted_at::text, ''),
                       coalesce(thread_hidden_at::text, ''), body, coalesce(title, '')))
    INTO contrib_digest_before FROM public.research_contributions WHERE id = c_id;

  SELECT count(*), coalesce(md5(string_agg(to_jsonb(l)::text, '|' ORDER BY l.id)), '')
    INTO n_links_before, links_digest_before
    FROM public.contribution_links l WHERE l.from_contribution_id = c_id;

  v_created := c.graph_node_id IS NULL;

  -- ---------------------------------------------------------------- 5. projection through the EXISTING projector
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);

  -- Park the import-identifier links for the duration of this locked transaction (nobody else can see or change
  -- them), run the unchanged projector, then restore the very same rows (same ids, same created_at).
  DROP TABLE IF EXISTS _community_elections_parked_links_v1;
  CREATE TEMP TABLE _community_elections_parked_links_v1 ON COMMIT DROP AS
    SELECT * FROM public.contribution_links WHERE from_contribution_id = c_id;
  DELETE FROM public.contribution_links WHERE from_contribution_id = c_id;

  SELECT public.project_contribution_to_graph(c_id) INTO v_node;
  IF v_node IS NULL THEN
    RAISE EXCEPTION 'projector returned no node for %', c_id;
  END IF;

  INSERT INTO public.contribution_links SELECT * FROM _community_elections_parked_links_v1;
  DROP TABLE _community_elections_parked_links_v1;

  -- Provenance + the two separated layers. The label is curated (never a slice of the message body), so the
  -- node stands on its own as research documentation even if the community message is later removed.
  UPDATE public.nodes
     SET label = v_label,
         description = v_observation,
         identity_key = 'research_contribution:' || c_id::text,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'source_kind', 'community_contribution',
           'provenance', jsonb_build_object(
             'contribution_id', c_id,
             'author', c.author_name,
             'origin', c.origin,
             'intent', c.intent,
             'contributed_at', c.created_at,
             'source_message_path', v_source_path,
             'source_surface', 'community_chat',
             'imported_from', CASE WHEN c.origin = 'openweb' THEN 'openweb' ELSE NULL END,
             'body_md5', expected_md5
           ),
           'epistemic', jsonb_build_object(
             'observation', 'documented_author_observation',
             'observation_verification', 'source_claim_not_verified',
             'interpretation_admitted_as_fact', false
           ),
           'author_interpretation', jsonb_build_object(
             'text', v_interpretation,
             'attribution', 'source_author',
             'admitted_as_fact', false
           ),
           'research_hint', jsonb_build_object(
             'independent_of_source_message', true,
             'removal', 'explicit_research_or_admin_decision_only'
           ),
           'projection_v1', jsonb_build_object(
             'migration', tag,
             'human_gate', 'ZURIEL',
             'decided_on', gate_date,
             'privacy_changed', false,
             'publication_changed', false,
             'canonicalization', false
           )
         )
   WHERE id = v_node
     AND type = 'contribution'
     AND metadata ->> 'contribution_id' = c_id::text
     AND coalesce(metadata ->> 'space', '') = 'core';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contribution node % failed closed (type/provenance/space)', v_node;
  END IF;

  -- ---------------------------------------------------------------- 6. the two typed relations (kept strictly separate)
  PERFORM public.upsert_edge(v_node, n77_id, 'mentions', jsonb_build_object('space', 'core'));
  PERFORM public.upsert_edge(v_node, post5107_id, 'related', jsonb_build_object('space', 'core'));

  -- mentions → 77: derived from the author's own text, not a calculation and not an interpretation.
  UPDATE public.edges
     SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'space', 'core',
           'via', tag,
           'source_contribution_id', c_id,
           'relation_basis', 'source_text_states_the_number_77_netanyahu_age; 77.7_percent_turnout_is_a_different_number_and_is_not_linked',
           'attribution', jsonb_build_object('kind', 'text_reference', 'derived_from', 'source_authorship', 'author', c.author_name),
           'epistemic_status', 'documented_author_observation',
           'interpretation_not_admitted', true,
           'not_a_calculation', true,
           'human_gate', jsonb_build_object('by', 'ZURIEL', 'decided_on', gate_date, 'scope', 'projection_of_contribution_and_mentions_77')
         )
   WHERE from_node = v_node AND to_node = n77_id AND relation_type = 'mentions'
  RETURNING id INTO v_edge_77;

  -- related → 5107: a research-family assignment by ZURIEL, NOT stated in the source message (§6.7: analyst
  -- assignment is a separate attribution from the source author's claim).
  UPDATE public.edges
     SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'space', 'core',
           'via', tag,
           'source_contribution_id', c_id,
           'relation_basis', 'research_assignment_approved_by_zuriel; not_stated_in_the_source_message',
           'family', 'election26_post_family',
           'attribution', jsonb_build_object('kind', 'analyst_assignment', 'decided_by', 'ZURIEL'),
           'epistemic_status', 'research_family_membership_not_a_claim',
           'interpretation_not_admitted', true,
           'human_gate', jsonb_build_object('by', 'ZURIEL', 'decided_on', gate_date, 'scope', 'related_to_post_5107')
         )
   WHERE from_node = v_node AND to_node = post5107_id AND relation_type = 'related'
  RETURNING id INTO v_edge_5107;

  IF v_edge_77 IS NULL OR v_edge_5107 IS NULL THEN
    RAISE EXCEPTION 'edge metadata update failed closed: mentions %, related %', v_edge_77, v_edge_5107;
  END IF;

  -- ---------------------------------------------------------------- 7. Human-Gate ledger rows (§4), once per edge
  INSERT INTO public.decision_ledger (
    decision_type, subject_type, subject_ref, candidate, domain, created_by_agent, agents_involved,
    human_decision, human_reason, decided_by, result_ref, provenance, status)
  SELECT 'research_graph_relation', 'relation', e.id::text,
         jsonb_build_object('from_node', v_node, 'to_node', e.to_node, 'relation_type', e.relation_type,
                            'source_contribution_id', c_id, 'creates_node', v_created, 'creates_edge', true),
         'reality_graph', 'CLAUDE', ARRAY['CLAUDE']::text[],
         'approve',
         CASE e.relation_type
           WHEN 'mentions' THEN 'ZURIEL 8.11.2026: project the community contribution and link it to Number 77 (mentions).'
           ELSE 'ZURIEL 8.11.2026: research-family assignment of the contribution to Post 5107 (related); not stated in the source message.'
         END,
         admin_id::text,
         jsonb_build_object('edge_id', e.id, 'contribution_node_id', v_node),
         jsonb_build_object('migration', tag, 'human_gate', 'ZURIEL', 'decided_on', gate_date,
                            'recorded_via_operational_admin', admin_id),
         'executed'
    FROM public.edges e
   WHERE e.id IN (v_edge_77, v_edge_5107)
     AND NOT EXISTS (
       SELECT 1 FROM public.decision_ledger d
        WHERE d.decision_type = 'research_graph_relation' AND d.subject_type = 'relation' AND d.subject_ref = e.id::text);

  SELECT id INTO v_ledger_77 FROM public.decision_ledger
   WHERE decision_type = 'research_graph_relation' AND subject_type = 'relation' AND subject_ref = v_edge_77::text;
  SELECT id INTO v_ledger_5107 FROM public.decision_ledger
   WHERE decision_type = 'research_graph_relation' AND subject_type = 'relation' AND subject_ref = v_edge_5107::text;

  UPDATE public.edges SET metadata = metadata || jsonb_build_object('decision_ledger_id', v_ledger_77)   WHERE id = v_edge_77;
  UPDATE public.edges SET metadata = metadata || jsonb_build_object('decision_ledger_id', v_ledger_5107) WHERE id = v_edge_5107;

  -- ---------------------------------------------------------------- 8. postconditions (fail closed)
  IF (SELECT count(*) FROM public.nodes WHERE type = 'contribution' AND metadata ->> 'contribution_id' = c_id::text) <> 1 THEN
    RAISE EXCEPTION 'postcondition: expected exactly one contribution node for %', c_id;
  END IF;
  IF (SELECT graph_node_id FROM public.research_contributions WHERE id = c_id) IS DISTINCT FROM v_node THEN
    RAISE EXCEPTION 'postcondition: graph_node_id pointer mismatch';
  END IF;
  IF (SELECT count(*) FROM public.nodes) <> n_nodes_before + (CASE WHEN v_created THEN 1 ELSE 0 END)
     OR (SELECT count(*) FROM public.nodes WHERE type = 'number') <> n_number_before
     OR (SELECT count(*) FROM public.nodes WHERE type = 'post') <> n_post_before THEN
    RAISE EXCEPTION 'postcondition: node counts changed beyond the single contribution node';
  END IF;
  IF (SELECT count(*) FROM public.edges) > n_edges_before + 2 THEN
    RAISE EXCEPTION 'postcondition: more than two edges were added';
  END IF;
  IF (SELECT count(*) FROM public.edges WHERE from_node = v_node) <> 2 THEN
    RAISE EXCEPTION 'postcondition: the contribution node must have exactly the two approved relations';
  END IF;
  IF EXISTS (SELECT 1 FROM public.edges e JOIN public.nodes t ON t.id = e.to_node
              WHERE e.from_node = v_node AND (coalesce(e.metadata ->> 'space', '') <> 'core'
                    OR coalesce(t.metadata ->> 'space', 'core') <> 'core' OR NOT t.is_active)) THEN
    RAISE EXCEPTION 'postcondition: both relations must be core and point to active public nodes';
  END IF;
  IF (SELECT md5(to_jsonb(n)::text) FROM public.nodes n WHERE id = n77_id) IS DISTINCT FROM n77_digest_before
     OR (SELECT md5(to_jsonb(n)::text) FROM public.nodes n WHERE id = post5107_id) IS DISTINCT FROM p5107_digest_before THEN
    RAISE EXCEPTION 'postcondition: target nodes were modified';
  END IF;
  SELECT md5(concat_ws('|', status, origin, intent, research_state, coalesce(target_type, ''), coalesce(target_id, ''),
                       coalesce(parent_id::text, ''), author_name, created_at::text, coalesce(deleted_at::text, ''),
                       coalesce(thread_hidden_at::text, ''), body, coalesce(title, '')))
    INTO contrib_digest_after FROM public.research_contributions WHERE id = c_id;
  IF contrib_digest_after IS DISTINCT FROM contrib_digest_before THEN
    RAISE EXCEPTION 'postcondition: the source contribution was modified';
  END IF;
  SELECT count(*), coalesce(md5(string_agg(to_jsonb(l)::text, '|' ORDER BY l.id)), '')
    INTO n_links_after, links_digest_after
    FROM public.contribution_links l WHERE l.from_contribution_id = c_id;
  IF links_digest_after IS DISTINCT FROM links_digest_before OR n_links_after <> n_links_before THEN
    RAISE EXCEPTION 'postcondition: contribution_links were not restored byte-identical';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nodes WHERE type IN ('openweb_message', 'openweb_user')) THEN
    RAISE EXCEPTION 'postcondition: import identifiers leaked into the public graph as nodes';
  END IF;
  IF (SELECT count(*) FROM public.decision_ledger WHERE decision_type = 'research_graph_relation'
        AND subject_ref IN (v_edge_77::text, v_edge_5107::text)) <> 2 THEN
    RAISE EXCEPTION 'postcondition: expected exactly one ledger row per relation';
  END IF;
END;
$batch$;
