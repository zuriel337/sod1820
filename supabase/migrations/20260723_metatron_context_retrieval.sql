-- 🕎 metatron_context — השליפה המשותפת (סוגר את הלולאה: העץ נותן, לא רק מקבל).
-- הוחל ב-DB 23.7.2026; קובץ לתיעוד/שחזור. פונקציה אחת שכל בוט/האתר קוראים לפני שהם עונים.
-- מחזיר על נושא/מספר: ערכי-מנוע · ביטויים מאומתים באותו ערך (הצלבות) · התכנסויות ·
--   צמתי-גרף (כולל research_objects שנחקקו) · עובדות-מחקר מאושרות · קולקטיב (אותו ערך אצל ≥2) · פוסטים · פרופיל-אדם.
create or replace function public.metatron_context(p_subject text, p_person text default null)
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_subj text := trim(coalesce(p_subject,''));
  v_is_num boolean;
  v_methods jsonb;
  v_value int;
  v_allvals int[];
  v_result jsonb;
begin
  if v_subj = '' then return jsonb_build_object('subject','','value',null); end if;
  v_is_num := v_subj ~ '^\d+$';
  if v_is_num then
    v_value := v_subj::int;
  else
    begin v_methods := public.fn_all_methods(v_subj); exception when others then v_methods := null; end;
    v_value := nullif(v_methods->>'רגיל','')::int;
    if v_methods is not null then
      select array_agg(distinct (kv.value)::int) into v_allvals
      from jsonb_each_text(v_methods) kv where kv.value ~ '^\d+$';
    end if;
  end if;

  v_result := jsonb_build_object(
    'subject', v_subj, 'is_number', v_is_num, 'value', v_value,
    'all_values', coalesce(to_jsonb(v_allvals), '[]'::jsonb),
    'canonical_matches', coalesce((
      select jsonb_agg(jsonb_build_object('phrase',phrase,'ragil',ragil))
      from (select phrase, ragil from gematria_words
            where ragil = v_value and is_verified and space='core' and phrase <> v_subj
            order by lead_rank asc nulls last limit 12) a), '[]'::jsonb),
    'convergences', coalesce((
      select jsonb_agg(jsonb_build_object('value',value,'group_size',group_size,'kind',kind))
      from (select value, group_size, kind from convergences where value = v_value order by group_size desc limit 5) b), '[]'::jsonb),
    'graph', coalesce((
      select jsonb_agg(jsonb_build_object('type',type,'label',label,'description',left(description,200)))
      from (select type, label, description, created_at from nodes
            where is_active and type in ('insight','number','convergence','entity')
              and (label = v_value::text or metadata->>'value' = v_value::text
                   or (length(v_subj)>=2 and label ilike '%'||v_subj||'%'))
            order by created_at desc limit 10) c), '[]'::jsonb),
    'research_facts', coalesce((
      select jsonb_agg(jsonb_build_object('kind',kind,'statement',statement,'engine_verified',engine_verified,'contributor',contributor,'status',status))
      from (select kind, statement, engine_verified, contributor, status, created_at from research_objects
            where status in ('approved','canonical')
              and (value = v_value or v_subj = any(terms) or (length(v_subj)>=2 and statement ilike '%'||v_subj||'%'))
            order by created_at desc limit 10) d), '[]'::jsonb),
    'collective', coalesce((
      select jsonb_agg(jsonb_build_object('value',value,'contributors',c))
      from (select value, count(distinct contributor) c from research_objects
            where value = v_value and contributor is not null
            group by value having count(distinct contributor) >= 2) e), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('title',title,'slug',slug))
      from (select title, slug from posts where length(v_subj)>=2 and title ilike '%'||v_subj||'%'
            order by modified desc nulls last limit 4) f), '[]'::jsonb)
  );

  if p_person is not null and length(trim(p_person))>=2 then
    v_result := v_result || jsonb_build_object('person', (
      select jsonb_build_object('name',display_name,'bio',left(coalesce(bio,''),300),
                                'interests',dossier_settings->'interests','tags',tags)
      from contributors
      where display_name ilike '%'||trim(p_person)||'%' or phone = regexp_replace(coalesce(p_person,''),'[^0-9]','','g')
      limit 1));
  end if;
  return v_result;
end; $$;

revoke all on function public.metatron_context(text,text) from public, anon;
grant execute on function public.metatron_context(text,text) to authenticated, service_role;
