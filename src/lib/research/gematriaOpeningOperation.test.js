import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEMATRIA_OPENING_OPERATION_CONTRACT,
  OPENING_COVERAGE_STATUS,
  PER_WORD_PREFIX_OPENING,
  buildOpeningFragments,
  fetchGematriaOpeningOperation,
  openingMethodTotal,
} from './gematriaOpeningOperation.js';
import { METHODS } from '../gematria.js';

// CALIBRATION ORACLE, not a live canonical DB replay (GPT review 5802943162 on PR #639): this stub
// reuses the EXISTING client method definitions (gematria.js METHODS) purely as a deterministic,
// offline stand-in for the fn_method_profile RPC response shape (numberCoreProjection.js
// fetchNumberMethodProfile output), so these tests need no network/Supabase round-trip. It proves
// the adapter's aggregation logic is correct against a known formula; it does NOT replay or assert
// against the live canonical Registry/engine (public.gematria_methods / fn_method_profile), which
// only a live-DB integration check can do. The adapter itself never sees or imports this stub logic
// in production -- production always injects fetchNumberMethodProfile.
function stubProfileFromRealMethods(phrase) {
  return METHODS.map((method, index) => ({
    methodKey: method.key,
    displayLabel: method.key,
    category: 'base',
    mathematicalFamily: null,
    computedValue: method.fn(phrase),
    definitionVersion: 1,
    sortOrder: index,
  }));
}

test('buildOpeningFragments walks each word into cumulative Hebrew-letter prefixes, preserving raw order', () => {
  const { words, fragments } = buildOpeningFragments('אל בראשית');
  assert.deepEqual(words, ['אל', 'בראשית']);
  assert.deepEqual(fragments.map((f) => f.text), [
    'א', 'אל',
    'ב', 'בר', 'ברא', 'בראש', 'בראשי', 'בראשית',
  ]);
  assert.deepEqual(fragments.map((f) => f.wordIndex), [0, 0, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(fragments.map((f) => f.prefixIndex), [0, 1, 0, 1, 2, 3, 4, 5]);
});

test('words with no Hebrew letters contribute no fragments', () => {
  const { words, fragments } = buildOpeningFragments('אל 123 בראשית');
  assert.deepEqual(words, ['אל', '123', 'בראשית']);
  assert.equal(fragments.filter((f) => f.wordIndex === 1).length, 0);
});

test('empty/blank input resolves without calling the engine', async () => {
  let calls = 0;
  const result = await fetchGematriaOpeningOperation('   ', {
    fetchMethodProfile: async () => { calls += 1; return []; },
  });
  assert.equal(calls, 0);
  assert.equal(result.contract, GEMATRIA_OPENING_OPERATION_CONTRACT);
  assert.equal(result.operation, PER_WORD_PREFIX_OPENING);
  assert.deepEqual(result.methodRows, []);
  assert.equal(result.verification.fragmentCount, 0);
});

test('REGULAR opening total for אל בראשית matches the calibration-oracle ribua invariant (2368) -- offline stub, not a live canonical DB replay', async () => {
  const result = await fetchGematriaOpeningOperation('אל בראשית', {
    fetchMethodProfile: async (fragment) => stubProfileFromRealMethods(fragment),
  });
  assert.equal(result.verification.fragmentCount, 8);
  assert.equal(result.verification.complete, true);
  assert.equal(openingMethodTotal(result, 'רגיל'), 2368);

  const regularRow = result.methodRows.find((row) => row.methodKey === 'רגיל');
  assert.equal(regularRow.role, 'DERIVED_OPERATION');
  assert.equal(regularRow.isIndependentEvidence, false);
  assert.equal(regularRow.fragmentValues.length, 8);
  assert.deepEqual(regularRow.fragmentValues.map((f) => f.value), [1, 31, 2, 202, 203, 503, 513, 913]);
});

test('adapter never computes a value itself -- total is exactly the sum of whatever the injected engine returns', async () => {
  const arbitraryValues = { 'א': 7, 'אל': 11, 'ב': 5, 'בר': 6, 'ברא': 9, 'בראש': 1, 'בראשי': 2, 'בראשית': 3 };
  const result = await fetchGematriaOpeningOperation('אל בראשית', {
    fetchMethodProfile: async (fragment) => ([{
      methodKey: 'עשוי',
      displayLabel: 'שיטת בדיקה',
      computedValue: arbitraryValues[fragment],
      sortOrder: 0,
    }]),
  });
  const total = Object.values(arbitraryValues).reduce((a, b) => a + b, 0);
  assert.equal(openingMethodTotal(result, 'עשוי'), total);
});

test('method row order follows the injected registry sortOrder, not a local priority list', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([
      { methodKey: 'b_method', computedValue: 1, sortOrder: 20 },
      { methodKey: 'a_method', computedValue: 1, sortOrder: 10 },
      { methodKey: 'c_method', computedValue: 1, sortOrder: 30 },
    ]),
  });
  assert.deepEqual(result.methodRows.map((row) => row.methodKey), ['a_method', 'b_method', 'c_method']);
});

test('a per-fragment engine failure is captured as an honest partial-coverage error, not a fabricated 0', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async (fragment) => {
      if (fragment === 'אל') throw new Error('engine_unavailable');
      return [{ methodKey: 'רגיל', computedValue: 1, sortOrder: 0 }];
    },
  });
  assert.equal(result.verification.errorCount, 1);
  assert.equal(result.verification.complete, false);
  assert.equal(result.verification.errors[0].text, 'אל');
  const regularRow = result.methodRows.find((row) => row.methodKey === 'רגיל');
  assert.equal(regularRow.total, 1);
  assert.equal(regularRow.complete, false);
  assert.ok(regularRow.coverage < 1);
  // The failed fragment still shows up as an explicit engine_error entry -- not a silently
  // vanished fragmentValue -- so coverage is never misread as "this method just has fewer fragments".
  assert.equal(regularRow.fragmentValues.length, 2);
  const failedEntry = regularRow.fragmentValues.find((f) => f.text === 'אל');
  assert.equal(failedEntry.value, null);
  assert.equal(failedEntry.coverageStatus, OPENING_COVERAGE_STATUS.ENGINE_ERROR);
  const okEntry = regularRow.fragmentValues.find((f) => f.text === 'א');
  assert.equal(okEntry.coverageStatus, OPENING_COVERAGE_STATUS.EXECUTED);
  assert.equal(regularRow.coverageBreakdown.executed, 1);
  assert.equal(regularRow.coverageBreakdown.engine_error, 1);
});

test('rejects an unsupported operation instead of silently falling back to per_word_prefix_opening', async () => {
  await assert.rejects(
    () => fetchGematriaOpeningOperation('אל', { operation: 'some_other_operation' }),
    /unsupported operation/,
  );
});

test('methodRows preserve Registry/access metadata (GPT review 5802943162): executionKind, requiredEntitlement, lifecycleActive, atomicOrComposite, derivedFrom, sourceOfTruth, dependencyVersion', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([{
      methodKey: 'test_method',
      computedValue: 5,
      sortOrder: 0,
      executionKind: 'sql_function',
      requiredEntitlement: 'public',
      lifecycleActive: true,
      atomicOrComposite: 'atomic',
      derivedFrom: ['רגיל'],
      sourceOfTruth: 'public.gematria_methods',
      dependencyVersion: 3,
    }]),
  });
  const row = result.methodRows.find((r) => r.methodKey === 'test_method');
  assert.deepEqual(row.registry, {
    executionKind: 'sql_function',
    requiredEntitlement: 'public',
    lifecycleActive: true,
    atomicOrComposite: 'atomic',
    derivedFrom: ['רגיל'],
    sourceOfTruth: 'public.gematria_methods',
    dependencyVersion: 3,
  });
});

test('a context_activated method is coverage-tagged context_required, not a fabricated failure', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([{
      methodKey: 'needs_context',
      computedValue: null,
      sortOrder: 0,
      executionKind: 'context_activated',
      requiredEntitlement: null,
    }]),
  });
  const row = result.methodRows.find((r) => r.methodKey === 'needs_context');
  assert.equal(row.total, 0);
  assert.equal(row.fragmentValues[0].coverageStatus, OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED);
  assert.equal(row.coverageBreakdown.context_required, row.fragmentValues.length);
});

test('an unimplemented/unset execution_kind method is coverage-tagged unavailable', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([{
      methodKey: 'not_built_yet',
      computedValue: null,
      sortOrder: 0,
      executionKind: 'unimplemented',
      requiredEntitlement: null,
    }]),
  });
  const row = result.methodRows.find((r) => r.methodKey === 'not_built_yet');
  assert.equal(row.fragmentValues[0].coverageStatus, OPENING_COVERAGE_STATUS.UNAVAILABLE);
});

test('a computable method with a non-public required_entitlement but no value is coverage-tagged access_filtered, not unavailable', async () => {
  const result = await fetchGematriaOpeningOperation('אל', {
    fetchMethodProfile: async () => ([{
      methodKey: 'premium_method',
      computedValue: null,
      sortOrder: 0,
      executionKind: 'sql_function',
      requiredEntitlement: 'premium',
    }]),
  });
  const row = result.methodRows.find((r) => r.methodKey === 'premium_method');
  assert.equal(row.fragmentValues[0].coverageStatus, OPENING_COVERAGE_STATUS.ACCESS_FILTERED);
});
