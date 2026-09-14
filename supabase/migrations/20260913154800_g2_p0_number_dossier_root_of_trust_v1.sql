-- G2 P0-7 · Number dossier Root-of-Trust containment.
-- Human Gate direction: Zero Upper-Layer Inheritance. Preserve Foundation semantics; legacy UI/runtime compatibility is not a closure requirement.
-- service_role is execution capability, not Human-Gate/publication authority.

create or replace function public.fn_number_dossier(p_value integer)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  mtx jsonb;
  v_admin boolean := false;
  v_public_convergences jsonb := '[]'::jsonb;
begin
  begin v_admin := public.rd_is_admin(); exception when others then v_admin := false; end;

  if coalesce(v_admin,false) then
    mtx := public.metatron_context(jsonb_build_object('ask',p_value::text,'channel','number-researcher','entities',jsonb_build_array(jsonb_build_object('type','number','value',p_value::text))));
    return jsonb_build_object('value',p_value,'projection_scope','internal_authorized','context_version',coalesce(mtx->'context_version',to_jsonb('v1'::text)),'rules_snapshot',public.fn_rules_snapshot(array['equality_vs_convergence','convergence_one_per_value','unified_discovery_architecture','gold_seal_convergence','partial_convergence_approval']),
      'facts',jsonb_build_object('anchor',(select fact from public.number_anchors where value=p_value limit 1),'metatron_anchor',(select label from public.metatron_anchors where anchor_value=p_value limit 1),'convergences',(select coalesce(jsonb_agg(jsonb_build_object('method',method,'group_size',group_size,'phrases',(select coalesce(jsonb_agg(p),'[]'::jsonb) from unnest(phrases) p)) order by group_size desc nulls last),'[]'::jsonb) from public.convergences where value=p_value and method<>'siduri'),'node',(select jsonb_build_object('id',id,'label',label,'description',left(description,400)) from public.nodes where type='number' and label=p_value::text limit 1)),
      'evidence',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'method',method,'a',a_phrase,'b',b_phrase,'note',note,'status',status)),'[]'::jsonb) from public.relation_evidence where value=p_value),
      'cards',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'title',title,'status',status)),'[]'::jsonb) from public.topic_cards,unnest(coalesce(numbers,'{}'::int[])||coalesce(highlight_numbers,'{}'::int[])) nn where nn=p_value),
      'decisions',(select coalesce(jsonb_agg(jsonb_build_object('human_decision',human_decision,'reason_code',reason_code,'human_reason',human_reason,'provenance',provenance,'rules_snapshot',rules_snapshot,'status',status,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.decision_ledger where subject_ref=p_value::text and decision_type='convergence'),
      'preferences',(select coalesce(jsonb_agg(jsonb_build_object('key',pattern_key,'polarity',polarity)),'[]'::jsonb) from public.learned_patterns where status='approved_preference'),
      'candidates',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'recommendation',recommendation,'status',status)),'[]'::jsonb) from public.research_candidates where subject_ref=p_value::text),
      'related',(select coalesce(jsonb_agg(distinct nn2),'[]'::jsonb) from public.topic_cards tc,unnest(coalesce(tc.numbers,'{}'::int[])||coalesce(tc.highlight_numbers,'{}'::int[])) nn2 where tc.status='approved' and nn2<>p_value and tc.id in (select tc2.id from public.topic_cards tc2,unnest(coalesce(tc2.numbers,'{}'::int[])||coalesce(tc2.highlight_numbers,'{}'::int[])) x where x=p_value)),'generated_at',now());
  end if;

  with rows as (
    select l.method,l.phrase,row_number() over(partition by l.method order by l.phrase,l.bid_id) rn
    from public.fn_number_lookup(p_value::bigint) l
  ), grouped as (
    select method,count(*) group_size,coalesce(jsonb_agg(phrase order by phrase) filter(where rn<=12),'[]'::jsonb) phrases
    from rows group by method
  ), top_groups as (
    select * from grouped order by group_size desc,method limit 8
  )
  select coalesce(jsonb_agg(jsonb_build_object('method',method,'group_size',group_size,'phrases',phrases) order by group_size desc,method),'[]'::jsonb)
    into v_public_convergences from top_groups;

  return jsonb_build_object('value',p_value,'projection_scope','public','context_version','public_projection_v2','rules_snapshot','[]'::jsonb,
    'facts',jsonb_build_object('anchor',null,'metatron_anchor',null,'convergences',coalesce(v_public_convergences,'[]'::jsonb),'node',(select jsonb_build_object('id',id,'label',label,'description',left(description,400)) from public.nodes where type='number' and label=p_value::text and coalesce(is_active,true) and public.fn_graph_space_is_public(metadata) limit 1)),
    'evidence','[]'::jsonb,
    'cards',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'title',title,'status',status)),'[]'::jsonb) from public.topic_cards_public where p_value=any(coalesce(numbers,'{}'::int[])) or p_value=any(coalesce(highlight_numbers,'{}'::int[]))),
    'decisions','[]'::jsonb,'preferences','[]'::jsonb,'candidates','[]'::jsonb,
    'related',(select coalesce(jsonb_agg(distinct nn2),'[]'::jsonb) from public.topic_cards_public tc,unnest(coalesce(tc.numbers,'{}'::int[])||coalesce(tc.highlight_numbers,'{}'::int[])) nn2 where nn2<>p_value and (p_value=any(coalesce(tc.numbers,'{}'::int[])) or p_value=any(coalesce(tc.highlight_numbers,'{}'::int[])))),'generated_at',now());
end;
$function$;

comment on function public.fn_number_dossier(integer) is
'Canonical Number dossier projection. Internal depth requires canonical caller-derived admin authority. service_role alone is execution capability and does not unlock internal_authorized. Public/service callers without Human-Gate authority receive publication-safe public projection. G2 P0-7 containment 2026-09-13.';
