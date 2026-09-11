-- W2.2b · Publication boundary hardening.
-- EXTEND_EXISTING only. Public numeric readers must not equate engine verification / EXECUTE grants
-- with publication. Internal depth remains available only through service/admin-authorized paths.

-- 1) Canonical public Number lookup: verified AND explicitly published rows only.
--    Preserve the W2.2b source-native identity/provenance columns and total ordering.
drop function if exists public.fn_number_lookup(bigint);
create function public.fn_number_lookup(p_value bigint)
returns table(method text, phrase text, value bigint, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean, atomic_or_composite text, component_methods text[], component_values bigint[], operator text, provenance text, method_evidence_class text, method_governed boolean, method_active boolean, method_scannable boolean, method_executable boolean, method_engine_verified boolean, row_provenance_state text, bid_id text, word_id uuid, method_version integer, dependency_version_snapshot jsonb, computed_at timestamptz, engine_run_id uuid, verified_at timestamptz, verified_run_id uuid, verified_method_version integer, verified_mismatch_value bigint)
language plpgsql stable set search_path to 'public'
as $function$
begin
  return query
  select b.method, b.phrase, b.value, gw.source, gw.vip_source,
         gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
         gm.final_letter_sensitive,
         case when gm.category = 'composite' then 'composite' else 'atomic' end,
         case when gm.category = 'composite' then gm.derived_from else null end,
         case when gm.category = 'composite' then (select c.component_values from public.fn_composite_calc(b.method, b.phrase) c) else null end,
         gm.operator,
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry (execution_kind=%s, operator=%s, evidence_class=%s)', b.method, b.value, gw.id, gm.execution_kind, coalesce(gm.operator, '-'), public.fn_method_evidence_class(b.method)),
         public.fn_method_evidence_class(b.method), public.fn_method_is_governed_evidence(b.method),
         gm.active, gm.scannable, public.fn_method_is_executable(b.method), public.fn_method_is_engine_verified(b.method),
         b.provenance_state, b.bid_id, b.word_id, b.method_version, b.dependency_version_snapshot,
         b.computed_at, b.engine_run_id, b.verified_at, b.verified_run_id, b.verified_method_version, b.verified_mismatch_value
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  left join public.gematria_methods gm on gm.method_key = b.method
  where b.value = p_value
    and gw.is_verified = true
    and coalesce(gw.is_published,false)=true
  order by (not public.fn_method_is_governed_evidence(b.method)), (gm.category='composite'), b.method, b.phrase, b.bid_id;
end;
$function$;
grant execute on function public.fn_number_lookup(bigint) to anon, authenticated, service_role;

-- 2) Legacy public Number dossier: apply publication to phrase/post projections and use the
--    already-hardened topic_cards_public / research_object public-candidate seams.
create or replace function public.number_dossier_json(n integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_methods jsonb := '[]'::jsonb; v_topics jsonb := '[]'::jsonb; v_posts jsonb := '[]'::jsonb; v_reality int := 0; v_defs jsonb := '[]'::jsonb;
begin
  if n is null or n < 1 then return null; end if;
  begin
    with u as (
      select 'רגיל' method,1 prio,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where ragil=n and is_verified and coalesce(is_published,false)
      union all select 'מסתתר',2,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where misratar=n and is_verified and coalesce(is_published,false)
      union all select 'אתבש',3,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where atbash=n and is_verified and coalesce(is_published,false)
      union all select 'קדמי',4,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where kadmi=n and is_verified and coalesce(is_published,false)
      union all select 'גדול',5,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where gadol=n and is_verified and coalesce(is_published,false)
      union all select 'מילוי',6,phrase,is_verified,category,source_wp_ids,node_id,lead_rank from gematria_words where miluy=n and is_verified and coalesce(is_published,false)
    ), scored as (
      select method,prio,phrase,((case when is_verified then 3 else 0 end)+(case when category in ('משיח','משיח וגאולה','יהוה','גאולה') then 3 when category ilike 'מספר-אם%' then 2 when category is null or category in ('כללי','מנוקה אוטומטית','מאגר_ערכים','מהחיפושים') then 0 else 1 end)+(case when source_wp_ids is not null and array_length(source_wp_ids,1)>0 then 2 else 0 end)+(case when node_id is not null then 1 else 0 end)+coalesce(10-least(lead_rank,9),0)) s from u
    ), ranked as (
      select method,prio,phrase,row_number() over(partition by method order by s desc,char_length(phrase) desc,phrase) rn from (select distinct method,prio,phrase,s from scored) d
    )
    select coalesce(jsonb_agg(jsonb_build_object('method',method,'phrases',phrases) order by prio),'[]'::jsonb) into v_methods from (select method,prio,jsonb_agg(phrase order by rn) phrases from ranked where rn<=7 group by method,prio) g;
  exception when others then v_methods := '[]'::jsonb; end;
  begin select coalesce(jsonb_agg(jsonb_build_object('title',title,'meter',coalesce(meter_score,0))),'[]'::jsonb) into v_topics from (select title,meter_score from topic_cards_public where (n=any(numbers) or n=any(highlight_numbers)) order by meter_score desc nulls last limit 4) t; exception when others then v_topics := '[]'::jsonb; end;
  begin select coalesce(jsonb_agg(title),'[]'::jsonb) into v_posts from (select distinct p.title from posts p join gematria_words g on p.wp_id=any(g.source_wp_ids) where (g.ragil=n or g.misratar=n or g.atbash=n) and g.is_verified and coalesce(g.is_published,false) and p.wp_id is not null limit 4) x; exception when others then v_posts := '[]'::jsonb; end;
  begin select count(*) into v_reality from gallery_images where primary_value=n and source='update' and coalesce(curator_hidden,false)=false; exception when others then v_reality := 0; end;
  begin select coalesce(jsonb_agg(left(statement,140)),'[]'::jsonb) into v_defs from (select statement from research_objects where value=n and status in ('approved','canonical') and privacy_scope='public_candidate' and statement is not null limit 3) r; exception when others then v_defs := '[]'::jsonb; end;
  return jsonb_build_object('value',n,'methods',v_methods,'topics',v_topics,'posts',v_posts,'reality',v_reality,'definitions',v_defs);
end;
$function$;

-- 3) Rich dossier: internal depth for service/admin only; public callers receive a bounded,
--    publication-safe context projection. Withheld material is not converted into negative truth.
create or replace function public.fn_number_dossier(p_value integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare mtx jsonb; v_claims jsonb; v_service boolean:=false; v_admin boolean:=false; v_privileged boolean:=false; v_public_convergences jsonb:='[]'::jsonb;
begin
  begin v_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb; exception when others then v_claims:=null; end;
  v_service := coalesce(v_claims->>'role','')='service_role' or (v_claims is null and session_user in ('postgres','supabase_admin','service_role'));
  begin v_admin := public.rd_is_admin(); exception when others then v_admin:=false; end;
  v_privileged := v_service or coalesce(v_admin,false);
  if v_privileged then
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
  with rows as (select l.method,l.phrase,row_number() over(partition by l.method order by l.phrase,l.bid_id) rn from public.fn_number_lookup(p_value::bigint) l), grouped as (select method,count(*) group_size,coalesce(jsonb_agg(phrase order by phrase) filter(where rn<=12),'[]'::jsonb) phrases from rows group by method), top_groups as (select * from grouped order by group_size desc,method limit 8)
  select coalesce(jsonb_agg(jsonb_build_object('method',method,'group_size',group_size,'phrases',phrases) order by group_size desc,method),'[]'::jsonb) into v_public_convergences from top_groups;
  return jsonb_build_object('value',p_value,'projection_scope','public','context_version','public_projection_v2','rules_snapshot','[]'::jsonb,
    'facts',jsonb_build_object('anchor',null,'metatron_anchor',null,'convergences',coalesce(v_public_convergences,'[]'::jsonb),'node',(select jsonb_build_object('id',id,'label',label,'description',left(description,400)) from public.nodes where type='number' and label=p_value::text and coalesce(is_active,true) and public.fn_graph_space_is_public(metadata) limit 1)),
    'evidence','[]'::jsonb,
    'cards',(select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'title',title,'status',status)),'[]'::jsonb) from public.topic_cards_public where p_value=any(coalesce(numbers,'{}'::int[])) or p_value=any(coalesce(highlight_numbers,'{}'::int[]))),
    'decisions','[]'::jsonb,'preferences','[]'::jsonb,'candidates','[]'::jsonb,
    'related',(select coalesce(jsonb_agg(distinct nn2),'[]'::jsonb) from public.topic_cards_public tc,unnest(coalesce(tc.numbers,'{}'::int[])||coalesce(tc.highlight_numbers,'{}'::int[])) nn2 where nn2<>p_value and (p_value=any(coalesce(tc.numbers,'{}'::int[])) or p_value=any(coalesce(tc.highlight_numbers,'{}'::int[])))),'generated_at',now());
end;
$function$;

-- 4) Journey bundle: public callers get a derived map only from the now publication-safe lookup,
--    plus public Tanakh source text. Root/branches/draft seed remain internal until their owners
--    carry an explicit public projection/publication contract.
create or replace function public.fn_number_journey(p_value integer)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_claims jsonb; v_service boolean:=false; v_admin boolean:=false; v_privileged boolean:=false; v_map jsonb:=null;
begin
  begin v_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb; exception when others then v_claims:=null; end;
  v_service := coalesce(v_claims->>'role','')='service_role' or (v_claims is null and session_user in ('postgres','supabase_admin','service_role'));
  begin v_admin := public.rd_is_admin(); exception when others then v_admin:=false; end;
  v_privileged := v_service or coalesce(v_admin,false);
  if v_privileged then
    return jsonb_build_object('value',p_value,'projection_scope','internal_authorized','root',(select jsonb_build_object('root_word',root_word,'essence',essence) from public.number_roots where number=p_value and coalesce(is_active,true) limit 1),'map',public.map_anchor_family(p_value),'branches',coalesce((select jsonb_agg(jsonb_build_object('name',branch_name,'description',description,'n_phrases',coalesce(array_length(phrases,1),0),'sort',sort_order) order by sort_order) from public.number_branches where number=p_value and coalesce(is_active,true)),'[]'::jsonb),'sources',public.fn_verses_by_gematria(p_value,6),'seed',(select jsonb_build_object('status',status,'readiness',readiness,'title',dna->>'title') from public.journey_seeds where value=p_value limit 1));
  end if;
  with r as (select public.zero_root(p_value) root), base as (select root,public.digit_reverse(root) mir from r), fam as (select distinct v from unnest(array[(select root from base),(select root from base)*10,(select root from base)*100,(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000), hits as (select l.value,l.phrase,l.method from fam f cross join lateral public.fn_number_lookup(f.v::bigint) l where l.phrase !~ '[A-Za-z0-9]')
  select jsonb_build_object('root',(select root from base),'primary_value',(select root from base),'mirror_values',to_jsonb(array(select v from unnest(array[(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000)),'zero_shift_values',to_jsonb(array[(select root from base)*10,(select root from base)*100]),'family_values',(select to_jsonb(array_agg(v order by v)) from fam),'hebrew_terms',coalesce((select to_jsonb((array_agg(distinct phrase order by phrase))[1:14]) from hits),'[]'::jsonb),'evidence_count',(select count(distinct phrase) from hits),'methods',coalesce((select to_jsonb(array_agg(distinct method order by method)) from hits),'[]'::jsonb),'n_bridges',0,'bridges','[]'::jsonb) into v_map;
  return jsonb_build_object('value',p_value,'projection_scope','public','root',null,'map',v_map,'branches','[]'::jsonb,'sources',public.fn_verses_by_gematria(p_value,6),'seed',null);
end;
$function$;

-- 5) The old family mapper has no publication/access axis and no repository consumer. Keep it for
--    authorized service/internal use, but stop exposing it as a public API.
revoke execute on function public.map_anchor_family(integer) from anon, authenticated;
grant execute on function public.map_anchor_family(integer) to service_role;
