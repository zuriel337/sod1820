// SQL builders for the experiment. Every ELS occurrence is requested from the ONE canonical engine
// (public.els_search_geometry_core_v1 / els_search_page_core_v1, owner els_research_layer_law:v9). The builders only compose
// read-only SELECTs: no DML, no DDL, no function creation. All interpolated values are validated integers or [א-ת] strings.
import { MIN_AXIS_WIDTH, skipGroups, tileGrid } from "./geometry.mjs";

export const CANONICAL_GEOMETRY_FUNCTION = "public.els_search_geometry_core_v1";
export const CANONICAL_PAGE_FUNCTION = "public.els_search_page_core_v1";
export const MAX_HITS_PER_CALL = 4000; // the canonical function's own ceiling; a call that reaches it reports truncated

const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};
const hebrew = (value, name) => {
  if (typeof value !== "string" || !/^[א-ת]{2,40}$/u.test(value)) throw new TypeError(`${name} must be 2-40 Hebrew letters`);
  return value;
};

export function dictionaryCountSql({ minLen = 3, maxLen = 9 } = {}) {
  int(minLen, 2, 12, "minLen"); int(maxLen, minLen, 12, "maxLen");
  return `select length(phrase) as len, count(distinct phrase) as words from public.gematria_words where phrase ~ '^[א-ת]{${minLen},${maxLen}}$' group by 1 order by 1 desc;`;
}

/** Evaluation helper: which of the given words exist in the dictionary at all (so "not found" can be told from "not in the lexicon"). */
export function dictionaryMembershipSql(words) {
  if (!Array.isArray(words) || !words.length || words.length > 50) throw new RangeError("1-50 words");
  const list = words.map((word) => `'${hebrew(word, "word")}'`).join(", ");
  return `select phrase from public.gematria_words where phrase in (${list}) group by phrase order by phrase;`;
}

export function streamLengthSql() {
  return "select count(*)::int as total_letters from public.torah_stream;";
}

/** Locate occurrences of the anchor term at the matrix width (the skip) through the canonical page function. */
export function anchorSql({ term, skip }) {
  hebrew(term, "term"); int(skip, MIN_AXIS_WIDTH, 1_000_000, "skip");
  return `select ${CANONICAL_PAGE_FUNCTION}('${term}','torah',${skip},${skip},50) as result;`;
}

/** Display letters of a region, one text row per matrix row. Stream idx is 1-based; engine positions are 0-based. */
export function regionLettersSql(region) {
  const { width, r0, r1, c0, cw } = region;
  int(width, MIN_AXIS_WIDTH, 1_000_000, "width"); int(r0, 0, 1_000_000, "r0"); int(r1, r0, 1_000_000, "r1"); int(c0, 0, width - 1, "c0"); int(cw, 1, width - c0, "cw");
  return `select r, string_agg(ch, '' order by idx) as letters from (select idx, ch, (idx - 1) / ${width} as r, (idx - 1) % ${width} as c from public.torah_stream where idx between ${r0 * width + 1} and ${(r1 + 1) * width}) t where r between ${r0} and ${r1} and c between ${c0} and ${c0 + cw - 1} group by r order by r;`;
}

/** The word source of a batch: a slice of the project dictionary, or (probe) an explicit list of words to look up through the same engine call. */
function wordSourceSql(dictionary) {
  if (dictionary.words !== undefined) {
    if (!Array.isArray(dictionary.words) || !dictionary.words.length || dictionary.words.length > 50) throw new RangeError("a probe takes 1-50 words");
    const list = [...new Set(dictionary.words.map((word) => hebrew(word, "word")))].map((word) => `'${word}'`).join(", ");
    return `select w from unnest(array[${list}]::text[]) as t(w)`;
  }
  const { minLen, maxLen, offset, limit } = dictionary;
  int(minLen, 2, 12, "minLen"); int(maxLen, minLen, 12, "maxLen"); int(offset, 0, 100000, "offset"); int(limit, 1, 1000, "limit");
  return `select w from (select distinct phrase as w from public.gematria_words where phrase ~ '^[א-ת]{${minLen},${maxLen}}$') d
  order by length(w) desc, w offset ${offset} limit ${limit}`;
}

/**
 * Optional control-comparison bookkeeping (a separate option, off by default): the same occurrences the scan already received are tiled
 * with same-size tiles anchored at the target region, and counted per tile. It adds NO engine call; it only adds the tile CTEs and the
 * tile_* members of the output JSON.
 */
function controlParts({ width, region, grid, minLen }) {
  const { r0, c0, rows, cols } = region;
  const gridColumns = grid.cbMax - grid.cbMin + 1;
  // With minLen >= 5 every word has >= 5 letters, so the "len >= 5" statistics equal the plain ones and are derived, not transported.
  const statEntries = [["cd", "cd", "hits"], ["row", "row", "hits"], ...(minLen < 5 ? [["cd5", "cd", "hits5"], ["row5", "row", "hits5"]] : [])];
  const vectorEntry = (name, group, column) => `'${name}', (select coalesce(jsonb_object_agg(((a.rb - ${grid.rbMin}) * ${gridColumns} + (a.cb - ${grid.cbMin}))::text, a.${column}), '{}'::jsonb) from agg a join grid g using (rb, cb) where a.grp = '${group}' and a.${column} > 0)`;
  const sumEntry = (name, group, column) => `'${name}', (select coalesce(sum(a.${column}), 0) from agg a join grid g using (rb, cb) where a.grp = '${group}')`;
  return {
    ctes: `,
tiles as materialized (
  select floor((sr - ${r0})::numeric / ${rows})::int as rb, floor((sc - ${c0})::numeric / ${cols})::int as cb, grp, len
  from ok
  where floor((sr - ${r0})::numeric / ${rows}) = floor((er - ${r0})::numeric / ${rows})
    and floor((sc - ${c0})::numeric / ${cols}) = floor((ec - ${c0})::numeric / ${cols})
),
grid as (
  select rb, cb from generate_series(${grid.rbMin}, ${grid.rbMax}) rb cross join generate_series(${grid.cbMin}, ${grid.cbMax}) cb
),
agg as (
  select rb, cb, grp, count(*) as hits, count(*) filter (where len >= 5) as hits5 from tiles group by rb, cb, grp
)`,
    entries: `,
  'tile_vectors', jsonb_build_object(${statEntries.map(([name, group, column]) => vectorEntry(name, group, column)).join(", ")}),
  'tile_sums', jsonb_build_object(${statEntries.map(([name, group, column]) => sumEntry(name, group, column)).join(", ")}),
  'tile_grid', jsonb_build_object('rb_min', ${grid.rbMin}, 'rb_max', ${grid.rbMax}, 'cb_min', ${grid.cbMin}, 'cb_max', ${grid.cbMax}, 'count', ${grid.count})`,
  };
}

/**
 * One dictionary batch. Per word it makes ONE canonical engine call per direction group over the WHOLE matrix, then derives, from the
 * returned occurrences only: the findings inside the target region and per-word matrix totals (and, only with `controls`, per-tile hit
 * counts for the comparison to other regions). Bookkeeping only — no occurrence is generated or searched for here.
 *
 * directions: "cd" (columns + both diagonals = skips W-1, W, W+1), "row" (skip 1), or "both".
 * controls: false (default) = region findings only; true = also the tile counts used by the separate control comparison.
 * Dictionary = distinct single Hebrew words of public.gematria_words of length [minLen, maxLen], ordered longest first (stable), sliced
 * by offset/limit so a run can be split into batches and budgeted. A probe (dictionary: { words: [...] }) looks up explicit words through the
 * same engine call instead — ground truth for the evaluation, never part of what a model sees.
 */
export function scanBatchSql({ width, totalRows, totalLetters, region, dictionary, directions = "both", controls = false, timeoutMs = 55000, targetLimit = 400 }) {
  int(width, MIN_AXIS_WIDTH, 1_000_000, "width");
  int(totalRows, region.r1 + 1, 1_000_000, "totalRows");
  const { r0, r1, c0, cw, rows, cols } = region;
  int(r0, 0, totalRows - 1, "r0"); int(r1, r0, totalRows - 1, "r1"); int(c0, 0, width - 1, "c0"); int(cw, 1, width - c0, "cw");
  int(rows, 1, totalRows, "rows"); int(cols, 1, width, "cols");
  const wordSource = wordSourceSql(dictionary);
  const probe = dictionary.words !== undefined; // a probe reports matrix-wide counts for every word it was asked about, region or not
  if (!["cd", "row", "both"].includes(directions)) throw new RangeError("directions must be cd, row or both");
  if (typeof controls !== "boolean") throw new TypeError("controls must be true or false");
  if (controls && dictionary.words !== undefined) throw new RangeError("the comparison to other regions applies to dictionary scans, not to probes");
  int(timeoutMs, 1000, 600000, "timeoutMs"); int(targetLimit, 1, 2000, "targetLimit");
  const letters = int(totalLetters, width, 100_000_000, "totalLetters");
  const control = controls ? controlParts({ width, region, grid: tileGrid(region, letters), minLen: dictionary.minLen }) : { ctes: "", entries: "" };
  const groups = skipGroups(width);
  const rowsOfValues = [
    ...(directions !== "row" ? [`('cd', array[${groups.cd.join(",")}])`] : []),
    ...(directions !== "cd" ? [`('row', array[${groups.row.join(",")}])`] : []),
  ].join(", ");
  const rmax = totalRows - 1;
  return `set local statement_timeout = '${timeoutMs}ms';
with dict as materialized (
  ${wordSource}
),
calls as materialized (
  select d.w, length(d.w) as len, g.grp, x.r
  from dict d
  cross join lateral (values ${rowsOfValues}) g(grp, skips)
  cross join lateral (select ${CANONICAL_GEOMETRY_FUNCTION}(d.w, 'torah', ${width}, 0, ${rmax}, 0, ${width}, g.skips, ${MAX_HITS_PER_CALL}) as r) x
),
hits as materialized (
  select c.w, c.len, c.grp, (h->>'skip')::int as skip, (h->>'dir')::int as dir, (h->>'start')::int as s, (h->>'end')::int as e
  from calls c cross join lateral jsonb_array_elements(c.r->'hits') h
),
ok as materialized (
  select z.*, z.s / ${width} as sr, z.s % ${width} as sc, z.e / ${width} as er, z.e % ${width} as ec
  from (select h.*, case when h.skip = 1 then h.dir when h.skip = ${width} then 0 when h.skip = ${width + 1} then h.dir else -h.dir end as dcol from hits h) z
  where (z.s % ${width}) + (z.len - 1) * z.dcol = z.e % ${width} and (z.s % ${width}) + (z.len - 1) * z.dcol between 0 and ${width - 1}
),
tgt as materialized (
  select * from ok where sr between ${r0} and ${r1} and er between ${r0} and ${r1}
    and sc between ${c0} and ${c0 + cw - 1} and ec between ${c0} and ${c0 + cw - 1}
)${control.ctes}
select jsonb_build_object(
  'words_in_batch', (select count(*) from dict),
  'calls', (select count(*) from calls),
  'engine_statuses', (select coalesce(jsonb_object_agg(st, n), '{}'::jsonb) from (select r->>'status' as st, count(*) as n from calls group by 1) q),
  'truncated_calls', (select coalesce(jsonb_agg(jsonb_build_object('w', w, 'grp', grp)), '[]'::jsonb) from (select w, grp from calls where (r->'completion'->>'truncated')::boolean limit 50) t),
  'target_total', (select count(*) from tgt),
  'target', (select coalesce(jsonb_agg(to_jsonb(t) order by t.len desc, t.w, t.skip, t.dir), '[]'::jsonb) from (select w, len, grp, skip, dir, s, e from tgt order by len desc, w, skip, dir limit ${targetLimit}) t),
  'word_matrix_hits', (select coalesce(jsonb_object_agg(w || '|' || grp, n), '{}'::jsonb) from (select w, grp, count(*) as n from ok${probe ? "" : " where w in (select w from tgt)"} group by w, grp) q)${control.entries},
  'db_ms', round(extract(epoch from clock_timestamp() - statement_timestamp()) * 1000)
) as batch;`;
}
