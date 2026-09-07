import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeFollowTopic, watchContinuation, assertWatchResult, requireVerifiedEmailSession } from '../src/lib/watchContinuation.js';

const verified = { session: { access_token: 'test-only' }, user: { id: 'test-user', email_confirmed_at: '2026-09-07T00:00:00Z' } };
for (const variant of ['inline', 'gate', 'compact', 'mini', 'checkbox']) {
  test(`${variant}: guest follow offers registration on first visit AND return`, () => {
    for (const justFollowed of [false, true]) assert.equal(watchContinuation({ variant, following: true, justFollowed, pushReady: true }), 'register');
  });
}
test('not following or auth not resolved: no invitation', () => {
  assert.equal(watchContinuation({ following: false }), 'none');
  assert.equal(watchContinuation({ following: true, authLoading: true }), 'none');
});
test('authenticated follow escalates once only to supported enabled Push', () => {
  const args = { following: true, userId: 'account', justFollowed: true, pushReady: true };
  assert.equal(watchContinuation(args), 'push');
  for (const override of [{ noPush: true }, { pushOn: true }, { pushReady: false }, { justFollowed: false }]) assert.equal(watchContinuation({ ...args, ...override }), 'none');
});
test('canonical category alias is idempotent, not a second topic registry', () => {
  assert.equal(normalizeFollowTopic('category:מימד חמש'), 'cat:מימד חמש');
  for (const v of ['cat:מימד חמש', 'number:1237', 'author:writer', 'stream:reality', 'codes:new']) {
    assert.equal(normalizeFollowTopic(v), v);
    assert.equal(normalizeFollowTopic(normalizeFollowTopic(v)), v);
  }
  for (const v of [null, undefined, 123, '']) assert.equal(normalizeFollowTopic(v), '');
});
test('RPC response must confirm the exact requested topic AND boolean', () => {
  for (const on of [true, false]) assert.equal(assertWatchResult({ topic: 'number:1237', following: on }, 'number:1237', on).following, on);
  for (const response of [null, {}, { following: true }, { following: false, topic: 'number:1237' }, { following: true, topic: 'number:358' }]) assert.throws(() => assertWatchResult(response, 'number:1237', true));
});
test('OTP send/account existence is not verified identity evidence', () => {
  assert.equal(requireVerifiedEmailSession(verified), verified);
  for (const bad of [null, {}, { user: verified.user }, { session: verified.session, user: { id: 'test-user' } }, { session: {}, user: verified.user }]) assert.throws(() => requireVerifiedEmailSession(bad));
});
test('one rendering path includes the shared continuation for all variants', () => {
  const source = readFileSync(new URL('../src/components/WatchButton.jsx', import.meta.url), 'utf8');
  assert.match(source, /\{control\}\{continuation\}/);
  assert.doesNotMatch(source, /if\s*\(variant === "mini"\)\s*\{\s*return/);
  assert.doesNotMatch(source, /if\s*\(checkbox\)\s*\{\s*return/);
  assert.match(source, /assertWatchResult\(result, canonicalTopic, next\)/);
  assert.match(source, /if \(!prefs\?\.topics\?\.includes\(canonicalTopic\)\) throw/);
});
test('EmailVerify is identity-only and no longer sends a premature Lead', () => {
  const source = readFileSync(new URL('../src/components/EmailVerify.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bsubscribeEmail\s*\(/);
  assert.doesNotMatch(source, /\btrackSubscribe\s*\(/);
  assert.doesNotMatch(source, /\bbroadcastJoin\s*\(/);
  assert.match(source, /requireVerifiedEmailSession\(await verifyEmailOtp/);
  assert.match(source, /await onVerified\?\.\(verifiedData\.current\)/);
  assert.match(source, /step === "verified"/);
});
