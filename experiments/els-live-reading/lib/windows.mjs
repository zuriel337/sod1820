// EXP-16: random control windows of the same shape as the Columbia region (33 rows x 41 columns of the width-4545 Torah matrix), chosen by a seeded generator whose seed
// is fixed in the pre-registration before any window is looked at. The letters are fetched with read-only SQL from public.torah_stream and checksummed per row; a second
// copy (the text embedded in the page) is compared cell by cell by the loader, exactly as for the Columbia region.
import { createHash } from "node:crypto";

export const WINDOW_ROWS = 33;
export const WINDOW_COLS = 41;
export const MATRIX_WIDTH = 4545;
/** The Columbia region (rows 34-66, columns 3315-3355) is excluded, so no control window shares a cell with it. */
export const COLUMBIA = Object.freeze({ r0: 34, r1: 66, c0: 3315, c1: 3355 });

export const seedOf = (label) => parseInt(createHash("sha256").update(label, "utf8").digest("hex").slice(0, 8), 16) >>> 0;

/** mulberry32: a small deterministic generator (same sequence in every runtime). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (a, b) => a.r0 <= b.r1 && b.r0 <= a.r1 && a.c0 <= b.c1 && b.c0 <= a.c1;

/**
 * n disjoint windows. Rows start in [0, rowMax] so that the last row is a complete row of the stream (the stream is 67 rows plus a partial one); columns keep a margin of
 * 21 from both edges of the matrix so no diagonal of the window wraps into another row. Rejection sampling in generation order, so the first k windows of a longer
 * list are the k windows of a shorter one.
 */
export function sampleWindows({ seed, n, rowMax = 34, margin = 21, exclude = [COLUMBIA] }) {
  const next = mulberry32(seed);
  const out = [];
  let guard = 0;
  while (out.length < n) {
    if ((guard += 1) > 10_000) throw new Error("could not place the windows");
    const r0 = Math.floor(next() * (rowMax + 1));
    const c0 = margin + Math.floor(next() * (MATRIX_WIDTH - WINDOW_COLS - 2 * margin + 1));
    const w = { r0, r1: r0 + WINDOW_ROWS - 1, c0, c1: c0 + WINDOW_COLS - 1 };
    if ([...exclude, ...out].some((other) => overlaps(w, other))) continue;
    out.push(w);
  }
  return out.map((w, k) => ({ id: `w${String(k + 1).padStart(2, "0")}`, ...w }));
}

/** One read-only SELECT returning, for every window and row, the 41 letters and their md5. */
export function windowsSql(windows) {
  for (const w of windows) for (const [name, value] of Object.entries({ r0: w.r0, c0: w.c0 })) if (!Number.isSafeInteger(value) || value < 0 || value > 100_000) throw new RangeError(`bad ${name}`);
  const values = windows.map((w) => { if (!/^w\d{2}$/.test(w.id)) throw new TypeError("bad window id"); return `('${w.id}', ${w.r0}, ${w.c0})`; }).join(", ");
  return `set local statement_timeout = '55000ms';
select jsonb_agg(jsonb_build_object('id', id, 'r', r, 's', s, 'md5', md5(s)) order by id, r) as rows
from (
  select w.id, w.r0 + k as r, string_agg(t.ch, '' order by t.idx) as s
  from (values ${values}) w(id, r0, c0)
  cross join generate_series(0, ${WINDOW_ROWS - 1}) k
  join public.torah_stream t on t.idx between (w.r0 + k) * ${MATRIX_WIDTH} + w.c0 + 1 and (w.r0 + k) * ${MATRIX_WIDTH} + w.c0 + ${WINDOW_COLS}
  group by w.id, w.r0, k
) q;`;
}

/** The region data files (same shape as data/region-columbia.json, no axis) from the rows the SQL returned. */
export function windowFiles(windows, sqlRows) {
  return windows.map((w) => {
    const rows = sqlRows.filter((row) => row.id === w.id).sort((a, b) => a.r - b.r);
    if (rows.length !== WINDOW_ROWS) throw new Error(`${w.id}: ${rows.length} rows`);
    for (const row of rows) if ([...row.s].length !== WINDOW_COLS) throw new Error(`${w.id} row ${row.r}: ${[...row.s].length} letters`);
    return {
      source: "public.torah_stream via execute_sql on project linswmnnkjxvweumprav; idx = row * width + col + 1 (0-based position = idx - 1). EXP-16 control window.",
      scope: "torah", width: MATRIX_WIDTH, rows: [w.r0, w.r1], cols: [w.c0, w.c1], axis: null,
      grid: rows.map((row) => ({ r: row.r, s: row.s, md5: row.md5 })),
    };
  });
}
