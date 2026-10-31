// Bounded coordinates on the EXISTING surface_semantic.els seam, not a receipt.
// Only ai-analyze's canonical replay can promote this client assertion.
export const ELS_RAZIEL_GROUNDING = "canonical_replay_v1";

export function normalizeElsRazielOccurrence(value) {
  if (!value || !["torah", "tanakh"].includes(value.scope)
    || typeof value.term !== "string" || !/^[א-ת]{2,80}$/u.test(value.term) || /[ךםןףץ]/u.test(value.term)
    || !Number.isSafeInteger(value.start) || value.start < 0
    || !Number.isSafeInteger(value.skip) || value.skip < 2 || ![1, -1].includes(value.dir)
    || typeof (value.corpusId ?? value.corpus) !== "string" || !/^[a-f0-9]{16,64}$/u.test(value.corpusId ?? value.corpus)) return null;
  return { term: value.term, scope: value.scope, corpusId: value.corpusId ?? value.corpus,
    start: value.start, skip: value.skip, dir: value.dir };
}

export function sameElsRazielOccurrence(left, right) {
  const a = normalizeElsRazielOccurrence(left), b = normalizeElsRazielOccurrence(right);
  return Boolean(a && b && ["term", "scope", "corpusId", "start", "skip", "dir"].every(key => a[key] === b[key]));
}
