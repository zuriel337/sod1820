-- 🕎 metatron_context(request) — שער-שליפה יחיד (חוק העץ האחד: שער-שליפה אחד לכל צרכני-הידע).
-- הוחל ב-DB 23.7.2026; קובץ לתיעוד/שחזור. גרסה סופית: מקבל *בקשת-מחקר* שלמה (לא נושא בודד),
-- מזהה ישויות (שם/מספר/תאריך), ומחזיר תמיד 4 חבילות: Canonical · Personal · Collective · Suggestions.
-- ה-AI הוא השלב האחרון (מקבל Evidence Pack), לא הראשון. שיפור השער פעם אחת = כל הסוכנים/האתר/הערוצים נהנים מיד.
drop function if exists public.metatron_context(text, text);

create or replace function public.metatron_context(p_request jsonb)
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_ask text := coalesce(p_request->>'ask','');
  v_channel text := coalesce(p_request->>'channel','');
  v_user_ref text := coalesce(p_request->'user'->>'ref','');
  v_user_name text := coalesce(p_request->'user'->>'name','');
  v_ent jsonb; v_val int; v_vals int[] := '{}'; v_labels text[] := '{}';
  v_targets jsonb := '[]'::jsonb; v_methods jsonb; v_valtext text[];
  v_canonical jsonb; v_personal jsonb; v_collective jsonb; v_suggestions jsonb;
begin
  -- targets מהישויות (שם→ערך-מנוע · מספר→עצמו). נפילה: מספרים מתוך הטקסט.
  if jsonb_typeof(p_request->'entities') = 'array' then
    for v_ent in select * from jsonb_array_elements(p_request->'entities') loop
      declare e_type text := lower(coalesce(v_ent->>'type','')); e_val text := trim(coalesce(v_ent->>'value','')); begin
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
  if array_length(v_vals,1) is null then
    select array_agg(distinct (m)[1]::int) into v_vals from regexp_matches(v_ask, '\d{1,5}', 'g') m;
  end if;
  v_vals := coalesce(v_vals,'{}');
  select array_agg(x::text) into v_valtext from unnest(v_vals) x;
  v_valtext := coalesce(v_valtext,'{}');

  -- ① CANONICAL — כל מה שנחקק (הצלבות · התכנסויות · הגדרות · גרף · עובדות-מחקר מאושרות · פוסטים)
  v_canonical := jsonb_build_object(
    'targets', v_targets,
    'matches', coalesce((select jsonb_agg(jsonb_build_object('phrase',phrase,'value',ragil))
       from (select distinct phrase, ragil from gematria_words where ragil = any(v_vals) and is_verified and space='core' order by ragil limit 24) a),'[]'::jsonb),
    'convergences', coalesce((select jsonb_agg(jsonb_build_object('value',value,'group_size',group_size))
       from (select distinct value, group_size from convergences where value = any(v_vals) order by group_size desc limit 10) b),'[]'::jsonb),
    'definitions', coalesce((select jsonb_agg(jsonb_build_object('content',left(content,300)))
       from (select content, created_at from researcher_definitions where status in ('applied','ai_replied') order by created_at desc limit 5) c),'[]'::jsonb),
    'graph', coalesce((select jsonb_agg(jsonb_build_object('type',type,'label',label))
       from (select distinct type,label from nodes where is_active and type in ('insight','number','convergence','language_bridge')
             and (label = any(v_valtext) or metadata->>'value' = any(v_valtext)) limit 12) d),'[]'::jsonb),
    'engraved_facts', coalesce((select jsonb_agg(jsonb_build_object('statement',statement,'contributor',contributor))
       from (select statement, contributor, created_at from research_objects where status in ('approved','canonical') and value = any(v_vals) order by created_at desc limit 10) e),'[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('title',title,'slug',slug))
       from (select distinct title, slug from posts, unnest(v_labels) lb where length(lb)>=2 and title ilike '%'||lb||'%' limit 4) f),'[]'::jsonb)
  );

  -- ② PERSONAL — רק מה שרלוונטי למשתמש
  v_personal := coalesce((select jsonb_build_object('name',display_name,'bio',left(coalesce(bio,''),200),
             'interests',dossier_settings->'interests','tags',tags)
    from contributors where (v_user_name<>'' and display_name ilike '%'||v_user_name||'%')
       or (v_user_ref ~ '\d' and phone = regexp_replace(v_user_ref,'[^0-9]','','g')) limit 1),'{}'::jsonb)
    || jsonb_build_object('numbers_worked', coalesce((
        select jsonb_agg(distinct value) from research_objects
        where value is not null and v_user_name<>'' and contributor ilike '%'||v_user_name||'%'),'[]'::jsonb));

  -- ③ COLLECTIVE — הזהב: אותו ערך אצל ≥2 חוקרים (גדל עם השנים)
  v_collective := coalesce((select jsonb_agg(jsonb_build_object('value',value,'researchers',c,'sample',s))
    from (select value, count(distinct contributor) c, (array_agg(distinct contributor))[1:3] s
          from research_objects where value = any(v_vals) and contributor is not null
          group by value having count(distinct contributor) >= 2 order by c desc) g),'[]'::jsonb);

  -- ④ SUGGESTIONS — לא עובדות, אלא מה כדאי לבדוק עכשיו
  v_suggestions := coalesce((select jsonb_agg(s) from (
      (select ('שאלה פתוחה: '||statement) s from research_objects where kind='question' and status='candidate' and value = any(v_vals) limit 3)
      union all
      (select ('במאגר יש עוד '||count(*)||' ביטויים מאומתים בערך '||ragil||' — שווה להצליב') s
        from gematria_words where ragil = any(v_vals) and is_verified and space='core' group by ragil having count(*)>3 limit 3)
    ) q),'[]'::jsonb);

  return jsonb_build_object(
    'request', jsonb_build_object('ask',left(v_ask,200),'channel',v_channel,'values',to_jsonb(v_vals)),
    'canonical', v_canonical, 'personal', v_personal, 'collective', v_collective, 'suggestions', v_suggestions);
end; $$;

revoke all on function public.metatron_context(jsonb) from public, anon;
grant execute on function public.metatron_context(jsonb) to authenticated, service_role;
