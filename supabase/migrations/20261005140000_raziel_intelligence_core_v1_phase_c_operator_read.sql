-- RAZIEL_INTELLIGENCE_CORE_V1_PHASE_C — verified-identity operator READ capability classes (admin only), additive.
-- Owners: raziel_routing_law v2 (EXTEND_EXISTING fn_raziel_plan) · traffic_intelligence_law v11 · system_suggestions_law v5 ·
--   research_strategy_layer_law v17. Builds on Phase A (20261005130000); fn_raziel_answer is NOT redefined: its existing
--   fallback already returns capability_class/strategy/minimum_intelligence/trace, and the operator descriptor rides in trace.operator.
-- Fail direction: non-admin context never gets an operator descriptor (trace.operator_denied='admin_required' only) → ordinary
--   Raziel/general synthesis. The plan describes; it never executes and never reads admin data.
-- Not touched: fn_raziel_route/resolve/extract_subject, permission/effective_scope, flag gate, the global-routing flag (stays off),
--   model auto-selection, any table/policy/registry. No provider/model names.

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
  v_op jsonb := null; v_op_denied text := null;
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

  -- ▼ Phase C bounded operator READ grammar (admin only). Whole-sentence anchored forms: a public phrase that merely
  --   contains כמה / אתר / מערכת never matches. The plan only DESCRIBES the capability; execution happens in ai-analyze
  --   after tier=admin was verified from the caller JWT, and each owner RPC re-checks admin itself (auth.uid()/rd_is_admin).
  --   capability → owner: analytics_traffic → traffic_intelligence_law v11 (admin_traffic) ·
  --   system_live_state → system_suggestions_law v5 (admin_system_health; admin_ai_tokens for AI cost) ·
  --   research_intelligence → research_strategy_layer_law v17 (fn_raziel_research_intel_scoped).
  declare
    v_cap text; v_own text; v_cls text; v_mode text; v_days int; v_win text;
  begin
    if v_q ~ '^ כמה (אנשים|מבקרים|גולשים|משתמשים|כניסות) (נכנסו|ביקרו|נכנסים) (לאתר |באתר )?(היום|השבוע) $' then
      v_win := case when v_q ~ ' השבוע $' then 'week' else 'today' end;
      v_cap := 'traffic_count'; v_cls := 'analytics_traffic'; v_own := 'traffic_intelligence_law v11';
      v_mode := 'deterministic'; v_days := case when v_win = 'week' then 7 else 1 end;
    elsif v_q ~ '^ (מה )?(מצב|קורה) (ה)?תנועה( באתר)? $' or v_q ~ '^ מה מצב (ה)?תנועה $' then
      v_win := 'week'; v_cap := 'traffic_state'; v_cls := 'analytics_traffic'; v_own := 'traffic_intelligence_law v11';
      v_mode := 'synthesis'; v_days := 7;
    elsif v_q ~ '^ (מה קורה (עכשיו )?(באתר|במערכת)|מה מצב (ה)?(אתר|מערכת)|מצב (ה)?(מערכת|אתר)) $' then
      v_win := 'now'; v_cap := 'system_overview'; v_cls := 'system_live_state'; v_own := 'system_suggestions_law v5';
      v_mode := 'synthesis';
    elsif v_q ~ '^ (האם )?יש תקלות( באתר| במערכת)? $' then
      v_win := 'now'; v_cap := 'system_faults'; v_cls := 'system_live_state'; v_own := 'system_suggestions_law v5';
      v_mode := 'synthesis';
    elsif v_q ~ '^ כמה (עלה|עלתה|עלו) (ה)?(ai|איי איי|בינה מלאכותית) (השבוע|בשבוע האחרון)( באתר)? $' then
      v_win := 'week'; v_cap := 'ai_cost_week'; v_cls := 'system_live_state'; v_own := 'system_suggestions_law v5';
      v_mode := 'deterministic'; v_days := 7;
    elsif v_q ~ '^ מה כדאי (לי )?לחקור( לפי (ה)?ביקוש)? $' then
      v_win := '7d'; v_cap := 'research_demand'; v_cls := 'research_intelligence'; v_own := 'research_strategy_layer_law v17';
      v_mode := 'synthesis';
    end if;

    if v_cap is not null then
      if v_urank = 2 then
        v_op := jsonb_build_object('capability', v_cap, 'capability_class', v_cls, 'owner', v_own,
                  'window', v_win, 'days', v_days, 'answer_mode', v_mode, 'read_only', true);
      else
        v_op_denied := 'admin_required';   -- fail closed: ordinary Raziel/general synthesis, no admin data
      end if;
    end if;
  end;

  if v_op is not null then
    v_avail := 'operator_read';
    v_reason := 'יכולת-מפעיל (קריאה בלבד): '||(v_op->>'capability')||' → '||(v_op->>'owner');
    v_rejected := null; v_expert := null; v_ename := null; v_cand := null; v_pintent := null; v_pfn := null;
    v_pdet := null; v_ptok := null; v_allow := null; v_escope := null; v_eff := null; v_perm_ok := null;
  end if;

  -- ▼ Phase A bounded capability metadata (semantic, provider-agnostic; levels per raziel_routing_law §3)
  v_class := case
    when v_avail = 'available' and v_pintent = 'gematria' then 'gematria_expression'
    when v_avail = 'available' and v_pintent = 'els' then 'els_search'
    when v_avail = 'available' then 'registered_protocol'
    when v_avail = 'operator_read' then v_op->>'capability_class'
    when v_avail = 'no_match' then 'general_synthesis'
    else 'expert_unavailable' end;
  v_strategy := case
    when v_avail = 'operator_read' and v_op->>'answer_mode' = 'deterministic' then 'operator_read_deterministic'
    when v_avail = 'operator_read' then 'operator_read_synthesis'
    when v_avail = 'available' and coalesce(v_pdet,true) then 'deterministic_engine'
    else 'raziel_synthesis' end;
  v_minint := case when v_strategy in ('deterministic_engine','operator_read_deterministic') then 'L0_DETERMINISTIC' else 'L2_FAST' end;

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
    'operator', v_op,
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
        'note', 'PLAN בלבד — לא הופעל מומחה, לא נקרא מודל, לא ערוץ חי'),
    'trace', jsonb_build_object(
        'question', left(coalesce(p_question,''),200), 'intent', v_route->>'intent',
        'operator', v_op, 'operator_denied', v_op_denied,
        'candidate_expert', v_expert, 'rejected_candidate', v_rejected, 'reason', v_reason,
        'permission_scope', v_escope, 'effective_scope', v_eff,
        'protocol', v_pintent, 'availability', v_avail,
        'capability_class', v_class, 'strategy', v_strategy, 'minimum_intelligence', v_minint,
        'execution_plan', case when v_avail='available' then 'ready (not executed)' else v_avail end),
    'cost', jsonb_build_object('used_llm', false, 'tokens', 0, 'db_calls', 1),
    'generated_at', now());
end;
$function$;
