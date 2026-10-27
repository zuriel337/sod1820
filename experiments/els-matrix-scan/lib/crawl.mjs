// Continuation crawler: from a seed occurrence that the canonical engine already reported, read the stream letters BEYOND its two ends along the
// same line and ask whether the extended string is Torah language. The language is learned from the Torah itself: the lexicon is every distinct
// word form of the five books as written in public.tanach_verses (prefixes and suffixes attached), not a registry of chosen words.
//
// What this module is not: it does not search for anything. Seeds come from the engine; every extended string that is reported is re-confirmed by
// the engine at the same positions (verifyExtensionsSql). The letters read beyond a seed are the same letters a viewer sees when the line is drawn.
//
// "Interesting" is calibrated from the corpus itself: the identical test is repeated on lines shifted to other places of the stream (same seed word,
// same geometry, different continuation letters). A continuation is only called unusual when the shifted lines rarely do as well.
import { createHash } from "node:crypto";
import { baseLetters } from "./letters.mjs";

export const CRAWL_BARS = Object.freeze([4, 5, 6, 7, 8, 9]);
export const CRAWL_CRITERIA = Object.freeze(["forms", "collocations"]);
const SHIFT_MULTIPLIER = 104729; // the 10,000th prime: shifts are deterministic, not random

const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};
const hebrew = (value, name) => {
  if (typeof value !== "string" || !/^[א-ת]{2,12}$/u.test(value)) throw new TypeError(`${name} must be 2-12 Hebrew letters`);
  return value;
};

/**
 * Query results travel as one plain line per record plus the md5 of that line (computed by the database). A transcription error in either the
 * line or the checksum is detected here, instead of silently becoming a number in a report.
 */
export function checkedLines(lines, label = "result") {
  if (!Array.isArray(lines)) throw new TypeError(`${label}: lines must be an array`);
  return lines.map((entry, index) => {
    const actual = createHash("md5").update(entry.s, "utf8").digest("hex");
    if (actual !== entry.md5) throw new Error(`${label}: line ${index + 1} does not match its checksum (copy error?)`);
    return entry.s;
  });
}

/** One crawl line = id|word|t|p|left|right|null_ge(bars)|top(e/kl/kr/len/kind/parts;…) */
export function parseCrawlLines(lines) {
  return checkedLines(lines, "crawl").map((line) => {
    const [id, word, t, p, left, right, nullGe, top] = line.split("|");
    return {
      id: Number(id), word, t_obs: t === "-" ? null : Number(t), p: Number(p), left, right,
      null_ge: Object.fromEntries(nullGe.split(",").map((count, index) => [String(CRAWL_BARS[index]), Number(count)])),
      top: top === "" ? [] : top.split(";").map((entry) => {
        const [e, kl, kr, len, kind, parts] = entry.split("/");
        return { e, kl: Number(kl), kr: Number(kr), len: Number(len), kind: kind === "w" ? "word" : "phrase", parts: parts.split("+") };
      }),
    };
  });
}

export function describeCrawlMethod() {
  return [
    "Continuation crawler (language learned from the Torah itself, interest calibrated from the corpus).",
    "1. Seeds are occurrences the canonical engine already reported (word, start, skip, direction). Nothing is searched here.",
    "2. Lexicon = every distinct word form of the five books as written in public.tanach_verses (final letters folded to base letters), forms of 2-12 letters; no registry of chosen words.",
    "3. For a seed, the stream letters before its first letter and after its last letter along the same line are read (up to `reach` each side). Every extension (kl letters on one side, kr on the other, kl + kr >= 1, total length between minTotal and 12) is tested. A line cannot continue beyond the beginning or the end of the text: such letters are unknown ('?'), never wrapped around; the shifted lines are masked to the same number of available letters per side.",
    "4. An extension qualifies when the whole string is a lexicon form, or splits into two parts of at least 2 letters each. Criterion `forms`: both parts are lexicon forms (any pair). Criterion `collocations` (stricter): the two parts are ADJACENT words of one verse of the five books (46,885 distinct attested pairs), i.e. a phrase the Torah itself contains. T(line) = the longest qualifying extension.",
    "5. Calibration: the same test is repeated on `shifts` lines moved by fixed pseudo-random offsets (same seed word and geometry, other continuation letters). p(seed) = (1 + number of shifted lines with T >= the real T) / (shifts + 1).",
    "6. Over all seeds, for each bar B: observed = seeds with T >= B; expected = sum over seeds of (shifted lines with T >= B) / shifts.",
    "7. Seeds that sit on the same arithmetic progression of the stream (same skip, same residue) with overlapping reading windows read the same letters: they are ONE line. The per-bar comparison is repeated on one representative per line (the longest seed word; ties: the first), with P(at least the observed number) from the exact Poisson-binomial distribution of the per-line shifted shares ((count + 1) / (shifts + 1), so a share is never exactly zero).",
    "8. Every reported extended string is re-confirmed by the canonical engine at the same skip, direction and start.",
    "9. Limits: vocabulary coverage is not meaning (short lexicon forms combine freely, so 4-5 letter continuations are common by chance); the lexicon is the Torah's vocabulary only (modern words, names and foreign words are outside it); p is a screening number for one seed, not corrected across seeds; a seed list chosen after looking at the matrix is a post-hoc choice.",
  ].join("\n");
}

/**
 * JS twin of the SQL test, for unit tests and cross-checks. left / right: the letters beyond the seed, NEAREST FIRST. lexicon: a Set of base-letter forms.
 * bigrams (optional): a Set of "a|b" strings = adjacent word pairs attested in the text; given, a two-part extension qualifies only when it is one of them.
 * Returns every qualifying extension, longest first.
 */
export function continuationsOf({ word, left, right, lexicon, bigrams = null, minTotal = 4, maxTotal = 12 }) {
  const out = [];
  for (let kl = 0; kl <= left.length; kl += 1) {
    for (let kr = 0; kr <= right.length; kr += 1) {
      if (kl + kr < 1) continue;
      const e = left.slice(0, kl).reverse().join("") + word + right.slice(0, kr).join("");
      if (e.length < minTotal || e.length > maxTotal) continue;
      const isWord = lexicon.has(e);
      let split = null;
      for (let m = 2; m <= e.length - 2 && split === null; m += 1) if (bigrams ? bigrams.has(`${e.slice(0, m)}|${e.slice(m)}`) : lexicon.has(e.slice(0, m)) && lexicon.has(e.slice(m))) split = m;
      if (isWord || split !== null) out.push({ kl, kr, e, len: e.length, kind: isWord ? "word" : "phrase", parts: isWord ? [e] : [e.slice(0, split), e.slice(split)] });
    }
  }
  return out.sort((a, b) => b.len - a.len || a.kl + a.kr - (b.kl + b.kr) || a.e.localeCompare(b.e, "he"));
}

/** Read-only query: for every seed, the real line (m = 0) and `shifts` shifted lines, the qualifying extensions, and the calibration counts. */
export function crawlSql({ seeds, reach = 5, shifts = 300, minTotal = 4, criterion = "forms", timeoutMs = 50000 }) {
  int(reach, 1, 8, "reach"); int(shifts, 10, 1000, "shifts"); int(minTotal, 3, 9, "minTotal"); int(timeoutMs, 1000, 600000, "timeoutMs");
  if (!CRAWL_CRITERIA.includes(criterion)) throw new RangeError(`criterion must be one of ${CRAWL_CRITERIA.join(", ")}`);
  const collocations = criterion === "collocations";
  if (!Array.isArray(seeds) || !seeds.length || seeds.length > 120) throw new RangeError("a crawl takes 1-120 seeds");
  const rows = seeds.map((seed, index) => {
    const word = baseLetters(hebrew(seed.word, "seed word"));
    const length = [...word].length;
    return `(${index + 1}, '${word}', ${int(seed.start, 0, 100_000_000, "start")}, ${int(seed.skip, 1, 1_000_000, "skip")}, ${[-1, 1].includes(seed.dir) ? seed.dir : int(NaN, 0, 0, "dir")}, ${length})`;
  }).join(",\n  ");
  const total = "(select total from n)";
  const letterAt = (expression) => `(select t.ch from public.torah_stream t where t.idx = (((${expression}) % ${total}) + ${total}) % ${total} + 1)`;
  const pivot = Array.from({ length: reach }, (_, i) => `max(ch) filter (where side = 'L' and j = ${i + 1}) as l${i + 1}, max(ch) filter (where side = 'R' and j = ${i + 1}) as r${i + 1}`).join(", ");
  const leftValues = Array.from({ length: reach + 1 }, (_, k) => `(${k}, ${k === 0 ? "''" : Array.from({ length: k }, (__, i) => `coalesce(l${k - i}, '?')`).join(" || ")})`).join(", ");
  const rightValues = Array.from({ length: reach + 1 }, (_, k) => `(${k}, ${k === 0 ? "''" : Array.from({ length: k }, (__, i) => `coalesce(r${i + 1}, '?')`).join(" || ")})`).join(", ");
  const nearest = (side) => Array.from({ length: reach }, (_, i) => `coalesce(${side}${i + 1}, '?')`).join(" || ");
  const bars = CRAWL_BARS.join(", ");
  // collocations: the two parts must be ADJACENT words of one verse (pairs the Torah itself contains), learned from the text like the lexicon
  const attestedPairs = collocations ? `bi as materialized (
  select distinct translate(v.words[i], 'ךםןףץ', 'כמנפצ') as a, translate(v.words[i + 1], 'ךםןףץ', 'כמנפצ') as b
  from public.tanach_verses v, lateral generate_series(1, coalesce(array_length(v.words, 1), 0) - 1) i
  where v.book_idx between 0 and 4 and v.words[i] ~ '^[א-ת]{2,12}$' and v.words[i + 1] ~ '^[א-ת]{2,12}$'
),
` : "";
  const phraseSource = collocations ? "from pairs p join bi on bi.a = p.a and bi.b = p.b" : "from pairs p join lex la on la.w = p.a join lex lb on lb.w = p.b";
  // enable_nestloop = off: the membership tests are equality joins against the lexicon and must be hash joins (a nested loop over a CTE rescans 17k forms per row)
  return `set local statement_timeout = '${timeoutMs}ms';
set local enable_nestloop = off;
with seed_rows(id, w, s, skip, dir, len) as (values
  ${rows}
),
n as (select max(idx)::bigint as total from public.torah_stream),
seeds as materialized (
  select r.*,
    greatest(0, least(${reach}, case when r.dir = 1 then r.s / r.skip else (n.total - 1 - r.s) / r.skip end))::int as avail_l,
    greatest(0, least(${reach}, case when r.dir = 1 then (n.total - 1 - (r.s + r.skip * (r.len - 1))) / r.skip else (r.s - r.skip * (r.len - 1)) / r.skip end))::int as avail_r
  from seed_rows r cross join n
),
lex as materialized (
  select translate(x.w, 'ךםןףץ', 'כמנפצ') as w, count(*) as n
  from public.tanach_verses v, lateral unnest(v.words) x(w)
  where v.book_idx between 0 and 4 and x.w ~ '^[א-ת]{2,12}$'
  group by 1
),
${attestedPairs}shifts as (select m, case when m = 0 then 0::bigint else (m::bigint * ${SHIFT_MULTIPLIER}) % ${total} end as delta from generate_series(0, ${shifts}) m),
cont as materialized (
  select sd.id, sh.m, 'L'::text as side, j, case when j <= sd.avail_l then ${letterAt("sd.s - sd.dir * sd.skip * j + sh.delta")} end as ch
  from seeds sd cross join shifts sh cross join generate_series(1, ${reach}) j
  union all
  select sd.id, sh.m, 'R'::text, j, case when j <= sd.avail_r then ${letterAt("sd.s + sd.dir * sd.skip * (sd.len - 1 + j) + sh.delta")} end
  from seeds sd cross join shifts sh cross join generate_series(1, ${reach}) j
),
piv as materialized (select id, m, ${pivot} from cont group by id, m),
cand as materialized (
  select p.id, p.m, lv.kl, rv.kr, lv.ls || sd.w || rv.rs as e
  from piv p join seeds sd on sd.id = p.id
  cross join lateral (values ${leftValues}) lv(kl, ls)
  cross join lateral (values ${rightValues}) rv(kr, rs)
  where lv.kl + rv.kr >= 1
),
word_ok as materialized (
  select c.id, c.m, c.kl, c.kr, c.e, length(c.e) as len, true as is_word, null::int as split_at
  from cand c join lex l on l.w = c.e
  where length(c.e) between ${minTotal} and 12
),
pairs as materialized (
  select c.id, c.m, c.kl, c.kr, c.e, mm, substr(c.e, 1, mm) as a, substr(c.e, mm + 1) as b
  from cand c cross join lateral generate_series(2, length(c.e) - 2) mm
  where length(c.e) between ${minTotal} and 12
),
phrase_ok as materialized (
  select p.id, p.m, p.kl, p.kr, p.e, length(p.e) as len, false as is_word, min(p.mm) as split_at
  ${phraseSource}
  group by p.id, p.m, p.kl, p.kr, p.e
),
qual as materialized (
  select * from word_ok
  union all
  select p.* from phrase_ok p where not exists (select 1 from word_ok w where w.id = p.id and w.m = p.m and w.kl = p.kl and w.kr = p.kr)
),
tm as materialized (select id, m, max(len) as t from qual group by id, m),
per_seed as (
  select sd.id, sd.w,
    (select max(t) from tm where tm.id = sd.id and tm.m = 0) as t_obs,
    (select ${nearest("l")} from piv where piv.id = sd.id and piv.m = 0) as left_nearest_first,
    (select ${nearest("r")} from piv where piv.id = sd.id and piv.m = 0) as right_nearest_first,
    (select coalesce(string_agg(q.e || '/' || q.kl || '/' || q.kr || '/' || q.len || '/' || case when q.is_word then 'w' else 'p' end || '/'
        || case when q.is_word then q.e else substr(q.e, 1, q.split_at) || '+' || substr(q.e, q.split_at + 1) end, ';' order by q.len desc, q.kl + q.kr, q.e), '')
      from (select * from qual where qual.id = sd.id and qual.m = 0 order by len desc, kl + kr, e limit 6) q) as top,
    (select string_agg(z.cnt::text, ',' order by z.b) from (select b, (select count(*) from tm where tm.id = sd.id and tm.m >= 1 and tm.t >= b) as cnt from unnest(array[${bars}]) b) z) as null_ge
  from seeds sd
),
lines as (
  select ps.id, concat_ws('|', ps.id, ps.w, coalesce(ps.t_obs::text, '-'),
      round((case when ps.t_obs is null then 1.0 else (1 + (select count(*) from tm where tm.id = ps.id and tm.m >= 1 and tm.t >= ps.t_obs))::numeric / (${shifts} + 1) end), 6)::text,
      ps.left_nearest_first, ps.right_nearest_first, ps.null_ge, ps.top) as line
  from per_seed ps
)
select jsonb_build_object(
  'meta', jsonb_build_object('criterion', '${criterion}', 'shifts', ${shifts}, 'reach', ${reach}, 'min_total', ${minTotal}, 'lexicon_forms', (select count(*) from lex), ${collocations ? "'attested_pairs', (select count(*) from bi), " : ""}'db_ms', round(extract(epoch from clock_timestamp() - statement_timestamp()) * 1000)),
  'lines', (select jsonb_agg(jsonb_build_object('s', line, 'md5', md5(line)) order by id) from lines)
) as crawl;`;
}

/**
 * Re-confirms extended strings through the canonical engine: each (term, skip) is searched over the whole matrix and only the hit at the PREDICTED
 * (skip, dir, start) is reported, so a confirmed extension is one short line and an unconfirmed one is simply missing. A truncated call is marked.
 */
export function verifyExtensionsSql({ width, totalRows, extensions }) {
  int(width, 5, 1_000_000, "width"); int(totalRows, 1, 1_000_000, "totalRows");
  if (!Array.isArray(extensions) || !extensions.length || extensions.length > 60) throw new RangeError("1-60 extensions");
  const rows = extensions.map((extension, index) => `(${index + 1}, '${hebrew(extension.term, "term")}', ${int(extension.skip, 1, 1_000_000, "skip")}, ${[-1, 1].includes(extension.dir) ? extension.dir : int(NaN, 0, 0, "dir")}, ${int(extension.start, 0, 100_000_000, "start")})`).join(", ");
  return `set local statement_timeout = '50000ms';
with ext(id, term, skip, dir, start) as (values ${rows}),
calls as materialized (select e.id, e.term, e.skip, e.dir, e.start, public.els_search_geometry_core_v1(e.term, 'torah', ${width}, 0, ${totalRows - 1}, 0, ${width}, array[e.skip], 4000) as r from ext e)
select jsonb_build_object(
  'meta', jsonb_build_object('calls', (select count(*) from calls), 'db_ms', round(extract(epoch from clock_timestamp() - statement_timestamp()) * 1000)),
  'lines', (select coalesce(jsonb_agg(jsonb_build_object('s', line, 'md5', md5(line)) order by line), '[]'::jsonb) from (
      select c.id || '|' || c.term || '|' || (h->>'skip') || '|' || (h->>'dir') || '|' || (h->>'start') as line from calls c cross join lateral jsonb_array_elements(c.r->'hits') h
        where (h->>'skip')::bigint = c.skip and (h->>'dir')::int = c.dir and (h->>'start')::bigint = c.start
      union all select c.id || '|' || c.term || '|truncated' from calls c where (c.r->'completion'->>'truncated')::boolean) q)
) as verify;`;
}

/** Parses the verification lines: hits (id|term|skip|dir|start) and truncated markers (id|term|truncated). */
export function parseVerifyLines(lines) {
  const hits = [];
  const truncated = [];
  for (const line of checkedLines(lines, "verify")) {
    const [id, term, skip, dir, start] = line.split("|");
    if (skip === "truncated") truncated.push(Number(id));
    else hits.push({ id: Number(id), term, skip: Number(skip), dir: Number(dir), start: Number(start) });
  }
  return { hits, truncated };
}

/**
 * Groups seeds that read the same letters: same skip, same residue (same arithmetic progression of the stream) and overlapping windows
 * (the seed's own letters plus `reach` letters beyond both ends). A seed without usable geometry is its own line.
 */
export function groupSeedsByLine({ seeds, reach }) {
  const group = new Array(seeds.length).fill(null);
  const byProgression = new Map();
  seeds.forEach((seed, index) => {
    const usable = Number.isSafeInteger(seed.skip) && seed.skip > 0 && Number.isSafeInteger(seed.start) && seed.start >= 0 && [-1, 1].includes(seed.dir);
    if (!usable) { group[index] = `seed:${index}`; return; }
    const residue = seed.start % seed.skip;
    const first = (seed.start - residue) / seed.skip;
    const last = first + seed.dir * ([...seed.word].length - 1);
    const key = `${seed.skip}:${residue}`;
    if (!byProgression.has(key)) byProgression.set(key, []);
    byProgression.get(key).push({ index, lo: Math.min(first, last) - reach, hi: Math.max(first, last) + reach });
  });
  for (const [key, entries] of byProgression) {
    entries.sort((a, b) => a.lo - b.lo || a.index - b.index);
    let hi = -Infinity;
    let ordinal = -1;
    for (const entry of entries) {
      if (entry.lo > hi) { ordinal += 1; hi = entry.hi; } else hi = Math.max(hi, entry.hi);
      group[entry.index] = `${key}#${ordinal}`;
    }
  }
  return group;
}

/** P(X >= observed) for X = sum of independent Bernoulli(q_i): exact, by dynamic programming. */
export function poissonBinomialUpperTail(probabilities, observed) {
  if (observed <= 0) return 1;
  let distribution = [1];
  for (const q of probabilities) {
    if (!(q >= 0 && q <= 1)) throw new RangeError("probabilities must be in [0, 1]");
    const next = new Array(distribution.length + 1).fill(0);
    distribution.forEach((mass, k) => { next[k] += mass * (1 - q); next[k + 1] += mass * q; });
    distribution = next;
  }
  return Math.min(1, distribution.slice(observed).reduce((sum, mass) => sum + mass, 0));
}

/**
 * Turns the SQL result into the calibrated picture: per seed (p against its own shifted lines), and per bar: observed vs expected, first over
 * seeds and then over distinct lines (seeds that read the same letters count once; the exact tail is computed over those lines).
 */
export function summarizeCrawl({ crawl, seeds, alpha = 0.05 }) {
  const shifts = Number(crawl.meta.shifts);
  const reach = Number(crawl.meta.reach);
  const parsed = parseCrawlLines(crawl.lines);
  const lineOf = groupSeedsByLine({ seeds: parsed.map((row) => seeds[row.id - 1] ?? { word: "" }), reach });
  const rows = parsed.map((row, index) => {
    const seed = seeds[row.id - 1];
    if (!seed) throw new Error(`crawl line ${row.id} has no seed in the seed list (different seed list?)`);
    if (seed.word !== row.word && baseLetters(seed.word) !== row.word) throw new Error(`crawl line ${row.id} is about "${row.word}", the seed list says "${seed.word}" (different seed list?)`);
    return Object.freeze({
      id: seed.id ?? row.id, seed: seed.word, t: row.t_obs, p: row.p, line: lineOf[index],
      left: row.left, right: row.right,
      best: row.top[0] ?? null, top: row.top,
      nullCount: row.null_ge,
      nullShare: Object.fromEntries(Object.entries(row.null_ge).map(([bar, count]) => [bar, count / shifts])),
    });
  });
  const representative = new Map(); // line -> the row with the longest seed word (first on ties): a choice that does not depend on the outcome
  for (const row of rows) { const current = representative.get(row.line); if (!current || [...row.seed].length > [...current.seed].length) representative.set(row.line, row); }
  const lines = [...representative.values()];
  const byBar = CRAWL_BARS.map((bar) => ({
    bar,
    observedSeeds: rows.filter((row) => row.t !== null && row.t >= bar).length,
    expectedSeeds: Number(rows.reduce((sum, row) => sum + (row.nullShare[bar] ?? 0), 0).toFixed(3)),
    observedLines: lines.filter((row) => row.t !== null && row.t >= bar).length,
    expectedLines: Number(lines.reduce((sum, row) => sum + (row.nullShare[bar] ?? 0), 0).toFixed(3)),
    tailLines: Number(poissonBinomialUpperTail(lines.map((row) => ((row.nullCount[bar] ?? 0) + 1) / (shifts + 1)), lines.filter((row) => row.t !== null && row.t >= bar).length).toFixed(4)),
  }));
  const unusual = rows.filter((row) => row.t !== null && row.p <= alpha);
  return Object.freeze({
    criterion: crawl.meta.criterion ?? "forms", attestedPairs: crawl.meta.attested_pairs === undefined ? null : Number(crawl.meta.attested_pairs),
    seeds: rows.length, distinctLines: lines.length, shifts, reach, minTotal: Number(crawl.meta.min_total), lexiconForms: Number(crawl.meta.lexicon_forms),
    byBar, alpha, unusual, unusualLines: new Set(unusual.map((row) => row.line)).size, unusualExpectedByChance: Number((lines.length * alpha).toFixed(2)),
    rows, method: describeCrawlMethod(),
  });
}
