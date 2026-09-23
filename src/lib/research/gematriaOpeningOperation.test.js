import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEMATRIA_OPENING_OPERATION_CONTRACT,
  PER_WORD_PREFIX_OPENING,
  buildOpeningFragments,
  fetchGematriaOpeningOperation,
  openingMethodTotal,
} from './gematriaOpeningOperation.js';
import { METHODS } from '../gematria.js';

// Stand-in for the canonical fn_method_profile RPC response shape (numberCoreProjection.js
// fetchNumberMethodProfile output). Reuses the EXISTING client method definitions (gematria.js
// METHODS) purely as a deterministic oracle so tests need no network/supabase -- the adapter
// itself never sees or imports this stub logic in production.
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

test('REGULAR opening total for אל בראשית equals the locked ribua invariant (2368)', async () => {
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
});

test('rejects an unsupported operation instead of silently falling back to per_word_prefix_opening', async () => {
  await assert.rejects(
    () => fetchGematriaOpeningOperation('אל', { operation: 'some_other_operation' }),
    /unsupported operation/,
  );
});
