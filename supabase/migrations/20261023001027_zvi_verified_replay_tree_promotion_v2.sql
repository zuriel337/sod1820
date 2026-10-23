-- ZVI VERIFIED REPLAY -> EXISTING TREE TARGETS v2
--
-- Human Gate: ZURIEL approved continuing the Zvi corpus in reviewed batches.
-- This exact batch contains the 19 public, non-duplicate findings from the next
-- 40-card review whose claims were replayed successfully on 2026-10-23 and
-- whose exact number nodes already exist. It creates no nodes/edges, changes no
-- publication scope, and keeps strength separate from truth and publication.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_row record;
  v_current record;
  v_result jsonb;
  v_processed integer := 0;
  v_note constant text :=
    'ZURIEL Human-Gate 2026-10-23: promote the replay-verified, non-duplicate public findings from Zvi review batch 2.';
BEGIN
  SELECT count(*)
  INTO v_admin_count
  FROM public.users
  WHERE role = 'admin';

  SELECT id
  INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  ORDER BY id
  LIMIT 1;

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN
    SELECT finding_id, target_node_id, replay_kind
    FROM (VALUES
      ('0223438e-1b7a-4e0b-baa8-94c9a4440586'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid, 'regular_composite'),
      ('0287469c-0915-4570-9606-a245e7286cad'::uuid, '8b1656d1-81b0-4dbd-b97c-1b27c5acb4b1'::uuid, 'regular_relation'),
      ('02db8f70-bb49-42b4-898e-348a32dac668'::uuid, 'dba512f5-8ba4-4086-bd5a-e42517c1b700'::uuid, 'regular_and_product'),
      ('05c97950-f765-4a58-bfaa-a158b649bf80'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid, 'regular_relation'),
      ('06d9c732-6e48-4f5c-8d57-a0447e841741'::uuid, '8935de02-56d5-4f56-a0d7-bc6694b22582'::uuid, 'regular_relation'),
      ('07f6272c-160b-4423-bc7b-3e659fc723ea'::uuid, '4740e8d5-f612-4b6c-ab6a-7db1d7b4aa4a'::uuid, 'regular_composite'),
      ('08d39d7f-7c24-4a79-b0f2-eaaa475a88cc'::uuid, '4239eacd-c479-4411-8380-b42d2dc0f1a6'::uuid, 'regular_relation'),
      ('0916cfbd-3b9d-4989-9ce3-ac35b1f0b9c7'::uuid, '0c1ec9c3-571c-467e-967d-d92f5a70747b'::uuid, 'regular_composite'),
      ('0c8786ca-e9ea-4e5f-8024-b34b629a786a'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid, 'regular'),
      ('0c9b29f3-8454-4a88-80cf-921d8faa6915'::uuid, '73ec943e-3c59-437f-9b97-2bafb39572f1'::uuid, 'regular'),
      ('0cd604ae-0499-444d-9f9a-9b8dacffca64'::uuid, 'acf58e09-87a5-47f7-896e-f24e66f0c9c7'::uuid, 'regular_composite'),
      ('100237f5-a108-45f1-a8ef-e3496d675395'::uuid, '0dbfa864-2801-4ccf-8382-4c39a37cc398'::uuid, 'regular_plus_tanach_phrase_count'),
      ('10e47f5a-8168-49d5-b0ee-e721d78beb43'::uuid, '17f8b9bd-873d-4188-9c72-02bd3f523b1b'::uuid, 'regular_relation'),
      ('10fd0341-a233-4a36-8969-91a9078b33d7'::uuid, '622c238b-9a18-4464-b3ba-f02d8392cf91'::uuid, 'regular_relation'),
      ('1118f3ab-e4eb-43c2-9da1-23be09599d7b'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid, 'regular_relation'),
      ('111d8117-7e30-44f8-bc43-1bdd3248fcef'::uuid, '281254ec-5e73-4949-928c-fd18e42f3a44'::uuid, 'milui_and_regular'),
      ('12e4cc15-42f2-42df-8ae5-7037ae667dcc'::uuid, '9cd22c3e-be5c-4283-ba6d-f974530d4dbc'::uuid, 'regular_relation'),
      ('13452e40-bceb-4f85-a2f5-3a631d146179'::uuid, 'cd7bc426-f541-4098-99e9-ea4a1e5d5c10'::uuid, 'regular'),
      ('135ca479-767a-4e5d-97be-ce0ca578592c'::uuid, '26cada57-26fe-4a6e-abed-d4f3f85ac5cb'::uuid, 'regular_composite')
    ) AS selected(finding_id, target_node_id, replay_kind)
    ORDER BY finding_id
  LOOP
    SELECT
      ro.status,
      ro.privacy_scope,
      ro.engine_detail ->> 'verification_state' AS verification_state,
      ro.meta #>> '{ext,extraction_integrity,fidelity_status}' AS fidelity_status,
      ro.promoted_node_id,
      cu.contributor_id AS source_contributor_id,
      cu.status AS source_status
    INTO v_current
    FROM public.research_objects AS ro
    JOIN public.channel_updates AS cu
      ON split_part(coalesce(ro.source_ref, ''), '#', 1) = 'channel_updates:' || cu.id::text
    WHERE ro.id = v_row.finding_id
    FOR UPDATE OF ro;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'finding % or its exact source occurrence was not found', v_row.finding_id;
    END IF;

    IF v_current.source_contributor_id <> 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
       OR v_current.source_status = 'off' THEN
      RAISE EXCEPTION 'finding % failed stable Zvi/source-on preflight', v_row.finding_id;
    END IF;

    IF v_current.privacy_scope <> 'public'
       OR v_current.status NOT IN ('candidate', 'approved', 'canonical')
       OR coalesce(v_current.fidelity_status, '') = 'partial'
       OR coalesce(v_current.verification_state, 'match') <> 'match'
       OR (v_current.promoted_node_id IS NOT NULL AND v_current.promoted_node_id <> v_row.target_node_id) THEN
      RAISE EXCEPTION 'finding % failed access/status/fidelity/target preflight', v_row.finding_id;
    END IF;

    IF v_current.status = 'candidate' THEN
      SELECT public.admin_research_review(v_row.finding_id, 'approve', NULL, false)
      INTO v_result;
      IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
         OR v_result ->> 'status' <> 'approved' THEN
        RAISE EXCEPTION 'approval failed for %: %', v_row.finding_id, v_result;
      END IF;
      v_current.status := 'approved';
    END IF;

    IF v_current.status = 'approved' THEN
      SELECT public.admin_research_review(v_row.finding_id, 'canonicalize', 'match', false)
      INTO v_result;
      IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
         OR v_result ->> 'status' <> 'canonical' THEN
        RAISE EXCEPTION 'canonicalization failed for %: %', v_row.finding_id, v_result;
      END IF;
    END IF;

    UPDATE public.research_objects
    SET engine_detail = coalesce(engine_detail, '{}'::jsonb) || jsonb_build_object(
      'verification_replay', jsonb_build_object(
        'batch', 'zvi_verified_replay_tree_promotion_v2',
        'replayed_at', '2026-10-23T00:00:00Z',
        'result', 'match',
        'replay_kind', v_row.replay_kind,
        'engine', 'src/lib/gematria.js',
        'target_node_id', v_row.target_node_id,
        'truth_score_created', false
      )
    )
    WHERE id = v_row.finding_id;

    SELECT public.admin_research_attach_existing_graph_node_v1(
      v_row.finding_id,
      v_row.target_node_id,
      v_note
    )
    INTO v_result;

    IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((v_result ->> 'tree_attached')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'tree attachment failed for %: %', v_row.finding_id, v_result;
    END IF;

    UPDATE public.decision_ledger
    SET provenance = coalesce(provenance, '{}'::jsonb) || jsonb_build_object(
      'review_batch', 'zvi_verified_replay_tree_promotion_v2',
      'reviewed_at', '2026-10-23',
      'selection', 'replay=match; recommendation=מתאים לעץ; contributor=צבי; duplicate=false',
      'replay_kind', v_row.replay_kind,
      'truth_score_created', false
    )
    WHERE decision_type = 'research_graph_attach'
      AND subject_type = 'research_object'
      AND subject_ref = v_row.finding_id::text
      AND candidate ->> 'target_node_id' = v_row.target_node_id::text
      AND human_decision = 'approve'
      AND status IN ('confirmed', 'applied', 'executed');

    v_processed := v_processed + 1;
  END LOOP;

  IF v_processed <> 19 THEN
    RAISE EXCEPTION 'expected 19 promoted findings, processed %', v_processed;
  END IF;
END;
$batch$;
