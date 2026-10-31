import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";

// Presentation plans only; the canonical scanner independently bounds every field.
export const ELS_LEXICON_PRESETS = Object.freeze({
  quick: Object.freeze({ minLength: 4, maxLength: 8, maxDistance: 12, minMembers: 2 }),
  broad: Object.freeze({ minLength: 4, maxLength: 10, maxDistance: 40, minMembers: 2 }),
  deep: Object.freeze({ minLength: 5, maxLength: 10, maxDistance: 80, minMembers: 3 }),
});

export function filterElsForwardSource(items, hideForwardSource) {
  return (items || []).filter(item => !hideForwardSource || !(item.skip === 1 && item.dir === 1));
}

// A phrase is an exact sequence with proposed spaces, not a rewritten headword.
// Longer terms are admitted only from this explicit, bounded language projection.
export function isElsLexiconCandidate(item, result) {
  if (!/^[א-ת]{3,16}$/.test(item?.term)) return false;
  if (result?.plan?.mode !== "language") return item.term.length <= 10;
  const language = item.language, tokens = language?.tokens;
  return item.term.length >= 5 && language?.exactLetters === item.term
    && Array.isArray(tokens) && tokens.length >= 1 && tokens.length <= 2
    && tokens.every(token => /^[א-ת]+$/.test(token.letters))
    && tokens.map(token => token.letters).join("") === item.term;
}

export function expandElsLexiconPlan(plan) {
  const maxDistance = [12, 30, 40, 80, 120].find(value => value > plan.maxDistance);
  return maxDistance === undefined ? null : { ...plan, maxDistance };
}

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
    if (!result.items?.includes(item) || !isElsLexiconCandidate(item, result) || !Number.isSafeInteger(item.skip) || item.skip < 1
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
