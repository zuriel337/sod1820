// SQL for the canonical check of a proposal: (1) the letters of the stream at the claimed positions, read straight from public.torah_stream; (2) for skips >= 2 the
// canonical engine itself (public.els_search_page_core_v1) must return an occurrence of the term with the same start and direction. Skip 1 is the plain text row, which the
// ELS engine does not search (its ELS domain starts at skip 2), so it is reported as plain-text-verified only. Read-only SELECTs; every interpolated value is validated.
export const CANONICAL_PAGE_FUNCTION = "public.els_search_page_core_v1";
export const BATCH = 25;

const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};

export function verificationSql(items) {
  if (!Array.isArray(items) || !items.length || items.length > BATCH) throw new RangeError(`1-${BATCH} items per statement`);
  const values = items.map((item) => {
    if (!/^[A-Za-z0-9_.-]{1,24}$/.test(item.key)) throw new TypeError("bad key");
    if (!/^[א-ת]{2,60}$/u.test(item.term)) throw new TypeError("term must be 2-60 Hebrew letters");
    int(item.start, 0, 400_000_000, "start"); int(item.skip, 1, 1_000_000, "skip"); int(item.dir, -1, 1, "dir");
    if (item.dir === 0) throw new RangeError("dir must be 1 or -1");
    return `('${item.key}', '${item.term}', ${item.start}, ${item.skip}, ${item.dir})`;
  }).join(", ");
  return `set local statement_timeout = '55000ms';
with q(key, term, start, skip, dir) as (values ${values}),
letters as (
  select q.key, string_agg(t.ch, '' order by j) as db_text, count(*) as n
  from q cross join lateral generate_series(0, char_length(q.term) - 1) j
  join public.torah_stream t on t.idx = q.start + q.dir * q.skip * j + 1
  group by q.key
),
els as (select q.key, ${CANONICAL_PAGE_FUNCTION}(q.term, 'torah', q.skip, q.skip, 100) as r from q where q.skip >= 2)
select jsonb_agg(jsonb_build_object(
  'key', q.key, 'term', q.term, 'start', q.start, 'skip', q.skip, 'dir', q.dir,
  'db_text', l.db_text, 'letters_match', coalesce(l.db_text = q.term, false),
  'engine', case when q.skip < 2 then jsonb_build_object('status', 'plain_text_row_not_els')
    else jsonb_build_object('status', e.r->>'status', 'hits', jsonb_array_length(coalesce(e.r->'hits', '[]'::jsonb)),
      'found', exists (select 1 from jsonb_array_elements(coalesce(e.r->'hits', '[]'::jsonb)) h where (h->>'start')::bigint = q.start and (h->>'dir')::int = q.dir),
      'completion', e.r->'completion') end
) order by q.key) as verification
from q left join letters l using (key) left join els e using (key);`;
}

/** Splits any number of items into statements of at most BATCH. */
export function verificationStatements(items) {
  const out = [];
  for (let i = 0; i < items.length; i += BATCH) out.push(verificationSql(items.slice(i, i + BATCH)));
  return out;
}
