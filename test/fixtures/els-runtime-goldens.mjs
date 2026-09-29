// Golden ELS replay fixtures — live canonical engine evidence (els_search_v1/els_verify_occurrence_v1),
// verified live 2026-09-29 by the assignment G3_ELS_RUNTIME_GOLDENS_SCANNER_STATS_V1.
// Coordinates are zero-based canonical corpus character indexes. These are replay INPUTS + expected
// canonical outputs; nothing here computes occurrences.
export const ELS_GOLDEN_CORPUS_ID = '0b022e8eef6f9c16';

export const ELS_GOLDENS = Object.freeze([
  { id: 'torah-50-fwd', term: 'תורה', scope: 'torah', skip: 50, dir: 1, start: 5, positions: [5, 55, 105, 155], note: 'representative hit, not unique' },
  { id: 'torah-kedosha-10065-fwd', term: 'תורהקדשה', scope: 'torah', skip: 10065, dir: 1, start: 50890,
    positions: [50890, 60955, 71020, 81085, 91150, 101215, 111280, 121345] },
  { id: 'eliyahu-1820-fwd', term: 'אליהו', scope: 'torah', skip: 1820, dir: 1, start: 27914, positions: [27914, 29734, 31554, 33374, 35194] },
  { id: 'eliyahu-1820-back', term: 'אליהו', scope: 'torah', skip: 1820, dir: -1, start: 37550, positions: [37550, 35730, 33910, 32090, 30270] },
].map((g) => Object.freeze({ ...g, corpus_id: ELS_GOLDEN_CORPUS_ID, positions: Object.freeze(g.positions) })));

/** Canonical-engine stand-in for replay tests: serves ONLY the recorded golden outputs, never computes. */
export function goldenReplayInvoke(goldens = ELS_GOLDENS) {
  return async (req) => {
    const g = goldens.find((x) => x.term === req.term && x.skip === req.skip && x.dir === req.dir && x.start === req.start);
    const result = {
      contract: 'els_occurrence_replay_v1',
      status: g ? 'OK' : 'REPLAY_MISMATCH',
      verification_state: g ? 'MATCH' : 'MISMATCH',
      corpus_id: ELS_GOLDEN_CORPUS_ID,
      occurrence: g ? { skip: g.skip, dir: g.dir, start: g.start, positions: [...g.positions], coordinate_convention: 'zero_based_character_index' } : null,
    };
    return { data: { result, trace_id: 'golden-replay' } };
  };
}
