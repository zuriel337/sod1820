-- VERIFIED PUBLIC CONTRIBUTOR GRAPH PROJECTION v8
--
-- Human Gate: ZURIEL approved continuing automatic, reviewed World admission
-- on 2026-10-26, including material by other writers when authorship and the
-- tree destination are exact. This one-time batch projects five already
-- approved+validated public contributions by two stable contributor IDs.
--
-- Every numeric statement is replayed through the canonical method registry.
-- The canonical project_contribution_to_graph writer creates the five source
-- contribution nodes and connects them to five already-existing, unique public
-- number nodes. It may not create a number node. Status, contributor identity,
-- source text and publication state remain unchanged.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_selected_count integer;
  v_ready_count integer;
  v_author_count integer;
  v_target_count integer;
  v_claim_count integer;
  v_claim_finding_count integer;
  v_claim_match_count integer;
  v_claim_cardinality_count integer;
  v_number_nodes_before integer;
  v_number_nodes_after integer;
  v_processed integer := 0;
  v_row_digest text;
  v_claims_digest text;
  v_projected_node_id uuid;
  v_row record;
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_contributions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.contributors IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.edges IN SHARE ROW EXCLUSIVE MODE;

  CREATE TEMP TABLE _public_contributor_selected_v8 (
    id uuid PRIMARY KEY,
    contributor_id uuid NOT NULL,
    expected integer NOT NULL,
    expected_claim_count integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _public_contributor_selected_v8
    (id, contributor_id, expected, expected_claim_count)
  VALUES
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','0999ac77-8efe-4282-907e-d2a561fca133',1358,7),
    ('f3af17f7-9b13-41d7-8fdc-d80d422fd271','0999ac77-8efe-4282-907e-d2a561fca133',911,1),
    ('4643a3e0-e761-433c-8640-8c2cb3f98d2c','c0459430-6ba0-44a9-b1be-b5952344e74d',57,2),
    ('96591873-5773-4b15-99ed-370c1013c468','c0459430-6ba0-44a9-b1be-b5952344e74d',360,2),
    ('0e195107-4a88-4ce9-a683-ac2a61cca49e','c0459430-6ba0-44a9-b1be-b5952344e74d',827,3);

  CREATE TEMP TABLE _public_contributor_claims_v8 (
    finding_id uuid NOT NULL REFERENCES _public_contributor_selected_v8(id),
    method text NOT NULL,
    phrase text NOT NULL,
    expected integer NOT NULL,
    PRIMARY KEY (finding_id, method, phrase)
  ) ON COMMIT DROP;

  INSERT INTO _public_contributor_claims_v8 (finding_id, method, phrase, expected)
  VALUES
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','שניאור',567),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','התשפ"ו',791),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','שניאור+התשפ"ו',1358),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','אתקע שופר גדול בציון',1358),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','ביאת המשיח האמיתי בזמן הזה',1358),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','מלחמת המשיח בעתה',1358),
    ('4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795','רגיל','משיח',358),
    ('f3af17f7-9b13-41d7-8fdc-d80d422fd271','רגיל','סוד הגאולה התשפ"ו',911),
    ('4643a3e0-e761-433c-8640-8c2cb3f98d2c','רגיל','חטם',57),
    ('4643a3e0-e761-433c-8640-8c2cb3f98d2c','רגיל','מחט',57),
    ('96591873-5773-4b15-99ed-370c1013c468','רגיל','דרקון',360),
    ('96591873-5773-4b15-99ed-370c1013c468','רגיל','נדקור',360),
    ('0e195107-4a88-4ce9-a683-ac2a61cca49e','רגיל','עבודת השם',827),
    ('0e195107-4a88-4ce9-a683-ac2a61cca49e','רגיל','התבודדות',827),
    ('0e195107-4a88-4ce9-a683-ac2a61cca49e','רגיל','דעת שמחה',827);

  CREATE TEMP TABLE _public_contributor_ready_v8
  ON COMMIT DROP
  AS
  SELECT
    selected.id,
    selected.contributor_id,
    selected.expected,
    selected.expected_claim_count,
    contribution.status,
    contribution.research_state,
    contribution.intent,
    contribution.target_type,
    contribution.target_id,
    contribution.title,
    contribution.body,
    contribution.gematria_claim,
    contribution.origin,
    contributor.slug,
    contributor.display_name,
    target.id AS target_node_id
  FROM _public_contributor_selected_v8 selected
  JOIN public.research_contributions contribution
    ON contribution.id = selected.id
   AND contribution.author_contributor_id = selected.contributor_id
  JOIN public.contributors contributor
    ON contributor.id = selected.contributor_id
  JOIN public.nodes target
    ON target.type = 'number'
   AND target.label = selected.expected::text
   AND target.is_active IS TRUE
   AND coalesce(target.metadata ->> 'space', 'core') = 'core'
  WHERE contribution.deleted_at IS NULL
    AND contribution.status = 'approved'
    AND contribution.research_state = 'validated'
    AND contribution.intent = 'חידוש'
    AND contribution.target_type = 'number'
    AND contribution.target_id = selected.expected::text
    AND contribution.graph_node_id IS NULL
    AND contribution.gematria_claim IS NOT NULL
    AND contributor.active IS TRUE
    AND contributor.locked IS NOT TRUE
    AND contributor.building IS NOT TRUE
    AND (
      nullif(btrim(contributor.dossier_settings ->> 'visibility'), '') IS NULL
      OR lower(contributor.dossier_settings ->> 'visibility') = 'public'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.nodes prior
      WHERE prior.type = 'contribution'
        AND prior.metadata ->> 'contribution_id' = selected.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.contribution_links extra_link
      WHERE extra_link.from_contribution_id = selected.id
    )
    AND (
      SELECT count(*)
      FROM public.nodes unique_target
      WHERE unique_target.type = 'number'
        AND unique_target.label = selected.expected::text
    ) = 1;

  CREATE TEMP TABLE _public_contributor_checks_v8
  ON COMMIT DROP
  AS
  SELECT
    claims.finding_id,
    claims.method,
    claims.phrase,
    claims.expected,
    public.fn_method_value(claims.method, claims.phrase) AS computed
  FROM _public_contributor_claims_v8 claims;

  SELECT count(*) INTO v_selected_count FROM _public_contributor_selected_v8;
  SELECT count(*), count(DISTINCT contributor_id), count(DISTINCT target_node_id)
  INTO v_ready_count, v_author_count, v_target_count
  FROM _public_contributor_ready_v8;

  SELECT
    count(*),
    count(DISTINCT finding_id),
    count(*) FILTER (WHERE computed = expected),
    md5(string_agg(
      finding_id::text || '|' || method || '|' || phrase || '|' || expected::text || '|' || computed::text,
      E'\n' ORDER BY finding_id, method, phrase
    ))
  INTO v_claim_count, v_claim_finding_count, v_claim_match_count, v_claims_digest
  FROM _public_contributor_checks_v8;

  SELECT count(*)
  INTO v_claim_cardinality_count
  FROM _public_contributor_selected_v8 selected
  JOIN (
    SELECT finding_id, count(*)::integer AS actual_claim_count
    FROM _public_contributor_checks_v8
    GROUP BY finding_id
  ) checks ON checks.finding_id = selected.id
  WHERE checks.actual_claim_count = selected.expected_claim_count;

  SELECT md5(string_agg(
    id::text || '|' || contributor_id::text || '|' || expected::text || '|' ||
    coalesce(title, '') || '|' || coalesce(body, '') || '|' ||
    coalesce(gematria_claim::text, '{}') || '|' || coalesce(origin, '') || '|' ||
    target_node_id::text || '|' || slug || '|' || display_name,
    E'\n' ORDER BY id
  ))
  INTO v_row_digest
  FROM _public_contributor_ready_v8;

  SELECT count(*) INTO v_number_nodes_before
  FROM public.nodes WHERE type = 'number';

  IF v_selected_count <> 5
     OR v_ready_count <> 5
     OR v_author_count <> 2
     OR v_target_count <> 5
     OR v_claim_count <> 15
     OR v_claim_finding_count <> 5
     OR v_claim_match_count <> 15
     OR v_claim_cardinality_count <> 5
     OR v_row_digest <> 'fb5646f079d49bc05680e269ee302ccd'
     OR v_claims_digest <> '3cb19de1b213c68bcdc414e91b85ca1a' THEN
    RAISE EXCEPTION
      'audited contributor cohort drift: selected %, ready %, authors %, targets %, claims %/% matches %, cardinalities %, digests %/%',
      v_selected_count, v_ready_count, v_author_count, v_target_count,
      v_claim_count, v_claim_finding_count, v_claim_match_count,
      v_claim_cardinality_count, v_row_digest, v_claims_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT * FROM _public_contributor_ready_v8 ORDER BY id
  LOOP
    SELECT public.project_contribution_to_graph(v_row.id)
    INTO v_projected_node_id;

    IF v_projected_node_id IS NULL THEN
      RAISE EXCEPTION 'contribution projection returned no node for %', v_row.id;
    END IF;

    UPDATE public.nodes
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'world_projection_v8', jsonb_build_object(
        'human_gate', 'ZURIEL',
        'reviewed_at', '2026-10-26',
        'contributor_id', v_row.contributor_id,
        'target_node_id', v_row.target_node_id,
        'verification_scope', 'numeric equality only; interpretation remains attributed source material',
        'claim_count', v_row.expected_claim_count,
        'row_digest', v_row_digest,
        'claims_digest', v_claims_digest,
        'privacy_changed', false,
        'publication_changed', false
      )
    )
    WHERE id = v_projected_node_id
      AND type = 'contribution'
      AND metadata ->> 'contribution_id' = v_row.id::text
      AND coalesce(metadata ->> 'space', '') = 'core';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'projected contribution node failed closed for % / %', v_row.id, v_projected_node_id;
    END IF;

    UPDATE public.edges
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'world_projection_v8', jsonb_build_object(
        'human_gate', 'ZURIEL',
        'reviewed_at', '2026-10-26',
        'claims_digest', v_claims_digest
      )
    )
    WHERE from_node = v_projected_node_id
      AND to_node = v_row.target_node_id
      AND relation_type = 'contributes_to'
      AND coalesce(metadata ->> 'space', '') = 'core';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'projected contribution edge failed closed for % / %', v_row.id, v_row.target_node_id;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  SELECT count(*) INTO v_number_nodes_after
  FROM public.nodes WHERE type = 'number';

  IF v_processed <> 5 OR v_number_nodes_after <> v_number_nodes_before THEN
    RAISE EXCEPTION
      'projection postcondition failed: processed %, number nodes before/after %/%',
      v_processed, v_number_nodes_before, v_number_nodes_after;
  END IF;

  IF (
    SELECT count(*)
    FROM _public_contributor_ready_v8 ready
    JOIN public.research_contributions contribution ON contribution.id = ready.id
    JOIN public.nodes source_node ON source_node.id = contribution.graph_node_id
    JOIN public.edges relation
      ON relation.from_node = source_node.id
     AND relation.to_node = ready.target_node_id
     AND relation.relation_type = 'contributes_to'
    WHERE contribution.status = 'approved'
      AND contribution.research_state = 'validated'
      AND contribution.author_contributor_id = ready.contributor_id
      AND source_node.type = 'contribution'
      AND coalesce(source_node.metadata ->> 'space', '') = 'core'
      AND coalesce(relation.metadata ->> 'space', '') = 'core'
  ) <> 5 THEN
    RAISE EXCEPTION 'projection postcondition failed: all five exact-author sources must remain approved and connect to their existing public number targets';
  END IF;
END;
$batch$;
