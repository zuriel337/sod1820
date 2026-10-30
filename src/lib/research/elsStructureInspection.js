import { parseElsHitKey } from "../elsJourney.js";
import { captureElsResearchReturn, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";
import { extractElsVectorGeometry } from "./els2029VectorGeometry.js";

// Presentation adapter over canonical verified occurrence identities and the existing
// vector geometry owner. No search, lexical generation, score or new result authority.
export function inspectElsStructures(state) {
  const snapshot = captureElsResearchReturn(state);
  const width = state?.geometry?.S;
  if (!snapshot || !Number.isSafeInteger(width) || width < 2 || !Number.isSafeInteger(state.corpusLetters))
    return { ok: false, reason: "נדרשת מטריצה מאומתת עם זהות טקסט וגיאומטריה." };
  const origin = { term: snapshot.normalizedTerm, corpus: snapshot.scope, corpusId: snapshot.corpusId,
    start: snapshot.axis.start, skip: snapshot.axis.skip, dir: snapshot.axis.dir };
  const lines = [], seen = new Set();
  const add = (term, hitId, kind) => {
    const anchor = parseElsHitKey(hitId);
    const normalized = term.replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]));
    if (!anchor || normalized.length < 2 || normalized.length > 100 || !Number.isSafeInteger(anchor.start)
      || !Number.isSafeInteger(anchor.skip) || anchor.skip < (kind === "source" ? 1 : 2)) return false;
    const id = `${normalized}:${hitId}`;
    if (seen.has(id)) return true;
    // Expand the engine-owned exact identity, not a new matching/search calculation.
    const positions = Array.from(normalized, (_, index) => anchor.start + index * anchor.skip * anchor.dir);
    if (positions.some(p => !Number.isSafeInteger(p) || p < 0 || p >= state.corpusLetters)) return false;
    seen.add(id); lines.push({ occurrenceId: id, term: normalized, hitId, dir: anchor.dir, positions, kind });
    return true;
  };
  if (!add(snapshot.normalizedTerm, snapshot.axis.hitId, "axis")) return { ok: false, reason: "זהות הציר אינה שלמה." };
  let excluded = 0;
  for (const finding of snapshot.findings) {
    for (const id of finding.shown) if (!add(finding.t, id, "els")) excluded++;
    for (const id of finding.sourceShown) if (!add(finding.t, id, "source")) excluded++;
  }
  if (lines.length > 64) return { ok: false, reason: "נבחרו יותר מ־64 מופעים. צמצמו את הסימונים לפני בדיקת המבנים; לא נבדק מדגם חלקי." };
  const geometry = extractElsVectorGeometry({ axisWidth: width, occurrences: lines });
  return { ok: true, origin, snapshot, lines, geometry, excluded, window: { ...state.geometry },
    selectionProtocol: "USER_SELECTED_VERIFIED_OCCURRENCES", modelCalls: 0, lexiconLoaded: false };
}

export function structureInspectionKey(result) {
  return result?.ok ? JSON.stringify([result.origin, result.window, result.lines.map(l => [l.occurrenceId,l.kind])]) : null;
}

export function restoreElsStructureInspection(result) {
  return result?.ok ? elsResearchReturnLoad({ origin: result.origin, returnSnapshot: result.snapshot }) : null;
}
