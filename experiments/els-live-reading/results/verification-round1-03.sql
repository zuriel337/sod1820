set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ('r1.f51.0', 'זועמ', 235129, 4544, -1), ('r1.f52.0', 'למבטו', 203315, 4544, -1), ('r1.f53.0', 'הארי', 216933, 4544, 1), ('r1.f54.0', 'צלשמי', 180579, 4544, 1), ('r1.f55.0', 'ספינת', 244225, 4544, 1), ('r1.f56.0', 'ושגרה', 198785, 4544, 1), ('r1.f57.0', 'ימרמר', 235139, 4544, -1), ('r1.f58.0', 'לאבק', 266962, 4544, -1), ('r1.f59.0', 'הרמה', 298771, 4544, -1), ('r1.f60.0', 'איומ', 298777, 4544, -1)),
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