-- RAZIEL_NUMBER_ANALYSIS_COST_ROUTE_V1 — fn_raziel_route keyword matching: substring → token/phrase boundary.
-- DRIFT fixed: keyword «ספר» (sandalphon) matched inside «מספר», routing Number-analysis sentences to Sandalphon.
-- Scope: matching only. Permission scope (effective_scope = min(expert, user)), active=false exclusion, output shape
-- and raziel_config.shared.model_policy.routing_enabled are untouched (routing stays disabled globally).
-- Note: Hebrew attached prefixes (ב/ה/ו/ל…) are no longer implicit matches; add the prefixed form as an explicit keyword if wanted.

create or replace function public.fn_raziel_norm(p_text text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  -- lowercase; every run of non [a-z0-9 א-ת] (spaces, quotes, geresh, hyphens, punctuation) → one space; trimmed.
  select btrim(regexp_replace(lower(coalesce(p_text,'')), '[^a-z0-9א-ת]+', ' ', 'g'))
$$;

create or replace function public.fn_raziel_route(p_question text, p_context_type text default 'public_user'::text, p_user_ref text default null::text)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  with params as (
    select ' '||fn_raziel_norm(p_question)||' ' as q,
           lower(coalesce(p_context_type,'public_user')) as ct,
           case lower(coalesce(p_context_type,'public_user'))
             when 'admin' then 2 when 'authenticated_user' then 1 when 'whatsapp_user' then 1 else 0 end as urank
  ),
  matched as (
    select a.agent_id, a.name, a.capabilities, a.does_not, a.permission_scope, a.active,
      (select count(*) from unnest(a.match_keywords) kw, params p
         where fn_raziel_norm(kw) <> '' and position(' '||fn_raziel_norm(kw)||' ' in p.q) > 0) as score,
      (select array_agg(kw) from unnest(a.match_keywords) kw, params p
         where fn_raziel_norm(kw) <> '' and position(' '||fn_raziel_norm(kw)||' ' in p.q) > 0) as hits,
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
    'intent', case
        when (select count(*) from hit where active) = 0 then 'no_clear_match → Raziel base (בלי הפעלת מומחה)'
        when (select count(*) from hit where active) = 1 then 'single_domain'
        else 'multi_domain (הצלבה/פרשנות נדרשת)' end,
    'expert_selected', coalesce((select jsonb_agg(jsonb_build_object(
        'expert', agent_id, 'name', name, 'capability', capabilities, 'does_not', does_not,
        'permission_scope', permission_scope, 'effective_scope', effective_scope,
        'reason','capability-match: '||coalesce(array_to_string(hits,', '),'')) order by score desc)
       from hit where active), '[]'::jsonb),
    'candidates', coalesce((select jsonb_agg(jsonb_build_object('expert',agent_id,'match_score',score,'available',active) order by score desc) from hit), '[]'::jsonb),
    'unavailable_matched', coalesce((select jsonb_agg(jsonb_build_object('expert',agent_id,'name',name,'reason','matched אך active=false — קיים ב-Registry, טרם נבנה'))
        from hit where not active), '[]'::jsonb),
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
