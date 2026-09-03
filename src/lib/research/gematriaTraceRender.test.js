import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrace, traceProvenance } from './gematriaTraceRender.js';

// Fixtures below are shaped exactly like real live `gematria_method_trace(...)` responses
// captured this session (GEMATRIA_TRACE_COVERAGE_COMPLETION_V1 verification pass) -- not
// invented shapes. This file never calls the RPC; it only proves the pure normalizer handles
// every live trace_kind without throwing and without inventing data the envelope didn't provide.

test('LETTER_LEDGER normalizes to a flat row list, values copied verbatim', () => {
  const trace = {
    method_key: 'רגיל', method_version: 1, mathematical_family: 'base_additive', execution_kind: 'sql_function',
    input: 'מלך', result: 90, trace_kind: 'LETTER_LEDGER',
    steps: [
      { index: 1, scope: 'letter', token: 'מ', position: 1, base_value: 40, transform: 'identity', contribution: 40, running_subtotal: 40 },
      { index: 2, scope: 'letter', token: 'ל', position: 2, base_value: 30, transform: 'identity', contribution: 30, running_subtotal: 70 },
      { index: 3, scope: 'letter', token: 'ך', position: 3, base_value: 20, transform: 'identity', contribution: 20, running_subtotal: 90 },
    ],
    semantics: { order_sensitive: false, word_boundary_sensitive: false, per_word_reset: null, full_phrase_continuation: null, final_letter_sensitive: false },
    dependencies: null,
    verification: { canonical_value: 90, trace_value: 90, parity: true },
    provenance: { engine: 'gematria', function: 'fn_ragil', method_version: 1 },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'LETTER_LEDGER');
  assert.equal(n.result, 90);
  assert.equal(n.rows.length, 3);
  assert.equal(n.rows[2].runningSubtotal, 90);
  assert.equal(n.rows[0].token, 'מ');
  const prov = traceProvenance(trace);
  assert.equal(prov.parity, true);
  assert.equal(prov.function, 'fn_ragil');
});

test('SUBSTITUTION_LEDGER exposes source and transformed token side by side', () => {
  const trace = {
    method_key: 'אתבח', trace_kind: 'SUBSTITUTION_LEDGER', result: 150,
    steps: [
      { index: 1, token: 'מ', transformed_token: 'ס', base_value: 60, transform: 'substituted', contribution: 60, running_subtotal: 60 },
      { index: 2, token: 'ל', transformed_token: 'כ', base_value: 20, transform: 'substituted', contribution: 20, running_subtotal: 80 },
      { index: 3, token: 'ך', transformed_token: 'ת', base_value: 70, transform: 'substituted', contribution: 70, running_subtotal: 150 },
    ],
    verification: { canonical_value: 150, trace_value: 150, parity: true },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'SUBSTITUTION_LEDGER');
  assert.equal(n.rows[0].transformedToken, 'ס');
  assert.equal(n.rows[2].runningSubtotal, 150);
});

test('ADJACENT_DIFFERENCE groups by word with explicit pairs and per-word reset', () => {
  const trace = {
    method_key: 'מסתתר', trace_kind: 'ADJACENT_DIFFERENCE', result: 534,
    steps: [
      { word: 'עופר', letter_values: [70, 6, 80, 200], pairs: [
        { left_value: 70, right_value: 6, difference: 64 },
        { left_value: 6, right_value: 80, difference: 74 },
        { left_value: 80, right_value: 200, difference: 120 },
      ], word_subtotal: 258 },
      { word: 'וינטר', letter_values: [6, 10, 50, 9, 200, 200], pairs: [], word_subtotal: 276 },
    ],
    verification: { canonical_value: 534, trace_value: 534, parity: true },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'ADJACENT_DIFFERENCE');
  assert.equal(n.words.length, 2);
  assert.equal(n.words[0].pairs.length, 3);
  assert.equal(n.words[0].pairs[0].diff, 64);
  assert.equal(n.words[0].wordSubtotal + n.words[1].wordSubtotal, 534);
});

test('CUMULATIVE_PREFIX distinguishes word_reset vs continuation scope from live shape', () => {
  const wordResetTrace = {
    method_key: 'ריבוע', trace_kind: 'CUMULATIVE_PREFIX', result: 200,
    steps: [{ word: 'מלך', steps: [
      { index: 1, token: 'מ', base_value: 40, prefix_subtotal: 40 },
      { index: 2, token: 'ל', base_value: 30, prefix_subtotal: 70 },
      { index: 3, token: 'ך', base_value: 20, prefix_subtotal: 90 },
    ], word_subtotal: 200 }],
    verification: { canonical_value: 200, trace_value: 200, parity: true },
  };
  const wr = normalizeTrace(wordResetTrace);
  assert.equal(wr.scope, 'word_reset');
  assert.equal(wr.words[0].rows.length, 3);
  assert.equal(wr.words[0].wordSubtotal, 200);

  const continuationTrace = {
    method_key: 'משולש הפוך', trace_kind: 'CUMULATIVE_PREFIX', result: 160,
    steps: [
      { index: 1, token: 'ך', original_position: 3, base_value: 20, prefix_subtotal: 20 },
      { index: 2, token: 'ל', original_position: 2, base_value: 30, prefix_subtotal: 50 },
      { index: 3, token: 'מ', original_position: 1, base_value: 40, prefix_subtotal: 90 },
    ],
    verification: { canonical_value: 160, trace_value: 160, parity: true },
  };
  const cont = normalizeTrace(continuationTrace);
  assert.equal(cont.scope, 'continuation');
  assert.equal(cont.rows[0].originalPosition, 3);
});

test('POSITION_WEIGHTED carries position and contribution per word', () => {
  const trace = {
    method_key: 'משולש מדרגות', trace_kind: 'POSITION_WEIGHTED', result: 160,
    steps: [{ word: 'מלך', steps: [
      { index: 1, token: 'מ', position: 1, base_value: 40, contribution: 40 },
      { index: 2, token: 'ל', position: 2, base_value: 30, contribution: 60 },
      { index: 3, token: 'ך', position: 3, base_value: 20, contribution: 60 },
    ], word_subtotal: 160 }],
    verification: { canonical_value: 160, trace_value: 160, parity: true },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.words[0].rows[1].contribution, 60);
  assert.equal(n.words[0].wordSubtotal, 160);
});

test('COMPOSITE nests recursively and passes through a component with no sub-trace honestly', () => {
  const trace = {
    method_key: 'רגיל+מילוי', trace_kind: 'COMPOSITE', result: 1376,
    steps: {
      operator: 'sum',
      components: [
        { component_method: 'רגיל', component_value: 424, component_trace: {
          method_key: 'רגיל', trace_kind: 'LETTER_LEDGER', result: 424, steps: [],
          verification: { canonical_value: 424, trace_value: 424, parity: true },
        } },
        { component_method: 'מילוי', component_value: 952, component_trace: {
          method_key: 'מילוי', trace_kind: 'LETTER_LEDGER', result: 952, steps: [],
          verification: { canonical_value: 952, trace_value: 952, parity: true },
        } },
      ],
    },
    verification: { canonical_value: 1376, trace_value: 1376, parity: true },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'COMPOSITE');
  assert.equal(n.operator, 'sum');
  assert.equal(n.components.length, 2);
  assert.equal(n.components[0].trace.kind, 'LETTER_LEDGER');
  assert.equal(n.components[0].value + n.components[1].value, 1376);
});

test('context_required renders honestly with no fabricated steps', () => {
  const trace = {
    method_key: 'אות רבתי', trace_kind: 'context_required', result: 248000,
    context_contract: { subject: 'text', activation: 'explicit_rabbati_context_only' },
    verification: { canonical_value: 248000, trace_value: null, parity: null },
  };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'context_required');
  assert.equal(n.result, 248000);
  assert.deepEqual(n.contextContract, { subject: 'text', activation: 'explicit_rabbati_context_only' });
  assert.equal(n.rows, undefined);
  assert.equal(n.words, undefined);
});

test('unavailable family never fabricates steps, still carries the canonical result', () => {
  const trace = { method_key: 'X', trace_kind: 'unavailable', result: 42, verification: { canonical_value: 42, trace_value: null, parity: null } };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'unavailable');
  assert.equal(n.result, 42);
});

test('a TRACE_PARITY_MISMATCH error envelope is surfaced, never silently displayed as a result', () => {
  const trace = { status: 'error', error: 'TRACE_PARITY_MISMATCH', method_key: 'X', canonical_value: 1, trace_value: 2 };
  const n = normalizeTrace(trace);
  assert.equal(n.kind, 'error');
  assert.equal(n.error, 'TRACE_PARITY_MISMATCH');
});

test('null/undefined input never throws', () => {
  assert.equal(normalizeTrace(null), null);
  assert.equal(normalizeTrace(undefined), null);
  assert.equal(traceProvenance(null), null);
});
