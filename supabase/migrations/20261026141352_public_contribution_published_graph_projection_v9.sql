-- PUBLIC CONTRIBUTION PUBLISHED GRAPH PROJECTION v9
--
-- Human Gate: ZURIEL explicitly approved publication of the remaining audited
-- public-writer material on 2026-10-26. The canonical writer-page reader has
-- always treated both approved and published contributions as public. The
-- older graph projector treated only approved as core, causing already-public
-- published sources to be projected into private graph space.
--
-- This migration aligns that existing projector with the existing reader
-- contract, then projects exactly nine already-published deterministic number
-- contributions by three stable public contributor IDs. Hidden/pending/deleted
-- rows, interpretations, ELS, unverified methods and unresolved targets remain
-- unchanged. Ariel's approved contributions remain approved and therefore stay
-- visible on Ariel's canonical public writer page.

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

  -- Public writer-page contract: approved and published are both public.
  v_source_space := CASE
    WHEN c.status IN ('approved', 'published') THEN 'core'
    ELSE 'private'
  END;
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
      WHEN v_source_space='core'
       AND coalesce((SELECT metadata->>'space' FROM public.nodes WHERE id=v_target),'core')='core'
      THEN 'core'
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
        WHEN v_source_space='core'
         AND coalesce((SELECT metadata->>'space' FROM public.nodes WHERE id=v_lt),'core')='core'
        THEN 'core'
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

COMMENT ON FUNCTION public.project_contribution_to_graph(uuid) IS
'Canonical contribution graph projector. Admin-only. approved|published are public/core in parity with writer_public_contributions_page_v1; every other status remains private.';

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

  CREATE TEMP TABLE _published_contributor_selected_v9 (
    id uuid PRIMARY KEY,
    contributor_id uuid NOT NULL,
    expected integer NOT NULL,
    expected_claim_count integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _published_contributor_selected_v9
    (id, contributor_id, expected, expected_claim_count)
  VALUES
    ('f52f435b-0bef-4a41-ad6f-77f385ff5922','d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86',1237,1),
    ('1bdd490a-fa61-4df0-9270-d40da793003a','d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86',333,1),
    ('3ce71608-f03b-4544-a028-e676c184fdac','d0fe09cd-ccc2-4f37-9c94-0de9e75e2b86',1445,1),
    ('5bf30254-4f6c-4ad8-8305-c55d5c861729','e4fc2c19-9669-49e5-9564-d27cc3558f67',1835,1),
    ('c622574f-a86e-4a10-b674-8e4f388a2422','e4fc2c19-9669-49e5-9564-d27cc3558f67',1835,1),
    ('740040bc-6739-423b-9738-27ea2d1ac5c1','c0459430-6ba0-44a9-b1be-b5952344e74d',227,1),
    ('2ad6d76c-89a7-44fc-862e-d519b26f718a','c0459430-6ba0-44a9-b1be-b5952344e74d',108,3),
    ('0d20be5d-1918-4c08-a01c-fefbf2565e5e','c0459430-6ba0-44a9-b1be-b5952344e74d',216,4),
    ('79b2f054-1b73-4e68-bd82-5ca9d496c482','c0459430-6ba0-44a9-b1be-b5952344e74d',356,3);

  CREATE TEMP TABLE _published_contributor_claims_v9 (
    finding_id uuid NOT NULL REFERENCES _published_contributor_selected_v9(id),
    method text NOT NULL,
    phrase text NOT NULL,
    expected integer NOT NULL,
    PRIMARY KEY (finding_id, method, phrase)
  ) ON COMMIT DROP;

  INSERT INTO _published_contributor_claims_v9 (finding_id, method, phrase, expected)
  VALUES
    ('f52f435b-0bef-4a41-ad6f-77f385ff5922','מסתתר','שר הדין חודש אב התשפו',1237),
    ('1bdd490a-fa61-4df0-9270-d40da793003a','אתבש','שר הדין תשפו',333),
    ('3ce71608-f03b-4544-a028-e676c184fdac','מילוי','שר הדין',1445),
    ('5bf30254-4f6c-4ad8-8305-c55d5c861729','רגיל','סוד אחד שתים שלש שבע',1835),
    ('c622574f-a86e-4a10-b674-8e4f388a2422','רגיל','מלחמת איראן השלישית',1835),
    ('740040bc-6739-423b-9738-27ea2d1ac5c1','רגיל','ברכה',227),
    ('2ad6d76c-89a7-44fc-862e-d519b26f718a','רגיל','גיהנם',108),
    ('2ad6d76c-89a7-44fc-862e-d519b26f718a','רגיל','מנהיג',108),
    ('2ad6d76c-89a7-44fc-862e-d519b26f718a','רגיל','חק',108),
    ('0d20be5d-1918-4c08-a01c-fefbf2565e5e','רגיל','עומק',216),
    ('0d20be5d-1918-4c08-a01c-fefbf2565e5e','רגיל','יראה',216),
    ('0d20be5d-1918-4c08-a01c-fefbf2565e5e','רגיל','גבורה',216),
    ('0d20be5d-1918-4c08-a01c-fefbf2565e5e','רגיל','אריה',216),
    ('79b2f054-1b73-4e68-bd82-5ca9d496c482','רגיל','מים עמוקים',356),
    ('79b2f054-1b73-4e68-bd82-5ca9d496c482','רגיל','אמריקה',356),
    ('79b2f054-1b73-4e68-bd82-5ca9d496c482','רגיל','שנאה',356);

  CREATE TEMP TABLE _published_contributor_ready_v9
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
  FROM _published_contributor_selected_v9 selected
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
    AND contribution.status = 'published'
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
      SELECT 1 FROM public.nodes prior
      WHERE prior.type = 'contribution'
        AND prior.metadata ->> 'contribution_id' = selected.id::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.contribution_links extra_link
      WHERE extra_link.from_contribution_id = selected.id
    )
    AND (
      SELECT count(*) FROM public.nodes unique_target
      WHERE unique_target.type = 'number'
        AND unique_target.label = selected.expected::text
    ) = 1;

  CREATE TEMP TABLE _published_contributor_checks_v9
  ON COMMIT DROP
  AS
  SELECT
    claims.finding_id,
    claims.method,
    claims.phrase,
    claims.expected,
    public.fn_method_value(claims.method, claims.phrase) AS computed
  FROM _published_contributor_claims_v9 claims;

  SELECT count(*) INTO v_selected_count FROM _published_contributor_selected_v9;
  SELECT count(*), count(DISTINCT contributor_id), count(DISTINCT target_node_id)
  INTO v_ready_count, v_author_count, v_target_count
  FROM _published_contributor_ready_v9;

  SELECT
    count(*), count(DISTINCT finding_id),
    count(*) FILTER (WHERE computed = expected),
    md5(string_agg(
      finding_id::text || '|' || method || '|' || phrase || '|' || expected::text || '|' || computed::text,
      E'\n' ORDER BY finding_id, method, phrase
    ))
  INTO v_claim_count, v_claim_finding_count, v_claim_match_count, v_claims_digest
  FROM _published_contributor_checks_v9;

  SELECT count(*)
  INTO v_claim_cardinality_count
  FROM _published_contributor_selected_v9 selected
  JOIN (
    SELECT finding_id, count(*)::integer AS actual_claim_count
    FROM _published_contributor_checks_v9 GROUP BY finding_id
  ) checks ON checks.finding_id = selected.id
  WHERE checks.actual_claim_count = selected.expected_claim_count;

  SELECT md5(string_agg(
    id::text || '|' || contributor_id::text || '|' || expected::text || '|' ||
    status || '|' || research_state || '|' || coalesce(title, '') || '|' ||
    coalesce(body, '') || '|' || coalesce(gematria_claim::text, '{}') || '|' ||
    coalesce(origin, '') || '|' || target_node_id::text || '|' || slug || '|' || display_name,
    E'\n' ORDER BY id
  ))
  INTO v_row_digest
  FROM _published_contributor_ready_v9;

  SELECT count(*) INTO v_number_nodes_before
  FROM public.nodes WHERE type = 'number';

  IF v_selected_count <> 9
     OR v_ready_count <> 9
     OR v_author_count <> 3
     OR v_target_count <> 8
     OR v_claim_count <> 16
     OR v_claim_finding_count <> 9
     OR v_claim_match_count <> 16
     OR v_claim_cardinality_count <> 9
     OR v_row_digest <> 'c1fd219383ebc68ca0d0ce0d7c4ac9c8'
     OR v_claims_digest <> '403767d607c52bfd4eafca98001b0bda' THEN
    RAISE EXCEPTION
      'audited published cohort drift: selected %, ready %, authors %, targets %, claims %/% matches %, cardinalities %, digests %/%',
      v_selected_count, v_ready_count, v_author_count, v_target_count,
      v_claim_count, v_claim_finding_count, v_claim_match_count,
      v_claim_cardinality_count, v_row_digest, v_claims_digest;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN SELECT * FROM _published_contributor_ready_v9 ORDER BY id
  LOOP
    SELECT public.project_contribution_to_graph(v_row.id)
    INTO v_projected_node_id;

    IF v_projected_node_id IS NULL THEN
      RAISE EXCEPTION 'published contribution projection returned no node for %', v_row.id;
    END IF;

    UPDATE public.nodes
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'world_projection_v9', jsonb_build_object(
        'human_gate', 'ZURIEL',
        'reviewed_at', '2026-10-26',
        'source_status', 'published',
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
      RAISE EXCEPTION 'published contribution node failed closed for % / %', v_row.id, v_projected_node_id;
    END IF;

    UPDATE public.edges
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'world_projection_v9', jsonb_build_object(
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
      RAISE EXCEPTION 'published contribution edge failed closed for % / %', v_row.id, v_row.target_node_id;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  SELECT count(*) INTO v_number_nodes_after
  FROM public.nodes WHERE type = 'number';

  IF v_processed <> 9 OR v_number_nodes_after <> v_number_nodes_before THEN
    RAISE EXCEPTION
      'published projection postcondition failed: processed %, number nodes before/after %/%',
      v_processed, v_number_nodes_before, v_number_nodes_after;
  END IF;

  IF (
    SELECT count(*)
    FROM _published_contributor_ready_v9 ready
    JOIN public.research_contributions contribution ON contribution.id = ready.id
    JOIN public.nodes source_node ON source_node.id = contribution.graph_node_id
    JOIN public.edges relation
      ON relation.from_node = source_node.id
     AND relation.to_node = ready.target_node_id
     AND relation.relation_type = 'contributes_to'
    WHERE contribution.status = 'published'
      AND contribution.author_contributor_id = ready.contributor_id
      AND source_node.type = 'contribution'
      AND coalesce(source_node.metadata ->> 'space', '') = 'core'
      AND coalesce(relation.metadata ->> 'space', '') = 'core'
  ) <> 9 THEN
    RAISE EXCEPTION 'published projection postcondition failed: all nine exact-author sources must remain published and connect to existing public number targets';
  END IF;
END;
$batch$;
