import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";

// Request identity and exact return only; the canonical tool owns letters, matching and admission.
export function elsLexiconWindowKey(state) {
  if (state?.status !== "ok" || state?.verification?.state !== "MATCH" || !state.axis) return "";
  return JSON.stringify([state.term, state.scope, state.verification.corpus_id, state.axis.hitId, state.geometry]);
}

export function prepareElsLexiconFinding(state, result, item, color) {
  return prepareElsLexiconFindings(state, result, [item], color);
}

// Group admission is one existing replay/load, never N new searches or a second
// finding store. Build atomically: a stale/invalid member rejects the whole request.
export function prepareElsLexiconFindings(state, result, items, color) {
  const snapshot = captureElsResearchReturn(state);
  if (!result?.ok || result.pending || !elsResearchSnapshotMatches(snapshot, result.origin)
    || !Array.isArray(items) || !items.length || items.length > 12) return null;
  if (result.box && (state.geometry?.S !== result.box.S || state.geometry?.r0 !== result.box.r0
    || state.geometry?.r1 !== result.box.r1 || state.geometry?.c0 !== result.box.c0
    || state.geometry?.cw !== result.box.c1 - result.box.c0 + 1)) return null;
  for (const item of items) {
    if (!result.items?.includes(item) || !/^[א-ת]{5,10}$/.test(item.term) || !Number.isSafeInteger(item.skip) || item.skip < 1
      || ![-1, 1].includes(item.dir) || !Number.isSafeInteger(item.start) || item.start < 0
      || item.hitId !== `${item.skip}_${item.dir}_${item.start}`) return null;
  }
  const load = elsResearchReturnLoad({ origin: result.origin, returnSnapshot: snapshot });
  for (const item of items) {
    let word = load.words.find(word => word.t === item.term);
    if (!word) {
      if (load.words.length >= 12) return null;
      word = { t: item.term, color: typeof color === "function" ? color(load.words) : color, sh: [], sourceShown: [] };
      load.words.push(word);
    }
    const field = item.skip === 1 ? "sourceShown" : "sh";
    word[field] = [...new Set([...(word[field] || []), item.hitId])];
  }
  return load; // existing canonical load replays selected occurrences before display
}
