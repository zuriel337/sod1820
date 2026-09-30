// Independent replay verifier. Shares no code with the strategies: it recomputes every letter of every
// returned occurrence straight from the corpus text and checks the Result-contract invariants.
import { getScope, sha256, normalizeTerm } from './corpus.mjs';

/** Replay one hit against the corpus. Returns null when exact, otherwise a reason string. */
export function replayHit(view, term, hit) {
  const L = term.length;
  const { skip, dir, start } = hit;
  if (!Number.isInteger(skip) || skip < 2) return 'skip<2';
  if (dir !== 1 && dir !== -1) return 'bad dir';
  if (!Number.isInteger(start)) return 'bad start';
  if (hit.direction !== (dir === 1 ? 'fwd' : 'back')) return 'direction label mismatch';
  if (hit.coordinate_convention !== 'zero_based_character_index') return 'coordinate convention';
  const end = start + dir * skip * (L - 1);
  if (hit.end !== end) return 'end mismatch';
  if (!Array.isArray(hit.positions) || hit.positions.length !== L) return 'positions length';
  for (let k = 0; k < L; k++) {
    const p = start + dir * skip * k;
    if (hit.positions[k] !== p) return 'position mismatch';
    if (p < 0 || p >= view.n) return 'out of corpus';
    if (view.text[p] !== term[k]) return 'letter mismatch';
  }
  const id = `els:${view.corpusId}:${term}:${skip}:${dir}:${start}`;
  if (hit.occurrence_id !== id) return 'occurrence_id';
  return null;
}

/**
 * Replay a whole els_search_result_v1-shaped result. Returns
 * { ok, checked, falsePositives, duplicates, reasons }.
 */
export function replayResult(result) {
  const reasons = [];
  const view = getScope(result.scope);
  const term = result.input.normalized;
  if (term !== normalizeTerm(term)) reasons.push('term not normalized');
  if (result.corpus_id !== view.corpusId) reasons.push('corpus_id');
  if (result.coordinate?.position_base !== 0) reasons.push('position_base');
  const expectedDep = `els:${view.corpusId}:${sha256(term)}:skip2-${result.search.skip_max_executed}`;
  if (result.dependency_group !== expectedDep) reasons.push('dependency_group');
  let falsePositives = 0;
  const seen = new Set();
  let duplicates = 0;
  for (const h of result.hits) {
    const bad = replayHit(view, term, h);
    if (bad) { falsePositives++; if (reasons.length < 5) reasons.push(`${h.occurrence_id}: ${bad}`); }
    if (h.skip > result.search.skip_max_executed) { falsePositives++; reasons.push('skip beyond executed domain'); }
    if (seen.has(h.occurrence_id)) duplicates++;
    seen.add(h.occurrence_id);
  }
  // Provenance honesty gates (sampled must never look exhaustive / negative).
  const c = result.completion;
  // A strategy that stopped early (cap/timeout) is partial; partial must say so and can never assert absence.
  const stoppedEarly = c.scan_complete !== true;
  if (stoppedEarly || c.partial) {
    if (c.negative) reasons.push('sampled result claims negative');
    if (c.coverage !== 'sampled_partial') reasons.push('sampled result not labelled partial');
  }
  if (result.execution_strategy.exhaustive === false && c.coverage !== 'sampled_partial' && c.scan_complete !== true) reasons.push('non-exhaustive strategy claims coverage');
  if (c.negative && (result.hits.length !== 0 || c.state === 'TIMEOUT' || c.scan_complete !== true)) {
    reasons.push('negative without completed scan');
  }
  if (!result.execution_strategy?.id || !result.execution_strategy?.version) reasons.push('strategy id/version missing');
  return { ok: falsePositives === 0 && duplicates === 0 && reasons.length === 0, checked: result.hits.length, falsePositives, duplicates, reasons };
}
