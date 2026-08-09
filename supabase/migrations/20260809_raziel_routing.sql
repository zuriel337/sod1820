-- ============================================================================
-- רזיאל · Routing — חוזה-ניתוב קשיח + Trace + gating (Freeze-safe · לא-מחובר)
-- ----------------------------------------------------------------------------
-- חוזה קשיח: question → intent → expert_selected → scoped_call → expert_result
--            → cross_check → Raziel synthesis.  (לא: רזיאל מחליט לבד ומספר סיפור)
-- חוקים:
--   · אין הפעלה בלי התאמה ברורה ל-capability (no match → רזיאל מבסיס, בלי מומחה).
--   · effective_scope = min(expert.permission_scope, user.context_type) — נאכף
--     בשכבת-הנתונים (חוק בלתי-עקיף), לא הנחיית-prompt.
--   · מומחה active=false (הצופן-בגדול) לעולם לא נבחר — מסומן «קיים אך טרם נבנה».
-- fn_raziel_route מפיקה את החלטת-הניתוב + שלד-ה-Trace. שדות expert_result/
--   evidence/cross_checks/final_classification מתמלאים בזמן-ההפעלה ע״י רזיאל.
-- ⛔ לא מחובר לאף ערוץ עדיין (map/decide-only).
-- ============================================================================

-- תיקון התנגשות-מילים (audit): «צופן» גנרי מדי ל-ELS → «צופן בגדול» הפעיל ELS בטעות.
-- ELS = דילוגים בלבד; big_letter_cipher = «צופן בגדול» (ביטוי ספציפי).
update public.agent_identity set match_keywords = array['דילוג','דילוגים','els','דילוגי אותיות','דילוגי-אותיות'] where agent_id='els_cipher';
update public.agent_identity set match_keywords = array['צופן בגדול','בצופן בגדול','שיטת הגדול','צופן-בגדול'] where agent_id='big_letter_cipher';

create or replace function public.fn_raziel_route(
  p_question text,
  p_context_type text default 'public_user',
  p_user_ref text default null
) returns jsonb
  language sql stable security definer set search_path to 'public'
as $function$
  with params as (
    select lower(coalesce(p_question,'')) as q,
           lower(coalesce(p_context_type,'public_user')) as ct,
           case lower(coalesce(p_context_type,'public_user'))
             when 'admin' then 2 when 'authenticated_user' then 1 when 'whatsapp_user' then 1 else 0 end as urank
  ),
  matched as (
    select a.agent_id, a.name, a.capabilities, a.does_not, a.permission_scope, a.active,
      (select count(*) from unnest(a.match_keywords) kw, params p where p.q like '%'||lower(kw)||'%') as score,
      (select array_agg(kw) from unnest(a.match_keywords) kw, params p where p.q like '%'||lower(kw)||'%') as hits,
      case a.permission_scope when 'admin' then 2 when 'authenticated' then 1 else 0 end as prank
    from agent_identity a
    where a.capabilities is not null and a.layer in ('engine','expert','interpretive')
  ),
  hit as (
    select m.*, (select urank from params) as urank,
      case least(m.prank, (select urank from params)) when 2 then 'admin' when 1 then 'authenticated' else 'public' end as effective_scope
    from matched m where m.score > 0
  )
  select jsonb_build_object(
    'contract','question → intent → expert_selected → scoped_call → expert_result → cross_check → Raziel synthesis',
    'question', left(coalesce(p_question,''),200),
    'context_type', (select ct from params),
    -- intent: כמה מומחים-זמינים תואמים
    'intent', case
        when (select count(*) from hit where active) = 0 then 'no_clear_match → Raziel base (בלי הפעלת מומחה)'
        when (select count(*) from hit where active) = 1 then 'single_domain'
        else 'multi_domain (הצלבה/פרשנות נדרשת)' end,
    -- מומחים-נבחרים (זמינים בלבד) + effective_scope נאכף
    'expert_selected', coalesce((select jsonb_agg(jsonb_build_object(
        'expert', agent_id, 'name', name, 'capability', capabilities, 'does_not', does_not,
        'permission_scope', permission_scope, 'effective_scope', effective_scope,
        'reason','capability-match: '||coalesce(array_to_string(hits,', '),'')) order by score desc)
       from hit where active), '[]'::jsonb),
    -- candidates (כולל שקילה) — לשקיפות
    'candidates', coalesce((select jsonb_agg(jsonb_build_object('expert',agent_id,'match_score',score,'available',active) order by score desc) from hit), '[]'::jsonb),
    -- מומחים שתאמו אך אינם פעילים (הצופן-בגדול) — «קיים, טרם נבנה»
    'unavailable_matched', coalesce((select jsonb_agg(jsonb_build_object('expert',agent_id,'name',name,'reason','matched אך active=false — קיים ב-Registry, טרם נבנה'))
        from hit where not active), '[]'::jsonb),
    -- שלד-Trace: מתמלא בזמן-הפעלה
    'trace_skeleton', jsonb_build_object(
       'intent', null, 'expert_selected', null, 'reason', null,
       'permission_scope', null, 'effective_scope', null, 'input', null,
       'expert_result', null, 'evidence', null, 'cross_checks', null, 'final_classification', null),
    'laws', jsonb_build_object(
       'no_invoke_without_match','אין הפעלה בלי התאמה ברורה ל-capability',
       'no_escalation','effective_scope = min(expert.permission_scope, user.context_type) — נאכף כאן',
       'big_cipher','active=false → לעולם לא נבחר'),
    'generated_at', now()
  )
$function$;
comment on function public.fn_raziel_route(text,text,text) is
  'רזיאל Routing — החלטת-ניתוב + Trace + capability-gating + min-scope. לא-מחובר (decide-only).';

-- config v9 + חוק-ניתוב
update public.raziel_config set
  config_version = 9, updated_at = now(),
  note = 'Routing — חוזה קשיח + Trace + gating (decide-only, לא-מחובר).',
  config = config || jsonb_build_object(
    'routing', jsonb_build_object(
      'function','fn_raziel_route',
      'contract', jsonb_build_array('question','intent','expert_selected','scoped_call','expert_result','cross_check','raziel_synthesis'),
      'trace_fields', jsonb_build_array('intent','expert_selected','reason','permission_scope','effective_scope','input','expert_result','evidence','cross_checks','final_classification'),
      'law_no_invoke_without_match', true,
      'law_no_escalation','effective = min(expert.permission_scope, user.context_type)',
      'big_cipher_stays_off_until','routing+trace audit passed',
      'wiring_status','decide_only'))
  where id = 1;

insert into public.nodes (type, rule_id, label, description, is_active, metadata)
values ('rule','raziel_routing_law','רזיאל Routing — חוזה קשיח + Trace + gating',
  'ניתוב בחוזה קשיח בלבד: question→intent→expert_selected→scoped_call→expert_result→cross_check→Raziel synthesis. אסור «רזיאל מחליט לבד ומפעיל כמה סוכנים ומספר סיפור». חוק: אין הפעלת מומחה בלי התאמה ברורה ל-capability; אם אין match — רזיאל עונה מבסיס-הידע ולא מפעיל סתם. שאלה דו-משמעית («האם 390 חזק?») → רזיאל מזהה שהיא יכולה להיות מחקר/ביקוש/חוזק/ידע ובוחר את הכלים הרלוונטיים; שאלה חד-משמעית («דילוגים של X»)→ELS. effective_scope=min(expert.permission_scope,user.context_type) — חוק בלתי-עקיף בשכבת-הנתונים. כל הפעלה שומרת Trace מלא (intent/expert_selected/reason/permission_scope/effective_scope/input/expert_result/evidence/cross_checks/final_classification) → «למה הפעלת את X?» ניתן-לשחזור. הצופן-בגדול (active=false) לא נבחר עד ש-Routing+Trace עוברים audit.',
  true,
  jsonb_build_object('wiring_status','decide_only','function','fn_raziel_route'))
on conflict do nothing;
