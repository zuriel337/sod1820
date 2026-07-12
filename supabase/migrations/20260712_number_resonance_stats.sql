-- 📊 מדד-תהודה — סופר רק התאמות ב*ציר האישי* (axis), לא תוכן ישן/גלם.
-- "תאריך ישן" חי בפוסט-המקור (2019-2025), לא בתאריך-ההכנסה (יבוא-בכמות יוני 2026). לכן הסימן = source:
--   ישן/גלם (מחוץ לציר): source_wp_ids קיים · source ~ excel_import/promoted:/auto:/wp_id:.
--   בציר (פנימה): lead_rank (מוביל) · VIP (wa-vip/wa-deep) · admin_curated · sod1820 · תורם-בשם · seed.
-- n_notable = אליאס ל-n_axis (תאימות-לקוח). ה-AI מפרש, לא סופר.
drop function if exists public.number_resonance_stats(text, jsonb);
create or replace function public.number_resonance_stats(p_self text, p_pairs jsonb)
returns table(n_methods int, n_connections int, n_strong_nodes int, n_axis int, n_notable int)
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
                g.lead_rank is not null
                or (coalesce(array_length(g.source_wp_ids,1),0) = 0
                    and coalesce(g.source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')
              ) from gematria_words g where g.phrase = b.phrase), false) as axis
    from ours o
    join bidim b on b.value = o.self_value and b.method in (select m from legible)
    where b.phrase <> p_self
      and (b.method = 'רגיל' or o.self_method = 'רגיל')
      and b.phrase !~ '[A-Za-z0-9]'
    group by o.self_method, o.self_value, b.phrase
  ),
  axis_hits as (select * from hits where axis),
  perval as (select self_value, count(distinct phrase) c from axis_hits group by self_value),
  agg as (
    select
      (select count(distinct self_method) from axis_hits)::int as m,
      (select count(distinct phrase) from axis_hits)::int      as c,
      (select count(*) from perval where c >= 2)::int          as s,
      (select count(*) from axis_hits)::int                    as a
  )
  select m, c, s, a, a from agg;
$$;
revoke all on function public.number_resonance_stats(text, jsonb) from public;
grant execute on function public.number_resonance_stats(text, jsonb) to anon, authenticated, service_role;
