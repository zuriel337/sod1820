import { elsLexiconWindowKey } from "../../src/lib/research/elsLexiconResearch.js";
import { captureElsDiscoverySource } from "../../src/lib/research/elsSavedDiscovery.js";

export const state = () => ({ status: "ok", term: "התורה", scope: "torah", corpusLetters: 304805,
  verification: { state: "MATCH", corpus_id: "fixture-torah" }, axis: { hitId: "100_1_510", start: 510, skip: 100, dir: 1, length: 5 },
  geometry: { S: 100, r0: 4, r1: 14, c0: 0, cw: 21 }, ui: {}, findings: [] });
const candidate = (term, start, skip) => ({ term, hitId: `${skip}_1_${start}`, start, skip, dir: 1, kind: "els", distance: 2,
  positions: [...term].map((_, i) => start + i * skip) });
export const fixtures = (s = state()) => {
  const source = captureElsDiscoverySource(s, s);
  const make = (id, mode, items) => ({ id, key: elsLexiconWindowKey(s), state: s, source,
    startedAt: "2026-11-19T10:00:00Z", endedAt: "2026-11-19T10:00:02Z",
    data: { ok: true, origin: source.origin, box: source.box, items, plan: { mode, minLength: 5, maxLength: mode === "language" ? 16 : 10, maxDistance: 40, minMembers: 2 },
      coverage: { complete: mode !== "language", stop: mode === "language" ? "BOUNDED_LANGUAGE_SAMPLE" : "COMPLETE", completedRays: mode === "language" ? 24 : 100, totalRays: 100 }, lexicon: { entryCount: 100 } } });
  const a = candidate("להבהתמכ", 512, 100), aLanguage = { ...a, label: "להבה תמכ", language: { exactLetters: a.term, tokens: [{ letters: "להבה" }, { letters: "תמכ" }] } };
  const b = candidate("חללנהל", 511, 101); b.language = { exactLetters: b.term, tokens: [{ letters: "חלל" }, { letters: "נהל" }] };
  return { words: make("word-run", "words", [a]), language: make("language-run", "language", [aLanguage, b]) };
};

