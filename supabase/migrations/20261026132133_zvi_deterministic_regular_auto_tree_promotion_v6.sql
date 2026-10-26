-- ZVI DETERMINISTIC REGULAR AUTO TREE PROMOTION v6
--
-- Human Gate: ZURIEL explicitly approved automatic promotion of the reviewed
-- Zvi corpus without opening every finding on 2026-10-26. This one-time batch
-- contains only eight approved/public findings whose complete, source-bounded
-- regular-gematria claim sets reproduce their stored values in the canonical
-- registry engine. It is not a standing rule for future intake.
--
-- The migration replays all 41 expressions through fn_method_value('רגיל', ...)
-- before changing governance. Every source, row, target and calculation is
-- fingerprinted. No node, edge or source is created; no duplicate is deleted;
-- privacy and publication remain unchanged.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_selected_count integer;
  v_ready_count integer;
  v_source_count integer;
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
    'ZURIEL explicit Human-Gate 2026-10-26: canonical regular-gematria replay matched every source-bounded expression; attach the finding to the identical existing public number node.';
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

  CREATE TEMP TABLE _zvi_deterministic_selected_v6 (
    id uuid PRIMARY KEY,
    expected integer NOT NULL,
    expected_claim_count integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _zvi_deterministic_selected_v6 (id, expected, expected_claim_count)
  VALUES
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 9),
    ('5362e6b5-5ab6-4fae-b203-60b45e428610', 787, 3),
    ('553e8ce2-2e24-477a-a0ef-68fd2b23b474', 1078, 3),
    ('59012fb5-7801-431c-9579-a13366c48fd0', 747, 4),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 5),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 10),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 5),
    ('e360453b-595d-4142-b77f-195a03c9ebb0', 1000, 2);

  CREATE TEMP TABLE _zvi_deterministic_claims_v6 (
    finding_id uuid NOT NULL REFERENCES _zvi_deterministic_selected_v6(id),
    expected integer NOT NULL,
    phrase text NOT NULL,
    PRIMARY KEY (finding_id, phrase)
  ) ON COMMIT DROP;

  INSERT INTO _zvi_deterministic_claims_v6 (finding_id, expected, phrase)
  VALUES
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'דגול מרבבה'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'מלך רב'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'דבר אלהים'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'ובידך כח וגבורה'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'ויחי עוד לנצח'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'ראה אלהים'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'זכר אדני'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'רוממו'),
    ('23bb4acf-1245-4617-93c7-7c14085e0b1f', 292, 'בכל דרכיו'),
    ('5362e6b5-5ab6-4fae-b203-60b45e428610', 787, 'תשפז'),
    ('5362e6b5-5ab6-4fae-b203-60b45e428610', 787, 'ומוראכם וחתכם'),
    ('5362e6b5-5ab6-4fae-b203-60b45e428610', 787, 'בהר שפר'),
    ('553e8ce2-2e24-477a-a0ef-68fd2b23b474', 1078, 'תערובת'),
    ('553e8ce2-2e24-477a-a0ef-68fd2b23b474', 1078, 'בכל מדינות מלכותך'),
    ('553e8ce2-2e24-477a-a0ef-68fd2b23b474', 1078, 'ויעשו להם חגרת'),
    ('59012fb5-7801-431c-9579-a13366c48fd0', 747, 'ומי כעמך ישראל'),
    ('59012fb5-7801-431c-9579-a13366c48fd0', 747, 'ותרפאני'),
    ('59012fb5-7801-431c-9579-a13366c48fd0', 747, 'אשר יבחר יהוה'),
    ('59012fb5-7801-431c-9579-a13366c48fd0', 747, 'ועטרת זהב גדולה'),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 'הפכת מספדי למחול'),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 'ויאמר אלהים יהי אור ויהי אור'),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 'בשמך הושיעני'),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 'ושמן זית'),
    ('7340156e-de40-4450-ba81-7099c611b7c2', 813, 'לשוש עליך לטוב'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'אש שחורה אש לבנה'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'כל אשר דבר יהוה נעשה'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'ורב טוב לבית ישראל'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'אשריך ישראל מי כמוך'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'הר אלהים הר בשן הר גבננים'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'בחרתיך ולא מאסתיך'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'ולמען תספר באזני בנך ובן בנך'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'בשר ערלתו'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'ובעת צרתם'),
    ('7d4f4727-0ecf-43a7-83b6-fb97eeeb9c19', 1208, 'מי יעלה בהר יהוה ומי יקום במקום קדשו'),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 'הכנסת ספר תורה'),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 'מעלים את ארון ברית יהוה'),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 'על אשר עשו את העגל'),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 'ועשית כפרת'),
    ('a72a2735-e927-4969-8573-90dc7e3edad6', 1486, 'ועשית פרכת'),
    ('e360453b-595d-4142-b77f-195a03c9ebb0', 1000, 'יעשו עץ גבה חמשים אמה'),
    ('e360453b-595d-4142-b77f-195a03c9ebb0', 1000, 'אליך יהוה אקרא ואל אדני אתחנן');

  CREATE TEMP TABLE _zvi_deterministic_ready_v6
  ON COMMIT DROP
  AS
  SELECT
    selected.id,
    selected.expected,
    selected.expected_claim_count,
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
  FROM _zvi_deterministic_selected_v6 selected
  JOIN public.research_objects ro ON ro.id = selected.id
  JOIN public.channel_updates source_row
    ON source_row.id = substring(ro.source_ref FROM '^channel_updates:([0-9a-f-]{36})$')::uuid
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
    AND coalesce(ro.meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
    AND ro.kind NOT IN ('hypothesis', 'question')
    AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}$'
    AND source_row.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
    AND source_row.status = 'live'
    AND source_row.page_only IS FALSE
    AND source_row.channel = 'torat-haremez'
    AND coalesce((ro.meta #>> '{ext,wa_channel_intake,media_ocr_pending}')::boolean, false) IS FALSE
    AND coalesce((ro.meta #>> '{ext,wa_channel_intake,media_transcription_pending}')::boolean, false) IS FALSE
    AND jsonb_array_length(
      CASE
        WHEN jsonb_typeof(ro.meta #> '{ext,wa_channel_intake,tree_matches}') = 'array'
          THEN ro.meta #> '{ext,wa_channel_intake,tree_matches}'
        ELSE '[]'::jsonb
      END
    ) = 1
    AND lower(ro.meta #>> '{ext,wa_channel_intake,tree_matches,0,type}') = 'number'
    AND ro.meta #>> '{ext,wa_channel_intake,tree_matches,0,key}' = selected.expected::text
    AND target_resolution.target_node_count = 1
    AND target_resolution.target_node_id IS NOT NULL;

  SELECT count(*) INTO v_selected_count FROM _zvi_deterministic_selected_v6;
  SELECT count(*), count(DISTINCT source_id)
  INTO v_ready_count, v_source_count
  FROM _zvi_deterministic_ready_v6;

  SELECT md5(string_agg(
    id::text || '|' || source_ref || '|' || expected::text || '|' ||
    coalesce(statement, '') || '|' || coalesce(terms::text, '{}') || '|' ||
    coalesce(relates::text, '{}') || '|' || coalesce(meta::text, '{}') || '|' ||
    source_id::text || '|' || coalesce(source_text, '') || '|' || coalesce(image_url, ''),
    E'\n' ORDER BY id
  ))
  INTO v_row_source_digest
  FROM _zvi_deterministic_ready_v6;

  CREATE TEMP TABLE _zvi_deterministic_checks_v6
  ON COMMIT DROP
  AS
  SELECT
    claims.finding_id,
    claims.expected,
    claims.phrase,
    public.fn_method_value('רגיל', claims.phrase) AS computed
  FROM _zvi_deterministic_claims_v6 claims;

  SELECT
    count(*),
    count(DISTINCT finding_id),
    count(*) FILTER (WHERE computed = expected),
    md5(string_agg(
      finding_id::text || '|' || expected::text || '|' || phrase || '|' || computed::text,
      E'\n' ORDER BY finding_id, phrase
    ))
  INTO
    v_claim_count,
    v_claim_finding_count,
    v_claim_match_count,
    v_claims_digest
  FROM _zvi_deterministic_checks_v6;

  SELECT count(*)
  INTO v_claim_cardinality_count
  FROM _zvi_deterministic_selected_v6 selected
  JOIN (
    SELECT finding_id, count(*)::integer AS actual_claim_count
    FROM _zvi_deterministic_checks_v6
    GROUP BY finding_id
  ) claims ON claims.finding_id = selected.id
  WHERE claims.actual_claim_count = selected.expected_claim_count;

  IF v_selected_count <> 8
     OR v_ready_count <> 8
     OR v_source_count <> 8
     OR v_claim_count <> 41
     OR v_claim_finding_count <> 8
     OR v_claim_match_count <> 41
     OR v_claim_cardinality_count <> 8
     OR v_row_source_digest <> '3e223ce6b9f53e7686b89e290ff1126b'
     OR v_claims_digest <> 'ffd91c01e5289e32881a172d81dbbbb0' THEN
    RAISE EXCEPTION
      'audited cohort drift: selected %, ready %, sources %, claims %/% matches %, cardinalities %, digests %/%',
      v_selected_count, v_ready_count, v_source_count, v_claim_count,
      v_claim_finding_count, v_claim_match_count, v_claim_cardinality_count,
      v_row_source_digest, v_claims_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT *
    FROM _zvi_deterministic_ready_v6
    ORDER BY id
  LOOP
    SELECT public.admin_research_review(
      v_row.id,
      'canonicalize',
      'match',
      false
    )
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR v_result ->> 'status' <> 'canonical'
       OR v_result ->> 'verification_state' <> 'match'
       OR coalesce((v_result ->> 'published')::boolean, false) IS TRUE THEN
      RAISE EXCEPTION 'canonicalization failed closed for %: %', v_row.id, v_result;
    END IF;

    SELECT public.admin_research_attach_existing_graph_node_v1(
      v_row.id,
      v_row.target_node_id,
      v_note
    )
    INTO v_result;

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
      'triage_base_commit', '34e5e504a03abc837959cec8e46c6e5cbd197634',
      'selection', 'approved public exact-source finding with one structured number target equal to row.value and complete deterministic regular-gematria replay match',
      'verification_method', 'canonical fn_method_value(רגיל, phrase)',
      'verification_scope', 'numeric equality only; interpretation remains separate',
      'claim_count', v_row.expected_claim_count,
      'deterministic_checks', (
        SELECT jsonb_agg(jsonb_build_object(
          'phrase', checks.phrase,
          'expected', checks.expected,
          'computed', checks.computed,
          'matches', checks.computed = checks.expected
        ) ORDER BY checks.phrase)
        FROM _zvi_deterministic_checks_v6 checks
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

  IF v_processed <> 8 THEN
    RAISE EXCEPTION 'expected 8 promoted findings, processed %', v_processed;
  END IF;

  IF (
    SELECT count(*)
    FROM _zvi_deterministic_selected_v6 selected
    JOIN public.research_objects ro ON ro.id = selected.id
    WHERE ro.status = 'canonical'
      AND ro.privacy_scope = 'public'
      AND ro.promoted_node_id IS NOT NULL
      AND ro.engine_detail ->> 'verification_state' = 'match'
      AND ro.engine_verified IS DISTINCT FROM TRUE
      AND coalesce((ro.meta #>> '{governance,published}')::boolean, false) IS FALSE
  ) <> 8 THEN
    RAISE EXCEPTION 'postcondition failed: all 8 rows must be canonical, attached, match-declared, unpublished and access-stable';
  END IF;
END;
$batch$;
