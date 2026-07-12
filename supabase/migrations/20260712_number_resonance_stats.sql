-- 📊 מדד-תהודה — מדד *טכני* של צפיפות-קשרים (לא "ציון רוחני"). עובדת-מנוע: כמה שיטות מצאו את
-- המילה · כמה חיבורים בלתי-תלויים · כמה "צמתים חזקים" (ערך שבו ≥3 מילים נפגשות) · כמה מאומתים
-- (משקל איכות-מקורות). אותה עדשה כמו number_cross_resonance (על bidim). ה-AI מפרש, לא סופר.
drop function if exists public.number_resonance_stats(text, jsonb);
create or replace function public.number_resonance_stats(p_self text, p_pairs jsonb)
returns table(n_methods int, n_connections int, n_strong_nodes int, n_verified int)
language sql stable security definer set search_path = public as $$
  with legible as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר']) m),
  ours as (
    select (e->>'method')::text self_method, (e->>'value')::int self_value
    from jsonb_array_elements(p_pairs) e
    where (e->>'method')::text in (select m from legible)
      and (e->>'value')::int between 10 and 100000
  ),
  hits as (
    select o.self_method, o.self_value, b.phrase,
           coalesce((select bool_or(coalesce(g.is_verified,false)) from gematria_words g where g.phrase = b.phrase), false) as verified
    from ours o
    join bidim b on b.value = o.self_value and b.method in (select m from legible)
    where b.phrase <> p_self
      and (b.method = 'רגיל' or o.self_method = 'רגיל')
      and b.phrase !~ '[A-Za-z0-9]'
    group by o.self_method, o.self_value, b.phrase
  )
  select
    count(distinct self_method)::int                             as n_methods,
    count(*)::int                                                as n_connections,
    count(distinct self_value) filter (where per_val >= 3)::int  as n_strong_nodes,
    count(*) filter (where verified)::int                        as n_verified
  from (select self_method, self_value, phrase, verified, count(*) over (partition by self_value) per_val from hits) x;
$$;
revoke all on function public.number_resonance_stats(text, jsonb) from public;
grant execute on function public.number_resonance_stats(text, jsonb) to anon, authenticated, service_role;
