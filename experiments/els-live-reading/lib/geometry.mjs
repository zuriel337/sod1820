// Descriptive geometry between two located proposals, with the definitions registered in PREREGISTERED-EXP16.md (Amendment C). Nothing here knows a word, a phrase or a topic.
//   crossing  at least one shared cell
//   parallel  the same line kind (R/R, C/C, D/D, A/A) on different lines; reading direction is ignored
//   near      no shared cell and a smallest Chebyshev distance between their cells of at most NEAR_MAX
// The cells and the line are those of the occurrence in the line the model cited (the first located occurrence).
export const NEAR_MAX = 2;

const occurrenceOf = (finding) => finding?.occurrences?.[0] ?? null;
export const lineOfReading = (reading) => String(reading ?? "").replace(/[+-]$/, "");

export function relationFacts(a, b) {
  const oa = occurrenceOf(a);
  const ob = occurrenceOf(b);
  if (!oa?.cells?.length || !ob?.cells?.length) return null;
  const inB = new Set(ob.cells.map(([i, j]) => `${i},${j}`));
  const crossing = oa.cells.some(([i, j]) => inB.has(`${i},${j}`));
  let minDist = Infinity;
  for (const [i, j] of oa.cells) for (const [k, l] of ob.cells) minDist = Math.min(minDist, Math.max(Math.abs(i - k), Math.abs(j - l)));
  const lineA = lineOfReading(oa.reading);
  const lineB = lineOfReading(ob.reading);
  return { crossing, parallel: lineA[0] === lineB[0] && lineA !== lineB, near: !crossing && minDist <= NEAR_MAX, minDist };
}

/**
 * Scores the model's own `relations` array. `raw` are the round's findings with `modelId` (the model's id) and `id` (the harness id); `classified` is the round's classification
 * (matched by `id`); `elsewhere` is an optional second {raw, classified} pair in which model ids are looked up if the first has none (a round-2 answer may point at a round-1 proposal).
 * A relation is "holds" if the registered definition for its claimed type is met, "does_not_hold" if both proposals are verified and it is not, "unverifiable" otherwise
 * (an unknown id, an unverified proposal, or the type 'other', which has no definition).
 */
export function scoreRelations(relations, { raw, classified }, elsewhere = null) {
  const find = (modelId, scope) => { const r = scope.raw.find((x) => x.modelId === modelId); return r ? scope.classified.find((c) => c.id === r.id) ?? null : null; };
  const lookup = (modelId) => find(modelId, { raw, classified }) ?? (elsewhere ? find(modelId, elsewhere) : null);
  return (relations ?? []).map((relation) => {
    const a = lookup(relation.a);
    const b = lookup(relation.b);
    const verified = (x) => Boolean(x) && x.verdict !== "not_verified" && occurrenceOf(x);
    if (!verified(a) || !verified(b)) return { ...relation, result: "unverifiable", why: !a || !b ? "unknown id" : "a proposal is not verified" };
    const facts = relationFacts(a, b);
    const defined = ["parallel", "crossing", "near"].includes(relation.type);
    if (!defined) return { ...relation, result: "unverifiable", why: "no definition for this type", facts };
    return { ...relation, result: facts[relation.type] ? "holds" : "does_not_hold", facts };
  });
}

/** Counts of crossings and near pairs among verified proposals that satisfy `keep` (parallel pairs are not counted: every two rows or columns qualify, which says nothing). */
export function pairCounts(rows, keep = () => true) {
  const chosen = rows.filter((row) => row.verdict !== "not_verified" && occurrenceOf(row) && keep(row));
  let crossing = 0;
  let near = 0;
  for (let x = 0; x < chosen.length; x += 1) for (let y = x + 1; y < chosen.length; y += 1) { const facts = relationFacts(chosen[x], chosen[y]); if (facts?.crossing) crossing += 1; else if (facts?.near) near += 1; }
  return { proposals: chosen.length, crossing, near };
}
