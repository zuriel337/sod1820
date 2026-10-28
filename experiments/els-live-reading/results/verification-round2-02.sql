set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ('r2.f26.0', 'נשבעיהוהלהמ', 253299, 1, 1), ('r2.f27.0', 'לאתחללו', 176059, 1, 1), ('r2.f28.0', 'שימש', 194242, 1, 1), ('r2.f29.0', 'חבי', 185155, 4544, 1), ('r2.f30.0', 'ברד', 157881, 4546, 1), ('r2.f31.0', 'שמיאלנכר', 248783, 4545, 1), ('r2.f32.0', 'שבילי', 285143, 4545, 1), ('r2.f33.0', 'סרו', 235148, 4545, 1), ('r2.f34.0', 'ליראה', 262415, 1, 1), ('r2.f35.0', 'ואתנפל', 266957, 1, 1), ('r2.f36.0', 'מאחריה', 280595, 1, 1), ('r2.f37.0', 'שמנ', 248783, 4546, 1), ('r2.f38.0', 'פרי', 266961, 4544, 1), ('r2.f39.0', 'טייל', 248770, 4545, 1), ('r2.f40.0', 'סלול', 244225, 4546, 1), ('r2.f41.0', 'פיתח', 248769, 4546, 1), ('r2.f42.0', 'שיא', 248768, 4545, 1), ('r2.f43.0', 'מיכל', 248767, 4546, 1)),
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