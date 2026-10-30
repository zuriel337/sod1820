import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";

// Request identity and exact return only; the canonical tool owns letters, matching and admission.
export function elsLexiconWindowKey(state) {
  if (state?.status !== "ok" || state?.verification?.state !== "MATCH" || !state.axis) return "";
  return JSON.stringify([state.term, state.scope, state.verification.corpus_id, state.axis.hitId, state.geometry]);
}

export function prepareElsLexiconFinding(state, result, item, color) {
  const snapshot = captureElsResearchReturn(state);
  if (!result?.ok || result.pending || !result.items?.includes(item) || !elsResearchSnapshotMatches(snapshot, result.origin)) return null;
  if (!/^[א-ת]{5,10}$/.test(item.term) || !Number.isSafeInteger(item.skip) || item.skip < 1
    || ![-1, 1].includes(item.dir) || !Number.isSafeInteger(item.start) || item.start < 0
    || item.hitId !== `${item.skip}_${item.dir}_${item.start}`) return null;
  const load = elsResearchReturnLoad({ origin: result.origin, returnSnapshot: snapshot });
  let word = load.words.find(word => word.t === item.term);
  if (!word) {
    if (load.words.length >= 12) return null;
    word = { t: item.term, color, sh: [], sourceShown: [] };
    load.words.push(word);
  }
  const field = item.skip === 1 ? "sourceShown" : "sh";
  word[field] = [...new Set([...(word[field] || []), item.hitId])];
  return load; // existing canonical load replays selected occurrences before display
}
