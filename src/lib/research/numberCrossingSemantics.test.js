import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deriveCrossings, deriveHiddenCrossings } from './numberCoreProjection.js';

const profile = (values, extra = {}) => Object.entries(values).map(([methodKey, computedValue], i) => ({
  methodKey, displayLabel: methodKey, computedValue, dbColumn: `c_${methodKey}`, sortOrder: i, ...extra[methodKey],
}));
const cand = (phrase, values) => ({ phrase, is_verified: true, ...Object.fromEntries(Object.entries(values).map(([k, v]) => [`c_${k}`, v])) });

test('hidden crossing needs >=2 independent methods, same-method values only', () => {
  const rows = deriveHiddenCrossings({
    expression: 'נפתלי בנט',
    methodProfile: profile({ רגיל: 631, סידורי: 100, מילוי: 1634 }),
    candidates: [
      cand('נס נתניהו', { רגיל: 631, סידורי: 100, מילוי: 900 }),
      cand('רק רגיל', { רגיל: 631, סידורי: 5, מילוי: 5 }),
    ],
  });
  assert.deepEqual(rows.map((r) => r.partner), ['נס נתניהו']);
  assert.deepEqual(rows[0].methods.map((m) => [m.methodKey, m.value]), [['רגיל', 631], ['סידורי', 100]]);
  assert.ok(rows.every((r) => r.kind === 'hidden_crossing'));
});

test('Bennett/Boaz: Boaz miluy=631 is not a hidden crossing and miluy is never 631 for Bennett', () => {
  const rows = deriveHiddenCrossings({
    expression: 'נפתלי בנט',
    methodProfile: profile({ רגיל: 631, מילוי: 1634 }),
    candidates: [cand('בועז', { רגיל: 85, מילוי: 631 })],
  });
  assert.equal(rows.length, 0);
  assert.ok(!JSON.stringify(rows).includes('בנט · מילוי = 631'));
});

test('dependent methods collapse to one family; anagrams are filtered', () => {
  const p = profile({ רגיל: 631, גדול: 631 }, { רגיל: { dependencyRules: [{ type: 'conditional_equivalence', condition: 'no_final_letters', to: 'גדול' }] } });
  const rows = deriveHiddenCrossings({
    expression: 'אבג',
    methodProfile: p,
    candidates: [cand('דהו', { רגיל: 631, גדול: 631 }), cand('גבא', { רגיל: 631, גדול: 631 })],
  });
  assert.equal(rows.length, 0, 'regular+gadol collapse to one method; anagram excluded');
});

test('numeric root with no phrase fabricates no hidden crossing', () => {
  assert.deepEqual(deriveHiddenCrossings({ expression: '631', methodProfile: profile({ רגיל: 631 }), candidates: [cand('x', { רגיל: 631 })] }), []);
});

test('cross-method intersection carries explicit operand ownership and a distinct kind', () => {
  const families = [
    { method_key: 'רגיל', phrases: ['נפתלי בנט'] },
    { method_key: 'מילוי', phrases: ['בועז'] },
  ];
  const rows = deriveCrossings({ families, expression: 'נפתלי בנט', root: 631, methodProfile: [] });
  const boaz = rows.find((r) => r.partner === 'בועז');
  assert.equal(boaz.kind, 'cross_method_intersection');
  assert.notEqual(boaz.kind, 'hidden_crossing');
  assert.deepEqual(boaz.methods.map((m) => [m.owner, m.methodKey, m.value]), [['נפתלי בנט', 'רגיל', 631], ['בועז', 'מילוי', 631]]);
});

test('drawer/page parity: hidden slot is fed only by hiddenCrossings, cross-method goes to its own section', () => {
  const core = readFileSync(new URL('../../components/number2029/NumberCore2029.jsx', import.meta.url), 'utf8');
  const drawer = readFileSync(new URL('../../components/number2029/NumberDrawer2029.jsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../../pages/Number2029Page.jsx', import.meta.url), 'utf8');
  assert.ok(!/compact \? projectedCrossings/.test(core));
  assert.match(core, /const stageCrossings = Array\.isArray\(hiddenCrossings\)/);
  assert.match(core, /number-cross-method-intersection/);
  assert.match(core, /מפגש בין שיטות/);
  assert.match(drawer, /hiddenCrossings=\{hiddenCrossState\.rows\}/);
  assert.match(page, /hiddenCrossings=\{hiddenCrossState\.rows\}/);
});
