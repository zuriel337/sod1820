import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, UPGRADES, initialState, transition, isUnlocked, fixtureMatchesEngine,
  answerMatches, upgradeAvailable, restorePreview, serializePreview } from './kingdomPreview.js';
const act = (state, type, data = {}) => transition(state, { type, ...data });
const solve = (state, id) => {
  const c = CHALLENGES.find((c) => c.id === id);
  return act(state, 'answer', { id, answer: c.answer });
};
test('all 10 canonical SQL fixtures agree with the existing client engine and reject malformed answers', () => {
  assert.equal(CHALLENGES.length, 10);
  for (const c of CHALLENGES) {
    assert.ok(fixtureMatchesEngine(c), `${c.expression}/${c.method}`);
    assert.ok(answerMatches(c, ` ${c.answer} `));
    for (const value of ['', ' ', 'NaN', '1e2', '-1', `${c.answer}abc`, null, c.answer + 1]) assert.equal(answerMatches(c, value), false);
  }
  assert.equal(fixtureMatchesEngine({ ...CHALLENGES[0], answer: 999 }), false);
});
test('locked buildings, wrong answers, repeated submissions and unaffordable upgrades cannot reward', () => {
  let s = initialState();
  assert.equal(solve(s, 'letters'), s);
  s = act(s, 'start');
  assert.equal(solve(s, 'peace'), s);
  assert.equal(act(s, 'answer', { id: 'letters', answer: '99' }), s);
  assert.equal(act(s, 'upgrade', { id: 'garden-2' }), s);
  s = solve(s, 'letters');
  assert.equal(solve(s, 'letters'), s);
  assert.equal(s.light, 20);
  assert.equal(s.xp, 10);
  assert.equal(act(s, 'answer', { id: '__proto__', answer: '0' }), s);
});
test('complete playable economy: all challenges, five upgrades, finite production and idempotent collection', () => {
  let s = act(initialState(), 'start');
  for (const c of CHALLENGES) {
    assert.ok(isUnlocked(s, c.building), c.id);
    s = solve(s, c.id);
    s = act(s, 'collect');
    for (const u of UPGRADES) {
      if (upgradeAvailable(s, u)) s = act(s, 'upgrade', { id: u.id });
    }
    s = act(s, 'collect');
    assert.ok(s.light >= 0);
  }
  assert.equal(s.completed.length, 10);
  assert.equal(s.upgrades.length, 5);
  assert.equal(s.xp, 100);
  assert.equal(s.pending, 0);
  assert.equal(act(s, 'collect'), s);
  for (const u of UPGRADES) assert.equal(act(s, 'upgrade', { id: u.id }), s);
  assert.deepEqual(restorePreview(serializePreview(s)), s);
});
test('storage corruption and forged balances do not become state; only bounded valid demo events replay', () => {
  for (const raw of ['{', 'null', '{}', '{"version":2,"events":[]}', JSON.stringify({ version: 1, events: Array(65).fill({ type: 'start' }) })]) {
    assert.deepEqual(restorePreview(raw), initialState());
  }
  const s = restorePreview(JSON.stringify({ version: 1, light: 999999, xp: 999999,
    events: [{ type: 'start' }, null, { type: 'upgrade', id: 'mine-3' }, { type: 'answer', id: 'peace', answer: 376 },
      { type: 'answer', id: 'letters', answer: 3 }, { type: 'answer', id: 'letters', answer: 3 }] }));
  assert.equal(s.light, 20);
  assert.equal(s.xp, 10);
  assert.deepEqual(s.upgrades, []);
});
