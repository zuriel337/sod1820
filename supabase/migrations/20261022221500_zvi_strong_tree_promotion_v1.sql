-- ZVI STRONG FINDINGS -> EXISTING TREE TARGETS v1
--
-- Human Gate: ZURIEL explicitly approved promoting every Zvi finding rated
-- strong + suitable for the tree in the complete World triage snapshot dated
-- 2026-10-22. This exact batch contains 106 public research_objects.
--
-- Canonicalization remains separate from tree attachment. The attachment
-- reuses an existing active public number/book node through promoted_node_id.
-- It creates no nodes/edges, preserves source/verification/access/statement,
-- and does not turn the triage strength into a truth score.

CREATE OR REPLACE FUNCTION public.admin_research_attach_existing_graph_node_v1(
  p_id uuid,
  p_target_node_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin boolean;
  v_actor text;
  v_row public.research_objects;
  v_target public.nodes;
  v_verification text;
  v_ledger_id uuid;
BEGIN
  SELECT (role = 'admin')
  INTO v_admin
  FROM public.users
  WHERE id = auth.uid();

  IF NOT coalesce(v_admin, false) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR p_target_node_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_identity');
  END IF;

  v_actor := auth.uid()::text;

  SELECT *
  INTO v_row
  FROM public.research_objects
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'research_object_not_found');
  END IF;

  IF v_row.status <> 'canonical' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'canonical_required', 'status', v_row.status);
  END IF;

  IF v_row.privacy_scope <> 'public' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'public_source_required', 'privacy_scope', v_row.privacy_scope);
  END IF;

  IF v_row.meta #>> '{ext,extraction_integrity,fidelity_status}' = 'partial' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partial_extraction_blocked');
  END IF;

  v_verification := v_row.engine_detail ->> 'verification_state';
  IF coalesce(v_verification, '') NOT IN ('match', 'match_numeric_only') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'verified_connection_required',
      'verification_state', v_verification
    );
  END IF;

  SELECT *
  INTO v_target
  FROM public.nodes
  WHERE id = p_target_node_id
    AND is_active = true
    AND type IN ('number', 'book')
    AND public.fn_graph_space_is_public(metadata)
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'active_public_target_required');
  END IF;

  IF v_row.promoted_node_id IS NOT NULL
     AND v_row.promoted_node_id <> p_target_node_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'existing_tree_target_conflict',
      'existing_target_node_id', v_row.promoted_node_id,
      'requested_target_node_id', p_target_node_id
    );
  END IF;

  UPDATE public.research_objects
  SET
    promoted_node_id = p_target_node_id,
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
      'governance',
      coalesce(meta -> 'governance', '{}'::jsonb) || jsonb_build_object(
        'tree_attachment',
        jsonb_build_object(
          'attached_by', v_actor,
          'attached_at', now(),
          'target_node_id', p_target_node_id,
          'target_node_type', v_target.type,
          'mode', 'existing_graph_identity_pointer',
          'contract', 'UNIVERSAL_RESEARCH_GRAPH_PROMOTION_CONTRACT_20260906',
          'human_gate_note', p_note
        )
      )
    )
  WHERE id = p_id;

  SELECT id
  INTO v_ledger_id
  FROM public.decision_ledger
  WHERE decision_type = 'research_graph_attach'
    AND subject_type = 'research_object'
    AND subject_ref = p_id::text
    AND human_decision = 'approve'
    AND status IN ('confirmed', 'applied', 'executed')
    AND candidate ->> 'target_node_id' = p_target_node_id::text
  ORDER BY created_at
  LIMIT 1;

  IF v_ledger_id IS NULL THEN
    INSERT INTO public.decision_ledger (
      decision_type, subject_type, subject_ref, candidate, domain,
      created_by_agent, agents_involved, human_decision, human_reason,
      decided_by, result_ref, provenance, status
    )
    VALUES (
      'research_graph_attach',
      'research_object',
      p_id::text,
      jsonb_build_object(
        'research_object_id', p_id,
        'target_node_id', p_target_node_id,
        'target_node_type', v_target.type,
        'verification_state', v_verification,
        'creates_node', false,
        'creates_edge', false
      ),
      'reality_graph',
      'GPT',
      ARRAY['GPT']::text[],
      'approve',
      p_note,
      v_actor,
      jsonb_build_object('research_object_id', p_id, 'promoted_node_id', p_target_node_id),
      jsonb_build_object(
        'triage_snapshot_date', '2026-10-22',
        'triage_base_commit', '640a385340733d84d4853e04e96cd38b3466e6ba',
        'selection', 'strength=חזק; recommendation=מתאים לעץ; contributor=צבי',
        'truth_score_created', false
      ),
      'executed'
    )
    RETURNING id INTO v_ledger_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'research_object_id', p_id,
    'status', v_row.status,
    'privacy_scope', v_row.privacy_scope,
    'verification_state', v_verification,
    'tree_attached', true,
    'target_node_id', p_target_node_id,
    'target_node_type', v_target.type,
    'decision_ledger_id', v_ledger_id,
    'created_node', false,
    'created_edge', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_research_attach_existing_graph_node_v1(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_research_attach_existing_graph_node_v1(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_research_attach_existing_graph_node_v1(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_research_attach_existing_graph_node_v1(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.admin_research_attach_existing_graph_node_v1(uuid, uuid, text) IS
  'Admin-only Human-Gate action: attach canonical public verified research to one existing active public number/book node; no node/edge creation and no access/publication change.';

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_row record;
  v_status text;
  v_result jsonb;
  v_processed integer := 0;
  v_note constant text :=
    'ZURIEL explicit Human-Gate 2026-10-22: promote all Zvi findings rated strong and suitable for the tree.';
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
    SELECT finding_id, target_node_id
    FROM (VALUES
      ('01ab7adc-92f0-4c76-92fb-3ee43411d32e'::uuid, '4c6bbf1f-3e0c-49df-8798-b9c41caef85c'::uuid),
      ('01fe92d4-7747-4a57-94bd-e9cbc2f16f81'::uuid, 'cd689c27-6c82-4a85-8d82-33424fb9d8d0'::uuid),
      ('038a5934-26be-4d1a-b7a2-5fcdca84925a'::uuid, 'd0287b22-2aa7-409f-8cc3-11cb8dc2751f'::uuid),
      ('0441761b-bf56-4b2c-8d94-63f04e0a824e'::uuid, 'e2fe5017-f468-433d-af4c-7006ad4d9e02'::uuid),
      ('050ca908-d01f-413a-b32d-3db37e72c7e2'::uuid, '1ce985c1-15f9-4d55-8efc-427708781bfd'::uuid),
      ('05599e2f-5d7c-43e2-9265-65ca0dc45450'::uuid, '281254ec-5e73-4949-928c-fd18e42f3a44'::uuid),
      ('055ee200-597d-4d2b-981c-bc13ece24ae0'::uuid, '67607d7f-13b8-4838-8ad2-cea93f4ca2de'::uuid),
      ('0b2e6fbf-a79d-4037-b5ae-b3d0751ef80b'::uuid, 'a362a510-0b4b-48e4-9ae7-bc3c4be0e9b7'::uuid),
      ('0d148b1b-b63f-4af9-a1f3-09c650b49643'::uuid, 'f9af9c48-6b36-4ab9-a4ba-9ac6c6d8166c'::uuid),
      ('0ddf7979-5f02-4db1-a5ae-3d9cd605e0b3'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid),
      ('103cdb3e-048f-46dd-b19a-ac45526c0008'::uuid, '84b2fd22-26ca-489b-a134-3da48f50bcac'::uuid),
      ('1067ca62-9cea-41b7-872e-060d3fddc5ee'::uuid, '8f62877e-8698-4d33-be7e-a16e6a16cd2e'::uuid),
      ('10785685-70a3-4d41-a6b1-b8d1511ac2b7'::uuid, '26b8957a-1925-4d3f-9c4a-70f6571098f4'::uuid),
      ('10787b09-da24-40b9-9205-95377131c08a'::uuid, '67899c04-ac75-4f29-bcaf-0adfbbe5e039'::uuid),
      ('10cf477f-c5aa-4bb0-a607-5cbd9f1fee21'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid),
      ('13606a8c-79aa-4cfa-8ed2-abb0db9149d4'::uuid, '9d25ae44-2d40-484a-8626-90ca52cdcf7c'::uuid),
      ('189ac942-4596-4988-a3bf-478666cbdcb5'::uuid, '0128ad5d-059f-4c08-b1f3-0bbab56b27c6'::uuid),
      ('18d98e90-6702-4f09-9fdb-da7195c435be'::uuid, 'b44b3787-6a16-49ea-82bd-a99e7f41e262'::uuid),
      ('19f59374-88f3-44b5-b692-64838302ee33'::uuid, '36e84fad-e1bc-4e98-917f-a5ac8d09d1b4'::uuid),
      ('1a1d75d7-f8b1-45f9-8a66-791595abf6d2'::uuid, '6d5adbc1-e506-4bdb-a7f1-0306d0ba8fe2'::uuid),
      ('1ae99518-f598-4315-8ce0-18342339120f'::uuid, '40d44380-11a4-482c-8685-3730c06333eb'::uuid),
      ('1e44c10f-daa9-4a45-ab26-5ca6093bb6ce'::uuid, '70c70998-4111-40cf-83c3-84d1ce17e380'::uuid),
      ('1edcecad-33bb-41ab-b295-cfc919c6b36e'::uuid, '153caf63-f3fd-4dc9-9cc8-fdb9fe0a521d'::uuid),
      ('2912366c-b1f6-4c60-8823-35cf5ccfa9d1'::uuid, '6d5adbc1-e506-4bdb-a7f1-0306d0ba8fe2'::uuid),
      ('2bcc6a3f-71e9-4299-93b3-69b4af127634'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('2c91fe06-3ba5-491b-9022-2b5be47ec481'::uuid, '5cabdbef-a0c9-4dce-b1bc-78084016c612'::uuid),
      ('3076e58f-d7a8-4559-abec-ebab24000c90'::uuid, '10ec9700-006d-4096-af7d-3559d022b460'::uuid),
      ('30b34604-afa7-4dff-80e9-562acef4c164'::uuid, 'cd7bc426-f541-4098-99e9-ea4a1e5d5c10'::uuid),
      ('30be7020-3169-40db-9d92-292e633fbbd5'::uuid, '3f0363d9-0767-4244-9ff6-6705f7268105'::uuid),
      ('36380dc2-7a33-4c1a-bd78-102983572f2a'::uuid, 'f4e02d60-26ab-4e42-9edb-db1738b8c41f'::uuid),
      ('39eec8d7-f374-4b3d-a943-74679cb18e14'::uuid, '44372cda-46fc-4c02-985e-f88e43d2a108'::uuid),
      ('3a58362c-fa07-4d55-aff9-74425c993b58'::uuid, '6d5adbc1-e506-4bdb-a7f1-0306d0ba8fe2'::uuid),
      ('3cdf2a7e-b2d0-4518-a198-2bc0efbd12a0'::uuid, 'f78023e7-32eb-40a6-8b57-d7ac8d2c9d44'::uuid),
      ('3dcce865-75d6-4eb8-aaee-47508bed2e6a'::uuid, '083b5735-7a3b-458d-b9e9-5a0202b486da'::uuid),
      ('3f50af95-8e82-412c-bbac-b87b60de66e9'::uuid, 'be377e4c-3482-41d2-a943-e9f9ea2c4dfa'::uuid),
      ('407ed225-b096-4f72-8ccf-53e41854c439'::uuid, '76d4671d-b81d-42ec-a0e4-8b6d0427232d'::uuid),
      ('42580087-1960-4b65-9a52-a68c1fb59210'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('42d86e0d-90c2-4a6e-b8d0-bae855589c75'::uuid, 'be377e4c-3482-41d2-a943-e9f9ea2c4dfa'::uuid),
      ('45a4bd7e-95ef-48ef-982c-5c5dffdbd1df'::uuid, '86ea972a-fe1d-4350-8968-ba0c518124de'::uuid),
      ('4970ee90-1440-4445-887d-dfbf4d1f85f2'::uuid, '3f0363d9-0767-4244-9ff6-6705f7268105'::uuid),
      ('4d961a27-8d06-41c7-b5ab-da47bcb88043'::uuid, 'e2fe5017-f468-433d-af4c-7006ad4d9e02'::uuid),
      ('527c4a0b-9046-4b61-9dcf-39c064e2e954'::uuid, '88083631-2f7f-4d93-ae46-63c5619a121a'::uuid),
      ('52e9eb04-d0c3-44f9-bb21-a1b6b1f7b8fc'::uuid, '70c70998-4111-40cf-83c3-84d1ce17e380'::uuid),
      ('596e73ea-0f55-49e2-8446-0d2c09891b13'::uuid, '153caf63-f3fd-4dc9-9cc8-fdb9fe0a521d'::uuid),
      ('5bce2d0c-b953-4259-93fe-de25bf1cab3a'::uuid, '36958496-8c26-460f-be55-76842a54117d'::uuid),
      ('5c8703b9-462d-4bd0-ad08-bafea5f63af1'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid),
      ('6081e4e8-9b45-4728-aa61-49a855d87d36'::uuid, '42aefba7-6571-4064-bc5a-fb02280a89c1'::uuid),
      ('61143d52-eb4a-4f77-9f82-00da8d45aea0'::uuid, '36958496-8c26-460f-be55-76842a54117d'::uuid),
      ('642fcd3c-5e48-4bd4-b64b-111f02c83bef'::uuid, '624a480e-b1f5-462e-8bc8-3df5c0bfdfed'::uuid),
      ('69c12cad-d167-442e-8353-b663d7512833'::uuid, '330e90b8-2fa5-4994-8220-495bfefa5b6b'::uuid),
      ('6b25e21e-52a5-4be8-b2d2-573e553c6e80'::uuid, '88083631-2f7f-4d93-ae46-63c5619a121a'::uuid),
      ('6f1c8277-b509-433b-8948-f1e51380fc79'::uuid, '69bcfbd0-8d4a-464f-9b6f-6f44de37c719'::uuid),
      ('70643bae-e984-4131-88b1-7c165ef28c33'::uuid, '048ee8a0-5c3f-4c2c-a1a8-fbdf1e91cba7'::uuid),
      ('73f034f7-3622-4f84-ae51-3da3ab626c47'::uuid, '544e1051-1aa1-4aae-8f5c-1ad86389b51d'::uuid),
      ('7468f1c6-f9bf-49b8-ac32-2ed9fc408683'::uuid, '40d44380-11a4-482c-8685-3730c06333eb'::uuid),
      ('762cb2fb-c54f-4f4a-b5a1-50684d244c64'::uuid, '6d5adbc1-e506-4bdb-a7f1-0306d0ba8fe2'::uuid),
      ('77ff6d9c-4c71-46a0-9ea7-b4419458b6fd'::uuid, '1afaa6db-c996-4ea1-889a-b3a6057c475a'::uuid),
      ('7a807fa1-4320-42e1-8be3-5524224d23d5'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('7c948b6d-fc3b-40d3-85e1-dfa74ff953f0'::uuid, '59ee03b6-ba2e-4842-93a9-349e65340d9c'::uuid),
      ('7efbe83b-1df4-494b-ba57-4c801613baf1'::uuid, '55be2699-22fe-487e-8e02-21474ce9815e'::uuid),
      ('80e1a0dd-dbc1-4da5-9a92-86952ee98962'::uuid, 'a42ae06c-dcca-4c56-aa26-39e898bfd407'::uuid),
      ('80f61425-5438-4c99-9ba5-e30baad0e7e4'::uuid, 'b44b3787-6a16-49ea-82bd-a99e7f41e262'::uuid),
      ('8100ba91-6462-4f8c-85cf-8d0520fbc8aa'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid),
      ('84634efc-645a-431c-9317-6c8ffc0ed911'::uuid, '0128ad5d-059f-4c08-b1f3-0bbab56b27c6'::uuid),
      ('8491396c-b017-4c8b-be08-8c6e387f2f49'::uuid, '73dc8748-4af2-49e3-b838-f4d810c36e7f'::uuid),
      ('8593fe3e-9606-4b2b-bd52-0c4a0285c4e3'::uuid, '20addd29-41db-4cc2-9a70-5c41d65bfb65'::uuid),
      ('928669db-d07f-4192-8ce1-0c71ea983bf4'::uuid, 'b84f4fbe-86aa-4c32-adbd-5a7dcf17450c'::uuid),
      ('93143e99-6a74-4520-9f6c-5c7c9ba6bcd2'::uuid, '7e8fc09c-ef94-481d-95eb-f90aef6213df'::uuid),
      ('94adc450-86ff-4953-86be-7d5650062f61'::uuid, '1bea63cf-f3ad-416d-a15c-fec672d073b9'::uuid),
      ('9cd25072-f942-4df5-883a-75f09d73538d'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('a12412b8-e8d2-4067-a6eb-2adb70f2e218'::uuid, '07a4c426-34cd-4b4b-ad4d-1c1e5013887e'::uuid),
      ('a8fd771a-b2b5-47d8-b9a6-72de44e17b57'::uuid, 'ed4ee018-e484-4a23-b84c-e9d032700a6d'::uuid),
      ('aed2bf6f-9a83-4e3f-8ce1-08e14b5a4886'::uuid, 'acf58e09-87a5-47f7-896e-f24e66f0c9c7'::uuid),
      ('b0983f2b-e7e4-41a6-a03c-8b29da64d9cf'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('b0a1466a-c9be-4fe8-accf-03891fd0915a'::uuid, '88083631-2f7f-4d93-ae46-63c5619a121a'::uuid),
      ('b2756055-641d-479d-8146-88a8720abb07'::uuid, '9cd22c3e-be5c-4283-ba6d-f974530d4dbc'::uuid),
      ('b3593852-4438-4d11-8318-f2f5145d01a0'::uuid, '9c570a75-aec8-4008-a6bf-b4ceacb3fc63'::uuid),
      ('b4144a1d-7cd1-45a0-bea8-d88d34429eaf'::uuid, '694a2591-033d-486a-acbf-63d0a40d1d38'::uuid),
      ('b4b7e2a9-ce9f-4244-aeb0-58ddc18405df'::uuid, '88083631-2f7f-4d93-ae46-63c5619a121a'::uuid),
      ('b642e45e-31b8-4160-9f2d-9038b6db13c4'::uuid, '47c8938c-8f71-461d-b6fe-684af949346e'::uuid),
      ('b7f9b4a5-fc43-48ae-a8c2-aef819c402ce'::uuid, '1ce985c1-15f9-4d55-8efc-427708781bfd'::uuid),
      ('bd2b112f-f8ad-41dc-ab30-959795200d6d'::uuid, 'ed4ee018-e484-4a23-b84c-e9d032700a6d'::uuid),
      ('be4dd5ef-70d8-468c-81af-dae2431ed363'::uuid, '36958496-8c26-460f-be55-76842a54117d'::uuid),
      ('bf0d6871-218b-4613-bb9d-138fee63135d'::uuid, '07155c99-fefa-42fe-81ba-8d3ad371ab25'::uuid),
      ('c2e6aa52-d473-4579-afb0-221a1d8d8f8a'::uuid, '81abe9ce-ad29-408b-b988-1b669b8e440e'::uuid),
      ('c403980f-a684-4247-bb08-9bd8a117685a'::uuid, '54eaaa19-0636-4f45-bcd3-804fcd98bdff'::uuid),
      ('c9090b26-0211-41cd-adea-397f097da044'::uuid, 'b44b3787-6a16-49ea-82bd-a99e7f41e262'::uuid),
      ('cb1e33ad-ed76-4370-9272-f8518c24ee10'::uuid, '9d426b9e-3b4e-400c-9fef-eb187cc9edf4'::uuid),
      ('cbc1fc77-6870-4806-861b-0238e1d2c441'::uuid, '67899c04-ac75-4f29-bcaf-0adfbbe5e039'::uuid),
      ('cf65619a-7f77-4b99-90dc-e082023dfb67'::uuid, 'af5a1362-8765-45da-8453-243ebfa56af7'::uuid),
      ('d22f2312-cd1a-4e5e-9e89-944209e2fc5d'::uuid, '07a4c426-34cd-4b4b-ad4d-1c1e5013887e'::uuid),
      ('d41cc580-6773-4401-b587-4dd0bbf9bd87'::uuid, '29fb150d-78f8-4077-a436-bb2a30f6f36a'::uuid),
      ('d42d017f-4639-49e0-a0e6-9f8e114f4a59'::uuid, '0820f5d7-d0ba-4a81-8289-093eb9563ca7'::uuid),
      ('d643fec4-c276-4c32-9560-6f06a60172f3'::uuid, '1c175ba7-6857-4925-ab4c-25b5e38e6b48'::uuid),
      ('db370d62-b4af-458d-b16b-d5bb901da679'::uuid, '979fae9c-b58d-43ef-87f5-7b284b58223e'::uuid),
      ('e3736335-4ea8-4ac6-97f8-90536d9c4096'::uuid, '4e6e746a-d5c8-48cb-9bbf-2b833865fe98'::uuid),
      ('e919bf63-c1a8-4bfb-96d8-9645e6e1b653'::uuid, 'e846e7f7-c629-4815-bc61-d83df57934f5'::uuid),
      ('e9dd02c6-f4e5-4b56-8810-a677a37083d7'::uuid, '0954a967-290c-4777-b993-9e16ee071cdb'::uuid),
      ('edb491fe-21b2-4914-bc3a-f34bed3ad0f6'::uuid, 'd9bc44b4-c9c2-4bee-b6d0-81b0ff868adb'::uuid),
      ('ef69812d-8b2c-4ad3-8f17-15cd70f96298'::uuid, 'e846e7f7-c629-4815-bc61-d83df57934f5'::uuid),
      ('ef938730-5d8a-4078-9a6a-8d24387e8cf3'::uuid, 'b33db193-61ba-4b3e-b6ff-5feca947d252'::uuid),
      ('eff1448e-51f9-4dd1-a1fc-3c1a3b5ce918'::uuid, '30e76d57-4299-47fc-9f8b-0b9212004da4'::uuid),
      ('f216ecc9-52f9-4204-a236-ce706fd398fa'::uuid, '5cabdbef-a0c9-4dce-b1bc-78084016c612'::uuid),
      ('f3ec4e0e-2696-4ebb-946b-2318565883b2'::uuid, '738e7dd7-7270-4529-86fe-b81e1913f459'::uuid),
      ('fa3ab8ca-d62c-4fa8-b2a5-ef287778a064'::uuid, '58586c46-d15a-4eb1-900a-df446df15419'::uuid),
      ('fe4defa2-6ce6-45c5-9a41-1afcd6c7a533'::uuid, 'b4589b3e-b1ac-474c-86f4-69a8b41e4787'::uuid)
    ) AS selected(finding_id, target_node_id)
    ORDER BY finding_id
  LOOP
    SELECT status
    INTO v_status
    FROM public.research_objects
    WHERE id = v_row.finding_id
      AND privacy_scope = 'public'
      AND engine_detail ->> 'verification_state' IN ('match', 'match_numeric_only')
      AND coalesce(meta #>> '{ext,extraction_integrity,fidelity_status}', '') <> 'partial'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'finding % failed public/verification/fidelity preflight', v_row.finding_id;
    END IF;

    IF v_status = 'approved' THEN
      SELECT public.admin_research_review(v_row.finding_id, 'canonicalize', NULL, false)
      INTO v_result;

      IF coalesce((v_result ->> 'ok')::boolean, false) IS NOT TRUE
         OR v_result ->> 'status' <> 'canonical' THEN
        RAISE EXCEPTION 'canonicalization failed for %: %', v_row.finding_id, v_result;
      END IF;
    ELSIF v_status <> 'canonical' THEN
      RAISE EXCEPTION 'finding % has invalid status %', v_row.finding_id, v_status;
    END IF;

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

    v_processed := v_processed + 1;
  END LOOP;

  IF v_processed <> 106 THEN
    RAISE EXCEPTION 'expected 106 promoted findings, processed %', v_processed;
  END IF;
END;
$batch$;
