// EXP-07: a dictionary-free sequence detector. It reads the letters of a matrix window along straight lines and asks which runs of k letters are ALSO
// consecutive letters of the Torah text (an attested sequence), then calibrates that against the same measurement on the same window shape moved to
// other places of the text. It needs no word list: the text itself is the language.
//
// What this module is not: it does not search for anything and creates no ELS occurrence. The window comes from an occurrence the canonical engine
// already reported; lines of the displayed grid are read and compared to the plain text. Horizontal lines are the text itself (skip 1) and are not counted.
import { occurrenceCells, regionAroundPositions } from "./geometry.mjs";
import { checkedLines } from "./crawl.mjs";
import { baseLetters } from "./letters.mjs";

export const SEQUENCE_KS = Object.freeze([6, 7, 8, 9]);
const SHIFT_MULTIPLIER = 104729; // same deterministic offsets as the crawler
// Straight lines of a displayed grid that are ELS (not plain text): down, down-right, down-left. Reversed reading is tested by reversing the string.
const LINES = Object.freeze([{ id: 1, name: "down", dr: 1, dc: 0 }, { id: 2, name: "down_right", dr: 1, dc: 1 }, { id: 3, name: "down_left", dr: 1, dc: -1 }]);
const ACROSS = Object.freeze({ id: 4, name: "across", dr: 0, dc: 1 }); // plain text: read in the real window only, to locate given strings; never counted

const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};

/** The window around an engine occurrence, like the guided-discovery window (the occurrence's cells plus `margin` rows and columns, clipped to the matrix). */
export function sequenceWindow({ width, totalLetters, axis, margin = 20 }) {
  int(axis.length, 2, 40, "axis.length");
  const positions = Array.from({ length: axis.length }, (_, i) => axis.start + axis.dir * axis.skip * i);
  const region = regionAroundPositions({ positions, width, totalLetters, margin });
  const cells = occurrenceCells(axis.start, axis.skip, axis.dir, axis.length, width);
  return Object.freeze({ region, axisCells: Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row, col: cell.col }))) });
}

/** Number of ELS windows of length k in an R x C window (down, down-right, down-left; horizontal text lines excluded). */
export function windowCount(rows, cols, k) {
  if (rows < k) return 0;
  return (rows - k + 1) * cols + 2 * (rows - k + 1) * Math.max(0, cols - k + 1);
}

/** JS twin of the window enumeration: every run of k letters on the three ELS line types, with its start cell and line id. */
export function enumerateWindows(grid, k) {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      for (const line of LINES) {
        const endRow = r + line.dr * (k - 1);
        const endCol = c + line.dc * (k - 1);
        if (endRow >= rows || endCol < 0 || endCol >= cols) continue;
        let text = "";
        for (let j = 0; j < k; j += 1) text += grid[r + line.dr * j][c + line.dc * j];
        out.push({ row: r, col: c, line: line.name, text });
      }
    }
  }
  return out;
}

const hebrewProbe = (value) => {
  if (typeof value !== "string" || !/^[א-ת]{2,16}$/u.test(value)) throw new TypeError("probe strings must be 2-16 Hebrew letters");
  return baseLetters(value);
};

/**
 * Read-only query. For the real window (m = 0) and `shifts` windows of the same shape moved to other places of the text: how many runs of k letters
 * are attested sequences of the text, in total and among those that touch the axis. Output: checksummed plain lines.
 *   C|k|windows|attested|attested_touching|null_mean|null_max|null_ge|null_mean_touch|null_ge_touch   one per k
 *   L|k|line|row|col|run|touch|reading|phrase                                                          attested real runs of 7+ letters
 *   P|string|forward|reverse                                                                           optional: occurrences of given strings in the plain text (never used by the detector)
 *   W|string|line|row|col|reading|touch                                                                optional: where a given string sits in the real window, on any line (post-run evaluation only)
 */
export function sequenceScanSql({ width, totalLetters, axis, margin = 20, shifts = 100, ks = SEQUENCE_KS, probes = [], grid = "torah", timeoutMs = 55000 }) {
  int(width, 5, 1_000_000, "width"); int(shifts, 10, 300, "shifts"); int(timeoutMs, 1000, 600000, "timeoutMs");
  if (!["torah", "tanakh"].includes(grid)) throw new RangeError("grid must be torah or tanakh");
  const gridTable = grid === "tanakh" ? "public.tanakh_stream" : "public.torah_stream"; // the grid is read from the matrix's own stream; the attested text is always the Torah
  if (!Array.isArray(ks) || !ks.length || ks.some((k) => !Number.isSafeInteger(k) || k < 4 || k > 12)) throw new RangeError("ks must be integers in [4, 12]");
  if (!Array.isArray(probes) || probes.length > 12) throw new RangeError("at most 12 probe strings");
  const { region, axisCells } = sequenceWindow({ width, totalLetters, axis, margin });
  const kmax = Math.max(...ks);
  const axisRows = axisCells.map((cell) => `(${cell.row}, ${cell.col})`).join(", ");
  const kValues = ks.map((k) => `(${k})`).join(", ");
  const sets = ks.map((k) => `select ${k} as k, substr(gk, 1, ${k}) as g from w where length(gk) >= ${k}`).join("\n  union\n  ");
  const lineValues = [...LINES, ACROSS].map((line) => `(${line.id}, ${line.dr}, ${line.dc}, '${line.name}')`).join(", ");
  const probeValues = probes.map((p) => `('${hebrewProbe(p)}')`).join(", ");
  const probeUnion = probes.length
    ? `\n  union all\n  select 'P|' || p.s || '|' || ((length(txt.t) - length(replace(txt.t, p.s, ''))) / length(p.s)) || '|' || ((length(txt.t) - length(replace(txt.t, reverse(p.s), ''))) / length(p.s))
  from (values ${probeValues}) p(s) cross join (select string_agg(ch, '' order by idx) as t from ${gridTable}) txt
  union all
  select 'W|' || p.s || '|' || l.name || '|' || ru.r || '|' || ru.c || '|' || case when substr(ru.s, 1, length(p.s)) = p.s then 'forward' else 'reverse' end || '|' ||
    exists (select 1 from axis x, generate_series(0, length(p.s) - 1) jj where ru.r + l.dr * jj = x.ar and ru.c + l.dc * jj = x.ac)
  from runs ru join lines l on l.d = ru.d join (values ${probeValues}) p(s) on ru.len >= length(p.s) and (substr(ru.s, 1, length(p.s)) = p.s or substr(ru.s, 1, length(p.s)) = reverse(p.s)) where ru.m = 0`
    : "";
  return `set local statement_timeout = '${timeoutMs}ms';
set local enable_nestloop = off;
with n as (select max(idx)::bigint as total from ${gridTable}),
shifts as (select m, case when m = 0 then 0::bigint else (m::bigint * ${SHIFT_MULTIPLIER}) % (select total from n) end as delta from generate_series(0, ${shifts}) m),
axis(ar, ac) as (values ${axisRows}),
ks(k) as (values ${kValues}),
lines(d, dr, dc, name) as (values ${lineValues}),
cells as materialized (
  select sh.m, rr, cc, t.ch
  from shifts sh cross join generate_series(${region.r0}, ${region.r1}) rr cross join generate_series(${region.c0}, ${region.c0 + region.cw - 1}) cc
  join ${gridTable} t on t.idx = ((rr::bigint * ${width} + cc + sh.delta) % (select total from n)) + 1
),
runs as materialized (
  select a.m, a.rr as r, a.cc as c, l.d, string_agg(b.ch, '' order by j) as s, count(*)::int as len
  from cells a cross join lines l cross join generate_series(0, ${kmax - 1}) j
  join cells b on b.m = a.m and b.rr = a.rr + l.dr * j and b.cc = a.cc + l.dc * j
  where l.d <> ${ACROSS.id} or a.m = 0
  group by a.m, a.rr, a.cc, l.d
),
cand as materialized (
  select ru.m, ru.r, ru.c, ru.d, k.k, substr(ru.s, 1, k.k) as g,
    exists (select 1 from axis x, lines l where l.d = ru.d and x.ar >= ru.r and x.ar - ru.r <= k.k - 1 and x.ac = ru.c + l.dc * (x.ar - ru.r)) as touch
  from runs ru cross join ks k where ru.len >= k.k and ru.d <> ${ACROSS.id}
),
w as materialized (select idx, string_agg(ch, '') over (order by idx rows between current row and ${kmax - 1} following) as gk from public.torah_stream),
setk as materialized (
  ${sets}
),
att as materialized (
  select c.*, false as rev from cand c where exists (select 1 from setk s where s.k = c.k and s.g = c.g)
  union all
  select c.*, true as rev from cand c where exists (select 1 from setk s where s.k = c.k and s.g = reverse(c.g))
),
tot as (select m, k, count(*) as n_all from cand group by m, k),
att_c as (select m, k, count(*) as n_att, count(*) filter (where touch) as n_touch from att group by m, k),
per as (
  select t.m, t.k, t.n_all, coalesce(a.n_att, 0) as n_att, coalesce(a.n_touch, 0) as n_touch from tot t left join att_c a on a.m = t.m and a.k = t.k
),
summary as (
  select o.k, o.n_all, o.n_att, o.n_touch,
    round(avg(z.n_att)::numeric, 3) as null_mean, max(z.n_att) as null_max, count(*) filter (where z.n_att >= o.n_att) as null_ge,
    round(avg(z.n_touch)::numeric, 3) as null_mean_touch, count(*) filter (where z.n_touch >= o.n_touch) as null_ge_touch
  from per o join per z on z.k = o.k and z.m >= 1 where o.m = 0 group by o.k, o.n_all, o.n_att, o.n_touch
),
bi as materialized (
  select distinct translate(v.words[i], 'ךםןףץ', 'כמנפצ') as a, translate(v.words[i + 1], 'ךםןףץ', 'כמנפצ') as b
  from public.tanach_verses v, lateral generate_series(1, coalesce(array_length(v.words, 1), 0) - 1) i
  where v.book_idx between 0 and 4 and v.words[i] ~ '^[א-ת]{2,12}$' and v.words[i + 1] ~ '^[א-ת]{2,12}$'
),
bi_cat as materialized (select a || b as g, (array_agg(a || '+' || b))[1] as split from bi group by a || b),
real as (
  select a.k, l.name, a.r, a.c, a.g, a.touch, a.rev, case when a.rev then reverse(a.g) else a.g end as reading
  from att a join lines l on l.d = a.d where a.m = 0 and a.k >= 7
),
out_lines as (
  select 'C|' || k || '|' || n_all || '|' || n_att || '|' || n_touch || '|' || null_mean || '|' || null_max || '|' || null_ge || '|' || null_mean_touch || '|' || null_ge_touch as line from summary
  union all
  select 'L|' || r.k || '|' || r.name || '|' || r.r || '|' || r.c || '|' || r.g || '|' || r.touch || '|' || r.reading || '|' || coalesce(b.split, '-') as line
  from real r left join bi_cat b on b.g = r.reading${probeUnion}
)
,
res as materialized (select coalesce(jsonb_agg(jsonb_build_object('s', line, 'md5', md5(line)) order by line), '[]'::jsonb) as lines from out_lines)
select jsonb_build_object(
  'meta', jsonb_build_object('shifts', ${shifts}, 'ks', '${JSON.stringify(ks)}'::jsonb, 'window', jsonb_build_object('r0', ${region.r0}, 'r1', ${region.r1}, 'c0', ${region.c0}, 'c1', ${region.c0 + region.cw - 1}), 'width', ${width}, 'grid', '${grid}', 'db_ms', round(extract(epoch from clock_timestamp() - statement_timestamp()) * 1000)),
  'lines', res.lines
) as scan from res;`;
}

/** Parses the checksummed lines into per-k calibration rows, the attested real runs and the optional plain-text probes. */
export function summarizeSequenceScan({ scan }) {
  const shifts = Number(scan.meta.shifts);
  const rows = [];
  const runs = [];
  const probes = [];
  const windowHits = [];
  for (const line of checkedLines(scan.lines, "sequence scan")) {
    const parts = line.split("|");
    if (parts[0] === "C") {
      const [, k, windows, attested, touching, nullMean, nullMax, nullGe, nullMeanTouch, nullGeTouch] = parts;
      rows.push(Object.freeze({
        k: Number(k), windows: Number(windows), attested: Number(attested), attestedTouching: Number(touching),
        nullMean: Number(nullMean), nullMax: Number(nullMax), p: (1 + Number(nullGe)) / (shifts + 1),
        nullMeanTouching: Number(nullMeanTouch), pTouching: (1 + Number(nullGeTouch)) / (shifts + 1),
      }));
    } else if (parts[0] === "L") {
      const [, k, lineName, row, col, run, touch, reading, phrase] = parts;
      runs.push(Object.freeze({ k: Number(k), line: lineName, row: Number(row), col: Number(col), run, touching: touch === "true", reading, phrase: phrase === "-" ? null : phrase }));
    } else if (parts[0] === "W") {
      windowHits.push(Object.freeze({ text: parts[1], line: parts[2], row: Number(parts[3]), col: Number(parts[4]), reading: parts[5], touching: parts[6] === "true" }));
    } else if (parts[0] === "P") {
      probes.push(Object.freeze({ text: parts[1], forward: Number(parts[2]), reverse: Number(parts[3]) }));
    } else throw new Error(`unknown sequence scan line type ${parts[0]}`);
  }
  rows.sort((a, b) => a.k - b.k);
  runs.sort((a, b) => b.k - a.k || a.row - b.row || a.col - b.col);
  // Presented candidates = attested runs of lengths for which chance alone gives less than one per page; their false-positive load is the sum of those chance means.
  const presentedLengths = rows.filter((row) => row.nullMean < 1).map((row) => row.k);
  const presented = runs.filter((run) => presentedLengths.includes(run.k));
  const expectedFalse = Number(rows.filter((row) => presentedLengths.includes(row.k)).reduce((sum, row) => sum + row.nullMean, 0).toFixed(3));
  return Object.freeze({ shifts, window: scan.meta.window, width: scan.meta.width, grid: scan.meta.grid ?? "torah", byLength: rows, runs, probes, windowHits, presentedLengths, presented: presented.length, expectedFalsePositives: expectedFalse });
}

export function describeSequenceMethod() {
  return [
    "Dictionary-free sequence detector (EXP-07). The text of the Torah is the language; no word list is used.",
    "1. The window is the one the guided discovery uses: the engine occurrence's cells plus 20 rows and 20 columns, clipped to the matrix.",
    "2. Lines read: down, down-right, down-left (ELS lines of the grid). Horizontal lines are the plain text itself and are not counted. Both reading directions are tested (the run and its reverse).",
    "3. A run of k letters is attested when the same k letters occur as consecutive letters of the Torah text (letter-level, final letters folded).",
    "4. Calibration: the identical count on `shifts` windows of the same shape moved by fixed pseudo-random offsets. p = (1 + shifted windows with at least as many attested runs) / (shifts + 1), per length k, for all runs and for runs touching the axis.",
    "5. Presented candidates are attested runs of lengths for which chance alone gives less than one per page; their false-positive load is the sum of those chance means.",
    "6. A run of 7+ letters is also checked against attested adjacent word pairs (46,885 pairs of the five books); a split is a Torah phrase only if that pair occurs.",
    "7. Limits: attestation is not meaning; lengths 5-6 are common by chance; a window of 7 rows cannot hold diagonal runs longer than 7; windows overlap, so lengths are not independent; no AI and no engine call are involved after the occurrence is given.",
  ].join("\n");
}
