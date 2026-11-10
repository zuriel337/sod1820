// Moving between localStorage and sessionStorage must never lose a valid session, sign existing users out, or break the OAuth return.
// "Legacy" = the client exactly as it was before the resilient storage (SDK given localStorage directly, default project key).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { MemoryStorage, QuotaStorage, BlockedStorage, createAuthServer, createProductionLikeClient, createWorkerFetch, loadAuthModule, API, ANON, SITE } from './helpers/authContractHarness.mjs';
import { authStorageStatus } from '../src/lib/authStorage.js';

const AUTH_KEY = 'sb-linswmnnkjxvweumprav-auth-token', VERIFIER_KEY = AUTH_KEY + '-code-verifier';
const legacyClient = (server, storage) => createClient(API, ANON, { auth: { storage, flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: createWorkerFetch(server).workerFetch } });
const withTab = async (tab, body) => { globalThis.sessionStorage = tab; try { return await body(); } finally { delete globalThis.sessionStorage; } };
const stored = (store, key = AUTH_KEY) => { const raw = store.getItem(key); return raw ? JSON.parse(raw) : null; };
const fill = quota => { quota.capacity = quota.used - 1; };   // nothing more fits, not even a same-size replacement

test('healthy: an existing user (session written by the legacy client) stays signed in; the same keys are used and the tab store is untouched', async () => {
  const server = createAuthServer(), local = new MemoryStorage(), tab = new MemoryStorage();
  server.newUser('old@example.invalid', true, 'pw');
  const before = (await legacyClient(server, local).auth.signInWithPassword({ email: 'old@example.invalid', password: 'pw' })).data.session;
  const keysBefore = [...local.map.keys()];
  await withTab(tab, async () => {
    const { client } = createProductionLikeClient({ server, storage: local });
    const { data } = await client.auth.getSession();
    assert.equal(data.session.user.id, before.user.id, 'the existing session is recognised');
    assert.equal(data.session.access_token, before.access_token);
    const refreshed = await client.auth.refreshSession();
    assert.equal(refreshed.error, null);
    assert.deepEqual([...local.map.keys()], keysBefore, 'same storage key, no copy, no new keys');
    assert.equal(stored(local).access_token, refreshed.data.session.access_token, 'the rotated session is written where the legacy client wrote it');
    assert.equal(tab.map.size, 0, 'sessionStorage is not used while localStorage works');
    assert.equal(authStorageStatus().persistence, 'durable');
  });
  assert.equal(server.log.filter(line => line.path === '/logout').length, 0, 'nobody is signed out');
});

test('localStorage fills AFTER sign-in: the refreshed session is kept in the tab (really used), the user stays signed in, the old durable copy is kept, other tabs are not signed out', async () => {
  const server = createAuthServer(), local = new QuotaStorage(1e6), tab = new MemoryStorage();
  server.newUser('full@example.invalid', true, 'pw');
  await legacyClient(server, local).auth.signInWithPassword({ email: 'full@example.invalid', password: 'pw' });
  local.setItem('research_state', 'precious'); const durableBefore = local.getItem(AUTH_KEY); fill(local);
  await withTab(tab, async () => {
    const { client } = createProductionLikeClient({ server, storage: local });
    const refreshed = await client.auth.refreshSession();
    assert.equal(refreshed.error, null, 'a refresh with a full store succeeds');
    assert.equal(stored(tab).access_token, refreshed.data.session.access_token, 'the fallback store really holds the fresh session');
    assert.equal((await client.auth.getSession()).data.session.access_token, refreshed.data.session.access_token, 'the fresh one is read, not the stale one');
    assert.equal(local.getItem(AUTH_KEY), durableBefore, 'the older durable copy is untouched (never deleted)');
    assert.equal(local.getItem('research_state'), 'precious');
    assert.equal(authStorageStatus().persistence, 'tab');
    // The same tab reloads: still signed in with the fresh session.
    const reload = createProductionLikeClient({ server, storage: local });
    assert.equal((await reload.client.auth.getSession()).data.session.access_token, refreshed.data.session.access_token);
    // The browser frees space (the person clears data): the next write goes back to localStorage and the tab copy is dropped.
    local.capacity = 1e6;
    const again = await reload.client.auth.refreshSession();
    assert.equal(again.error, null);
    assert.equal(stored(local).access_token, again.data.session.access_token); assert.equal(tab.getItem(AUTH_KEY), null);
    assert.equal(authStorageStatus().persistence, 'durable');
  });
  assert.equal(server.log.filter(line => line.path === '/logout').length, 0);
});

test('localStorage becomes unreadable mid-session (site data blocked): the tab keeps its session through a refresh', async () => {
  const server = createAuthServer(), tab = new MemoryStorage(); let blocked = false; const real = new MemoryStorage(); const blockedStore = new BlockedStorage();
  const primary = { getItem: k => (blocked ? blockedStore.getItem(k) : real.getItem(k)), setItem: (k, v) => (blocked ? blockedStore.setItem(k, v) : real.setItem(k, v)), removeItem: k => (blocked ? blockedStore.removeItem(k) : real.removeItem(k)) };
  server.newUser('b@example.invalid', true, 'pw');
  await withTab(tab, async () => {
    const { client } = createProductionLikeClient({ server, storage: primary });
    await client.auth.signInWithPassword({ email: 'b@example.invalid', password: 'pw' });
    blocked = true;
    const refreshed = await client.auth.refreshSession();
    assert.equal(refreshed.error, null);
    assert.equal((await client.auth.getSession()).data.session.user.email, 'b@example.invalid');
    assert.equal(authStorageStatus().persistence, 'tab');
  });
  assert.equal(server.log.filter(line => line.path === '/logout').length, 0);
});

test('OAuth return with a full localStorage: the verifier lives in the tab store across the redirect, the callback completes, nothing is left behind', async () => {
  const server = createAuthServer(), local = new QuotaStorage(1e6), tab = new MemoryStorage();
  local.setItem('research_state', 'precious'); fill(local);
  await withTab(tab, async () => {
    const first = createProductionLikeClient({ server, storage: local, pathname: '/login' });
    const out = await first.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE + '/auth/callback', skipBrowserRedirect: true } });
    assert.equal(out.error, null);
    assert.ok(tab.getItem(VERIFIER_KEY), 'the PKCE verifier is in the tab store (survives the redirect)');
    assert.equal(local.getItem(VERIFIER_KEY), null);
    const code = server.issueOAuthCode('g@example.invalid', new URL(out.data.url).searchParams.get('code_challenge'));
    const callback = createProductionLikeClient({ server, storage: local, pathname: '/auth/callback' });   // a NEW page load
    const exchanged = await callback.client.auth.exchangeCodeForSession(code);
    assert.equal(exchanged.error, null);
    assert.equal(tab.getItem(VERIFIER_KEY), null, 'the verifier is removed after use'); assert.equal(local.getItem(VERIFIER_KEY), null);
    assert.equal(stored(tab).user.email, 'g@example.invalid');
    assert.equal(local.getItem('research_state'), 'precious', 'application data is never evicted');
  });
});

test('a healthy browser: OAuth and code sign-in write exactly the keys the legacy client wrote, and sessionStorage stays empty', async () => {
  const server = createAuthServer(), legacyStore = new MemoryStorage(), local = new MemoryStorage(), tab = new MemoryStorage();
  const legacy = legacyClient(server, legacyStore);
  const legacyOut = await legacy.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE + '/auth/callback', skipBrowserRedirect: true } });
  const shape = keys => keys.map(key => key.replace(/-flow-[0-9a-f]+-/, '-flow-<id>-')).sort();
  const legacyKeysDuring = shape([...legacyStore.map.keys()]);
  await withTab(tab, async () => {
    const { client } = createProductionLikeClient({ server, storage: local });
    const out = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE + '/auth/callback', skipBrowserRedirect: true } });
    assert.equal(new URL(out.data.url).origin + new URL(out.data.url).pathname, new URL(legacyOut.data.url).origin + new URL(legacyOut.data.url).pathname);
    assert.deepEqual(shape([...local.map.keys()]), legacyKeysDuring);
    assert.equal(tab.map.size, 0);
  });
});
