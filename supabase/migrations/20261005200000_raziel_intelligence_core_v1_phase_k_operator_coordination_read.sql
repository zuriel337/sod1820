-- RAZIEL_INTELLIGENCE_CORE_V1_PHASE_K — operator coordination / attention READ (verified admin only). BRANCH_ONLY: NOT applied live.
-- EXTEND_EXISTING: only fn_raziel_plan is redefined (Phase H body + a Phase K block inside the existing Phase C operator grammar). fn_raziel_answer is NOT
-- redefined (operator descriptor already rides in trace.operator). No table/policy/registry/RPC is created or changed; the existing owner RPCs
-- admin_command_center / admin_agents_dashboard / get_work_log_current / admin_system_health are read by ai-analyze with the CALLER JWT (never service role);
-- each re-checks admin itself. Output bounding/projection is done in ai-analyze (allowlisted fields, max rows).
-- New operator capabilities (class operator_coordination | operator_attention): work_now, work_active, work_ready, work_today, agents_status (L0 deterministic),
--   attention (L2_FAST synthesis), live_external_state (L0 fixed answer, zero RPC: GitHub/Vercel/main live verification is NOT connected in this phase).
-- Non-admin: v_op_denied='admin_required' → ordinary synthesis, zero admin RPC calls. Global routing flag untouched (stays off).

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
  -- Phase G
  v_ge text; v_grx text; v_gc text; v_gdom jsonb := '[]'::jsonb; v_gcap jsonb := '[]'::jsonb; v_gxc boolean := false; v_toolset boolean := false;
  -- Phase H
  v_nc jsonb := null; v_ncx text; v_nct text; v_ncf text; v_ncd text; v_ncmode text; v_ncn text; v_nchead text; v_nctail text;
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
    -- ▼ Phase K coordination / attention READ grammar (admin only; whole-sentence anchored). work_log is Coordination/Provenance:
    --   these capabilities report what the coordination ledger SAYS, never merge/deploy/production truth.
    elsif v_q ~ '^ (על מה (אנחנו )?עובדים|מה (אנחנו )?עושים|על מה עובדים) (עכשיו|כרגע)? $' then
      v_win := 'now'; v_cap := 'work_now'; v_cls := 'operator_coordination'; v_own := 'inter_agent_coordination_law v13';
      v_mode := 'deterministic';
    elsif v_q ~ '^ (מה|אילו|אלו) (ה)?(משימות|מטלות) (ה)?(פעילות|פתוחות)( עכשיו| כרגע)? $' then
      v_win := 'now'; v_cap := 'work_active'; v_cls := 'operator_coordination'; v_own := 'inter_agent_coordination_law v13';
      v_mode := 'deterministic';
    elsif v_q ~ '^ (מה|אילו משימות|אילו) (מוכן|מוכנות|נדחה|נדחו|דחוי|דחויות|ממתין|ממתינות|מוכן או נדחה|מוכן ונדחה)( כרגע| עכשיו)? $' then
      v_win := 'now'; v_cap := 'work_ready'; v_cls := 'operator_coordination'; v_own := 'inter_agent_coordination_law v13';
      v_mode := 'deterministic';
    elsif v_q ~ '^ מה (השתנה|עודכן|קרה) היום( ביומן (ה)?(תיאום|עבודה))? $' then
      v_win := 'today'; v_cap := 'work_today'; v_cls := 'operator_coordination'; v_own := 'inter_agent_coordination_law v13';
      v_mode := 'deterministic';
    elsif v_q ~ '^ (אילו|מה) (ה)?(סוכנים|בוטים) (פעילים|רצים|קיימים)( עכשיו| כרגע)? $' then
      v_win := 'now'; v_cap := 'agents_status'; v_cls := 'operator_coordination'; v_own := 'system_suggestions_law v5';
      v_mode := 'deterministic';
    elsif v_q ~ '^ מה דורש (את )?(ה)?(תשומת לב|טיפול|החלטה)( שלי)?( עכשיו| כרגע)? $' then
      v_win := 'now'; v_cap := 'attention'; v_cls := 'operator_attention'; v_own := 'system_suggestions_law v5 + inter_agent_coordination_law v13';
      v_mode := 'synthesis';
    elsif v_q ~ '^ (מה )?(מצב|סטטוס) (ה)?(פריסה|דיפלוי|deploy|github|גיטהאב|vercel|ורסל|main|מיין|פרודקשן|production|ריפו) ?( עכשיו| כרגע)? $'
       or v_q ~ '^ מה (יש|קורה) (ב )?(main|מיין|github|גיטהאב|vercel|ורסל) $'
       or v_q ~ '^ (האם )?(זה |הגרסה |השינוי |הקוד )?(האחרון |האחרונה )?(נפרס|עלה|מוזג)( ל?פרודקשן| ל ?main| למיין)? $' then
      v_win := 'now'; v_cap := 'live_external_state'; v_cls := 'operator_coordination'; v_own := 'live_state_resolution_law v2';
      v_mode := 'deterministic';
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
  -- Phase G: source + gematria/ELS combination. ONLY entered when the question names the Tanakh source leg (route selected sandalphon, or an
  --   explicit [ו/ב]-prefixed «בתנ״ך»/«ובתנך» token). Any of the three registered read-only capabilities {gematria, els, tanakh_source} that the
  --   text explicitly names (prefixed forms «בגימטריה»/«ובדילוגים»/«ובתנך» included, which the token-exact route matcher misses) is added to the
  --   domain set — only when its agent is active, permitted, has an enabled allowlisted protocol. Committed only if it yields >=2 domains.
  --   Nothing outside {gematria_engine, els_cipher, sandalphon} is ever added; pure gematria+els questions never enter this block (Phase E path).
  if v_op is null and (v_dom ? 'sandalphon' or v_q ~ ' [וב]*(תנך|תנ ך) ') then
    for v_ge, v_grx in select t.e, t.rx from (values
        ('gematria_engine', ' [וב]*(גימטריה|גימטריא) ', 1),
        ('els_cipher',      ' [וב]*(דילוגים|דילוג|דילוגי) ', 2),
        ('sandalphon',      ' [וב]*(תנך|תנ ך) ', 3)) t(e, rx, o) order by t.o loop
      if not (v_dom ? v_ge) and v_q ~ v_grx then
        v_gc := null;
        select pa.intent into v_gc
        from public.agent_identity ai
        join public.raziel_protocol_agents pa on pa.expert_id = ai.agent_id and pa.enabled
        where ai.agent_id = v_ge and ai.active
          and (case ai.permission_scope when 'admin' then 2 when 'authenticated' then 1 else 0 end) <= v_urank
          and exists (select 1 from public.raziel_protocol_allowed_fns f where f.fn_name = pa.fn_name)
        order by pa.sort limit 1;
        if v_gc is not null then
          v_gdom := v_gdom || to_jsonb(v_ge); v_gcap := v_gcap || to_jsonb(v_gc);
          v_gxc := v_gxc or coalesce((select (pa.cross_check->>'required')::boolean from public.raziel_protocol_agents pa
                                       where pa.expert_id = v_ge and pa.enabled order by pa.sort limit 1), false);
        end if;
      end if;
    end loop;
    if jsonb_array_length(v_dom) + jsonb_array_length(v_gdom) >= 2 and jsonb_array_length(v_gdom) > 0 then
      v_dom := v_dom || v_gdom; v_caps := v_caps || v_gcap; v_ndom := jsonb_array_length(v_dom); v_xchk := v_xchk or v_gxc;
    end if;
  end if;
  -- Phase H: reality_number_context (bounded, WHOLE-SENTENCE anchored grammar over v_q = fn_raziel_norm(question); hyphen/quotes already → space).
  --   The only numeral that may become the anchor is the single explicit decimal inside one of these forms; a stray date/year/count elsewhere in a
  --   sentence makes the sentence NOT match. Pronoun forms never carry a number here (surface root is resolved in ai-analyze, bounded, never by a model).
  if v_op is null then
    v_ncx := '([0-9]+|זה|הוא|ה?מספר הזה|מספר זה)';
    v_nct := '( באתר| בכל האתר)? $';
    v_ncf := null;
    if v_q ~ ('^ (איפה|היכן) (עוד )?((מופיע|נמצא|מוזכר) )?(המספר )?'||v_ncx||'( עוד)? (מופיע|מופיעה|נמצא|נמצאת|מוזכר|מוזכרת)'||v_nct)
       or v_q ~ ('^ (איפה|היכן) (עוד )?(המספר )?'||v_ncx||' (מופיע|מופיעה|נמצא|נמצאת|מוזכר|מוזכרת) עוד'||v_nct)
       or v_q ~ ('^ מה (מחובר|מחוברת|קשור|קשורה|מקושר|מקושרת) (ל ?|אל )(המספר )?'||v_ncx||v_nct)
       or v_q ~ ('^ מה יש סביב (המספר )?'||v_ncx||v_nct)
       or v_q ~ ('^ (איזה|אילו) (פוסטים|טופיקים|נושאים|דפים)( או (פוסטים|טופיקים|נושאים|דפים))? (קשורים|מחוברים|מקושרים) (ל ?|אל )(המספר )?'||v_ncx||v_nct) then
      v_ncf := 'deterministic';
    elsif v_q ~ ('^ (מה|איך) (מעניין|המשמעות|משמעות|זה מתחבר|מתחבר|מתחברים) (ב ?|של |ל ?|עם |אל |לגבי )?(המספר )?'||v_ncx||v_nct)
       or v_q ~ ('^ איך (המספר )?'||v_ncx||' (מתחבר|מתחברת)'||v_nct)
       or v_q ~ ('^ מה המשמעות של (החיבורים|הקשרים|ההופעות) (של |ל ?)(המספר )?'||v_ncx||v_nct) then
      v_ncf := 'synthesis';
    end if;
    if v_ncf is not null then
      v_ncn := (regexp_match(v_q, '[0-9]+'))[1];
      if v_ncn is null then
        v_nc := jsonb_build_object('contract','number_context_v1','anchor','surface_root','number',null,'mode',v_ncf);
      elsif length(v_ncn) <= 6 and v_ncn::int >= 1 and (select count(distinct m[1]) from regexp_matches(v_q, '[0-9]+', 'g') m) = 1 then
        v_nc := jsonb_build_object('contract','number_context_v1','anchor','explicit','number',v_ncn::int,'mode',v_ncf);
      end if;   -- out-of-range / multiple distinct numerals → no number_context (fail closed)
    else
      -- Gematria + context: «<explicit gematria question> ואיפה עוד הוא מופיע באתר» — the gematria leg is the dependency that supplies the anchor.
      v_nctail := '( ו?(איפה|היכן) עוד (הוא|זה|המספר הזה|הערך הזה) (מופיע|נמצא|מוזכר)( באתר)?| ו?מה מחובר (אליו|לערך הזה|למספר הזה)( באתר)?) $';
      if v_q ~ v_nctail then
        v_nchead := btrim(regexp_replace(v_q, v_nctail, ''));
        if v_nchead !~ '[0-9]' and (v_nchead ~ ' [וב]*(גימטריה|גימטריא|חישוב)( |$)' or v_nchead ~ '^(מה )?(הערך|ערך) של ') then
          v_nc := jsonb_build_object('contract','number_context_v1','anchor','gematria_dependency','number',null,'mode','synthesis','gematria_head',v_nchead);
        end if;
      end if;
    end if;
    if v_nc is not null then v_nc := v_nc || jsonb_build_object('owner','reality_graph_law v8','read_only',true); end if;
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

  -- Phase H override (after every earlier classification): an explicit/anchored number-context question is its OWN capability, never a gematria/ELS/source one.
  if v_nc is not null then
    v_avail := 'number_context';
    v_reason := 'הקשר-מספר (קריאה בלבד): number_map + number_dossier_json → reality_graph_law v8 · עוגן='||(v_nc->>'anchor');
    v_rejected := null; v_expert := null; v_ename := null; v_cand := null; v_pintent := null; v_pfn := null;
    v_pdet := null; v_ptok := null; v_allow := null; v_escope := null; v_eff := null; v_perm_ok := null;
    v_gform := null; v_cmp := false; v_xchk := false;
    if v_nc->>'anchor' = 'gematria_dependency' then
      v_dom := '["gematria_engine"]'::jsonb; v_caps := '["gematria"]'::jsonb; v_ndom := 1; v_rint := 'single_domain';
    else
      v_dom := '[]'::jsonb; v_caps := '[]'::jsonb; v_ndom := 0; v_rint := 'no_clear_match';
    end if;
  end if;

  -- ▼ Phase A bounded capability metadata (semantic, provider-agnostic; levels per raziel_routing_law §3)
  v_class := case
    when v_avail = 'number_context' then 'reality_number_context'
    when v_avail = 'available' and v_pintent = 'gematria' then 'gematria_expression'
    when v_avail = 'available' and v_pintent = 'els' then 'els_search'
    when v_avail = 'available' and v_pintent = 'tanakh_source' then 'tanakh_source'
    when v_avail = 'available' then 'registered_protocol'
    when v_avail = 'operator_read' then v_op->>'capability_class'
    when v_avail in ('no_match','multi_domain_synthesis') then 'general_synthesis'
    else 'expert_unavailable' end;
  v_strategy := case
    when v_avail = 'number_context' and v_nc->>'mode' = 'deterministic' then 'number_context_deterministic'
    when v_avail = 'number_context' then 'number_context_synthesis'
    when v_avail = 'operator_read' and v_op->>'answer_mode' = 'deterministic' then 'operator_read_deterministic'
    when v_avail = 'operator_read' then 'operator_read_synthesis'
    when v_avail = 'available' and coalesce(v_pdet,true) then 'deterministic_engine'
    else 'raziel_synthesis' end;
  v_minint := case when v_strategy in ('deterministic_engine','operator_read_deterministic','number_context_deterministic') then 'L0_DETERMINISTIC' else 'L2_FAST' end;
  -- Phase G: a bounded multi-tool acquisition over exactly the registered read-only set {gematria, els, tanakh_source} is L4_TOOL_RESEARCH
  --   (synthesis target L3_DEEP). Any other multi-domain combination keeps the existing floor and executes nothing.
  v_toolset := v_avail = 'multi_domain_synthesis' and v_ndom between 2 and 3
               and not exists (select 1 from jsonb_array_elements_text(v_caps) c where c not in ('gematria','els','tanakh_source'));
  -- Phase H: gematria → reality dependency is the ONLY number_context form that is L4_TOOL_RESEARCH (explicitly combined with gematria).
  if v_avail = 'number_context' and v_nc->>'anchor' = 'gematria_dependency' then v_toolset := true; end if;
  if v_toolset then v_minint := 'L4_TOOL_RESEARCH'; end if;

  return jsonb_build_object(
    'plan_version', 2,
    'question', left(coalesce(p_question,''),200),
    'context_type', p_context_type,
    'user_context_rank', v_urank,
    'intent_class', v_route->>'intent',
    'capability_class', v_class,
    'strategy', v_strategy,
    'minimum_intelligence', v_minint,
    'synthesis_target', case when v_toolset then 'L3_DEEP' else null end,
    'gematria_form', v_gform,
    'route_intent', v_rint, 'route_intent_raw', v_rraw,
    'domains', v_dom, 'capabilities', v_caps,
    'compare_requested', v_cmp,
    'cross_check_required', v_xchk,
    'contradictory', false,
    'operator', v_op,
    'number_context', v_nc,
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
        'operator', v_op, 'operator_denied', v_op_denied, 'number_context', v_nc,
        'signals', jsonb_build_object('route_intent', v_rint, 'route_intent_raw', v_rraw, 'domains', v_dom, 'capabilities', v_caps,
            'compare_requested', v_cmp, 'cross_check_required', v_xchk, 'contradictory', false),
        'candidate_expert', v_expert, 'rejected_candidate', v_rejected, 'reason', v_reason,
        'permission_scope', v_escope, 'effective_scope', v_eff,
        'protocol', v_pintent, 'availability', v_avail,
        'capability_class', v_class, 'strategy', v_strategy, 'minimum_intelligence', v_minint,
        'synthesis_target', case when v_toolset then 'L3_DEEP' else null end,
        'execution_plan', case when v_avail='available' then 'ready (not executed)' else v_avail end),
    'cost', jsonb_build_object('used_llm', false, 'tokens', 0, 'db_calls', 1),
    'generated_at', now());
end;
$function$;
