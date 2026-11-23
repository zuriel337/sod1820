-- SOD1820 owner-reference repair proposal — 2026-11-23
-- NOT a migration. DO NOT APPLY until exact-object Human Gate / work_log approval.
-- Fail-closed. The approval row must mention all six rule_ids below. The gate refuses in-place owner edits.
--
-- In the SAME transaction, after BEGIN and before DO, supply:
-- SELECT set_config('sod1820.contract_repair_approval_ref','work_log:<approved-uuid>',true);
-- The work_log row must name each of: brand_spelling_law, canonical_colors_law,
-- logo_integrity_law, sod1820_canonical_identity_law, worlds_color_law, legacy_content_protocol.
-- The same explicit authorization record must also name the four Codex slugs affected:
-- gematria_engine, project_overview, data_model_map, raziel_mind_architecture.
--
BEGIN;

DO $repair$
DECLARE
  old_owner CONSTANT text := 'SOD1820_DESIGN_CONTRACT_V1.md';
  new_owner CONSTANT text := 'SOD1820_DESIGN_CONTRACT_V2.md';
  v_gate text := nullif(current_setting('sod1820.contract_repair_approval_ref',true),'');
  v_count integer;
  rec record;
  new_metadata jsonb;
  new_description text;
  new_deps text[];
  gem_old text;
  gem_new text;
  brand_ids text[] := array[
    'brand_spelling_law','canonical_colors_law','logo_integrity_law',
    'sod1820_canonical_identity_law','worlds_color_law'
  ];
BEGIN
  IF v_gate IS NULL OR v_gate !~ '^work_log:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'MISSING_EXPLICIT_APPROVAL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.work_log w
    WHERE w.id = substring(v_gate from 10)::uuid
      AND (SELECT count(*)
           FROM unnest(brand_ids || array['legacy_content_protocol','gematria_engine','project_overview','data_model_map','raziel_mind_architecture']) AS required_id(rule_id)
           WHERE position(required_id.rule_id in coalesce(w.topic,'') || ' ' || coalesce(w.what_we_did,'')) > 0) = 10
  ) THEN RAISE EXCEPTION 'APPROVAL_MUST_NAME_EACH_RULE_AND_CODEX_SLUG'; END IF;

  SELECT count(*) INTO v_count FROM public.nodes n
  WHERE n.type='rule' AND n.is_active=true
    AND n.rule_id=ANY(brand_ids)
    AND n.metadata#>>'{owner_routing,canonical_owner}'=old_owner
    AND n.metadata#>>'{compaction_v1,canonical_owner}'=old_owner;
  IF v_count<>5 THEN RAISE EXCEPTION 'OWNER_DRIFT: expected 5, found %',v_count; END IF;

  SELECT count(*) INTO v_count FROM public.nodes n
  WHERE n.type='rule' AND n.is_active=true
    AND n.rule_id='sod1820_canonical_identity_law'
    AND old_owner=ANY(n.depends_on);
  IF v_count<>1 THEN RAISE EXCEPTION 'V1_DEPENDENCY_DRIFT'; END IF;

  SELECT count(*) INTO v_count FROM public.nodes n
  WHERE n.type='rule' AND n.is_active=true AND n.rule_id='legacy_content_protocol'
    AND n.rule_version=2
    AND n.depends_on=ARRAY['research_intake_foundation_contract_law@13']::text[];
  IF v_count<>1 THEN RAISE EXCEPTION 'LEGACY_13_PIN_DRIFT'; END IF;

  SELECT c.body INTO gem_old FROM public.project_codex c WHERE c.slug='gematria_engine' FOR UPDATE;
  IF gem_old IS NULL
     OR position('current v5' in gem_old)=0
     OR position('v5. Alias is one method identity' in gem_old)=0
  THEN RAISE EXCEPTION 'CODEX_V5_POINTER_DRIFT'; END IF;

  -- New versions for owner changes; old rows retain historic text and are retired in the same transaction.
  FOR rec IN SELECT * FROM public.nodes
    WHERE type='rule' AND is_active=true AND rule_id=ANY(brand_ids)
    ORDER BY rule_id FOR UPDATE
  LOOP
    new_metadata := coalesce(rec.metadata,'{}'::jsonb)-'rule_guard';
    new_metadata := jsonb_set(new_metadata,'{owner_routing,canonical_owner}',to_jsonb(new_owner),true);
    new_metadata := jsonb_set(new_metadata,'{compaction_v1,canonical_owner}',to_jsonb(new_owner),true);
    IF new_metadata->>'canonical_owner'=old_owner THEN
      new_metadata := jsonb_set(new_metadata,'{canonical_owner}',to_jsonb(new_owner),true);
    END IF;
    new_metadata := jsonb_set(new_metadata,'{owner_routing,resolution}','"SUPERSEDE_EXISTING"'::jsonb,true);
    new_metadata := jsonb_set(new_metadata,'{owner_routing,human_gate}',to_jsonb(v_gate),true);
    new_metadata := jsonb_set(new_metadata,'{owner_routing,normalized_at}','"2026-11-23"'::jsonb,true);

    new_deps := rec.depends_on;
    IF rec.rule_id='sod1820_canonical_identity_law' THEN
      new_deps := array_replace(rec.depends_on,old_owner,new_owner);
    END IF;
    new_description := concat(
      '[2026-11-23 CURRENT OWNER] SOD1820_DESIGN_CONTRACT_V2.md. ',
      'This is an owner-routing-only version v',rec.rule_version+1,
      '; V1 references below are historical decision provenance, NOT a current authority. ',
      'No changes to substantive branding, truth, access or research semantics.',
      E'\n\n--- HISTORICAL RULE BODY PRESERVED ---\n\n',coalesce(rec.description,''));

    UPDATE public.nodes SET is_active=false WHERE id=rec.id;
    INSERT INTO public.nodes(
      type,label,description,metadata,is_active,rule_id,rule_version,depends_on,
      supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key
    ) VALUES (
      rec.type,
      replace(rec.label,'v'||rec.rule_version::text,'v'||(rec.rule_version+1)::text),
      new_description,new_metadata,true,rec.rule_id,rec.rule_version+1,new_deps,
      rec.rule_version,rec.weight,rec.hebrew_date,rec.axis_theme,rec.gallery_id,rec.identity_key
    );
  END LOOP;

  -- Legacy product retired 2026-11-05; historic WP import/source evidence remains.
  -- No active rule depends on this legacy protocol. Retire v2; DO NOT create a v3 or remove v2.
  SELECT count(*) INTO v_count FROM public.nodes n
  WHERE n.type='rule' AND n.is_active=true
    AND (n.metadata#>>'{owner_routing,canonical_owner}'='legacy_content_protocol'
      OR 'legacy_content_protocol'=ANY(coalesce(n.depends_on,ARRAY[]::text[])));
  IF v_count<>0 THEN RAISE EXCEPTION 'LEGACY_PROTOCOL_STILL_HAS_ACTIVE_DEPENDENTS'; END IF;
  UPDATE public.nodes SET is_active=false
  WHERE type='rule' AND rule_id='legacy_content_protocol' AND is_active=true AND rule_version=2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'LEGACY_RETIREMENT_DID_NOT_RETIRE_ONE'; END IF;

  -- Mark three old codex documents as historical; prepend a short guard, preserve original bodies.
  -- These do not supersede existing owners and never create a second authority.
  IF NOT EXISTS (SELECT 1 FROM public.project_codex WHERE slug='project_overview'
                 AND left(body,9)='SOD1820 ה') THEN
    RAISE EXCEPTION 'CODEX_PROJECT_OVERVIEW_CHANGED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_codex WHERE slug='data_model_map'
                 AND left(body,13)='הטבלאות המרכז') THEN
    RAISE EXCEPTION 'CODEX_DATA_MODEL_MAP_CHANGED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_codex WHERE slug='raziel_mind_architecture'
                 AND body LIKE '> מפרט מימוש%') THEN
    RAISE EXCEPTION 'CODEX_RAZIEL_SPEC_CHANGED';
  END IF;
  UPDATE public.project_codex SET
     body='⚠️ HISTORICAL OVERVIEW ONLY (2026-11-23). Legacy is retired as of 2026-11-05. The old deployment and Preview directions below are NOT operative. Resolve current release from deploy_on_request + project_codex.branches_deploy; validate code, Production and DB from live owners. Original historical text follows unchanged.'||E'\n\n---\n\n'||body,
     updated_at=now()
   WHERE slug='project_overview';
  UPDATE public.project_codex SET
     body='⚠️ HISTORICAL DATA-MODEL SNAPSHOT ONLY (2026-11-23). Old counts, WordPress/Legacy references and 8-method examples are provenance, not the current schema or method Registry. Resolve active schema live and Method Registry through canonical_methods_registry_law.'||E'\n\n---\n\n'||body,
     updated_at=now()
   WHERE slug='data_model_map';
  UPDATE public.project_codex SET
     body='⚠️ HISTORICAL RAZIEL IMPLEMENTATION SPEC, NOT CURRENT AUTHORITY (2026-11-23). Named rules and hard-coded method counts in this spec may have been superseded; route to the latest active owners before design. No Raziel implementation or new connection is authorized here.'||E'\n\n---\n\n'||body,
     updated_at=now()
   WHERE slug='raziel_mind_architecture';

  -- Codex is a pointer/contract body, not nodes version history; avoid future static current-vN strings.
  gem_new := replace(gem_old,
    chr(96)||'canonical_methods_registry_law'||chr(96)||' (current v5)',
    chr(96)||'canonical_methods_registry_law'||chr(96)||
    ' (resolve the latest active public.nodes rule version)');
  gem_new := replace(gem_new,
    'Use active '||chr(96)||'canonical_methods_registry_law'||chr(96)||' v5.',
    'Use the latest active '||chr(96)||'canonical_methods_registry_law'||chr(96)||
    ' resolved from public.nodes, not a pinned historical version.');
  IF gem_new=gem_old OR position('current v5' in gem_new)>0
      OR position('law'||chr(96)||' v5.' in gem_new)>0
  THEN RAISE EXCEPTION 'CODEX_REPLACEMENT_FAILED'; END IF;
  UPDATE public.project_codex SET body=gem_new,updated_at=now() WHERE slug='gematria_engine';

  SELECT count(*) INTO v_count FROM public.nodes
  WHERE type='rule' AND is_active=true AND rule_id=ANY(brand_ids)
    AND metadata#>>'{owner_routing,canonical_owner}'=new_owner
    AND metadata#>>'{compaction_v1,canonical_owner}'=new_owner;
  IF v_count<>5 THEN RAISE EXCEPTION 'POSTCONDITION_DESIGN_OWNER'; END IF;

  SELECT count(*) INTO v_count FROM public.nodes
  WHERE type='rule' AND is_active=true AND rule_id=ANY(brand_ids)
    AND metadata->>'canonical_owner'=old_owner;
  IF v_count<>0 THEN RAISE EXCEPTION 'POSTCONDITION_TOP_LEVEL_OWNER_STALE'; END IF;

  SELECT count(*) INTO v_count FROM public.nodes
  WHERE type='rule' AND rule_id='legacy_content_protocol' AND is_active=true;
  IF v_count<>0 THEN RAISE EXCEPTION 'POSTCONDITION_LEGACY_STILL_ACTIVE'; END IF;
  SELECT count(*) INTO v_count FROM public.nodes
  WHERE type='rule' AND rule_id='legacy_content_protocol'
    AND rule_version=2 AND is_active=false
    AND depends_on=ARRAY['research_intake_foundation_contract_law@13']::text[];
  IF v_count<>1 THEN RAISE EXCEPTION 'POSTCONDITION_HISTORY_NOT_PRESERVED'; END IF;

  SELECT count(*) INTO v_count FROM public.project_codex
  WHERE (slug='project_overview' AND body LIKE '⚠️ HISTORICAL OVERVIEW ONLY%')
     OR (slug='data_model_map' AND body LIKE '⚠️ HISTORICAL DATA-MODEL SNAPSHOT ONLY%')
     OR (slug='raziel_mind_architecture' AND body LIKE '⚠️ HISTORICAL RAZIEL IMPLEMENTATION SPEC%');
  IF v_count<>3 THEN RAISE EXCEPTION 'POSTCONDITION_CODEX_OLD_OVERVIEW_NOT_MARKED'; END IF;

  SELECT count(*) INTO v_count FROM public.nodes WHERE type='rule' AND is_active=true;
  IF v_count<>86 THEN RAISE EXCEPTION 'POSTCONDITION_EXPECTED_86_ACTIVE_RULES_GOT_%',v_count; END IF;

  SELECT count(*) INTO v_count FROM (
    SELECT rule_id FROM public.nodes WHERE type='rule' AND is_active=true
    GROUP BY rule_id HAVING count(*)>1
  ) duplicates;
  IF v_count<>0 THEN RAISE EXCEPTION 'POSTCONDITION_MULTIPLE_ACTIVE_VERSIONS'; END IF;
END
$repair$;

SELECT rule_id,rule_version,metadata#>>'{owner_routing,canonical_owner}' current_owner,depends_on
FROM public.nodes WHERE type='rule' AND is_active=true
  AND rule_id=ANY(ARRAY[
    'brand_spelling_law','canonical_colors_law','logo_integrity_law',
    'sod1820_canonical_identity_law','worlds_color_law','legacy_content_protocol'
  ]) ORDER BY rule_id;
COMMIT;
