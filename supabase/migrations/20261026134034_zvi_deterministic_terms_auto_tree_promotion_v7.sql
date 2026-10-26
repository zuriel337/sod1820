-- ZVI DETERMINISTIC TERM-SET AUTO TREE PROMOTION v7
--
-- Human Gate: ZURIEL explicitly approved automatic promotion of reviewed
-- material on 2026-10-26. This one-time, branch-only batch contains only
-- approved/public Zvi findings with an exact live source, an existing unique
-- public number target, and a complete structured terms array for which every
-- term reproduces the stored value through fn_method_value('רגיל', ...).
--
-- Five mixed/incomplete findings remain excluded: one frequency claim, one
-- multi-method claim, and three incompletely extracted term lists. No source,
-- node, edge or duplicate is created or deleted. Privacy/publication do not
-- change. Interpretation remains a source claim, separate from the verified
-- numeric equality.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_selected_count integer;
  v_ready_count integer;
  v_source_count integer;
  v_cluster_count integer;
  v_claim_count integer;
  v_claim_finding_count integer;
  v_claim_match_count integer;
  v_claim_cardinality_count integer;
  v_processed integer := 0;
  v_ledger_updated integer;
  v_row_source_digest text;
  v_claims_digest text;
  v_result jsonb;
  v_row record;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-26: every structured term in this exact-source finding was replayed through the canonical regular-gematria engine and matched the stored value; attach to the identical existing public number node.';
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_objects IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.channel_updates IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE MODE;

  CREATE TEMP TABLE _zvi_deterministic_selected_v7 (
    id uuid PRIMARY KEY,
    expected integer NOT NULL,
    expected_term_count integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _zvi_deterministic_selected_v7 (id, expected, expected_term_count)
  VALUES
    ('0120a1c4-e099-40e4-8454-82096ff73678',98,3),
    ('06de0dff-c8df-4d54-ab3e-6778c6000575',352,4),
    ('08207673-e260-40d4-a172-48b3a6f3ff8e',965,3),
    ('0a53e6b1-34af-4670-b35a-8604ebc117dc',787,3),
    ('0bbcb0d6-f0b8-443d-b628-7cd15bdcb681',787,3),
    ('0c899143-63c5-4d12-a006-cd1305301036',305,3),
    ('0d666994-5533-4182-aad7-c61ba935785d',305,3),
    ('15278e3a-cdc0-4fb5-a446-4484c0abf333',786,3),
    ('16abd58d-9804-4400-af02-f3dbc4f99ac7',530,2),
    ('1bc9488c-9e56-42aa-9571-abaadad683bf',277,2),
    ('24cb0678-7857-4cea-9d69-246140d8da52',305,3),
    ('283e747c-21af-484d-9bda-4c36b40dd5f7',474,2),
    ('3497547e-65c2-45fc-9606-c0aea1e51d7c',98,3),
    ('36fa239e-0564-463a-bcea-d2e75efe6edc',247,4),
    ('37a2cdbe-b156-40aa-8b77-e526c05d302b',530,4),
    ('3c1e1582-c122-4e68-b8a1-8c987186c411',98,4),
    ('424cb7cc-1c8a-449f-85e6-acff588e6412',403,3),
    ('4383f2e5-4a59-4520-93e9-6653ad958f0c',98,2),
    ('44091700-eb60-4c74-b5c8-8d167deb1ae7',167,2),
    ('495ac274-edcf-479b-b50f-e49293910ce2',155,3),
    ('4cbef54e-cbcc-4ffd-903e-d0809f9f4c21',530,4),
    ('5071cf66-ea0e-4793-8121-16f4374ca67d',412,4),
    ('58dff5fe-7dfa-4c9c-89d0-58709d3183a9',247,3),
    ('5997ae7d-6c13-46db-be86-c49e9167f126',439,3),
    ('59df73d1-3fd8-4101-8677-f9acf852ab44',128,3),
    ('5a812bb7-4878-42b9-b868-595888b2082b',75,3),
    ('5c86cc83-b86f-4892-8176-046d9f68e7a6',570,5),
    ('607f0028-6adc-4273-9856-12fd1de7da50',98,3),
    ('63f0012b-0f5d-4156-bda7-9d8e3527b220',101,2),
    ('6478f0d1-ddb7-47b0-a374-0df81c58db82',450,4),
    ('6f62e73f-916f-4ef6-b7c0-9cca2de35809',401,2),
    ('7290469a-1412-4778-9a06-0ba5ee29d0ab',98,3),
    ('78b67259-e26f-4fc3-b431-903bdb371a60',580,3),
    ('7e9215d3-a8d5-4084-b87f-36028a901045',98,3),
    ('7fbbacd5-1d50-45b3-94cf-67502b7b9f4e',136,3),
    ('819eb84c-b946-47be-8dc5-b0ef27bd41a0',128,3),
    ('8e9e181e-36bd-4af4-b573-0818141df979',786,2),
    ('9241ffd6-54e5-427d-b667-fa6fefeafe0d',1042,2),
    ('99c79516-4753-40cd-a900-d41df9c14213',118,2),
    ('99f8582f-c59b-40c3-af28-0382122c22f4',444,3),
    ('9ab9cd7b-8315-4617-b4f7-4faf1014b786',170,4),
    ('9b1a2294-24d3-4790-b9d2-a539d01f091b',913,3),
    ('9caa837a-c329-4fa7-b544-6f2da950ae94',651,2),
    ('9dfa31f9-cf7f-4f3f-a7dd-54d35d737099',476,2),
    ('a2d33676-3ce5-449e-9701-0210422e169a',91,2),
    ('af40c675-60eb-4e3a-8f94-4bb1ba879e06',786,2),
    ('b03c8b4e-a2c6-4e6d-bc16-3c91ab72ee2c',277,4),
    ('b400a8d8-64b9-4598-8394-3d966de932e2',108,3),
    ('b462c35f-fcf6-4947-adec-9b86c5a96f5c',786,3),
    ('b7185cfb-9156-4c24-8526-cc2380eab586',620,2),
    ('b7f5f275-9455-4e0d-aea6-bfe3517601e0',446,3),
    ('b9b7dc63-d165-4064-9fbc-6ce1b8a2abb2',299,2),
    ('ba64dd7e-0c9e-4643-bde7-47ac2dae41f0',467,3),
    ('bc6ce865-676c-4ea9-a74c-6a6635507b5f',467,3),
    ('beaec4f8-7fd6-43a2-8fcb-169d591e5ccc',553,2),
    ('c03dc512-39d2-4804-94fd-b7a70e7a6d84',335,3),
    ('c1c7bec2-3242-4e70-9b49-2c39053c81fb',98,3),
    ('c549bb8e-5718-45db-b7ee-8457f62c330e',913,3),
    ('ce414f38-1502-4328-a877-03b6967db46f',580,3),
    ('d3d918ca-d684-42a4-a1f5-dc08b6456505',98,3),
    ('d6c4ba6c-4fdb-4c7e-909c-205fdfc1bd9b',299,2),
    ('de5d2f44-7d4a-4567-bf00-2789e43493d4',98,5),
    ('e23fb1b9-f0b2-47b8-abf4-ef3b1c27db64',553,2),
    ('e353191c-be39-4eaf-90ad-92759ff8fcd2',305,3),
    ('e5e04257-0d5c-41df-aac1-bff74aac6de7',246,2),
    ('ec115bf1-3e2f-4d36-9e69-23b2cb1fb4c3',68,2),
    ('ed4427e5-6c9f-4693-8873-8464a0a7da66',729,3),
    ('ef78420a-809c-45f3-89ba-5be877c236b7',685,4),
    ('f72fd94a-2769-453a-9abc-83a4f049c018',570,3),
    ('f9cb3f5c-b370-4532-91e0-c0422501aed1',128,3),
    ('fa5494ae-323f-480a-972d-e90c3a73d983',75,3),
    ('ff99fa55-d779-4a23-8a1e-3320d18749cf',170,3);

  CREATE TEMP TABLE _zvi_deterministic_ready_v7
  ON COMMIT DROP
  AS
  SELECT
    selected.id,
    selected.expected,
    selected.expected_term_count,
    ro.kind,
    ro.statement,
    ro.terms,
    ro.relates,
    ro.value,
    ro.source_ref,
    ro.engine_detail,
    ro.meta,
    source_row.id AS source_id,
    source_row.text AS source_text,
    source_row.image_url,
    target_resolution.target_node_id,
    target_resolution.target_node_count
  FROM _zvi_deterministic_selected_v7 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  JOIN public.channel_updates source_row
    ON split_part(ro.source_ref, '#', 1) = 'channel_updates:' || source_row.id::text
  CROSS JOIN LATERAL (
    SELECT
      (array_agg(node.id ORDER BY node.id::text))[1] AS target_node_id,
      count(*)::integer AS target_node_count
    FROM public.nodes node
    WHERE node.type = 'number'
      AND node.is_active IS TRUE
      AND node.label = selected.expected::text
      AND coalesce(node.metadata ->> 'space', 'core') = 'core'
  ) AS target_resolution
  WHERE ro.status = 'approved'
    AND ro.privacy_scope = 'public'
    AND ro.promoted_node_id IS NULL
    AND ro.value = selected.expected
    AND ro.engine_verified IS DISTINCT FROM TRUE
    AND coalesce(ro.engine_detail, '{}'::jsonb) = '{}'::jsonb
    AND cardinality(coalesce(ro.terms, '{}'::text[])) = selected.expected_term_count
    AND coalesce(ro.meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
    AND ro.kind NOT IN ('hypothesis', 'question')
    AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}(#.*)?$'
    AND source_row.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
    AND source_row.status = 'live'
    AND source_row.page_only IS FALSE
    AND source_row.channel = 'torat-haremez'
    AND coalesce((ro.meta #>> '{ext,wa_channel_intake,media_ocr_pending}')::boolean, false) IS FALSE
    AND coalesce((ro.meta #>> '{ext,wa_channel_intake,media_transcription_pending}')::boolean, false) IS FALSE
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(ro.meta #> '{ext,wa_channel_intake,tree_matches}') = 'array'
            THEN ro.meta #> '{ext,wa_channel_intake,tree_matches}'
          ELSE '[]'::jsonb
        END
      ) match_row
      WHERE lower(match_row ->> 'type') = 'number'
        AND match_row ->> 'key' ~ '^-?[0-9]+$'
        AND (match_row ->> 'key')::integer = selected.expected
    )
    AND target_resolution.target_node_count = 1
    AND target_resolution.target_node_id IS NOT NULL;

  CREATE TEMP TABLE _zvi_deterministic_checks_v7
  ON COMMIT DROP
  AS
  SELECT
    ready.id AS finding_id,
    ready.expected,
    term_row.term,
    term_row.ordinality AS term_ordinal,
    public.fn_method_value('רגיל', term_row.term) AS computed
  FROM _zvi_deterministic_ready_v7 ready
  CROSS JOIN LATERAL unnest(ready.terms) WITH ORDINALITY term_row(term, ordinality);

  SELECT count(*) INTO v_selected_count FROM _zvi_deterministic_selected_v7;
  SELECT count(*), count(DISTINCT source_id), count(DISTINCT (source_id, expected))
  INTO v_ready_count, v_source_count, v_cluster_count
  FROM _zvi_deterministic_ready_v7;

  SELECT md5(string_agg(
    id::text || '|' || source_ref || '|' || expected::text || '|' ||
    coalesce(statement, '') || '|' || coalesce(terms::text, '{}') || '|' ||
    coalesce(relates::text, '{}') || '|' || coalesce(meta::text, '{}') || '|' ||
    source_id::text || '|' || coalesce(source_text, '') || '|' || coalesce(image_url, ''),
    E'\n' ORDER BY id
  ))
  INTO v_row_source_digest
  FROM _zvi_deterministic_ready_v7;

  SELECT
    count(*),
    count(DISTINCT finding_id),
    count(*) FILTER (WHERE computed = expected),
    md5(string_agg(
      finding_id::text || '|' || expected::text || '|' || term_ordinal::text || '|' || term || '|' || computed::text,
      E'\n' ORDER BY finding_id, term_ordinal
    ))
  INTO v_claim_count, v_claim_finding_count, v_claim_match_count, v_claims_digest
  FROM _zvi_deterministic_checks_v7;

  SELECT count(*)
  INTO v_claim_cardinality_count
  FROM _zvi_deterministic_selected_v7 selected
  JOIN (
    SELECT finding_id, count(*)::integer AS actual_term_count
    FROM _zvi_deterministic_checks_v7
    GROUP BY finding_id
  ) checks ON checks.finding_id = selected.id
  WHERE checks.actual_term_count = selected.expected_term_count;

  IF v_selected_count <> 72
     OR v_ready_count <> 72
     OR v_source_count <> 70
     OR v_cluster_count <> 72
     OR v_claim_count <> 209
     OR v_claim_finding_count <> 72
     OR v_claim_match_count <> 209
     OR v_claim_cardinality_count <> 72
     OR v_row_source_digest <> 'd6ce852a3b0eac70ccef3eeef1d2b624'
     OR v_claims_digest <> '95e978f2f834ca225637e811a6e344e4' THEN
    RAISE EXCEPTION
      'audited cohort drift: selected %, ready %, sources %, clusters %, claims %/% matches %, cardinalities %, digests %/%',
      v_selected_count, v_ready_count, v_source_count, v_cluster_count,
      v_claim_count, v_claim_finding_count, v_claim_match_count,
      v_claim_cardinality_count, v_row_source_digest, v_claims_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT * FROM _zvi_deterministic_ready_v7 ORDER BY id
  LOOP
    SELECT public.admin_research_review(v_row.id, 'canonicalize', 'match', false)
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR v_result ->> 'status' <> 'canonical'
       OR v_result ->> 'verification_state' <> 'match'
       OR coalesce((v_result ->> 'published')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;

    SELECT public.admin_research_attach_existing_graph_node_v1(
      v_row.id, v_row.target_node_id, v_note
    ) INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((v_result ->> 'tree_attached')::boolean, false) IS NOT TRUE
       OR (v_result ->> 'target_node_id')::uuid IS DISTINCT FROM v_row.target_node_id
       OR coalesce((v_result ->> 'created_node')::boolean, false) IS TRUE
       OR coalesce((v_result ->> 'created_edge')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'tree attachment failed closed for %: %', v_row.id, v_result;
    END IF;

    UPDATE public.decision_ledger
    SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'triage_snapshot_date', '2026-10-26',
      'triage_base_commit', '3a5c4fdde4a42e59582157103efc3d06d53dc66a',
      'selection', 'approved public exact-source finding whose complete structured terms array replays to row.value through the canonical regular-gematria engine',
      'verification_method', 'canonical fn_method_value(רגיל, term)',
      'verification_scope', 'numeric equality only; source interpretation remains separate',
      'claim_count', v_row.expected_term_count,
      'deterministic_checks', (
        SELECT jsonb_agg(jsonb_build_object(
          'term', checks.term,
          'expected', checks.expected,
          'computed', checks.computed,
          'matches', checks.computed = checks.expected
        ) ORDER BY checks.term_ordinal)
        FROM _zvi_deterministic_checks_v7 checks
        WHERE checks.finding_id = v_row.id
      ),
      'row_source_digest', v_row_source_digest,
      'claims_digest', v_claims_digest,
      'stored_tree_match_present', true,
      'engine_verified_boolean_changed', false,
      'truth_score_created', false,
      'privacy_changed', false,
      'publication_changed', false
    )
    WHERE id = (v_result ->> 'decision_ledger_id')::uuid;

    GET DIAGNOSTICS v_ledger_updated = ROW_COUNT;
    IF v_ledger_updated <> 1 THEN
      RAISE EXCEPTION 'expected one decision ledger row for %, updated %', v_row.id, v_ledger_updated;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  IF v_processed <> 72 THEN
    RAISE EXCEPTION 'expected 72 promoted findings, processed %', v_processed;
  END IF;

  IF (
    SELECT count(*)
    FROM _zvi_deterministic_selected_v7 selected
    JOIN public.research_objects ro ON ro.id = selected.id
    WHERE ro.status = 'canonical'
      AND ro.privacy_scope = 'public'
      AND ro.promoted_node_id IS NOT NULL
      AND ro.engine_detail ->> 'verification_state' = 'match'
      AND ro.engine_verified IS DISTINCT FROM TRUE
      AND coalesce((ro.meta #>> '{governance,published}')::boolean, false) IS FALSE
  ) <> 72 THEN
    RAISE EXCEPTION 'postcondition failed: all 72 rows must be canonical, attached, match-declared, unpublished and access-stable';
  END IF;
END;
$batch$;
