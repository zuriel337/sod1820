// EXP-12 pilot: deterministic, model-free measures over a pool (rank of a pair, how many similar groups a window produces). Descriptive only; no test statistic is claimed.
//   registered (PREREGISTERED-EXP12P.md, section 4): pair score = relation priority (continuation > crossing > parallel), then the larger sum of letters, then the smaller product of E;
//   "similar groups" = PP (>= 4 letters each, ELS, parallel, offset <= 3, overlap >= 3), PPA (both tier A), PXA (both cross the axis).
//   post-hoc (labelled as such wherever it is reported): collinear pairs (same line, gap <= 2) and compact connected groups of ELS items.
const SCORE_RELATIONS = ["continuation", "crossing", "parallel"];
const PRIORITY = { continuation: 0, crossing: 1, parallel: 2 };
export const isEls = (item) => item.skip >= 2;
const e = (item) => (item.E === null || item.E === undefined ? 1 : item.E);

const itemsById = (pool) => new Map(pool.items.map((item) => [item.id, item]));
const pairKey = (r) => `${r.a}|${r.b}`;

/** All scored pairs, best first. `elsOnly` keeps pairs whose two items are both ELS (skip >= 2). */
export function rankedPairs(pool, { elsOnly = false, types = SCORE_RELATIONS } = {}) {
  const byId = itemsById(pool);
  const rows = [];
  for (const r of pool.relations) {
    if (!types.includes(r.type)) continue;
    const a = byId.get(r.a), b = byId.get(r.b);
    if (elsOnly && !(isEls(a) && isEls(b))) continue;
    rows.push({ a: r.a, b: r.b, type: r.type, letters: a.text.length + b.text.length, E: e(a) * e(b), priority: PRIORITY[r.type] ?? 9 });
  }
  return rows.sort((x, y) => x.priority - y.priority || y.letters - x.letters || x.E - y.E || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}
/** 1-based rank of the pair of ids in `rankedPairs`, or null when the pair is not scored (its relation is not one of the scored types). */
export function rankOfPair(pool, idA, idB, options) {
  const [a, b] = [idA, idB].sort();
  const k = rankedPairs(pool, options).findIndex((row) => row.a === a && row.b === b);
  return k < 0 ? null : k + 1;
}

/** Registered counts of similar groups: PP, PPA, PXA. */
export function similarGroups(pool) {
  const byId = itemsById(pool);
  const out = { PP: 0, PPA: 0, PXA: 0 };
  for (const r of pool.relations) {
    if (r.type !== "parallel" || r.offset > 3 || r.overlap < 3) continue;
    const a = byId.get(r.a), b = byId.get(r.b);
    if (!isEls(a) || !isEls(b) || a.text.length < 4 || b.text.length < 4) continue;
    out.PP += 1;
    if (a.tier === "A" && b.tier === "A") out.PPA += 1;
    const crosses = (i) => i.axis && (i.axis.type === "crossing" || i.axis.type === "inside");
    if (crosses(a) && crosses(b)) out.PXA += 1;
  }
  return out;
}

/** Post-hoc: ELS pairs on one line (same_line, gap <= maxGap). */
export function collinearPairs(pool, { maxGap = 2, minLetters = 4 } = {}) {
  const byId = itemsById(pool);
  return pool.relations.filter((r) => r.type === "same_line" && r.gap <= maxGap && isEls(byId.get(r.a)) && isEls(byId.get(r.b)) && byId.get(r.a).text.length >= minLetters && byId.get(r.b).text.length >= minLetters);
}

/** Post-hoc: connected groups of ELS items (>= minLetters) under tight non-crossing relations: same line with gap <= 2, or parallel with offset <= 1 and overlap >= 3 (crossing and nesting are left out:
 *  they chain a whole pool into one component). Largest first. */
export function compactGroups(pool, { minLetters = 4, minSize = 3 } = {}) {
  const byId = itemsById(pool);
  const ok = (id) => isEls(byId.get(id)) && byId.get(id).text.length >= minLetters;
  const tight = (r) => (r.type === "same_line" && r.gap <= 2) || (r.type === "parallel" && r.offset <= 1 && r.overlap >= 3);
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const r of pool.relations) {
    if (!tight(r) || !ok(r.a) || !ok(r.b)) continue;
    for (const id of [r.a, r.b]) if (!parent.has(id)) parent.set(id, id);
    parent.set(find(r.a), find(r.b));
  }
  const groups = new Map();
  for (const id of parent.keys()) { const root = find(id); (groups.get(root) ?? groups.set(root, []).get(root)).push(id); }
  return [...groups.values()].filter((g) => g.length >= minSize).map((ids) => {
    const cells = ids.flatMap((id) => byId.get(id).cells);
    return { ids: ids.sort(), size: ids.length, rows: [Math.min(...cells.map((c) => c[0])), Math.max(...cells.map((c) => c[0]))], cols: [Math.min(...cells.map((c) => c[1])), Math.max(...cells.map((c) => c[1]))] };
  }).sort((x, y) => y.size - x.size || x.ids[0].localeCompare(y.ids[0]));
}

/** One line of numbers per window for the report. */
export function windowStats(pool) {
  const groups = compactGroups(pool);
  const pairs = compactGroups(pool, { minSize: 2 });
  return { id: pool.id, items: pool.items.length, relations: pool.relations.length, ...similarGroups(pool), collinear: collinearPairs(pool).length, tight_pairs_or_more: pairs.length, compact_groups: groups.length, largest_group: groups[0]?.size ?? 0, top_pair_els: rankedPairs(pool, { elsOnly: true })[0] ?? null };
}
