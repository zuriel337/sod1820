-- Composite Derivation -> Convergence Bridge v1
--
-- Bridges verified compound derivations in research_objects (e.g. Zvi's
-- "ברית(612)*5=3060") into the EXISTING convergence infrastructure
-- (nodes.type='convergence', edges.relation_type='converges_on',
-- research_candidates.candidate_type='convergence'). No new tables, no new
-- node/edge/relation types, no automatic canonical promotion -- writes only
-- ever land in research_candidates, staged for the existing Human Gate.
--
-- Why not reuse wizard_build_convergence: it requires phrase_value=target_value
-- directly via fn_ragil(phrase) -- it has no concept of a multiplier/compound
-- chain (phrase * N = target), so a bare phrase like "ברית" (=612) cannot be
-- routed through it to represent "ברית*5=3060" without fabricating a fake
-- gematria_words phrase, which is explicitly forbidden.
--
-- Why not reuse fn_relation_candidate / fn_relation_dependency_groups /
-- fn_relation_independent_evidence / fn_relation_composite_evidence: that
-- family analyzes whether TWO PHRASES independently land on the same value
-- via different gematria METHODS (bidim + gematria_methods.dependency_rules)
-- -- a same-phrase, cross-method independence question. Composite Zvi
-- derivations are a different shape entirely: DIFFERENT phrases, each with
-- its own multiplier, chained arithmetically to ONE target. The dependency
-- question here is "do these compound claims share an operand/sub-value"
-- (e.g. טוב(17)*36=612=ברית), which the existing family cannot express.
create or replace function public.fn_composite_convergence_candidate(
  p_target_value integer,
  p_research_object_ids uuid[],
  p_by text default 'metatron'
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_raw_count int;
  v_requested_count int := coalesce(array_length(p_research_object_ids,1),0);
  changed boolean;
  v_number_node uuid;
  v_convergence_edges jsonb;
  v_approved_cards jsonb;
  v_relation_evidence jsonb;
  v_existing_pending_id uuid;
  v_paths jsonb;
  v_dependency_groups jsonb;
  v_shared_operands jsonb;
  v_shared_sources jsonb;
  v_independent_group_count int;
  v_classification text;
  v_recommendation text;
  v_confidence numeric;
  v_why jsonb;
  v_candidate_id uuid;
  v_action text;
  v_warnings jsonb := '[]'::jsonb;
begin
  -- One System Law: this function only READS research_objects/nodes/edges/topic_cards/
  -- relation_evidence/research_candidates and only ever WRITES research_candidates.
  -- It never inserts/updates nodes, edges or gematria_words (no canonical promotion here).

  drop table if exists pg_temp.cc_paths;
  create temp table cc_paths on commit drop as
  select ro.id, ro.kind, ro.statement, ro.value, ro.source, ro.source_ref, ro.contributor,
         ro.engine_verified, ro.status, ro.confidence,
         regexp_replace(ro.source_ref, '#.*$', '') as base_source,
         coalesce(ro.engine_detail->'compound'->'operand'->>'phrase',
                  ro.engine_detail->'compound'->'operands'->0->>'phrase') as operand_phrase,
         coalesce((ro.engine_detail->'compound'->'operand'->>'value')::numeric,
                  (ro.engine_detail->'compound'->'operands'->0->>'value')::numeric) as operand_value,
         coalesce(ro.engine_detail->'compound'->>'origRaw', ro.engine_detail->'compound'->>'raw', '') as raw_text
  from public.research_objects ro
  -- Eligibility Gate (section E of the task): engine_verified + not rejected + deterministic
  -- target match + provenance present. kind='fact' is deliberately NOT required in v1 --
  -- existing valid Zvi calculations are currently kind='observation'; tagging cleanup is separate.
  where ro.id = any(p_research_object_ids)
    and ro.engine_verified = true
    and ro.status <> 'rejected'
    and ro.value = p_target_value
    and ro.source_ref is not null;

  select count(*) into v_raw_count from cc_paths;

  if v_raw_count = 0 then
    return jsonb_build_object(
      'error', 'no_eligible_derivation_objects',
      'target_value', p_target_value,
      'requested_ids', to_jsonb(p_research_object_ids),
      'note', 'eligibility gate: engine_verified=true AND status<>rejected AND value=target AND source_ref present'
    );
  end if;

  if v_raw_count < v_requested_count then
    v_warnings := v_warnings || jsonb_build_array(
      format('%s of %s requested ids failed the eligibility gate and were excluded', v_requested_count - v_raw_count, v_requested_count)
    );
  end if;

  alter table cc_paths add column contributed_values numeric[];
  alter table cc_paths add column grp int;

  -- Shared-operand / dependency signal (section G): bounded, single-hop, no new engine.
  -- contributed_values = this path's own gematria operand value, plus operand_value times
  -- each bare numeric literal appearing in its own raw claim text (catches e.g. טוב(17)*36=612,
  -- which is ברית's own value, without re-implementing expression parsing). The target value
  -- itself is always removed -- otherwise every path would trivially "share" the root value
  -- and collapse into one meaningless group.
  update cc_paths t set contributed_values = array_remove((
    select array_agg(distinct v) from (
      select t.operand_value as v
      union
      select t.operand_value * (m[1])::numeric
      from regexp_matches(t.raw_text, '\d+', 'g') as m
      where (m[1])::numeric <> p_target_value and t.operand_value is not null
    ) s
    where v is not null
  ), p_target_value::numeric);

  update cc_paths set grp = sub.rn
  from (select id, row_number() over (order by id) as rn from cc_paths) sub
  where cc_paths.id = sub.id;

  -- Union-find via iterative label propagation (N is always small -- Zvi specimens are
  -- single-digit path counts -- so this converges in a handful of passes). Merge ONLY on
  -- shared contributed_values (arithmetic/operand dependency), deliberately NOT on shared
  -- source message -- that is a different signal, reported separately as shared_sources so
  -- neither one silently hides the other ("Rank, Don't Hide").
  loop
    changed := false;
    update cc_paths a set grp = least(a.grp, b.grp)
    from cc_paths b
    where a.id <> b.id
      and a.contributed_values && b.contributed_values
      and b.grp < a.grp;
    if found then changed := true; end if;
    exit when not changed;
  end loop;

  select jsonb_agg(jsonb_build_object(
    'research_object_id', id, 'kind', kind, 'statement', statement, 'value', value,
    'source', source, 'source_ref', source_ref, 'contributor', contributor,
    'engine_verified', engine_verified, 'status', status, 'confidence', confidence,
    'operand_phrase', operand_phrase, 'operand_value', operand_value,
    'contributed_values', to_jsonb(contributed_values), 'base_source', base_source, 'group', grp
  ) order by source_ref) into v_paths from cc_paths;

  select jsonb_agg(jsonb_build_object('group', grp, 'members', member_ids, 'member_count', member_count))
  into v_dependency_groups
  from (select grp, jsonb_agg(id) as member_ids, count(*) as member_count from cc_paths group by grp) g;

  select count(distinct grp) into v_independent_group_count from cc_paths;

  select jsonb_agg(jsonb_build_object('operand_value', operand_value, 'operand_phrases', phrases, 'members', member_ids))
  into v_shared_operands
  from (
    select operand_value, jsonb_agg(distinct operand_phrase) as phrases, jsonb_agg(id) as member_ids
    from cc_paths where operand_value is not null group by operand_value having count(*) > 1
  ) x;

  select jsonb_agg(jsonb_build_object('base_source', base_source, 'members', member_ids))
  into v_shared_sources
  from (
    select base_source, jsonb_agg(id) as member_ids
    from cc_paths group by base_source having count(*) > 1
  ) y;

  if v_shared_sources is not null and jsonb_array_length(v_shared_sources) > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      'one or more path groups share a common source message (see shared_sources) -- these may be facets of one authorial essay rather than fully independent discoveries; not merged into dependency_groups, reported separately per instruction'
    );
  end if;

  -- Existing-convergence crosswalk (section J) -- read-only.
  select id into v_number_node from public.nodes where type = 'number' and label = p_target_value::text limit 1;

  select coalesce(jsonb_agg(jsonb_build_object('edge_id', e.id, 'from_node', e.from_node, 'relation_type', e.relation_type)), '[]'::jsonb)
  into v_convergence_edges
  from public.edges e join public.nodes cn on cn.id = e.from_node and cn.type = 'convergence'
  where e.relation_type = 'converges_on' and v_number_node is not null and e.to_node = v_number_node;

  select coalesce(jsonb_agg(jsonb_build_object('slug', tc.slug, 'title', tc.title, 'status', tc.status)), '[]'::jsonb)
  into v_approved_cards
  from public.topic_cards tc
  where tc.status = 'approved'
    and p_target_value = any(coalesce(tc.numbers, '{}'::int[]) || coalesce(tc.highlight_numbers, '{}'::int[]));

  select coalesce(jsonb_agg(jsonb_build_object('id', re.id, 'a_phrase', re.a_phrase, 'b_phrase', re.b_phrase, 'status', re.status)), '[]'::jsonb)
  into v_relation_evidence
  from public.relation_evidence re where re.value = p_target_value;

  select rc.id into v_existing_pending_id
  from public.research_candidates rc
  where rc.candidate_type = 'convergence' and rc.subject_type = 'number' and rc.subject_ref = p_target_value::text
    and rc.status = 'pending'
  order by rc.created_at desc limit 1;

  v_classification := case
    when v_existing_pending_id is not null then 'ENRICH_EXISTING_CANDIDATE'
    when jsonb_array_length(coalesce(v_approved_cards, '[]'::jsonb)) > 0
         and jsonb_array_length(coalesce(v_convergence_edges, '[]'::jsonb)) > 0 then 'ALREADY_REPRESENTED'
    else 'NEW_COMPOSITE_CANDIDATE'
  end;

  v_recommendation := case
    when v_classification = 'ALREADY_REPRESENTED' then 'duplicate'
    when v_independent_group_count >= 3 then 'strong'
    when v_independent_group_count = 2 then 'needs_check'
    else 'weak'
  end;

  v_confidence := least(1.0, round(v_independent_group_count / 4.0, 2));

  v_why := jsonb_build_object(
    'target_value', p_target_value,
    'raw_path_count', v_raw_count,
    'independent_group_count', v_independent_group_count,
    'dependency_groups', v_dependency_groups,
    'shared_operands', coalesce(v_shared_operands, '[]'::jsonb),
    'shared_sources', coalesce(v_shared_sources, '[]'::jsonb),
    'paths', v_paths,
    'existing_number_node', v_number_node,
    'existing_convergence_edges', v_convergence_edges,
    'existing_approved_topic_cards', v_approved_cards,
    'existing_relation_evidence', v_relation_evidence,
    'classification', v_classification,
    'warnings', v_warnings,
    'source', 'fn_composite_convergence_candidate',
    'generated_by', p_by
  );

  if v_classification = 'ENRICH_EXISTING_CANDIDATE' then
    update public.research_candidates
    set why = why || jsonb_build_object('enriched_at', now()::text, 'enrichment', v_why),
        evidence_refs = (
          select jsonb_agg(distinct e) from jsonb_array_elements(coalesce(evidence_refs, '[]'::jsonb) || to_jsonb(p_research_object_ids)) e
        )
    where id = v_existing_pending_id
    returning id into v_candidate_id;
    v_action := 'enriched_existing_pending_candidate';
  elsif v_classification = 'ALREADY_REPRESENTED' then
    v_candidate_id := null;
    v_action := 'no_write_already_represented_reported_only';
  else
    insert into public.research_candidates(candidate_type, subject_type, subject_ref, node_id, recommendation, confidence, why, evidence_refs, created_by_agent, status)
    values ('convergence', 'number', p_target_value::text, v_number_node, v_recommendation, v_confidence, v_why, to_jsonb(p_research_object_ids), p_by, 'pending')
    returning id into v_candidate_id;
    v_action := 'inserted_new_pending_candidate';
  end if;

  return jsonb_build_object(
    'action', v_action, 'candidate_id', v_candidate_id, 'classification', v_classification,
    'target_value', p_target_value, 'raw_path_count', v_raw_count,
    'independent_group_count', v_independent_group_count,
    'dependency_groups', v_dependency_groups, 'shared_operands', v_shared_operands, 'shared_sources', v_shared_sources,
    'existing_number_node', v_number_node, 'existing_convergence_edges', v_convergence_edges,
    'existing_approved_topic_cards', v_approved_cards, 'existing_relation_evidence', v_relation_evidence,
    'warnings', v_warnings
  );
end;
$function$;

revoke all on function public.fn_composite_convergence_candidate(integer, uuid[], text) from public;
grant execute on function public.fn_composite_convergence_candidate(integer, uuid[], text) to authenticated, service_role;
