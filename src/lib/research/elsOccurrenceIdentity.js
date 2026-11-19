// The identity of one exact ELS occurrence, the engine's own occurrence_id (ZURIEL 18.11.2026).
// The canonical core issues it: 'els:'||corpus_id||':'||term||':'||skip||':'||dir||':'||start
// (supabase/migrations/20260916150500_g3_els_callable_core_v1.sql and its replay,
// 20260916151000_g3_els_core_compatibility_truth_hardening_v1.sql). The cipher engine sends it on the axis and on every
// verified finding hit (tools/els/els-code.template.html, occurrenceIdOf). This module never invents another identity:
//   - occurrenceId: corpus + canonical letters + skip + direction + start. Two corpora are always two occurrences.
//   - hitId (`${skip}_${dir}_${start}`): the older key inside one matrix/record; it carries no corpus, so it identifies an
//     occurrence only together with the corpus of its record, link or engine state (elsOccurrenceFromHitId).
const FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const canonical = text => String(text ?? "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => FINALS[c]);
const integer = Number.isSafeInteger;
const CORPUS = /^[\w.-]{1,100}$/;

/** The engine's occurrence_id for an exact occurrence, or null when any part is missing. */
export function elsOccurrenceId({ corpusId, term, skip, dir, start } = {}) {
  const letters = canonical(term), step = Math.abs(Number(skip));
  if (typeof corpusId !== "string" || !CORPUS.test(corpusId) || letters.length < 2 || !integer(step) || step < 1
    || ![1, -1].includes(Number(dir)) || !integer(start) || start < 0) return null;
  return `els:${corpusId}:${letters}:${step}:${Number(dir)}:${start}`;
}

/** Parse an occurrence_id; null unless it is exactly the canonical form (so a parsed id round-trips). */
export function parseElsOccurrenceId(value) {
  if (typeof value !== "string") return null;
  const match = /^els:([\w.-]{1,100}):([א-ת]{2,}):(\d+):(-?1):(\d+)$/u.exec(value);
  if (!match) return null;
  const parsed = { corpusId: match[1], term: match[2], skip: Number(match[3]), dir: Number(match[4]), start: Number(match[5]) };
  if (elsOccurrenceId(parsed) !== value) return null;
  return { ...parsed, occurrenceId: value, hitId: `${parsed.skip}_${parsed.dir}_${parsed.start}` };
}

/** An older hitId (no corpus) read inside the corpus of its record, link or state. */
export function elsOccurrenceFromHitId(hitId, { corpusId, term } = {}) {
  const match = typeof hitId === "string" ? /^(-?\d+)_(-?1)_(\d+)$/.exec(hitId.trim()) : null;
  if (!match) return null;
  return parseElsOccurrenceId(elsOccurrenceId({ corpusId, term, skip: Number(match[1]), dir: Number(match[2]), start: Number(match[3]) }));
}

/** The axis occurrence of an engine state: the engine's own id; derived the same way only for an older engine state. */
export function elsStateAxisOccurrenceId(state) {
  if (state?.verification?.state !== "MATCH" || !state.axis) return null;
  const sent = state.axis.occurrence_id;
  if (typeof sent === "string") return parseElsOccurrenceId(sent) ? sent : null;
  return elsOccurrenceFromHitId(state.axis.hitId, { corpusId: state.verification.corpus_id, term: state.term })?.occurrenceId ?? null;
}

/** Same exact occurrence: equal ids. A missing corpus never matches anything. */
export function sameElsOccurrence(a, b) {
  return typeof a === "string" && !!parseElsOccurrenceId(a) && a === b;
}
