-- RAZIEL_INTELLIGENCE_CORE_V1_PHASE_A — plan-first answer; gematria resolver only behind a gematria-classified plan.
-- Owners: raziel_routing_law v2 + research_strategy_layer_law v17 (EXTEND_EXISTING fn_raziel_plan / fn_raziel_answer).
-- DRIFT fixed: fn_raziel_answer called fn_raziel_resolve BEFORE capability classification, so any short sentence
--   (even «מה קורה עכשיו באתר?») could be computed as a gematria expression; and the bare route keyword «כמה»
--   classified «כמה אנשים נכנסו היום?» as the gematria capability.
-- Scope: fn_raziel_plan (additive fields + gematria question-form gate) and fn_raziel_answer (order of operations).
--   fn_raziel_route, fn_raziel_resolve, fn_raziel_extract_subject, permission/effective_scope, inactive-agent
--   fail-closed, flag gate and raziel_config.shared.model_policy.routing_enabled (stays false) are untouched.
-- Fail direction: an ambiguous gematria keyword falls to Raziel synthesis (ai-analyze persona=raziel), never to calculation.
-- No provider/model names here. minimum_intelligence uses the raziel_routing_law §3 level vocabulary.

create or replace function public.fn_raziel_plan(p_question text, p_context_type text default 'public_user'::text, p_user_ref text default null::text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_route jsonb; v_sel jsonb; v_unavail jsonb;
  v_urank int; v_cand jsonb;
  v_expert text; v_ename text; v_escope text; v_eff text;
  v_pintent text; v_pfn text; v_allow boolean; v_pdet boolean; v_ptok int;
  v_erank int; v_perm_ok boolean; v_avail text; v_reason text;
  v_q text; v_gform text; v_rejected text;
  v_class text; v_strategy text; v_minint text;
begin
  v_urank := case lower(coalesce(p_context_type,'public_user'))
               when 'admin' then 2 when 'authenticated_user' then 1 when 'whatsapp_user' then 1 else 0 end;
  v_q := ' '||public.fn_raziel_norm(p_question)||' ';

  v_route  := public.fn_raziel_route(p_question, p_context_type, p_user_ref);
  v_sel    := coalesce(v_route->'expert_selected','[]'::jsonb);
  v_unavail:= coalesce(v_route->'unavailable_matched','[]'::jsonb);

  if jsonb_array_length(v_sel) > 0 then
    v_cand   := v_sel->0;
    v_expert := v_cand->>'expert';
    v_ename  := v_cand->>'name';
    v_escope := v_cand->>'permission_scope';
    v_eff    := v_cand->>'effective_scope';
    v_erank  := case v_escope when 'admin' then 2 when 'authenticated' then 1 else 0 end;
    v_perm_ok:= (v_urank >= v_erank);

    select pa.intent, pa.fn_name, pa.deterministic, pa.token_cost,
           exists(select 1 from public.raziel_protocol_allowed_fns f where f.fn_name=pa.fn_name)
      into v_pintent, v_pfn, v_pdet, v_ptok, v_allow
    from public.raziel_protocol_agents pa
    where pa.expert_id = v_expert and pa.enabled order by pa.sort limit 1;

    -- ▼ Phase A gematria question-form gate. A bare route keyword (כמה / ערך / שווה) is not a gematria question.
    --   strong vocabulary: גימטריה/גימטריא/חישוב; otherwise an expression-shaped form:
    --   «כמה זה X» · «X שווה כמה» · «מה (ה)ערך של X». Quantity/amount words veto the «כמה זה» form.
    if v_pintent = 'gematria' then
      v_gform := case
        when v_q ~ ' (גימטריה|גימטריא|חישוב) ' then 'explicit_gematria_term'
        when v_q ~ ' (שווה|שוה) כמה $' then 'value_question_suffix'
        when v_q ~ '^ (מה )?(הערך|ערך) של ' then 'value_of_expression'
        when v_q ~ '^ כמה (זה|זהו|הוא|היא|זו) ' and v_q !~ ' (אנשים|משתמשים|מבקרים|נכנסו|פוסטים|עולה|עולים|עולות|זמן|כסף|פעמים|יש|קוראים) '
          then 'how_much_is_expression'
        else null end;
      if v_gform is null then
        v_rejected := v_expert; v_expert := null; v_ename := null; v_cand := null;
        v_pintent := null; v_pfn := null; v_pdet := null; v_ptok := null; v_allow := null;
        v_escope := null; v_eff := null; v_perm_ok := null;
      end if;
    end if;

    if v_rejected is not null then
      v_avail := 'no_match';
      v_reason := 'מילת-מפתח «'||v_rejected||'» בלבד אינה שאלת גימטריה — אין צורת-ביטוי → Raziel synthesis (לא מחשבים)';
    elsif v_pintent is null then
      v_avail := 'no_protocol'; v_reason := 'מומחה תואם אך אין intent/פרוטוקול רשום עבורו';
    elsif not v_perm_ok then
      v_avail := 'blocked_permission';
      v_reason := 'מומחה '||v_escope||'; משתמש '||p_context_type||' אינו מורשה להריץ (effective_scope='||v_eff||')'
                  || case when not coalesce(v_allow,false) then ' · גם fn לא ב-allowlist' else '' end;
    elsif not coalesce(v_allow,false) then
      v_avail := 'blocked_not_allowlisted'; v_reason := 'function '||v_pfn||' אינו ב-allowlist → חסום';
    else
      v_avail := 'available'; v_reason := 'intent-match: '||v_pintent;
    end if;

  elsif jsonb_array_length(v_unavail) > 0 then
    v_cand   := v_unavail->0;
    v_expert := v_cand->>'expert';
    v_ename  := v_cand->>'name';
    v_avail  := 'unavailable_matched';
    v_reason := coalesce(v_cand->>'reason','matched אך active=false — טרם נבנה');
    select pa.intent, pa.fn_name, pa.deterministic, pa.token_cost,
           exists(select 1 from public.raziel_protocol_allowed_fns f where f.fn_name=pa.fn_name)
      into v_pintent, v_pfn, v_pdet, v_ptok, v_allow
    from public.raziel_protocol_agents pa where pa.expert_id=v_expert and pa.enabled order by pa.sort limit 1;
    v_escope := 'n/a'; v_eff := null; v_perm_ok := false;
  else
    v_avail := 'no_match'; v_reason := 'אין התאמה ברורה → אין מומחה (לא מנחשים)';
  end if;

  -- ▼ Phase A bounded capability metadata (semantic, provider-agnostic; levels per raziel_routing_law §3)
  v_class := case
    when v_avail = 'available' and v_pintent = 'gematria' then 'gematria_expression'
    when v_avail = 'available' and v_pintent = 'els' then 'els_search'
    when v_avail = 'available' then 'registered_protocol'
    when v_avail = 'no_match' then 'general_synthesis'
    else 'expert_unavailable' end;
  v_strategy := case when v_avail = 'available' and coalesce(v_pdet,true) then 'deterministic_engine' else 'raziel_synthesis' end;
  v_minint := case when v_strategy = 'deterministic_engine' then 'L0_DETERMINISTIC' else 'L2_FAST' end;

  return jsonb_build_object(
    'plan_version', 2,
    'question', left(coalesce(p_question,''),200),
    'context_type', p_context_type,
    'user_context_rank', v_urank,
    'intent_class', v_route->>'intent',
    'capability_class', v_class,
    'strategy', v_strategy,
    'minimum_intelligence', v_minint,
    'gematria_form', v_gform,
    'candidate', case when v_expert is null then null else
        jsonb_build_object('expert',v_expert,'name',v_ename,'reason',coalesce(v_cand->>'reason',v_reason)) end,
    'availability', v_avail,
    'reason', v_reason,
    'protocol', case when v_pintent is null then null else jsonb_build_object(
        'intent', v_pintent, 'executor','fn_raziel_protocol',
        'specialist_fn', v_pfn, 'fn_allowlisted', coalesce(v_allow,false),
        'deterministic', coalesce(v_pdet,true), 'token_cost', coalesce(v_ptok,0)) end,
    'permission', jsonb_build_object(
        'expert_scope', v_escope, 'user_context', p_context_type,
        'effective_scope', v_eff, 'permission_ok', coalesce(v_perm_ok,false),
        'escalation_possible', false),
    'execution_plan', jsonb_build_object(
        'will_execute', false, 'live', false,
        'would_call', case when v_avail='available' then 'fn_raziel_protocol('||quote_literal(coalesce(p_question,''))||','||quote_literal(coalesce(v_pintent,''))||')' else null end,
        'note', 'PLAN בלבד — לא הופעל מומחה, לא נקרא Claude, לא ערוץ חי'),
    'trace', jsonb_build_object(
        'question', left(coalesce(p_question,''),200), 'intent', v_route->>'intent',
        'candidate_expert', v_expert, 'rejected_candidate', v_rejected, 'reason', v_reason,
        'permission_scope', v_escope, 'effective_scope', v_eff,
        'protocol', v_pintent, 'availability', v_avail,
        'capability_class', v_class, 'strategy', v_strategy, 'minimum_intelligence', v_minint,
        'execution_plan', case when v_avail='available' then 'ready (not executed)' else v_avail end),
    'cost', jsonb_build_object('used_llm', false, 'tokens', 0, 'db_calls', 1),
    'generated_at', now());
end;
$function$;

create or replace function public.fn_raziel_answer(p_question text, p_context_type text default 'public_user'::text, p_user_ref text default null::text, p_visitor text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_en boolean; v_tv text; v_active boolean;
  v_plan jsonb; v_avail text; v_intent text; v_class text; v_subject text; v_proto jsonb;
  v_answer text; v_facts jsonb; v_cross jsonb; v_specialists jsonb := '[]'::jsonb;
  v_gp jsonb; v_res jsonb; v_pack jsonb; v_value int;
begin
  -- flag gate (ללא שינוי)
  select enabled, test_visitor_id into v_en, v_tv from public.raziel_execution_flags where id=1;
  v_active := coalesce(v_en,false) or (v_tv is not null and p_visitor is not null and v_tv = p_visitor);
  if not v_active then
    return jsonb_build_object('enabled',false,'mode','disabled','note','flag OFF — מסלול ישן (fallback קנוני)',
      'cost',jsonb_build_object('used_llm',false,'tokens',0));
  end if;

  -- Phase A: capability/plan FIRST. fn_raziel_resolve (the gematria resolver) runs only for a plan
  -- classified gematria_expression; every other route never computes the sentence.
  v_plan   := public.fn_raziel_plan(p_question, p_context_type, p_user_ref);
  v_avail  := v_plan->>'availability';
  v_intent := v_plan->'protocol'->>'intent';
  v_class  := v_plan->>'capability_class';

  if v_class = 'gematria_expression' then
    v_res := public.fn_raziel_resolve(p_question, 'public', p_context_type);
    if coalesce((v_res->>'has_subject')::boolean,false) then
      v_subject := v_res->>'subject';
      v_pack    := v_res->'pack';
      v_value   := (v_res->>'value')::int;
      v_facts   := (select jsonb_agg(jsonb_build_object('label',k,'value',(val)::int) order by k)
                    from jsonb_each_text(v_pack->'stages'->'methods'->'evidence') e(k,val) where val ~ '^-?\d+$');
      v_answer  := v_subject||' = '||coalesce(v_pack->'stages'->'methods'->'evidence'->>'רגיל', v_value::text)
                   ||' (גימטריה רגילה — עובדה מאומתת במנוע).';
      select cross_check into v_cross from public.raziel_protocol_agents where intent='gematria' and enabled order by sort limit 1;
      return jsonb_build_object('enabled',true,'mode','deterministic','availability','available',
        'intent','gematria','subject',v_subject,'answer',v_answer,'facts',coalesce(v_facts,'[]'::jsonb),
        'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
        'expert_selected','gematria_engine',
        'source_agent','gematria_engine','source_fn','fn_gematria_pack','source_of_truth', v_res->>'source_of_truth',
        'expert_result', jsonb_build_object('gematria_pack', v_pack),
        'evidence', jsonb_build_object('gematria_pack', jsonb_build_object('source_of_truth', v_res->>'source_of_truth')),
        'specialists', jsonb_build_array(jsonb_build_object('agent_id','gematria','fn','fn_gematria_pack',
            'via','fn_raziel_resolve','ran',true,'ok',true,'source_of_truth', v_res->>'source_of_truth')),
        'cross_checks', jsonb_build_object('required',coalesce((v_cross->>'required')::boolean,false),'source',v_cross->>'with','performed',false,
            'reason', case when coalesce((v_cross->>'required')::boolean,false) then 'הצלבה נדרשת — לא בוצעה ולא הומצאה' else 'לא נדרשת' end),
        'needs_synthesis',false,'final_classification','deterministic_answer','synthesis',null,
        'trace', jsonb_build_object('question',left(coalesce(p_question,''),200),'intent','gematria',
            'capability_class',v_class,'gematria_form',v_plan->>'gematria_form',
            'resolver','fn_raziel_resolve → fn_gematria_pack (G1.3)','subject',v_subject,'value',v_value,
            'execution','executed(deterministic)','final_classification','deterministic_answer',
            'cost',jsonb_build_object('used_llm',false,'tokens',0),'synthesis',null),
        'cost', jsonb_build_object('used_llm',false,'tokens',0,'resolve_db_calls',(v_res->'cost'->>'db_calls')::int,'llm_calls',0));
    end if;
    -- has_subject=false → continues to the existing gematria protocol/clarification path below
  end if;

  -- truthful fallback: not a deterministic capability → ai-analyze continues with the existing Raziel persona/context
  if v_avail <> 'available' then
    return jsonb_build_object('enabled',true,'mode','fallback','availability',v_avail,'intent',v_intent,
      'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
      'reason', v_plan->>'reason','needs_synthesis', (v_avail = 'no_match'),'trace', v_plan->'trace',
      'cost',jsonb_build_object('used_llm',false,'tokens',0));
  end if;

  -- existing deterministic protocol path (ELS, and gematria when the resolver found no clean subject)
  v_subject := public.fn_raziel_extract_subject(p_question, v_intent);
  if v_subject is null then
    return jsonb_build_object('enabled',true,'mode','needs_clarification','availability',v_avail,'intent',v_intent,
      'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
      'reason','לא ניתן לחלץ subject דטרמיניסטי — נדרשת הבהרה / fallback','needs_synthesis',false,
      'trace', v_plan->'trace','cost',jsonb_build_object('used_llm',false,'tokens',0));
  end if;

  v_proto := public.fn_raziel_protocol(v_subject, v_intent, p_context_type, p_user_ref);
  select cross_check into v_cross from public.raziel_protocol_agents where intent=v_intent and enabled order by sort limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('agent_id',a->>'agent_id','stage',a->>'stage','fn',a->>'fn',
      'ran',(a->>'ran')::boolean,'ok',(a->>'ok')::boolean,'ms',(a->>'ms')::numeric,'error',a->>'error','empty',(a->>'empty')::boolean,
      'source_of_truth', v_proto->'provenance'->(a->>'output_key')->>'source_of_truth') order by (a->>'seq')::int),'[]'::jsonb)
    into v_specialists from jsonb_array_elements(v_proto->'agents') a;

  if v_intent='gematria' then
    v_gp     := v_proto->'findings'->'gematria_pack';
    v_facts  := (select jsonb_agg(jsonb_build_object('label',k,'value',(val)::int) order by k)
                 from jsonb_each_text(v_gp->'stages'->'methods'->'evidence') e(k,val) where val ~ '^-?\d+$');
    v_answer := v_subject||' = '||coalesce(v_gp->'stages'->'methods'->'evidence'->>'רגיל', v_gp->>'value','?')
                ||' (גימטריה רגילה — עובדה מאומתת במנוע).';
  elsif v_intent='els' then
    v_facts  := jsonb_build_array(
      jsonb_build_object('label','דילוגים','value', v_proto->'findings'->'els'->'els_count'),
      jsonb_build_object('label','דילוג מינימלי','value', v_proto->'findings'->'els'->'min_skip'));
    v_answer := '«'||v_subject||'» — נמצאו '||coalesce(v_proto->'findings'->'els'->>'els_count','0')||
                ' דילוגים בתורה (דילוג מינימלי '||coalesce(v_proto->'findings'->'els'->>'min_skip','?')||'). הצלבה נדרשת לאישור ממצא.';
  else v_answer := null; end if;

  return jsonb_build_object('enabled',true,'mode','deterministic','availability','available',
    'intent',v_intent,'subject',v_subject,'answer',v_answer,'facts',coalesce(v_facts,'[]'::jsonb),
    'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
    'expert_selected', v_plan->'candidate'->>'expert',
    'source_agent', v_specialists->0->>'agent_id','source_fn', v_specialists->0->>'fn','source_of_truth', v_specialists->0->>'source_of_truth',
    'expert_result', v_proto->'findings','evidence', v_proto->'provenance','specialists', v_specialists,
    'cross_checks', jsonb_build_object('required',coalesce((v_cross->>'required')::boolean,false),'source',v_cross->>'with','performed',false,
        'reason', case when coalesce((v_cross->>'required')::boolean,false) then 'הצלבה נדרשת — לא בוצעה ולא הומצאה' else 'לא נדרשת' end),
    'needs_synthesis',false,'final_classification','deterministic_answer','synthesis',null,
    'trace', jsonb_build_object('question',left(coalesce(p_question,''),200),'intent',v_intent,
        'expert_selected',v_plan->'candidate'->>'expert','permission_scope',v_plan->'permission'->>'expert_scope',
        'effective_scope',v_plan->'permission'->>'effective_scope','execution','executed(deterministic)',
        'expert_result',v_proto->'findings','evidence',v_proto->'provenance','cross_checks',v_cross,
        'final_classification','deterministic_answer','cost',jsonb_build_object('used_llm',false,'tokens',0),'synthesis',null),
    'cost', jsonb_build_object('used_llm',false,'tokens',0,'protocol_db_calls',(v_proto->'cost'->>'db_calls')::int,'llm_calls',0));
end $function$;
