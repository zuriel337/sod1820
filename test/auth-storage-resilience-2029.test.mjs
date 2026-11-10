// Sign-in must survive a failing browser storage (permanent gate).
// Real emitted worker + real Supabase SDK + real auth modules against the GoTrue model, with the SDK's storage replaced by a
// full (quota exceeded) or blocked (SecurityError) localStorage. Covers Google/Facebook (PKCE across the redirect), e-mail code and
// password, session save and refresh, and the honest durability each state allows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryStorage, FullStorage, BlockedStorage, QuotaStorage, createAuthServer, createProductionLikeClient, loadAuthModule, SITE,
} from './helpers/authContractHarness.mjs';
import { createResilientAuthStorage, authStorageStatus, isStorageError, summarizeLocalStorage } from '../src/lib/authStorage.js';
import { classifyAuthError, AUTH_MESSAGES } from '../src/lib/authDiagnostics.js';

const STATES = {
  healthy: () => new MemoryStorage(),
  full: () => Object.assign(new FullStorage(), { keep: 'research-state-must-survive' }),
  blocked: () => new BlockedStorage(),
};
// Each scenario gets its own tab storage (sessionStorage) and primary store. `tab: null` models a browser where session storage is unusable too.
function scenario(state, { tab = new MemoryStorage(), server = createAuthServer() } = {}) {
  const primary = STATES[state]();
  if (primary instanceof FullStorage) MemoryStorage.prototype.setItem.call(primary, 'research_state', primary.keep);   // data that must never be evicted
  globalThis.sessionStorage = tab ?? new BlockedStorage();
  const open = (pathname = '/login') => { const env = createProductionLikeClient({ server, storage: primary, pathname }); return { ...env, auth: loadAuthModule(env.client) }; };
  return { server, primary, tab, open, ...open() };
}
const cleanup = () => { delete globalThis.sessionStorage; };
const signInByCode = async (s, email) => { if (!s.server.users.has(email)) s.server.newUser(email, true); await s.auth.requestEmailOtp(email); return s.auth.verifyEmailOtp(email, s.server.lastCode(email)); };

for (const state of ['healthy', 'full', 'blocked']) {
  test(`[${state} localStorage] e-mail code sign-in works; the session survives a reload where the browser allows it`, async () => {
    const s = scenario(state);
    try {
      const data = await signInByCode(s, 'a@example.invalid');
      assert.equal(data.user.email, 'a@example.invalid');
      const reopened = s.open('/world');
      const { data: restored } = await reopened.client.auth.getSession();
      assert.equal(restored.session?.user.email, 'a@example.invalid', 'a reload in the same tab keeps the session');
      const status = authStorageStatus();
      assert.equal(status.persistence, state === 'healthy' ? 'durable' : 'tab', 'durability is reported honestly');
      if (state === 'full') assert.equal(s.primary.getItem('research_state'), 'research-state-must-survive', 'nothing is evicted to make room');
    } finally { cleanup(); }
  });

  test(`[${state} localStorage] password sign-in works and a refresh replaces the session without a stale copy shadowing it`, async () => {
    const s = scenario(state);
    try {
      s.server.newUser('p@example.invalid', true, 'correct horse');
      const first = await s.auth.signInWithPassword('p@example.invalid', 'correct horse');
      const refreshed = await s.client.auth.refreshSession();
      assert.equal(refreshed.error, null);
      assert.notEqual(refreshed.data.session.access_token, first.session.access_token);
      const { data } = await s.open('/els').client.auth.getSession();
      assert.equal(data.session.access_token, refreshed.data.session.access_token, 'the newest session is the one read back');
    } finally { cleanup(); }
  });

  test(`[${state} localStorage] Google/Facebook: the PKCE verifier survives the redirect and the callback completes the session`, async () => {
    const s = scenario(state);
    try {
      for (const provider of ['google', 'facebook']) {
        const out = await s.client.auth.signInWithOAuth({ provider, options: { redirectTo: SITE + '/auth/callback', skipBrowserRedirect: true } });
        assert.equal(out.error, null, 'opening the provider never throws on a storage failure');
        const challenge = new URL(out.data.url).searchParams.get('code_challenge');
        const code = s.server.issueOAuthCode(`${provider}@example.invalid`, challenge);
        // The redirect leaves the page; the callback is a NEW page load in the same tab.
        const callback = s.open('/auth/callback');
        const exchanged = await callback.client.auth.exchangeCodeForSession(code);
        assert.equal(exchanged.error, null, provider);
        assert.equal(exchanged.data.session.user.email, `${provider}@example.invalid`);
        const { data } = await s.open('/').client.auth.getSession();
        assert.equal(data.session.user.email, `${provider}@example.invalid`);
      }
    } finally { cleanup(); }
  });
}

test('[full + blocked tab storage] sign-in still works on this page, honestly reported as not surviving a reload or a redirect', async () => {
  const s = scenario('full', { tab: null });
  try {
    const data = await signInByCode(s, 'm@example.invalid');
    assert.equal(data.user.email, 'm@example.invalid');
    assert.equal((await s.client.auth.getSession()).data.session.user.email, 'm@example.invalid', 'the page that signed in keeps it');
    assert.equal(authStorageStatus().persistence, 'none');
    assert.equal((await s.open('/world').client.auth.getSession()).data.session, null, 'a reload has nothing to restore: that is what "none" means');
    // PKCE cannot cross a redirect without any storage: the failure is classified, never silent.
    const out = await s.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE + '/auth/callback', skipBrowserRedirect: true } });
    const code = s.server.issueOAuthCode('g@example.invalid', new URL(out.data.url).searchParams.get('code_challenge'));
    const lost = await s.open('/auth/callback').client.auth.exchangeCodeForSession(code);
    assert.ok(lost.error); assert.equal(classifyAuthError(lost.error), 'pkce_mismatch');
  } finally { cleanup(); }
});

test('a stale session that cannot be overwritten never shadows the fresh one, is not lost, and the fallback copy is dropped once there is room', () => {
  const primary = new QuotaStorage(70); const tab = new MemoryStorage();
  primary.setItem('session', 'OLD'.repeat(5));                                // 'session' + 15 chars
  primary.setItem('research_state', 'x'.repeat(30));                           // data that must never be evicted
  const storage = createResilientAuthStorage({ primary, secondary: tab });
  storage.setItem('session', 'NEW'.repeat(20));                                // far too large even with the old value removed
  assert.equal(storage.getItem('session'), 'NEW'.repeat(20));
  assert.equal(primary.getItem('session'), 'OLD'.repeat(5), 'the old value is left in place, not lost');
  assert.equal(primary.getItem('research_state'), 'x'.repeat(30), 'other keys are never touched');
  assert.equal(tab.getItem('session'), 'NEW'.repeat(20), 'the fresh value really lives in the tab store');
  assert.equal(storage.status().persistence, 'tab');
  const reloaded = createResilientAuthStorage({ primary, secondary: tab });
  assert.equal(reloaded.getItem('session'), 'NEW'.repeat(20), 'a reload reads the tab copy before the stale primary');
  assert.equal(reloaded.status().persistence, 'tab', 'durability is reported honestly after a reload too');
  const otherTab = createResilientAuthStorage({ primary, secondary: new MemoryStorage() });
  assert.equal(otherTab.getItem('session'), 'OLD'.repeat(5), 'another tab still finds the durable (older) session instead of nothing');
  primary.removeItem('research_state');                                        // room again
  storage.setItem('session', 'NEWER');
  assert.equal(primary.getItem('session'), 'NEWER'); assert.equal(tab.getItem('session'), null); assert.equal(storage.status().mode, 'normal');
  storage.removeItem('session'); assert.equal(storage.getItem('session'), null);
});

test('the resilient storage never throws, never touches other keys, and probes durability without side effects', () => {
  for (const [primary, secondary, expected] of [[new FullStorage(), new MemoryStorage(), 'tab'], [new BlockedStorage(), new BlockedStorage(), 'none'], [new MemoryStorage(), new MemoryStorage(), 'durable']]) {
    primary.map?.set?.('other', 'untouched');
    const storage = createResilientAuthStorage({ primary, secondary });
    assert.doesNotThrow(() => { storage.setItem('k', 'v'); storage.getItem('k'); storage.removeItem('k'); });
    assert.equal(storage.probe(), expected);
    assert.equal(primary.map?.get?.('other') ?? 'untouched', 'untouched');
    assert.equal(primary.map?.has?.('sod_auth_probe') ?? false, false, 'the probe key is removed');
  }
});

test('storage errors are never reported as network errors; real network failures are never reported as storage', async () => {
  const quota = new DOMException("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.", 'QuotaExceededError');
  const blocked = new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
  for (const error of [quota, blocked]) { assert.equal(isStorageError(error), true); assert.equal(classifyAuthError(error), 'storage_unavailable'); }
  for (const error of [new TypeError('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, { status: 503, message: 'public_reading_auth_unreachable' }]) {
    assert.equal(isStorageError(error), false); assert.equal(classifyAuthError(error), 'network');
  }
  assert.notEqual(AUTH_MESSAGES.storage_unavailable, AUTH_MESSAGES.network);
  // Through the real worker: an unreachable Auth server is a 503 'unreachable' (network), not the policy denial 403 that means "stale worker".
  const s = scenario('healthy');
  try {
    s.server.state.failNetwork = true;
    await assert.rejects(s.auth.requestEmailOtp('n@example.invalid'), error => classifyAuthError(error) === 'network' && Number(error.status) === 503);
    assert.equal(s.worker.denied.length, 0, 'an outage is not counted as a worker denial');
    s.server.state.failNetwork = false; s.server.forgetSendTimes();
    await assert.doesNotReject(s.auth.requestEmailOtp('n@example.invalid'));
  } finally { cleanup(); }
});

test('a code request with a full localStorage reaches Auth and the person can finish signing in (the reported production failure)', async () => {
  const s = scenario('full');
  try {
    s.server.newUser('owner@example.invalid', true);
    await s.auth.requestEmailOtp('owner@example.invalid');
    assert.equal(s.server.log.filter(line => line.path === '/otp').length, 1, 'the request leaves the browser');
    assert.equal((await s.auth.verifyEmailOtp('owner@example.invalid', s.server.lastCode('owner@example.invalid'))).user.email, 'owner@example.invalid');
  } finally { cleanup(); }
});

test('the storage report lists names and sizes only, masks identifiers and groups piles of same-shaped keys', () => {
  const store = new MemoryStorage();
  const uid = '3f2b8c1e-1111-4222-8333-444455556666';
  for (let i = 0; i < 40; i++) store.setItem(`sod_research_v2:user:${uid}:pending:${i}ab`, JSON.stringify({ secret: 'value-must-not-appear', queue: Array(30).fill('x') }));
  store.setItem('sod_research_v2:user:' + uid, 'S'.repeat(5000));
  store.setItem(`ua_visit_${uid}_2026-11-10`, '1'); store.setItem(`ua_visit_${uid}_2026-11-09`, '1');
  const key = Symbol.iterator; store.length = store.map.size; store.key = i => [...store.map.keys()][i];
  const report = summarizeLocalStorage(store);
  const raw = JSON.stringify(report);
  assert.ok(!raw.includes('value-must-not-appear') && !raw.includes(uid), 'no values and no identifiers');
  const pile = report.entries.find(entry => entry.key.includes(':pending:')); assert.equal(pile.count, 40);
  assert.equal(report.entries.find(entry => entry.key.startsWith('ua_visit_')).count, 2);
  assert.ok(report.totalChars > 40 * 100); void key;
});
