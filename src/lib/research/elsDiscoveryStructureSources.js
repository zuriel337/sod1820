import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";
import { elsOccurrenceId } from "./elsOccurrenceIdentity.js";
import { elsLexiconWindowKey, isElsLexiconCandidate, filterElsForwardSource, prepareElsLexiconAdditions } from "./elsLexiconResearch.js";
import { groupElsLexiconDiscoveries, selectElsStructureCandidates } from "./elsStructureInspection.js";

// Projections over the existing in-page runs and explicitly opened library items.
// No persistence, search, scoring, new occurrence identity or merged coverage claim.
function matches(state, data) {
  const box = data?.box, geometry = state?.geometry;
  try { return data?.ok === true && !data.pending && Array.isArray(data.items)
    && elsResearchSnapshotMatches(captureElsResearchReturn(state), data.origin)
    && !!box && !!geometry && box.S === geometry.S && box.r0 === geometry.r0 && box.r1 === geometry.r1
    && box.c0 === geometry.c0 && box.c1 === geometry.c0 + geometry.cw - 1; }
  catch { return false; }
}

export function compatibleElsDiscoveryRuns(state, runs) {
  const key = elsLexiconWindowKey(state), byId = new Map();
  if (!key) return [];
  for (const [entryKey, run] of Object.entries(runs || {})) {
    if (run?.key !== key || !matches(state, run.data)) continue;
    const id = run.id || entryKey, prior = byId.get(id);
    // A saved copy and its later continuation are the same operation, not two sources.
    if (!prior || (Date.parse(run.endedAt) || 0) > (Date.parse(prior.run.endedAt) || 0)) byId.set(id, { id, entryKey, run });
  }
  return [...byId.values()];
}

function validCandidate(item, data, corpusLetters) {
  const box = data.box;
  return isElsLexiconCandidate(item, data) && Number.isSafeInteger(item.start) && Number.isSafeInteger(item.skip)
    && item.skip >= 1 && [1, -1].includes(item.dir) && item.hitId === `${item.skip}_${item.dir}_${item.start}`
    && Array.isArray(item.positions) && item.positions.length === item.term.length
    && item.positions.every((p, i) => Number.isSafeInteger(p) && p >= 0 && p < corpusLetters
      && p === item.start + i * item.skip * item.dir && Math.floor(p / box.S) >= box.r0 && Math.floor(p / box.S) <= box.r1
      && p % box.S >= box.c0 && p % box.S <= box.c1);
}

export function projectElsDiscoveryStructures(state, runs, { excludedIds = [], hideForwardSource = false } = {}) {
  const available = compatibleElsDiscoveryRuns(state, runs), included = available.filter(source => !excludedIds.includes(source.id));
  const entries = new Map(); let collected = 0, invalid = 0, duplicates = 0;
  for (const source of included) for (const item of source.run.data.items) {
    collected++;
    if (!validCandidate(item, source.run.data, state?.corpusLetters)) { invalid++; continue; }
    const id = elsOccurrenceId({ ...item, corpusId: source.run.data.origin.corpusId });
    if (!id) { invalid++; continue; }
    const receipt = { source, item, data: source.run.data }, prior = entries.get(id);
    if (prior) {
      duplicates++; prior.receipts.push(receipt);
      // Retain a proposed segmentation for display when the dictionary also found these same letters.
      if (!prior.item.language && item.language) { prior.item = item; prior.data = receipt.data; }
    } else entries.set(id, { id, item, data: receipt.data, receipts: [receipt] });
  }
  const items = filterElsForwardSource([...entries.values()].map(entry => entry.item), hideForwardSource);
  const itemEntries = new Map([...entries.values()].map(entry => [entry.item, entry]));
  const selected = selectElsStructureCandidates(items); // unchanged 300-candidate budget
  const minMembers = Math.min(6, ...included.map(source => source.run.data.plan?.minMembers || 2));
  const first = included[0]?.run.data;
  const structures = first ? groupElsLexiconDiscoveries(state, { ...first, items: selected }, { minMembers }, item => itemEntries.get(item)?.data)
    : { ok: false, groups: [], reason: "בחרו סריקות תואמות לניתוח המבנים." };
  const groups = structures.groups.map(group => ({ ...group,
    sources: [...new Map(group.items.flatMap(item => itemEntries.get(item).receipts.map(receipt => [receipt.source.id, receipt.source]))).values()],
    memberSources: group.items.map(item => ({ term: item.term, hitId: item.hitId, sourceIds: [...new Set(itemEntries.get(item).receipts.map(receipt => receipt.source.id))] })),
  }));
  return { available, included, entries, items, groups, structures, minMembers, collected, invalid, duplicates,
    filtered: entries.size - items.length, analyzed: selected.length, omittedFromStructures: items.length - selected.length,
    contextKey: elsLexiconWindowKey(state), partial: included.some(source => source.run.data.coverage?.complete !== true),
    score: null, independentConfirmations: false };
}

// One atomic findings update, admitted against EACH original response. Never launch
// one update per member (that would race and discard the preceding addition).
export function prepareElsStructureAdditions(state, projection, items, color) {
  if (!projection?.contextKey || projection.contextKey !== elsLexiconWindowKey(state) || !Array.isArray(items) || !items.length) return { error: "stale" };
  let findings = (state.findings || []).map(f => ({ t: f.t, color: f.color }));
  for (const item of items) {
    const id = elsOccurrenceId({ ...item, corpusId: state.verification?.corpus_id });
    const entry = projection.entries.get(id), receipt = entry?.receipts.find(r => r.item === item);
    if (!receipt || !projection.items.includes(item) || !matches(state, receipt.data)
      || !validCandidate(item, receipt.data, state.corpusLetters)) return { error: "stale" };
    const prepared = prepareElsLexiconAdditions({ ...state, findings }, receipt.data, [item], color);
    if (prepared.error) return prepared;
    findings = prepared.findings.map(next => {
      const keys = [...new Set([...(findings.find(f => f.t === next.t)?.addShown || []), ...(next.addShown || [])])];
      return keys.length ? { ...next, addShown: keys } : next;
    });
  }
  return { findings };
}

export function prepareElsStructureRestore(state, projection, items, color) {
  const prepared = prepareElsStructureAdditions(state, projection, items, color);
  if (prepared.error) return null;
  const snapshot = captureElsResearchReturn(state), origin = projection.included[0]?.run.data.origin;
  if (!snapshot || !origin) return null;
  const load = elsResearchReturnLoad({ origin, returnSnapshot: snapshot });
  for (const finding of prepared.findings) for (const key of finding.addShown || []) {
    let word = load.words.find(w => w.t === finding.t);
    if (!word) { word = { t: finding.t, color: finding.color, sh: [], sourceShown: [] }; load.words.push(word); }
    const field = key.startsWith("1_") ? "sourceShown" : "sh";
    word[field] = [...new Set([...(word[field] || []), key])];
  }
  return load;
}
