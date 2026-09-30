// Independent replay verifier (benchmark-side). Re-derives an occurrence from the raw canonical string by direct
// character comparison — shares NO code with the strategies. Mirrors the els_verify_occurrence_v1 contract:
// zero-based indexes, dir=+1: positions start+k*skip; dir=-1: positions start-k*skip; all inside scope [0,N).
import { norm } from './corpus.mjs';

export function positionsOf(term, hit) {
  const L = term.length, p = new Array(L);
  for (let k = 0; k < L; k++) p[k] = hit.start + hit.dir * k * hit.skip;
  return p;
}
export function replayVerify(view, rawTerm, hit) {
  const t = norm(rawTerm), L = t.length;
  if (L < 2 || !Number.isInteger(hit.skip) || hit.skip < 1 || (hit.dir !== 1 && hit.dir !== -1) || !Number.isInteger(hit.start)) return 'MISMATCH';
  const p = positionsOf(t, hit);
  for (let k = 0; k < L; k++) {
    if (p[k] < 0 || p[k] >= view.N) return 'MISMATCH';
    if (view.letters[p[k]] !== t[k]) return 'MISMATCH';
  }
  return 'MATCH';
}
export const hitKey = (h) => `${h.skip}|${h.start}|${h.dir}`;
// canonical result ordering of els_occurrences_internal_v1: skip asc, start asc, dir desc (forward first)
export const canonicalCompare = (a, b) => a.skip - b.skip || a.start - b.start || b.dir - a.dir;
