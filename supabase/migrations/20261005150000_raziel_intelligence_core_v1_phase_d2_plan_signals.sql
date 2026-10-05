-- RAZIEL_INTELLIGENCE_CORE_V1_PHASE_D2 — conservative plan-side intelligence signals, additive (EXTEND_EXISTING fn_raziel_plan).
-- Owners: raziel_routing_law v2 · research_strategy_layer_law v17. Builds on Phase A/C (applied-candidate migrations are NOT edited);
--   this is a new migration that re-declares fn_raziel_plan = Phase C body + signal fields. fn_raziel_answer is NOT redefined:
--   the signals ride in trace.signals through its existing fallback `trace`, and at top level of the plan.
-- Signals (metadata only, provider/model-agnostic, no model selection):
--   route_intent        fn_raziel_route intent token (single_domain|multi_domain|no_clear_match); multi_domain is emitted only when
--                       >1 permitted, active, gate-passing selected capabilities exist (route_intent_raw keeps the raw route token).
--   domains/capabilities  derived ONLY from active expert_selected entries of fn_raziel_route (permission_scope <= user rank;
--                       a gematria keyword that fails the Phase A question-form gate is not a domain). Several keywords for one agent = 1 domain.
--   compare_requested   tightly bounded Hebrew/English compare/relationship grammar; alone it never forces L3 (selector needs >1 domains).
--   cross_check_required  only when a selected domain's registered protocol already declares cross_check.required=true.
--   contradictory       always false here: no structured contradiction evidence exists at plan time; never inferred from wording.
-- >1 domains ⇒ one deterministic engine cannot truthfully answer the whole question: availability='multi_domain_synthesis',
--   capability_class general_synthesis, L2 floor, no expert candidate, no execution (Raziel synthesis; selector may raise to L3).
-- Unchanged: gematria question-form gate, operator admin grammar, permission/effective_scope, inactive-agent fail-closed, flag gate.

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
  v_dom jsonb := '[]'::jsonb; v_caps jsonb := '[]'::jsonb; v_ndom int := 0; v_cmp boolean := false; v_xchk boolean := false;
  v_rint text; v_rraw text; v_gok boolean;
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
  --   capability → owner: analytics_traffic → traffic_intelligence_law v11 (admin_entries_daily / admin_traffic_insights over traffic_daily) ·
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

  -- ▼ Phase D2 plan-side intelligence signals (metadata only; see header). Domains come only from active expert_selected entries.
  v_gok := (v_q ~ ' (גימטריה|גימטריא|חישוב) ' or v_q ~ ' (שווה|שוה) כמה $' or v_q ~ '^ (מה )?(הערך|ערך) של '
            or (v_q ~ '^ כמה (זה|זהו|הוא|היא|זו) ' and v_q !~ ' (אנשים|משתמשים|מבקרים|נכנסו|פוסטים|עולה|עולים|עולות|זמן|כסף|פעמים|יש|קוראים) '));
  if v_op is null then
    select coalesce(jsonb_agg(x.ex order by x.ord), '[]'::jsonb),
           coalesce(jsonb_agg(coalesce(x.pintent, x.ex) order by x.ord), '[]'::jsonb),
           count(*)::int,
           coalesce(bool_or(x.xreq), false)
      into v_dom, v_caps, v_ndom, v_xchk
    from (
      select e.ex, e.ord, p.pintent, p.xreq
      from (select s.e->>'expert' as ex, s.e->>'permission_scope' as sc, s.ord
              from jsonb_array_elements(v_sel) with ordinality s(e, ord)) e
      left join lateral (
        select pa.intent as pintent, coalesce((pa.cross_check->>'required')::boolean, false) as xreq
        from public.raziel_protocol_agents pa where pa.expert_id = e.ex and pa.enabled order by pa.sort limit 1) p on true
      where (case e.sc when 'admin' then 2 when 'authenticated' then 1 else 0 end) <= v_urank
        and not (coalesce(p.pintent,'') = 'gematria' and not v_gok)
    ) x;
    -- cross-check evidence only for the selected registered protocol(s); never without >=1 selected domain
    if v_ndom = 0 then v_xchk := false; end if;
  end if;
  v_cmp := v_q ~ ' (השווה|השוואה|לעומת|מול|compare|comparison|relationship) ' or v_q ~ ' מה הקשר בין ';
  v_rraw := case when coalesce(v_route->>'intent','') like 'multi_domain%' then 'multi_domain'
                 when coalesce(v_route->>'intent','') like 'single_domain%' then 'single_domain'
                 else 'no_clear_match' end;
  v_rint := case when v_ndom > 1 then 'multi_domain' when v_ndom = 1 then 'single_domain' else 'no_clear_match' end;

  if v_ndom > 1 then
    v_avail := 'multi_domain_synthesis';
    v_reason := 'שאלה רב-תחומית ('||(select string_agg(d,', ') from jsonb_array_elements_text(v_dom) d)||') — מנוע בודד אינו עונה על כולה → Raziel synthesis (לא הופעל מומחה)';
    v_rejected := null; v_expert := null; v_ename := null; v_cand := null; v_pintent := null; v_pfn := null;
    v_pdet := null; v_ptok := null; v_allow := null; v_escope := null; v_eff := null; v_perm_ok := null;
  end if;

  -- ▼ Phase A bounded capability metadata (semantic, provider-agnostic; levels per raziel_routing_law §3)
  v_class := case
    when v_avail = 'available' and v_pintent = 'gematria' then 'gematria_expression'
    when v_avail = 'available' and v_pintent = 'els' then 'els_search'
    when v_avail = 'available' then 'registered_protocol'
    when v_avail = 'operator_read' then v_op->>'capability_class'
    when v_avail in ('no_match','multi_domain_synthesis') then 'general_synthesis'
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
    'route_intent', v_rint, 'route_intent_raw', v_rraw,
    'domains', v_dom, 'capabilities', v_caps,
    'compare_requested', v_cmp,
    'cross_check_required', v_xchk,
    'contradictory', false,
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
        'signals', jsonb_build_object('route_intent', v_rint, 'route_intent_raw', v_rraw, 'domains', v_dom, 'capabilities', v_caps,
            'compare_requested', v_cmp, 'cross_check_required', v_xchk, 'contradictory', false),
        'candidate_expert', v_expert, 'rejected_candidate', v_rejected, 'reason', v_reason,
        'permission_scope', v_escope, 'effective_scope', v_eff,
        'protocol', v_pintent, 'availability', v_avail,
        'capability_class', v_class, 'strategy', v_strategy, 'minimum_intelligence', v_minint,
        'execution_plan', case when v_avail='available' then 'ready (not executed)' else v_avail end),
    'cost', jsonb_build_object('used_llm', false, 'tokens', 0, 'db_calls', 1),
    'generated_at', now());
end;
$function$;
