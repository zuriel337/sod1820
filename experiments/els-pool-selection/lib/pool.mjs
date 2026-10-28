// EXP-12 pilot: builds the candidate pool of a window. The generator is local and exhaustive over the registered families (every run of letters of the canonical stream that is a word
// of the word list), and every candidate that reaches the pool is confirmed by the engine afterwards (verify.mjs). The shortlist rule is registered before any pool is looked at.
import { FAMILIES, cellOfPosition, engineParams, linesOf, positionAt } from "./geometry.mjs";
import { axisRelation, geometryOf, relationOf, relationsAmong } from "./relations.mjs";

export const POOL_RULE = Object.freeze({ minLen: 4, maxLen: 9, K: 300, tierACap: 120, tierBCap: 100, tierCMinLen: 6, tierBRelations: ["parallel", "crossing", "near", "continuation", "same_line"], parallelForTierB: 3 });

/** Expected occurrences of `text` at `skip` in the whole Torah (both directions), from the Torah's own letter frequencies. */
export function chanceExpectation(model, text, skip) {
  if (skip < 2) return null;
  const letters = [...text];
  const starts = Math.max(0, model.N - (letters.length - 1) * skip);
  let p = 1;
  for (const ch of letters) p *= (model.counts.get(ch) ?? 0) / model.N;
  return 2 * starts * p;
}

/** grid: nRows strings of nCols letters (letters of the stream in window order). Returns every word occurrence along the registered families, maximal per reading. */
export function scanWindow({ win, grid, lexicon, minLen = POOL_RULE.minLen, maxLen = POOL_RULE.maxLen, chance, maximal = true }) {
  const found = [];
  for (const family of FAMILIES) {
    for (const line of linesOf(win, family)) {
      for (const reversed of [false, true]) {
        const cells = reversed ? line.cells.slice().reverse() : line.cells;
        const letters = cells.map(([i, j]) => grid[i - 1][j - 1]).join("");
        const local = [];
        for (let a = 0; a + minLen <= letters.length; a += 1) {
          for (let len = minLen; len <= maxLen && a + len <= letters.length; len += 1) {
            const text = letters.slice(a, a + len);
            const entry = lexicon.get(text);
            if (entry) local.push({ a, b: a + len, text, entry });
          }
        }
        for (const x of local) {
          if (maximal && local.some((y) => y !== x && y.a <= x.a && y.b >= x.b && y.b - y.a > x.b - x.a)) continue; // maximal per reading (the registered rule); maximal:false lists every occurrence
          const runCells = cells.slice(x.a, x.b);
          const p = engineParams(win, runCells);
          found.push({ text: x.text, family: family.id, lineId: line.id, reversed, cells: runCells, positions: p.positions, start: p.start, skip: p.skip, dir: p.dir, lex: x.entry, E: chance ? chanceExpectation(chance, x.text, p.skip) : null,
            before: cells.slice(Math.max(0, x.a - 6), x.a).map(([i, j]) => grid[i - 1][j - 1]).join(""), after: cells.slice(x.b, x.b + 6).map(([i, j]) => grid[i - 1][j - 1]).join("") });
        }
      }
    }
  }
  // a palindrome is read twice over the same cells: keep the forward reading
  const seen = new Map();
  for (const c of found) { const key = `${c.text}|${c.family}|${[...c.positions].sort((x, y) => x - y).join(",")}`; if (!seen.has(key) || (seen.get(key).dir < 0 && c.dir > 0)) seen.set(key, c); }
  return [...seen.values()];
}

export function makeAxis({ win, positions, term = null }) {
  const cells = positions.map((p) => cellOfPosition(win, p)).filter(Boolean);
  const step = positions.length > 1 ? positions[1] - positions[0] : 0;
  const skip = Math.abs(step);
  const family = FAMILIES.find((f) => f.dr * win.width + f.dc === skip) ?? null;
  const axis = { term, positions, cells, skip, step, dir: step > 0 ? 1 : -1, family: family?.id ?? null, reversed: step < 0 };
  axis.geo = family ? geometryOf({ family: family.id, cells }) : null;
  return axis;
}

const E_OF = (c) => (c.E === null ? Infinity : c.E);
const byStrength = (x, y) => y.text.length - x.text.length || E_OF(x) - E_OF(y) || x.text.localeCompare(y.text) || x.start - y.start || x.skip - y.skip;

/** The shortlist rule (registered): tier A = attached to the axis (crossing or continuing it), tier B = related to a tier-A item, tier C = the longest words anywhere; K in all. */
export function shortlist({ candidates, axis, rule = POOL_RULE }) {
  const pool = candidates.filter((c) => c.text.length >= rule.minLen);
  for (const c of pool) { c.geo = geometryOf(c); c.axisRelation = axis.geo ? axisRelation(c, axis) : { type: "none" }; }
  const visible = pool.filter((c) => c.axisRelation.type !== "inside");
  const tierA = visible.filter((c) => c.axisRelation.type === "crossing" || c.axisRelation.type === "continuation").sort(byStrength).slice(0, rule.tierACap);
  const taken = new Set(tierA);
  const related = (c) => tierA.some((a) => { const r = relationOf(c, a); return r && rule.tierBRelations.includes(r.type) && (r.type !== "parallel" || r.offset <= rule.parallelForTierB); });
  const tierB = visible.filter((c) => !taken.has(c) && related(c)).sort(byStrength).slice(0, rule.tierBCap);
  tierB.forEach((c) => taken.add(c));
  const tierC = visible.filter((c) => !taken.has(c) && c.text.length >= rule.tierCMinLen).sort(byStrength).slice(0, Math.max(0, rule.K - taken.size));
  const chosen = [...tierA.map((c) => [c, "A"]), ...tierB.map((c) => [c, "B"]), ...tierC.map((c) => [c, "C"])];
  // neutral ids: by position in the window (top to bottom, then by column), never by tier or strength
  const ordered = chosen.map(([c, tier]) => ({ ...c, tier })).sort((x, y) => x.cells[0][0] - y.cells[0][0] || x.cells[0][1] - y.cells[0][1] || x.text.localeCompare(y.text) || x.skip - y.skip || x.dir - y.dir);
  ordered.forEach((c, k) => { c.id = `F${String(k + 1).padStart(3, "0")}`; });
  return { items: ordered, counts: { candidates: found(pool), visibleLen4: visible.length, tierA: tierA.length, tierB: tierB.length, tierC: tierC.length } };
}
const found = (list) => list.length;

export function poolRelations(items) { return relationsAmong(items); }
export { positionAt };
