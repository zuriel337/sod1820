-- RAZIEL_INTELLIGENCE_CORE_V1_PHASE_E — first bounded L4_TOOL_RESEARCH: Gematria + ELS only. ADDITIVE migration (BRANCH_ONLY: NOT applied live).
-- Owners: raziel_routing_law v2 · research_strategy_layer_law v17 · raziel_companion_layer_law v3 · ai_analyze_contract v2.
-- EXTEND_EXISTING. No new router/engine/agent/store/table. fn_gematria_pack / fn_els_search / fn_raziel_protocol / fn_raziel_route /
--   fn_raziel_extract_subject are NOT changed. Two existing functions are re-declared (earlier migrations are not edited):
--   1) fn_raziel_plan  = Phase D2 body + ONE additive step: a vav-prefixed partner («...ודילוגים», «...וגימטריה») of an already-selected
--      gematria/els domain is counted when the partner agent is active+enabled+allowlisted+permitted (the keyword matcher is token-exact).
--   2) fn_raziel_answer = Phase A body + ONE early branch for availability='multi_domain_synthesis':
--        · capabilities exactly {gematria, els} (domains {gematria_engine, els_cipher}) → run each existing fn_raziel_protocol path ONCE
--          against ONE clean subject; return mode='tool_research' (specialists[], findings_by_capability, evidence_by_capability,
--          tool_status, cross_checks, needs_synthesis=true). Each tool keeps its own provenance; no facts are merged or canonicalized.
--        · no single clean subject → needs_clarification, ZERO tools.
--        · any other multi-domain combination → fallback general synthesis, ZERO tools, with an honest tool_availability list.
--   Partial failure: per-tool status ok|empty|failed; overall complete|partial|failed. Nothing is fabricated.
--   Subject cleaning: the existing extractor drops stop-words but not vav-prefixed capability words («ודילוגים»), so the other capability
--   word is removed here; a subject that still contains conjunction/second-subject words, or >3 words, is NOT clean → zero tools.
--   Read-only: no writes, no research_intel, no Sandalphon/source, no external web. Semantic level = L4_TOOL_RESEARCH; the synthesis
--   model intelligence = L3_DEEP (recorded separately in trace).

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
  v_vgem boolean; v_vels boolean; v_add text; v_addcap text;
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
  -- Phase E: «גימטריה ודילוגים» — a vav-prefixed conjunct (ו+מילת-מפתח) is the SAME capability word; the route keyword matcher is
  --   token-boundary exact and so misses «ודילוגים»/«וגימטריה». Only the partner of an already-selected, permitted, gate-passing
  --   gematria/els domain is added, and only when that partner agent is active, enabled, allowlisted and permitted. Nothing else.
  v_vgem := v_q ~ ' ו(גימטריה|גימטריא) ';
  v_vels := v_q ~ ' ו(דילוגים|דילוג|דילוגי) ';
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
    if v_ndom = 1 then
      v_add := case when v_dom->>0 = 'gematria_engine' and v_vels then 'els_cipher'
                    when v_dom->>0 = 'els_cipher' and v_vgem then 'gematria_engine' end;
      if v_add is not null then
        select pa.intent into v_addcap
        from public.agent_identity ai
        join public.raziel_protocol_agents pa on pa.expert_id = ai.agent_id and pa.enabled
        where ai.agent_id = v_add and ai.active
          and (case ai.permission_scope when 'admin' then 2 when 'authenticated' then 1 else 0 end) <= v_urank
          and exists (select 1 from public.raziel_protocol_allowed_fns f where f.fn_name = pa.fn_name)
        order by pa.sort limit 1;
        if v_addcap is not null then
          v_dom := v_dom || to_jsonb(v_add); v_caps := v_caps || to_jsonb(v_addcap); v_ndom := 2;
          v_xchk := v_xchk or coalesce((select (pa.cross_check->>'required')::boolean from public.raziel_protocol_agents pa
                                         where pa.expert_id = v_add and pa.enabled order by pa.sort limit 1), false);
        end if;
      end if;
    end if;
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
  -- Phase E
  v_caps jsonb; v_doms jsonb; v_raw text; v_i text; v_t0 timestamptz; v_err text; v_f jsonb; v_st text; v_nok int := 0; v_nrun int := 0;
  v_spec jsonb := '[]'::jsonb; v_fbc jsonb := '{}'::jsonb; v_ebc jsonb := '{}'::jsonb; v_tst jsonb := '{}'::jsonb; v_tms jsonb := '{}'::jsonb;
  v_all text; v_xreq boolean; v_overall text; v_sp1 jsonb;
begin
  -- flag gate (unchanged)
  select enabled, test_visitor_id into v_en, v_tv from public.raziel_execution_flags where id=1;
  v_active := coalesce(v_en,false) or (v_tv is not null and p_visitor is not null and v_tv = p_visitor);
  if not v_active then
    return jsonb_build_object('enabled',false,'mode','disabled','note','flag OFF — מסלול ישן (fallback קנוני)',
      'cost',jsonb_build_object('used_llm',false,'tokens',0));
  end if;

  v_plan   := public.fn_raziel_plan(p_question, p_context_type, p_user_ref);
  v_avail  := v_plan->>'availability';
  v_intent := v_plan->'protocol'->>'intent';
  v_class  := v_plan->>'capability_class';

  -- ▼ Phase E — multi-domain: the ONLY multi-tool path. Decided before the gematria resolver so nothing else can run first.
  if v_avail = 'multi_domain_synthesis' then
    v_caps := coalesce(v_plan->'capabilities','[]'::jsonb);
    v_doms := coalesce(v_plan->'domains','[]'::jsonb);
    if not (jsonb_array_length(v_caps) = 2 and v_caps @> '["gematria","els"]'::jsonb
            and jsonb_array_length(v_doms) = 2 and v_doms @> '["gematria_engine","els_cipher"]'::jsonb) then
      -- unsupported combination: no tool of ANY kind is executed; honest list of what was asked vs what exists
      return jsonb_build_object('enabled',true,'mode','fallback','availability',v_avail,'intent',v_intent,
        'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
        'reason', v_plan->>'reason','needs_synthesis',false,
        'tool_availability', jsonb_build_object('supported_combination','gematria+els','executed','[]'::jsonb,'requested',v_caps,
            'registered_but_not_combined', coalesce((select jsonb_agg(c) from jsonb_array_elements_text(v_caps) c where c in ('gematria','els')),'[]'::jsonb),
            'unavailable', coalesce((select jsonb_agg(c) from jsonb_array_elements_text(v_caps) c where c not in ('gematria','els')),'[]'::jsonb),
            'note','שילוב לא נתמך להרצת כלים — לא הורץ שום כלי'),
        'trace', v_plan->'trace','cost',jsonb_build_object('used_llm',false,'tokens',0));
    end if;

    -- one clean subject, from the existing extractor, after capability classification
    v_raw := public.fn_raziel_extract_subject(p_question, 'gematria');
    if v_raw is not null then
      select nullif(btrim(string_agg(w, ' ' order by o)), '') into v_subject
      from unnest(regexp_split_to_array(v_raw, '\s+')) with ordinality t(w, o)
      where w !~ '^ו?(גימטריה|גימטריא|הגימטריה|בגימטריה|דילוגים|דילוג|דילוגי|אותיות|בתורה|בצופן|גם)$';
      if v_subject is not null and (array_length(regexp_split_to_array(v_subject,'\s+'),1) > 3
         or exists (select 1 from unnest(regexp_split_to_array(v_subject,'\s+')) w
                    where w in ('ושל','או','ביחד','לעומת','מול','עם','בין','ובין','ו','וגם'))) then
        v_subject := null;
      end if;
    end if;
    if v_subject is null then
      return jsonb_build_object('enabled',true,'mode','needs_clarification','availability',v_avail,'intent','multi_domain',
        'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
        'reason','שאלה רב-תחומית ללא נושא יחיד ונקי — לא הורץ שום כלי; נדרשת הבהרה','needs_synthesis',false,
        'tool_availability', jsonb_build_object('supported_combination','gematria+els','executed','[]'::jsonb,'requested',v_caps),
        'trace', v_plan->'trace','cost',jsonb_build_object('used_llm',false,'tokens',0));
    end if;

    -- run each existing deterministic protocol path exactly once (fixed order); failures are explicit, never fabricated
    foreach v_i in array array['gematria','els'] loop
      v_t0 := clock_timestamp(); v_proto := null; v_err := null;
      begin v_proto := public.fn_raziel_protocol(v_subject, v_i, p_context_type, p_user_ref);
      exception when others then v_proto := null; v_err := left(sqlerrm, 160); end;
      v_nrun := v_nrun + 1;
      v_f := case v_i when 'gematria' then v_proto->'findings'->'gematria_pack' else v_proto->'findings'->'els' end;
      v_st := case
        when v_proto is null then 'failed'
        when v_proto ? 'error' then 'failed'
        when coalesce((v_proto->'plan'->>'no_match')::boolean,false) or v_proto->'agents' = '[]'::jsonb then 'unavailable'
        when exists (select 1 from jsonb_array_elements(v_proto->'agents') a where coalesce((a->>'ok')::boolean,false) = false) then 'failed'
        when v_f is null or v_f = 'null'::jsonb or v_f = '{}'::jsonb
          or exists (select 1 from jsonb_array_elements(v_proto->'agents') a where coalesce((a->>'empty')::boolean,false)) then 'empty'
        else 'ok' end;
      if v_st = 'ok' then v_nok := v_nok + 1; end if;
      v_tst := v_tst || jsonb_build_object(v_i, v_st);
      v_tms := v_tms || jsonb_build_object(v_i, round(extract(epoch from (clock_timestamp() - v_t0))*1000));
      v_sp1 := coalesce((select jsonb_agg(jsonb_build_object('agent_id',a->>'agent_id','stage',a->>'stage','fn',a->>'fn',
                 'ran',(a->>'ran')::boolean,'ok',(a->>'ok')::boolean,'ms',(a->>'ms')::numeric,'error',a->>'error','empty',(a->>'empty')::boolean,
                 'source_of_truth', v_proto->'provenance'->(a->>'output_key')->>'source_of_truth') order by (a->>'seq')::int)
               from jsonb_array_elements(coalesce(v_proto->'agents','[]'::jsonb)) a), '[]'::jsonb);
      v_spec := v_spec || jsonb_build_array(jsonb_build_object('capability', v_i, 'status', v_st, 'error', v_err,
                 'ms', (v_tms->>v_i)::numeric, 'agents', v_sp1, 'cost', v_proto->'cost'));
      -- bounded projections (the full pack stays in the owner function; provenance is kept per tool, unmerged)
      if v_st in ('ok','empty') then
        v_fbc := v_fbc || jsonb_build_object(v_i, case v_i
          when 'gematria' then jsonb_build_object('value', v_f->'value', 'methods_evidence', v_f->'stages'->'methods'->'evidence',
                 'stages_found', v_f->'trace'->'stages_found', 'pack', v_f->'pack')
          else jsonb_build_object('term', v_f->'term', 'els_count', v_f->'els_count', 'min_skip', v_f->'min_skip', 'coverage', v_f->'coverage',
                 'truncated', v_f->'truncated', 'scope', v_f->'scope', 'searched_maxskip', v_f->'searched_maxskip', 'corpus_id', v_f->'corpus_id',
                 'hits_sample', coalesce((select jsonb_agg(h) from (select h from jsonb_array_elements(coalesce(v_f->'hits','[]'::jsonb)) h limit 5) s),'[]'::jsonb))
          end);
        v_ebc := v_ebc || jsonb_build_object(v_i, v_proto->'provenance');
      end if;
    end loop;

    select (cross_check->>'required')::boolean into v_xreq from public.raziel_protocol_agents where intent='els' and enabled order by sort limit 1;
    v_overall := case when v_nok = v_nrun then 'complete' when v_nok = 0 then 'failed' else 'partial' end;

    return jsonb_build_object('enabled',true,'mode','tool_research','availability',v_avail,'intent','multi_domain',
      'capability_class',v_class,'strategy',v_plan->>'strategy','minimum_intelligence',v_plan->>'minimum_intelligence',
      'subject',v_subject,'status',v_overall,'needs_synthesis',true,
      'reason','L4_TOOL_RESEARCH: גימטריה + דילוגים הורצו (פרוטוקולים דטרמיניסטיים קיימים) — נדרשת סינתזה',
      'tool_research', jsonb_build_object('contract','tool_research_v1','status',v_overall,'subject',v_subject,
          'specialists',v_spec,'findings_by_capability',v_fbc,'evidence_by_capability',v_ebc,'tool_status',v_tst,
          'cross_checks', jsonb_build_object('required',coalesce(v_xreq,false),'performed',false,
              'reason','שני כלים עצמאיים הורצו; לא בוצעה הצלבה ולא נוצרה טענה קנונית חדשה'),
          'needs_synthesis',true),
      'specialists', v_spec, 'findings_by_capability', v_fbc, 'evidence_by_capability', v_ebc,
      'cross_checks', jsonb_build_object('required',coalesce(v_xreq,false),'performed',false,
          'reason','שני כלים עצמאיים הורצו; לא בוצעה הצלבה ולא נוצרה טענה קנונית חדשה'),
      'trace', coalesce(v_plan->'trace','{}'::jsonb) || jsonb_build_object('selected_semantic_level','L4_TOOL_RESEARCH',
          'synthesis_intelligence','L3_DEEP','tools_executed',v_nrun,'tool_status',v_tst,'tool_ms',v_tms,
          'execution','executed(deterministic x2) → synthesis','subject',v_subject),
      'cost', jsonb_build_object('used_llm',false,'tokens',0,'tool_calls',v_nrun,'llm_calls',0));
  end if;

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
