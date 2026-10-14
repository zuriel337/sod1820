-- ROLE B · CANDIDATES · the live bodies with ONE change each: the unbounded fn_number_lookup(...) call becomes fn_number_hits(...) (same filter, no per-row work). Admin/service branches are byte-identical.
\set ON_ERROR_STOP on
-- NARROW READ for the two definer RPCs: exactly the base rows of fn_number_lookup (bidim x gematria_words, verified + published, registry LEFT JOIN never filters), without per-row registry/provenance/composite work.
CREATE OR REPLACE FUNCTION public.fn_number_hits(p_value bigint)
 RETURNS TABLE(method text, phrase text, value bigint, bid_id text)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  select b.method, b.phrase, b.value, b.bid_id
  from public.bidim b join public.gematria_words gw on gw.id = b.word_id
  where b.value = p_value and gw.is_verified = true and coalesce(gw.is_published, false) = true;
$function$;
grant execute on function public.fn_number_hits(bigint) to anon, authenticated, lab_admin;
CREATE OR REPLACE FUNCTION public.fn_number_dossier_v3(p_value integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  mtx jsonb;
  v_admin boolean := false;
  v_public_convergences jsonb := '[]'::jsonb;
begin
  -- Root-of-trust boundary: service_role is execution capability, not Human-Gate/publication authority.
  -- Only the canonical caller-derived admin predicate may unlock the internal projection.
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
    from public.fn_number_hits(p_value::bigint) l
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
CREATE OR REPLACE FUNCTION public.fn_number_journey_v3(p_value integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_claims jsonb; v_service boolean:=false; v_admin boolean:=false; v_privileged boolean:=false; v_map jsonb:=null;
begin
  begin v_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb; exception when others then v_claims:=null; end;
  v_service := coalesce(v_claims->>'role','')='service_role' or (v_claims is null and session_user in ('postgres','supabase_admin','service_role'));
  begin v_admin := public.rd_is_admin(); exception when others then v_admin:=false; end;
  v_privileged := v_service or coalesce(v_admin,false);
  if v_privileged then
    return jsonb_build_object('value',p_value,'projection_scope','internal_authorized','root',(select jsonb_build_object('root_word',root_word,'essence',essence) from public.number_roots where number=p_value and coalesce(is_active,true) limit 1),'map',public.map_anchor_family(p_value),'branches',coalesce((select jsonb_agg(jsonb_build_object('name',branch_name,'description',description,'n_phrases',coalesce(array_length(phrases,1),0),'sort',sort_order) order by sort_order) from public.number_branches where number=p_value and coalesce(is_active,true)),'[]'::jsonb),'sources',public.fn_verses_by_gematria(p_value,6),'seed',(select jsonb_build_object('status',status,'readiness',readiness,'title',dna->>'title') from public.journey_seeds where value=p_value limit 1));
  end if;
  with r as (select public.zero_root(p_value) root), base as (select root,public.digit_reverse(root) mir from r), fam as (select distinct v from unnest(array[(select root from base),(select root from base)*10,(select root from base)*100,(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000), hits as (select l.value,l.phrase,l.method from fam f cross join lateral public.fn_number_hits(f.v::bigint) l where l.phrase !~ '[A-Za-z0-9]')
  select jsonb_build_object('root',(select root from base),'primary_value',(select root from base),'mirror_values',to_jsonb(array(select v from unnest(array[(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000)),'zero_shift_values',to_jsonb(array[(select root from base)*10,(select root from base)*100]),'family_values',(select to_jsonb(array_agg(v order by v)) from fam),'hebrew_terms',coalesce((select to_jsonb((array_agg(distinct phrase order by phrase))[1:14]) from hits),'[]'::jsonb),'evidence_count',(select count(distinct phrase) from hits),'methods',coalesce((select to_jsonb(array_agg(distinct method order by method)) from hits),'[]'::jsonb),'n_bridges',0,'bridges','[]'::jsonb) into v_map;
  return jsonb_build_object('value',p_value,'projection_scope','public','root',null,'map',v_map,'branches','[]'::jsonb,'sources',public.fn_verses_by_gematria(p_value,6),'seed',null);
end;
$function$;
grant execute on function public.fn_number_dossier_v3(integer), public.fn_number_journey_v3(integer) to anon, authenticated, lab_admin;
