-- 📊 מדד-תהודה — מדד *טכני* של צפיפות-קשרים (לא "ציון רוחני"). עובדת-מנוע.
-- ⚠️ נספרות רק התאמות *נחשבות* (notable): מילה עם lead_rank (מובילה) / world (תמטית) /
-- node_id (בגרף) / source_wp_ids (מפוסט). כי bidim צפוף (~13.5k) וכל ערך מוצא התאמות מילוניות —
-- ספירה גולמית לא מבחינה. עם notable: משיח→94 · מדהים→63 · מלגזה(חלש)→49. אין תהודה מלאכותית.
drop function if exists public.number_resonance_stats(text, jsonb);
create or replace function public.number_resonance_stats(p_self text, p_pairs jsonb)
returns table(n_methods int, n_connections int, n_strong_nodes int, n_notable int)
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
           coalesce((select bool_or(
                g.lead_rank is not null or g.world is not null or g.node_id is not null
                or coalesce(array_length(g.source_wp_ids,1),0) > 0
              ) from gematria_words g where g.phrase = b.phrase), false) as notable
    from ours o
    join bidim b on b.value = o.self_value and b.method in (select m from legible)
    where b.phrase <> p_self
      and (b.method = 'רגיל' or o.self_method = 'רגיל')
      and b.phrase !~ '[A-Za-z0-9]'
    group by o.self_method, o.self_value, b.phrase
  ),
  notable_hits as (select * from hits where notable),
  perval as (select self_value, count(distinct phrase) c from notable_hits group by self_value)
  select
    (select count(distinct self_method) from notable_hits)::int      as n_methods,
    (select count(distinct phrase) from notable_hits)::int           as n_connections,
    (select count(*) from perval where c >= 2)::int                  as n_strong_nodes,
    (select count(*) from notable_hits)::int                         as n_notable;
$$;
revoke all on function public.number_resonance_stats(text, jsonb) from public;
grant execute on function public.number_resonance_stats(text, jsonb) to anon, authenticated, service_role;
