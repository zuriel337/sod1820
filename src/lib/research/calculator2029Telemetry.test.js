import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalComputeTelemetry } from './calculator2029Model.js';

test('one settled profile produces one bounded computation payload, without the expression or values', () => {
  const payload = buildCanonicalComputeTelemetry('שם אישי פרטי', [
    { methodKey: 'ragil', computedValue: 337 },
    { methodKey: 'triangle', computedValue: 1472 },
    { methodKey: 'preview', computedValue: 337, previewOnly: true },
  ]);
  assert.deepEqual(payload, { computation_version: 1, expression_length: 12, method_count: 2 });
  assert.deepEqual(Object.keys(payload).sort(), ['computation_version', 'expression_length', 'method_count']);
});
test('empty, failed, preview-only and share-restoration profiles are not new computations', () => {
  assert.equal(buildCanonicalComputeTelemetry('', [{ computedValue: 14 }]), null);
  assert.equal(buildCanonicalComputeTelemetry('דוד', []), null);
  assert.equal(buildCanonicalComputeTelemetry('דוד', [{ computedValue: null }]), null);
  assert.equal(buildCanonicalComputeTelemetry('דוד', [{ computedValue: 14, previewOnly: true }]), null);
  assert.equal(buildCanonicalComputeTelemetry('דוד', [{ computedValue: 14 }], { restored: true }), null);
});
