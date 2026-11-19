import { captureElsDiscoverySource } from "../../src/lib/research/elsSavedDiscovery.js";

export const projection = { kind: "row-spacing", width: 1515, rowGap: 2, r0: 161, r1: 189, c0: 245, c1: 365 };
export const matrix = (corpusId = "0b022e8eef6f9c16", scope = "torah") => ({
  status: "ok", term: "קולומביה", termRaw: "קולומביה", scope, corpusLetters: 304805,
  verification: { state: "MATCH", corpus_id: corpusId },
  axis: { start: 248765, skip: 4545, dir: 1, hitId: "4545_1_248765", length: 8,
    occurrence_id: `els:${corpusId}:קולומביה:4545:1:248765` },
  geometry: { S: 4545, r0: 54, r1: 66, c0: 3300, cw: 80 },
  ui: { ctxR: 3, windowSize: "legacy", windowRequested: "legacy", zoom: 1.3, fit: false, heat: true, niqqud: true, showN: 2, findingRadius: null },
  findings: [{ t: "להבהתמכ", color: "#112233", shown: ["1514_-1_274518"], sourceHits: [{ selected: true, hitId: "1_1_248765" }] }],
});
export const scanState = state => ({ ...state, geometry: { S: 1515, r0: 161, r1: 189, c0: 245, cw: 121 } });
export function discoveryFixture(state = matrix()) {
  const source = captureElsDiscoverySource(state, scanState(state), projection);
  const item = { term: "חללנהל", label: "חלל נהל", hitId: "1514_1_254827", start: 254827, skip: 1514, dir: 1,
    positions: Array.from("חללנהל", (_, i) => 254827 + i * 1514), kind: "els", status: "CANDIDATE", distance: 4,
    language: { exactLetters: "חללנהל", tokens: [{ letters: "חלל" }, { letters: "נהל" }], segmentationVerified: false } };
  return { id: "test-scan-a", startedAt: "2026-11-19T10:00:00Z", endedAt: "2026-11-19T10:00:02Z", source,
    data: { ok: true, pending: false, origin: source.origin, box: source.box,
      plan: { mode: "language", minLength: 5, maxLength: 16, maxDistance: 120, minMembers: 2 }, items: [item],
      coverage: { stop: "BOUNDED_LANGUAGE_SAMPLE", complete: false, completedRays: 24, totalRays: 100, windows: 400, axisFragments: 2 },
      lexicon: { contract: "fixture", entryCount: 200, asset: { sha256: "fixture-digest" } } } };
}
