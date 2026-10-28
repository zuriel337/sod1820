// EXP-12 pilot: computed relations between two candidates, from their cells only (no word, no meaning). Definitions are registered in PREREGISTERED-EXP12P.md.
//   continuation  same line (same family, same chain) and the two runs overlap or touch (nothing between them)
//   same_line     same line with `gap` letters (1..GAP_MAX) between them
//   crossing      different families and at least one shared cell
//   parallel      same family, different lines, perpendicular offset <= PARALLEL_MAX cells (rounded to 0.1) and the runs overlap along the line by >= 2 cells
//   near          none of the above, smallest Chebyshev distance between cells <= 1
import { familyOf } from "./geometry.mjs";

export const PARALLEL_MAX = 6;
export const GAP_MAX = 6;
const round1 = (x) => Math.round(x * 10) / 10;

/** Pre-computes what the relations need for one candidate: coordinates along (t) and across (u) its line, a cell set and a bounding box. */
export function geometryOf(candidate) {
  const family = familyOf(candidate.family);
  const norm = Math.hypot(family.dr, family.dc);
  const t = candidate.cells.map(([i, j]) => (i * family.dr + j * family.dc) / (norm * norm));
  const u = (candidate.cells[0][0] * family.dc - candidate.cells[0][1] * family.dr) / norm; // perpendicular coordinate, constant along a line
  return { family, tMin: Math.min(...t), tMax: Math.max(...t), u, set: new Set(candidate.cells.map(([i, j]) => `${i},${j}`)), box: [Math.min(...candidate.cells.map((c) => c[0])), Math.max(...candidate.cells.map((c) => c[0])), Math.min(...candidate.cells.map((c) => c[1])), Math.max(...candidate.cells.map((c) => c[1]))] };
}

export function relationOf(a, b, ga = a.geo ?? geometryOf(a), gb = b.geo ?? geometryOf(b)) {
  let shared = 0;
  for (const key of ga.set) if (gb.set.has(key)) shared += 1;
  if (a.family === b.family) {
    if (Math.abs(ga.u - gb.u) < 1e-9) { // the same line
      const overlap = Math.max(0, Math.min(ga.tMax, gb.tMax) - Math.max(ga.tMin, gb.tMin) + 1);
      const gap = Math.max(0, Math.max(ga.tMin, gb.tMin) - Math.min(ga.tMax, gb.tMax) - 1);
      if (overlap > 0 || gap === 0) return { type: "continuation", overlap: Math.round(overlap), gap: 0, shared };
      if (gap <= GAP_MAX) return { type: "same_line", gap: Math.round(gap), shared: 0 };
      return null;
    }
    const offset = Math.abs(ga.u - gb.u);
    const overlap = Math.max(0, Math.min(ga.tMax, gb.tMax) - Math.max(ga.tMin, gb.tMin) + 1);
    if (offset <= PARALLEL_MAX + 1e-9 && overlap >= 2 - 1e-9) return { type: "parallel", offset: round1(offset), overlap: Math.round(overlap), same_direction: a.dir === b.dir, shared: 0 };
  } else if (shared > 0) {
    return { type: "crossing", shared, families: [a.family, b.family].sort().join("×") };
  }
  const [a0, a1, a2, a3] = ga.box, [b0, b1, b2, b3] = gb.box;
  if (a1 + 1 < b0 || b1 + 1 < a0 || a3 + 1 < b2 || b3 + 1 < a2) return null; // boxes more than one cell apart
  let best = Infinity;
  for (const [i, j] of a.cells) for (const [k, l] of b.cells) best = Math.min(best, Math.max(Math.abs(i - k), Math.abs(j - l)));
  return best <= 1 ? { type: "near", distance: best, shared: 0 } : null;
}

export const RELATION_RANK = Object.freeze({ continuation: 0, same_line: 1, crossing: 2, parallel: 3, near: 4 });

/** All relations among `items` (each with .id, .family, .cells, .dir), strongest first, deterministic order. */
export function relationsAmong(items) {
  const geos = items.map((item) => item.geo ?? geometryOf(item));
  const out = [];
  for (let x = 0; x < items.length; x += 1) {
    for (let y = x + 1; y < items.length; y += 1) {
      const relation = relationOf(items[x], items[y], geos[x], geos[y]);
      if (relation) out.push({ a: items[x].id, b: items[y].id, ...relation });
    }
  }
  return out.sort((p, q) => RELATION_RANK[p.type] - RELATION_RANK[q.type] || (p.offset ?? p.distance ?? p.gap ?? 0) - (q.offset ?? q.distance ?? q.gap ?? 0) || p.a.localeCompare(q.a) || p.b.localeCompare(q.b));
}

/** Relation of a candidate to the axis (a candidate-shaped object with .cells and .family). Adds "inside" (every letter is an axis letter). */
export function axisRelation(candidate, axis) {
  const set = axis.geo.set;
  const own = candidate.cells.filter(([i, j]) => set.has(`${i},${j}`)).length;
  if (own === candidate.cells.length) return { type: "inside" };
  const relation = relationOf(candidate, axis);
  if (!relation) return { type: "none" };
  return relation;
}
