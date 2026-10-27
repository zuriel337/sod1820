// EXP-13: the crossing measure. Only runs that share a cell with the axis are enumerated (not the whole pool), annotated with the product reader's output
// (lib/reading.mjs) and scored by how rare it is, for a window of this shape, to contain a crossing run at least this long that reads at least this well.
import { LINES, READ_BUCKETS, bucketOf } from "./ranking.mjs";

export const CROSS_MIN = 4;
export const CROSS_MAX = 10;
const reverseText = (text) => [...text].reverse().join("");

/** Crossing runs: for every axis cell and every line type other than the axis' own, every run of CROSS_MIN..CROSS_MAX letters that contains the cell, both directions. */
export function enumerateCrossing({ letterAt, axisCells, axisLine, minLen = CROSS_MIN, maxLen = CROSS_MAX }) {
  const seen = new Set();
  const out = [];
  for (const [row, col] of axisCells) {
    for (const line of LINES) {
      if (line.name === axisLine) continue;
      for (let length = minLen; length <= maxLen; length += 1) {
        for (let k = 0; k < length; k += 1) {
          const r0 = row - line.dr * k;
          const c0 = col - line.dc * k;
          const key = `${line.name}:${r0}:${c0}:${length}`;
          if (seen.has(key)) continue;
          let text = "";
          const cells = [];
          for (let j = 0; j < length; j += 1) {
            const r = r0 + line.dr * j;
            const c = c0 + line.dc * j;
            const letter = letterAt(r, c);
            if (letter === undefined) { text = null; break; }
            text += letter;
            cells.push([r, c]);
          }
          if (text === null) continue;
          seen.add(key);
          out.push({ surface: text, cells: cells.slice(), line: line.name, text: line.text, reverse: false, len: length });
          out.push({ surface: reverseText(text), cells: cells.slice().reverse(), line: line.name, text: line.text, reverse: true, len: length });
        }
      }
    }
  }
  return out;
}

/** m[L]: the highest readScore bucket among the window's crossing candidates of length L (only readScore >= 0.75 counts). */
export function bestByLength(candidates) {
  const best = {};
  for (const c of candidates) {
    const bucket = bucketOf(c.readScore);
    if (bucket > 0 && bucket > (best[c.len] ?? 0)) best[c.len] = bucket;
  }
  return best;
}

const hasAtLeast = (m, length, bucket) => Object.entries(m).some(([len, b]) => Number(len) >= length && b >= bucket);

/** T[L][b] = share of the windows that contain a crossing run of length >= L reading at bucket >= b (floored at 1/(n+1)). */
export function crossingTable(windowBest) {
  const n = windowBest.length;
  const table = {};
  for (let length = CROSS_MIN; length <= CROSS_MAX; length += 1) {
    table[length] = {};
    for (const bucket of READ_BUCKETS) {
      const count = windowBest.filter((m) => hasAtLeast(m, length, bucket)).length;
      table[length][bucket] = Math.max(count / n, 1 / (n + 1));
    }
  }
  return table;
}

/** X(c) = -log10 T[len][bucket]; 0 for a run that does not read at least at the lowest bucket. */
export function crossingScore(candidate, table) {
  const bucket = bucketOf(candidate.readScore);
  if (bucket === 0 || !table[candidate.len]) return 0;
  return -Math.log10(table[candidate.len][bucket]);
}

/** S(w): the largest X among the window's crossing candidates. */
export const windowStatistic = (candidates, table) => candidates.reduce((best, c) => Math.max(best, crossingScore(c, table)), 0);

/** The ranker D (order by X, then lexicalConfidence, then length), in the shape rankFindings accepts. */
export const rankerD = Object.freeze({
  eligible: (c, ctx) => c.cross && c.line !== ctx.axisLine && c.readScore >= 0.75,
  tuple: (c, ctx) => [crossingScore(c, ctx.crossTable), c.lexConf, c.len],
});
