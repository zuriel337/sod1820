-- 📊 מדד-תהודה — עובדת-מנוע (לא AI): כמה שיטות מצאו את המילה, כמה חיבורים בלתי-תלויים,
-- וכמה "צמתים חזקים" (ערך שבו ≥3 מילים נפגשות). אותה עדשה כמו number_cross_resonance (על bidim).
create or replace function public.number_resonance_stats(p_self text, p_pairs jsonb)
returns table(n_methods int, n_connections int, n_strong_nodes int)
language sql stable security definer set search_path = public as $$
  with legible as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר']) m),
  ours as (
    select (e->>'method')::text self_method, (e->>'value')::int self_value
    from jsonb_array_elements(p_pairs) e
    where (e->>'method')::text in (select m from legible)
      and (e->>'value')::int between 10 and 100000
  ),
  hits as (
    select o.self_method, o.self_value, b.phrase
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
    count(distinct self_value) filter (where per_val >= 3)::int  as n_strong_nodes
  from (select self_method, self_value, phrase, count(*) over (partition by self_value) per_val from hits) x;
$$;
revoke all on function public.number_resonance_stats(text, jsonb) from public;
grant execute on function public.number_resonance_stats(text, jsonb) to anon, authenticated, service_role;
