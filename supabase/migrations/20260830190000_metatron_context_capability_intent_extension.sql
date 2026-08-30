-- SINGLE-MIND TRUNK — FOUNDATION EXPANSION GATE: Context Capability / Intent Contract
--
-- Minimal additive extension to the EXISTING metatron_context(request) builder so it can be
-- capability-aware for a non-research consumer (ai-analyze kind="guide") WITHOUT injecting the
-- gematria/research rules block, and WITHOUT a second context builder/router/registry.
--
-- No new table, engine, router, graph, context store or agent. Reuses:
--   - metatron_context() itself (only function body replaced)
--   - site_services — the EXISTING, already-live capability/route registry (wa-raziel's
--     servicesText() already reads it). This migration does not touch site_services.
--
-- WHAT CHANGES
--   1. p_request MAY now carry an optional 'intent' string (e.g. 'navigation'). Absent/unrecognized
--      intent behaves EXACTLY as before this migration — this is the backward-compat guarantee.
--   2. When intent = 'navigation': the (~2-6KB) fn_active_method_rules() rules block is skipped —
--      it is gematria/research guidance irrelevant to a strict-JSON navigation router, and was the
--      concrete risk identified in PR #258 (breaking a fixed-schema output contract on a live,
--      frequently-used onboarding surface). Every other intent (including '', unset) is unaffected:
--      v_rules is still computed by fn_active_method_rules() exactly as before.
--   3. canonical.capabilities is now ALWAYS populated from site_services (active rows only, by
--      sort) — cheap (~14 rows), additive, ignorable by any consumer that doesn't read the key.
--      This lets a "site capabilities/navigation" package be sourced from ONE canonical place
--      instead of being hand-duplicated per consumer (the exact duplication this gate exists to
--      close). This migration does NOT rewire ai-analyze's kind="guide" route list to consume it —
--      site_services' route paths (e.g. "/numbers") do not 1:1 match guide's existing routing
--      contract (e.g. "/number/:n") and reconciling them is a product/routing decision, not a
--      Foundation patch; that remains an explicit EXTENSION POINT, reported separately.
--   4. The echoed `request` envelope now also reports `intent` (null when not sent) for traceability,
--      matching the existing pattern of echoing `ask`/`channel`/`values`.
--
-- WHY THIS IS SAFE (verification against source_truth_vs_context_builder)
--   metatron_context is a unification/retrieval layer, not a source of truth (nodes rule
--   source_truth_vs_context_builder). site_services already IS a source of truth (live, RLS'd,
--   read today by wa-raziel). Adding a read of an already-canonical table into the existing
--   builder does not create a new source of truth or a parallel one.
--
-- WHY THIS IS NOT APPLIED YET
--   metatron_context is live, core, SECURITY DEFINER infrastructure already serving production
--   Raziel traffic (wa-raziel's guardian-fallback path, and elsewhere). Per agent_onboarding_law
--   ("כתיבה לליבה דורשת אישור מפורש של צוריאל") and core_protection, this migration is committed
--   to the PR branch but intentionally NOT applied via apply_migration/execute_sql — it requires
--   explicit ZURIEL approval before it goes live, same as the rest of PR #258 (unmerged, undeployed).

CREATE OR REPLACE FUNCTION public.metatron_context(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ask text := coalesce(p_request->>'ask','');
  v_channel text := coalesce(p_request->>'channel','');
  v_intent text := lower(coalesce(p_request->>'intent',''));
  v_user_ref text := coalesce(p_request->'user'->>'ref','');
  v_user_name text := coalesce(p_request->'user'->>'name','');
  v_ent jsonb; v_val int; v_vals int[] := '{}'; v_labels text[] := '{}';
  v_targets jsonb := '[]'::jsonb; v_methods jsonb; v_valtext text[];
  v_canonical jsonb; v_personal jsonb; v_collective jsonb; v_suggestions jsonb;
  v_capabilities jsonb;
  v_rules text := '';
begin
  if jsonb_typeof(p_request->'entities') = 'array' then
    for v_ent in select * from jsonb_array_elements(p_request->'entities') loop
      declare
        e_type text := case when jsonb_typeof(v_ent)='object' then lower(coalesce(v_ent->>'type','')) else '' end;
        e_val  text := trim(case when jsonb_typeof(v_ent)='object' then coalesce(v_ent->>'value','') else coalesce(v_ent#>>'{}','') end);
      begin
        if e_val = '' then continue; end if;
        if e_val ~ '^\d+$' then v_val := e_val::int;
        else begin v_methods := public.fn_all_methods(e_val); exception when others then v_methods:=null; end;
             v_val := nullif(v_methods->>'רגיל','')::int;
             if length(e_val) >= 2 then v_labels := array_append(v_labels, e_val); end if;
        end if;
        if v_val is not null then v_vals := array_append(v_vals, v_val); end if;
        v_targets := v_targets || jsonb_build_array(jsonb_build_object('label',e_val,'type',e_type,'value',v_val));
      end; end loop;
  end if;

  -- ערכים מספריים מפורשים שסוכן מעביר (values: [878])
  if jsonb_typeof(p_request->'values') = 'array' then
    v_vals := v_vals || coalesce((select array_agg((x)::int)
       from jsonb_array_elements_text(p_request->'values') x where x ~ '^\d+$'),'{}');
  end if;

  -- 🔢 מספרים חופשיים בטקסט: ask + subject + תוויות-מילים (clean של הבוטים מוחק ספרות — כאן שולפים מהמקור)
  v_vals := v_vals || coalesce((
      select array_agg(distinct (m)[1]::int)
      from regexp_matches(
        concat_ws(' ', v_ask, coalesce(p_request->>'subject',''), array_to_string(v_labels,' ')),
        '\d{2,6}', 'g') m),'{}');

  v_vals := coalesce((select array_agg(distinct v) from unnest(v_vals) v where v between 1 and 999999),'{}');
  select array_agg(x::text) into v_valtext from unnest(v_vals) x;
  v_valtext := coalesce(v_valtext,'{}');

  -- 🧭 יכולות-האתר (canonical.capabilities) — תמיד, מ-site_services הקנוני (אותו מקור ש-wa-raziel
  -- כבר קורא ב-servicesText()). זול (~14 שורות), אדיטיבי, מתעלמים ממנו צרכנים שלא צריכים אותו.
  v_capabilities := coalesce((
      select jsonb_agg(jsonb_build_object('title',title,'description',description,'icon',icon,'url',url) order by sort)
      from site_services where active),'[]'::jsonb);

  -- 🧭 חוקי-המערכת (fn_active_method_rules) — לא-רלוונטיים ואף מסוכנים לחוזה-JSON-קשיח של ניווט
  -- (intent='navigation', כמו ai-analyze kind="guide"). כל intent אחר (כולל '' — כל הצרכנים הקיימים
  -- שלא שולחים intent) מקבל את חוקי-המערכת בדיוק כמו לפני migration זו.
  if v_intent <> 'navigation' then
    begin v_rules := public.fn_active_method_rules(); exception when others then v_rules := ''; end;
  end if;

  v_canonical := jsonb_build_object(
    'targets', v_targets,
    'capabilities', v_capabilities,
    'matches', coalesce((select jsonb_agg(jsonb_build_object('phrase',phrase,'value',ragil))
       from (select distinct phrase, ragil from gematria_words where ragil = any(v_vals) and is_verified and space='core' order by ragil limit 24) a),'[]'::jsonb),
    'convergences', coalesce((select jsonb_agg(jsonb_build_object('value',value,'group_size',group_size))
       from (select distinct value, group_size from convergences where value = any(v_vals) order by group_size desc limit 10) b),'[]'::jsonb),
    'definitions', coalesce((select jsonb_agg(jsonb_build_object('content',left(content,300)))
       from (select content, created_at from researcher_definitions where status in ('applied','ai_replied') order by created_at desc limit 5) c),'[]'::jsonb),
    'qa', coalesce((select jsonb_agg(jsonb_build_object('q',question,'a',left(answer,300)))
       from (select question, answer, created_at from post_qa where verified and vals::bigint[] && v_vals::bigint[] order by created_at desc limit 6) qq),'[]'::jsonb),
    'graph', coalesce((select jsonb_agg(jsonb_build_object('type',type,'label',label))
       from (select distinct type,label from nodes where is_active and type in ('insight','number','convergence','language_bridge')
             and (label = any(v_valtext) or metadata->>'value' = any(v_valtext)) limit 12) d),'[]'::jsonb),
    'engraved_facts', coalesce((select jsonb_agg(jsonb_build_object('statement',statement,'contributor',contributor))
       from (select statement, contributor, created_at from research_objects where status in ('approved','canonical') and privacy_scope = 'public_candidate' and value = any(v_vals) order by created_at desc limit 10) e),'[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('title',title,'slug',slug))
       from (select distinct title, slug from posts, unnest(v_labels) lb where length(lb)>=2 and title ilike '%'||lb||'%' limit 4) f),'[]'::jsonb)
  );

  v_personal := coalesce((select jsonb_build_object('name',display_name,'bio',left(coalesce(bio,''),200),
             'interests',dossier_settings->'interests','tags',tags)
    from contributors where (v_user_name<>'' and display_name ilike '%'||v_user_name||'%')
       or (v_user_ref ~ '\d' and phone = regexp_replace(v_user_ref,'[^0-9]','','g')) limit 1),'{}'::jsonb)
    || jsonb_build_object('numbers_worked', coalesce((
        select jsonb_agg(distinct value) from research_objects
        where value is not null and v_user_ref<>'' and owner_person_id in (select person_id from persons where account_user_id::text = v_user_ref)),'[]'::jsonb));

  v_collective := coalesce((select jsonb_agg(jsonb_build_object('value',value,'researchers',c,'sample',s))
    from (select value, count(distinct contributor) c, (array_agg(distinct contributor))[1:3] s
          from research_objects where value = any(v_vals) and privacy_scope = 'public_candidate' and contributor is not null
          group by value having count(distinct contributor) >= 2 order by c desc) g),'[]'::jsonb);

  v_suggestions := coalesce((select jsonb_agg(s) from (
      (select ('שאלה פתוחה: '||statement) s from research_objects where kind='question' and status='candidate' and privacy_scope = 'public_candidate' and value = any(v_vals) limit 3)
      union all
      (select ('במאגר יש עוד '||count(*)||' ביטויים מאומתים בערך '||ragil||' — שווה להצליב') s
        from gematria_words where ragil = any(v_vals) and is_verified and space='core' group by ragil having count(*)>3 limit 3)
    ) q),'[]'::jsonb);

  return jsonb_build_object(
    'request', jsonb_build_object('ask',left(v_ask,200),'channel',v_channel,'intent',nullif(v_intent,''),'values',to_jsonb(v_vals)),
    'canonical', v_canonical, 'personal', v_personal, 'collective', v_collective, 'suggestions', v_suggestions,
    'rules', v_rules,
    'context_version', jsonb_build_object(
        'rules_hash', substr(md5(coalesce(v_rules,'')),1,12),
        'rules_len', length(coalesce(v_rules,'')),
        'built_at', now()));
end; $function$;
