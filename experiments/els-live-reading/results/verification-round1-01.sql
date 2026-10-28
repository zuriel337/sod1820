set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ('r1.f01.0', 'קולומביה', 248765, 4545, 1), ('r1.f02.0', 'יבכו', 289670, 4545, 1), ('r1.f03.0', 'פורה', 226040, 4545, 1), ('r1.f04.0', 'אשאכלההוא', 257845, 1, 1), ('r1.f05.0', 'ותבקעהאדמה', 216937, 1, 1), ('r1.f06.0', 'ותפתחהארצאתפיה', 216956, 1, 1), ('r1.f07.0', 'מעפרשרפת', 221507, 1, 1), ('r1.f08.0', 'במדברהזהיפלו', 212413, 1, 1), ('r1.f09.0', 'פנירדפגאלהדמאחרי', 280584, 1, 1), ('r1.f10.0', 'ואלהמסעיהמלמוצאיהמ', 244220, 1, 1), ('r1.f11.0', 'מחצמתנימ', 303317, 1, 1), ('r1.f12.0', 'חזקואמצ', 298753, 1, 1), ('r1.f13.0', 'ולאתזנההארצומלאהה', 171504, 1, 1), ('r1.f14.0', 'נחתו', 189700, 4545, -1), ('r1.f15.0', 'שמיאל', 248783, 4545, 1), ('r1.f16.0', 'נתיבהליל', 271473, 4545, 1), ('r1.f17.0', 'ונאהב', 257838, 4545, -1), ('r1.f18.0', 'כעסתי', 271476, 4545, 1), ('r1.f19.0', 'ונשוב', 203302, 4545, 1), ('r1.f20.0', 'שיצרח', 189669, 4545, -1), ('r1.f21.0', 'אהבה', 280569, 4545, -1), ('r1.f22.0', 'החבר', 303298, 4545, -1), ('r1.f23.0', 'תאותו', 180585, 4545, 1), ('r1.f24.0', 'בשממה', 180586, 4545, 1), ('r1.f25.0', 'כוח', 294211, 4545, 1)),
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