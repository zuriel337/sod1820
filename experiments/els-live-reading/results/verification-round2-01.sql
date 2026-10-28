set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ('r2.f01.0', 'לחקתמשפט', 248763, 1, 1), ('r2.f02.0', 'וגמידיהוה', 253310, 1, 1), ('r2.f03.0', 'אלהיכאשאכלההואאלקנא', 257840, 1, 1), ('r2.f04.0', 'לעשותאתכלהחקימהאלה', 262397, 1, 1), ('r2.f05.0', 'ואכלתבשרכברכתיהוה', 271481, 1, 1), ('r2.f06.0', 'ויפדכ', 276037, 1, 1), ('r2.f07.0', 'הערימהאלהוחי', 280572, 1, 1), ('r2.f08.0', 'אשה', 257854, 4545, 1), ('r2.f09.0', 'לשוש', 257855, 4544, 1), ('r2.f10.0', 'רימה', 239670, 4546, 1), ('r2.f11.0', 'בראי', 271490, 4544, 1), ('r2.f12.0', 'יכתור', 253315, 4544, 1), ('r2.f13.0', 'ליבכ', 280579, 4544, 1), ('r2.f14.0', 'כיתכלה', 289669, 1, 1), ('r2.f15.0', 'בשרבניכובנתיכ', 294212, 1, 1), ('r2.f16.0', 'חזקואמצכיאתהתבוא', 298753, 1, 1), ('r2.f17.0', 'חילוופעלידיותרצה', 303301, 1, 1), ('r2.f18.0', 'הפינתבצל', 271495, 4544, 1), ('r2.f19.0', 'ובשני', 248756, 4545, 1), ('r2.f20.0', 'אות', 257847, 4545, 1), ('r2.f21.0', 'ומתר', 262395, 4545, 1), ('r2.f22.0', 'עור', 262398, 4545, 1), ('r2.f23.0', 'שמרו', 262399, 4546, 1), ('r2.f24.0', 'אפלה', 239668, 4546, 1), ('r2.f25.0', 'והלוכ', 253305, 4546, 1)),
letters as (
  select q.key, string_agg(t.ch, '' order by j) as db_text, count(*) as n
  from q cross join lateral generate_series(0, char_length(q.term) - 1) j
  join public.torah_stream t on t.idx = q.start + q.dir * q.skip * j + 1
  group by q.key
),
els as (select q.key, public.els_search_page_core_v1(q.term, 'torah', q.skip, q.skip, 100) as r from q where q.skip >= 2)
select jsonb_agg(jsonb_build_object(
  'key', q.key, 'term', q.term, 'start', q.start, 'skip', q.skip, 'dir', q.dir,
  'db_text', l.db_text, 'letters_match', coalesce(l.db_text = q.term, false),
  'engine', case when q.skip < 2 then jsonb_build_object('status', 'plain_text_row_not_els')
    else jsonb_build_object('status', e.r->>'status', 'hits', jsonb_array_length(coalesce(e.r->'hits', '[]'::jsonb)),
      'found', exists (select 1 from jsonb_array_elements(coalesce(e.r->'hits', '[]'::jsonb)) h where (h->>'start')::bigint = q.start and (h->>'dir')::int = q.dir),
      'completion', e.r->'completion') end
) order by q.key) as verification
from q left join letters l using (key) left join els e using (key);