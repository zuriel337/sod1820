set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ('r1.f26.0', 'אישה', 257858, 4545, -1), ('r1.f27.0', 'פגשו', 235137, 4545, -1), ('r1.f28.0', 'דיילה', 257865, 4545, -1), ('r1.f29.0', 'אימה', 276046, 4545, -1), ('r1.f30.0', 'נמלה', 157885, 4545, 1), ('r1.f31.0', 'הוי', 294195, 4545, 1), ('r1.f32.0', 'בהלה', 226044, 4546, 1), ('r1.f33.0', 'תמוז', 157861, 4546, 1), ('r1.f34.0', 'חזונ', 157862, 4546, 1), ('r1.f35.0', 'ישסוס', 226056, 4546, 1), ('r1.f36.0', 'ללבנה', 157871, 4546, 1), ('r1.f37.0', 'וקללהבאפ', 180603, 4546, 1), ('r1.f38.0', 'ניתח', 189700, 4546, -1), ('r1.f39.0', 'ארורות', 180574, 4546, 1), ('r1.f40.0', 'בעת', 285130, 4546, 1), ('r1.f41.0', 'לאהבת', 235122, 4546, -1), ('r1.f42.0', 'הנעלה', 235120, 4546, 1), ('r1.f43.0', 'כבו', 194205, 4546, 1), ('r1.f44.0', 'אהובכ', 212389, 4546, -1), ('r1.f45.0', 'לאניה', 303308, 4546, -1), ('r1.f46.0', 'נוסע', 253299, 4546, -1), ('r1.f47.0', 'ויאבר', 262390, 4546, 1), ('r1.f48.0', 'כלומ', 253295, 4546, 1), ('r1.f49.0', 'צרחו', 244200, 4546, 1), ('r1.f50.0', 'פועמ', 157884, 4544, 1)),
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