import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchGematriaOpeningOperation, openingMethodTotal, OPENING_TOTAL_STATUS, OPENING_COVERAGE_STATUS } from '../../lib/research/gematriaOpeningOperation.js';
import { METHODS } from '../../lib/gematria.js';
import { beitMidrashMethodHref, buildOpeningWordGroups, openingFragmentDisplay, openingTotalStatusLabel } from './gematriaOpeningPresentation.js';

// Same calibration-oracle stub as gematriaOpeningOperation.test.js (HEICHAL_GEMATRIA_CAPABILITY_HOOK_V1):
// a deterministic offline stand-in for fn_method_profile, reusing the existing client METHODS
// definitions purely to exercise this UI-wiring layer's own grouping/labeling logic end to end.
function stubProfileFromRealMethods(phrase) {
  return METHODS.map((method, index) => ({
    methodKey: method.key,
    displayLabel: method.key,
    category: 'base',
    computedValue: method.fn(phrase),
    definitionVersion: 1,
    sortOrder: index,
  }));
}

test('golden acceptance: אל בראשית groups into 2 words / 8 fragments, and רגיל opens to 2368', async () => {
  const result = await fetchGematriaOpeningOperation('אל בראשית', {
    fetchMethodProfile: async (fragment) => stubProfileFromRealMethods(fragment),
  });
  assert.equal(result.verification.fragmentCount, 8);
  assert.equal(openingMethodTotal(result, 'רגיל'), 2368);

  const regularRow = result.methodRows.find((row) => row.methodKey === 'רגיל');
  const groups = buildOpeningWordGroups(result, regularRow);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].word, 'אל');
  assert.equal(groups[0].fragments.length, 2);
  assert.equal(groups[1].word, 'בראשית');
  assert.equal(groups[1].fragments.length, 6);
  assert.equal(groups[0].fragments.length + groups[1].fragments.length, 8);

  assert.deepEqual(groups[0].fragments.map((f) => f.display), ['1', '31']);
  assert.deepEqual(groups[1].fragments.map((f) => f.display), ['2', '202', '203', '503', '513', '913']);
  assert.ok(groups[0].fragments.every((f) => f.coverageStatus === OPENING_COVERAGE_STATUS.EXECUTED));
});

test('word groups render from the result shell even before any method row is selected', async () => {
  const result = await fetchGematriaOpeningOperation('אל בראשית', {
    fetchMethodProfile: async (fragment) => stubProfileFromRealMethods(fragment),
  });
  const groups = buildOpeningWordGroups(result, null);
  assert.equal(groups.length, 2);
  // No method row selected -> every fragment is honestly "no entry", never a fabricated number.
  assert.ok(groups.flatMap((g) => g.fragments).every((f) => f.display === '—' && f.coverageStatus === null));
});

test('a totalStatus other than complete never fabricates a numeric total, and gets an honest label', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([{
      methodKey: 'context_method',
      displayLabel: 'שיטה הקשרית',
      executionKind: 'context_activated',
      sortOrder: 0,
    }]),
  });
  const row = result.methodRows.find((r) => r.methodKey === 'context_method');
  assert.equal(row.total, null);
  assert.equal(row.totalStatus, OPENING_TOTAL_STATUS.CONTEXT_REQUIRED);
  assert.equal(openingTotalStatusLabel(row.totalStatus), 'דורש הקשר נוסף');

  const groups = buildOpeningWordGroups(result, row);
  assert.deepEqual(groups[0].fragments.map((f) => f.display), ['הקשר', 'הקשר']);
  assert.deepEqual(groups[0].fragments.map((f) => f.coverageStatus), [OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED, OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED]);
});

test('an engine-error fragment renders its own honest status, not a blank or a zero', () => {
  const display = openingFragmentDisplay({ value: null, coverageStatus: OPENING_COVERAGE_STATUS.ENGINE_ERROR });
  assert.equal(display.display, 'שגיאה');
  assert.equal(display.coverageStatus, OPENING_COVERAGE_STATUS.ENGINE_ERROR);
});

test('beitMidrashMethodHref deep-links to /beit-midrash/:methodKey, URI-encoded, and is null for an empty key', () => {
  assert.equal(beitMidrashMethodHref('רגיל'), `/beit-midrash/${encodeURIComponent('רגיל')}`);
  assert.equal(beitMidrashMethodHref('  '), null);
  assert.equal(beitMidrashMethodHref(null), null);
});
