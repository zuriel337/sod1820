import { makeJourneySnapshot, buildJourneyRestore } from "../elsJourney.js";

// A bounded navigation snapshot, not another matrix/result store. Engine-owned values
// only: no letter grid, private record metadata, request tokens or inferred occurrences.
export function captureElsResearchReturn(state) {
  if (state?.verification?.state !== "MATCH" || typeof state.verification.corpus_id !== "string"
    || !state.verification.corpus_id || !Array.isArray(state.findings)
    || state.findings.length > 12
    || state.findings.some(f => !f || typeof f.t !== "string" || !f.t || f.t.length > 100)) return null;
  const snapshot = makeJourneySnapshot(state);
  if (!snapshot || !snapshot.term || !Number.isSafeInteger(snapshot.axis.start)
    || snapshot.axis.start < 0 || !Number.isSafeInteger(snapshot.axis.skip) || snapshot.axis.skip < 2) return null;
  const ui = state.ui || {};
  snapshot.corpusId = state.verification.corpus_id;
  snapshot.findings = snapshot.findings.map((finding, i) => {
    const native = state.findings[i];
    return { ...finding,
      // Preserve selection even when a reversible radius filter currently hides it.
      shown: Array.isArray(native.hits) ? native.hits.filter(hit => hit?.selected && hit.verified && typeof hit.hitId === "string").map(hit => hit.hitId) : finding.shown,
      sourceShown: (Array.isArray(native.sourceHits) ? native.sourceHits : []).filter(hit => hit?.selected && typeof hit.hitId === "string").map(hit => hit.hitId) };
  });
  if (snapshot.findings.some(f => typeof f.t !== "string" || f.t.length > 100 || f.shown.length + f.sourceShown.length > 4096)) return null;
  snapshot.view = { showN: ui.showN, findingRadius: ui.findingRadius, zoom: ui.zoom,
    fit: ui.fit, heat: ui.heat, niqqud: ui.niqqud };
  snapshot.hideMain = ui.hideMain === true;
  snapshot.searchWindow = { ctxR: ui.ctxR, windowColumns: state.geometry?.cw,
    windowSize: ui.windowSize, windowRequested: ui.windowRequested };
  // Freeze recursively so a subsequent state notification/page cannot rewrite the origin.
  const freeze = value => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  return freeze(snapshot);
}

export function elsResearchSnapshotMatches(snapshot, origin) {
  return !!snapshot && !!origin && snapshot.normalizedTerm === origin.term && snapshot.scope === origin.corpus
    && snapshot.corpusId === origin.corpusId && snapshot.axis.start === origin.start
    && snapshot.axis.skip === origin.skip && snapshot.axis.dir === origin.dir;
}

export function elsResearchReturnLoad(task) {
  const origin = task?.origin;
  if (!origin) return null;
  const snapshot = task.returnSnapshot;
  if (elsResearchSnapshotMatches(snapshot, origin)) {
    const restored = buildJourneyRestore(snapshot);
    if (restored.ok) return { ...restored.loadItem, corpusId: origin.corpusId,
      view: { ...snapshot.view }, searchWindow: { ...snapshot.searchWindow }, hideMain: snapshot.hideMain,
      words: restored.loadItem.words.map((word, i) => ({ ...word, sourceShown: [...snapshot.findings[i].sourceShown] })) };
  }
  return { term: origin.term, scope: origin.corpus, corpusId: origin.corpusId,
    start: origin.start, skip: origin.skip, dir: origin.dir,
    hitId: `${origin.skip}_${origin.dir}_${origin.start}`, words: [] };
}
