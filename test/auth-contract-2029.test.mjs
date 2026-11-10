// Authentication contract (permanent release gate).
// Runs the REAL emitted public-reading service worker, the REAL @supabase/supabase-js client configured like production and the
// REAL src/lib/auth.js against an in-memory GoTrue model (test/helpers/authContractHarness.mjs). Nothing here is a UI-text check:
// every assertion is about the request that would leave the browser and the answer the worker/auth server gives.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import {
  API, SITE, SHA, MemoryStorage, createAuthServer, createWorkerFetch, createProductionLikeClient, loadAuthModule,
} from './helpers/authContractHarness.mjs';
import { buildPublicReadingWorker, startPublicReading, publicReadingBootstrap, PUBLIC_READING_POLICY_ID } from '../public-reading-deploy/transport.js';
import { EMAIL_OTP_MIN_LENGTH, EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from '../src/lib/emailOtp.js';
import { classifyAuthError, recordAuthEvent, readAuthTrail, AUTH_FAILURE_KINDS, AUTH_MESSAGES, RECOVERABLE_BY_REFRESH } from '../src/lib/authDiagnostics.js';
import { refreshAppRuntime } from '../src/lib/authRecovery.js';
import { otpResendWaitMs, markOtpSent, clearOtpThrottle, OTP_RESEND_WINDOW_MS } from '../src/lib/otpThrottle.js';

const CALLBACK = SITE + '/auth/callback';
function setup(options = {}) {
  const server = createAuthServer(options.server);
  const env = createProductionLikeClient({ server, ...options.client });
  return { server, ...env, auth: loadAuthModule(env.client) };
}
const loginOk = async (auth, server, email, { confirmed = true } = {}) => {
  if (confirmed && !server.users.has(email)) server.newUser(email, true);
  await auth.requestEmailOtp(email);
  return auth.verifyEmailOtp(email, server.lastCode(email));
};

// ---- the two production regressions ------------------------------------------------------------------
test('REGRESSION #1285: a code request with an arbitrary query parameter or destination is denied by the worker and never reaches Auth', async () => {
  for (const redirect of ['https://evil.invalid/auth/callback', SITE + '/auth/callback?next=evil', SITE + '/auth/callback#t', SITE + '/', 'javascript:alert(1)']) {
    const { server, client, worker } = setup();
    const result = await client.auth.signInWithOtp({ email: 'a@example.invalid', options: { shouldCreateUser: true, data: {}, emailRedirectTo: redirect } });
    assert.equal(result.error?.status, 403, redirect);
    assert.match(result.error.message, /public_reading_auth_denied/);
    assert.equal(server.log.length, 0, 'the request must not reach Supabase: ' + redirect);
    assert.equal(worker.denied.length, 1);
  }
  const { server, worker } = setup();
  for (const query of ['?foo=1', '?redirect_to=' + encodeURIComponent(CALLBACK) + '&foo=1', '?redirect_to=' + encodeURIComponent(CALLBACK) + '&redirect_to=' + encodeURIComponent(CALLBACK)]) {
    const response = await worker.workerFetch(API + '/auth/v1/otp' + query, { method: 'POST', headers: { apikey: 'k', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.invalid', create_user: true, data: {}, code_challenge: 'a'.repeat(43), code_challenge_method: 's256' }) });
    assert.equal(response.status, 403, query);
  }
  assert.equal(server.log.length, 0);
});

test('REGRESSION #1286: the production client\'s own code request is admitted for existing, new and sign-in-only requests', async () => {
  const { server, auth, worker } = setup();
  server.newUser('existing@example.invalid', true);
  for (const [email, options] of [['existing@example.invalid', undefined], ['brand-new@example.invalid', { shouldCreateUser: true }]]) {
    server.forgetSendTimes();
    assert.equal(JSON.stringify(await auth.requestEmailOtp(email, options)), '{"ok":true}');
  }
  server.forgetSendTimes();
  await assert.rejects(auth.requestEmailOtp('nobody@example.invalid', { shouldCreateUser: false }), error => error.status === 422);   // reached Auth, answered by Auth
  assert.equal(worker.denied.length, 0, 'the worker must not block any request the client emits');
  for (const line of worker.passed.filter(line => line.includes('/otp'))) {
    assert.match(line, /^POST \/auth\/v1\/otp\?redirect_to=https%3A%2F%2Fsod1820\.co\.il%2Fauth%2Fcallback$/, 'exactly one admitted query parameter');
  }
});

test('the e-mail link destination is the exact callback on trusted origins only; an unverified preview origin sends no redirect at all', () => {
  const { auth } = setup();
  assert.equal(auth.emailLinkRedirect(SITE), CALLBACK);
  assert.equal(auth.emailLinkRedirect('https://random-preview.vercel.app', { integratedPreview: true }), undefined);
  assert.equal(auth.emailLinkRedirect('not a url'), undefined);
});

// ---- verification: types, lengths, single use -----------------------------------------------------
test('existing account: e-mail code signs in; the Auth answer carries the right user', async () => {
  const { server, auth } = setup();
  const data = await loginOk(auth, server, 'owner@example.invalid');
  assert.equal(data.user.email, 'owner@example.invalid');
  assert.ok(data.session.access_token && data.session.refresh_token);
});

test('NEW account: the signup confirmation code is admitted by the worker (type signup) and signs the new user in', async () => {
  const { server, auth, worker } = setup();
  await auth.requestEmailOtp('new-person@example.invalid');
  assert.equal(server.codes.get('new-person@example.invalid').type, 'signup', 'model: an unconfirmed account is sent a signup code');
  const data = await auth.verifyEmailOtp('new-person@example.invalid', server.lastCode('new-person@example.invalid'));
  assert.equal(data.user.email, 'new-person@example.invalid');
  assert.equal(server.users.get('new-person@example.invalid').confirmed, true);
  assert.equal(worker.denied.length, 0);
});

test('6, 8 and 10 digit codes are consistent across the sanitizer, the worker and Auth; 5 and 11 digits are refused before and by the worker', async () => {
  assert.equal(EMAIL_OTP_MIN_LENGTH, 6); assert.equal(EMAIL_OTP_MAX_LENGTH, 10);
  for (const length of [6, 8, 10]) {
    const { server, auth } = setup({ server: { codeLength: length } });
    server.newUser('x@example.invalid', true);
    await auth.requestEmailOtp('x@example.invalid');
    const code = server.lastCode('x@example.invalid');
    assert.equal(code.length, length);
    assert.equal(isValidEmailOtp(sanitizeEmailOtp(' ' + code.replace(/(\d{3})/g, '$1 ') + ' ')), true, 'sanitizer keeps a spaced/pasted code');
    assert.equal((await auth.verifyEmailOtp('x@example.invalid', code)).user.email, 'x@example.invalid', length + ' digits');
  }
  for (const bad of ['12345', '12345678901', '12 345', '١٢٣٤٥٦']) {
    assert.equal(isValidEmailOtp(bad), false, bad);
    const { worker } = setup();
    const response = await worker.workerFetch(API + '/auth/v1/verify', { method: 'POST', headers: { apikey: 'k' }, body: JSON.stringify({ email: 'x@example.invalid', token: bad, type: 'email' }) });
    assert.equal(response.status, 403, bad);
  }
});

test('only the e-mail verification types are admitted; recovery, magic-link, invite, change and SMS types are denied', async () => {
  for (const type of ['recovery', 'magiclink', 'invite', 'email_change', 'phone_change', 'sms', 'signup ', 'EMAIL', '']) {
    const { server, worker } = setup();
    const response = await worker.workerFetch(API + '/auth/v1/verify', { method: 'POST', headers: { apikey: 'k' }, body: JSON.stringify({ email: 'x@example.invalid', token: '123456', type }) });
    assert.equal(response.status, 403, JSON.stringify(type));
    assert.equal(server.log.length, 0);
  }
  for (const type of ['email', 'signup']) {
    const { server, worker } = setup();
    server.newUser('x@example.invalid', true);
    const response = await worker.workerFetch(API + '/auth/v1/verify', { method: 'POST', headers: { apikey: 'k' }, body: JSON.stringify({ email: 'x@example.invalid', token: '123456', type }) });
    assert.notEqual(response.status === 403 && (await response.clone().text()).includes('public_reading_auth_denied'), true, type);
  }
});

test('a code is single use; the newest code wins; double submission shares one request; an already-consumed code after sign-in is not an error', async () => {
  const { server, auth, client } = setup();
  server.newUser('o@example.invalid', true);
  await auth.requestEmailOtp('o@example.invalid');
  const first = server.lastCode('o@example.invalid');
  server.forgetSendTimes(); await auth.requestEmailOtp('o@example.invalid');
  const second = server.lastCode('o@example.invalid');
  await assert.rejects(auth.verifyEmailOtp('o@example.invalid', first), error => classifyAuthError(error) === 'otp_expired');   // superseded
  server.log.length = 0;
  const [a, b] = await Promise.all([auth.verifyEmailOtp('o@example.invalid', second), auth.verifyEmailOtp('o@example.invalid', second)]);
  assert.equal(a.user.email, b.user.email);
  assert.equal(server.log.filter(line => line.path === '/verify').length, 1, 'one verification request for a double submit');
  // The same (now consumed) code submitted again after the person is already signed in resolves to the existing session.
  const again = await auth.verifyEmailOtp('o@example.invalid', second);
  assert.equal(again.user.email, 'o@example.invalid');
  // But a consumed code for a different, not-signed-in account is a real failure.
  await client.auth.signOut();
  await assert.rejects(auth.verifyEmailOtp('o@example.invalid', second), error => classifyAuthError(error) === 'otp_expired');
});

test('rate limit: Auth answers 429, the client classifies it, and the tab does not re-request inside the window', async () => {
  const { server, auth } = setup();
  server.newUser('r@example.invalid', true);
  await auth.requestEmailOtp('r@example.invalid');
  await assert.rejects(auth.requestEmailOtp('r@example.invalid'), error => error.status === 429 && classifyAuthError(error) === 'rate_limited');
  clearOtpThrottle();
  assert.equal(otpResendWaitMs('R@example.invalid'), 0);
  markOtpSent('r@example.invalid', 1000);
  assert.equal(otpResendWaitMs(' R@example.invalid ', 1000 + 10_000), OTP_RESEND_WINDOW_MS - 10_000);
  assert.equal(otpResendWaitMs('r@example.invalid', 1000 + OTP_RESEND_WINDOW_MS), 0);
  clearOtpThrottle();
});

test('a 5xx while sending leaves the code step reachable (mail may still be on its way): the error carries the status', async () => {
  const { server, auth } = setup();
  server.newUser('s@example.invalid', true); server.state.rejectNextSend = 500;
  await assert.rejects(auth.requestEmailOtp('s@example.invalid'), error => Number(error.status) === 500 && classifyAuthError(error) === 'server_error');
});

// ---- password, e-mail link, OAuth shape ---------------------------------------------------------------------
test('password login works and a wrong password is classified without revealing why', async () => {
  const { server, auth } = setup();
  server.newUser('p@example.invalid', true, 'correct horse');
  assert.equal((await auth.signInWithPassword('p@example.invalid', 'correct horse')).user.email, 'p@example.invalid');
  await assert.rejects(auth.signInWithPassword('p@example.invalid', 'nope'), error => classifyAuthError(error) === 'invalid_credentials');
});

test('e-mail link: the PKCE code in the same browser completes the session; a different browser has no verifier and is classified, not blocked', async () => {
  const { server, auth, client, storage } = setup();
  server.newUser('l@example.invalid', true);
  await auth.requestEmailOtp('l@example.invalid');
  const link = new URL(server.lastLink('l@example.invalid'));
  assert.equal(link.origin + link.pathname, CALLBACK);
  const authCode = link.searchParams.get('code');
  const exchanged = await client.auth.exchangeCodeForSession(authCode);
  assert.equal(exchanged.error, null);
  assert.equal(exchanged.data.session.user.email, 'l@example.invalid');
  // Link opened in another browser / the installed app: new storage, no code verifier.
  const other = createProductionLikeClient({ server, pathname: '/auth/callback' });
  server.forgetSendTimes(); await auth.requestEmailOtp('l@example.invalid');
  const foreign = await other.client.auth.exchangeCodeForSession(new URL(server.lastLink('l@example.invalid')).searchParams.get('code'));
  assert.ok(foreign.error, 'no verifier in this storage');
  assert.equal(classifyAuthError(foreign.error), 'pkce_mismatch');
  assert.ok(storage.getItem('sod-public-reading-account') || [...storage.map.keys()].length > 0);
});

test('Google and Facebook still return through the exact callback with PKCE (shape unchanged)', async () => {
  const { auth, client } = setup();
  for (const provider of ['google', 'facebook']) {
    const result = await client.auth.signInWithOAuth({ provider, options: { redirectTo: CALLBACK, skipBrowserRedirect: true } });
    const url = new URL(result.data.url);
    assert.equal(url.searchParams.get('redirect_to'), CALLBACK);
    assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  }
});

// ---- session persistence, refresh, isolation ----------------------------------------------------------------
test('the session survives a page refresh and in-app navigation without any new Auth request', async () => {
  const { server, auth, storage } = setup();
  await loginOk(auth, server, 'keep@example.invalid');
  const before = server.log.length;
  for (const pathname of ['/login', '/world', '/els', '/auth/callback/' /* not the callback: trailing slash */, '/community']) {
    const reopened = createProductionLikeClient({ server, storage, pathname });
    const { data } = await reopened.client.auth.getSession();
    assert.equal(data.session?.user.email, 'keep@example.invalid', pathname);
  }
  assert.equal(server.log.length, before, 'restoring a session from storage is local');
});

test('refresh works through the worker, concurrent refreshes share one grant and a replayed refresh token fails with a classified error', async () => {
  const { server, auth, client, worker } = setup();
  const data = await loginOk(auth, server, 'rf@example.invalid');
  const oldRefresh = data.session.refresh_token;
  server.log.length = 0;
  const [one, two] = await Promise.all([client.auth.refreshSession(), client.auth.refreshSession()]);
  assert.equal(one.error, null); assert.equal(two.error, null);
  assert.equal(server.log.filter(line => line.path === '/token').length, 1, 'concurrent refreshes are de-duplicated');
  const replay = await client.auth.refreshSession({ refresh_token: oldRefresh });
  assert.ok(replay.error);
  assert.equal(classifyAuthError(replay.error), 'refresh_failed');
  assert.equal(worker.denied.length, 0);
});

test('two people never receive each other\'s session or identity, even concurrently', async () => {
  const server = createAuthServer();
  const a = createProductionLikeClient({ server }), b = createProductionLikeClient({ server });
  const authA = loadAuthModule(a.client), authB = loadAuthModule(b.client);
  const [sa, sb] = await Promise.all([loginOk(authA, server, 'alice@example.invalid'), loginOk(authB, server, 'bob@example.invalid')]);
  assert.notEqual(sa.user.id, sb.user.id);
  assert.notEqual(sa.session.access_token, sb.session.access_token);
  const [ua, ub] = await Promise.all([a.client.auth.getUser(), b.client.auth.getUser()]);
  assert.equal(ua.data.user.email, 'alice@example.invalid'); assert.equal(ub.data.user.email, 'bob@example.invalid');
  assert.equal(a.storage.map.size > 0 && b.storage.map.size > 0, true);
  assert.notDeepEqual([...a.storage.map.values()], [...b.storage.map.values()]);
});

test('Auth traffic is never cached or replayed by the worker: no-store, no cookies, errors on redirect', async () => {
  const { server, auth, client, worker } = setup();
  await loginOk(auth, server, 'nc@example.invalid');
  await client.auth.getUser(); await client.auth.refreshSession(); await client.auth.signOut({ scope: 'local' });
  const authCalls = worker.forwarded.filter(call => call.path.startsWith('/auth/v1/') && call.path !== '/auth/v1/settings');
  assert.ok(authCalls.length >= 4, JSON.stringify(authCalls.map(call => call.path)));
  for (const call of authCalls) { assert.equal(call.cache, 'no-store', call.path); assert.equal(call.credentials, 'omit', call.path); assert.equal(call.redirect, 'error', call.path); }
});

test('analytics and public telemetry in the same worker cannot change or block an Auth request', async () => {
  const { server, auth, worker } = setup();
  const noise = [
    [API + '/rest/v1/rpc/track_visit', { p_path: '/login' }], [API + '/rest/v1/rpc/ingest_event', { p_event: 'x' }],
    ['https://www.google-analytics.com/g/collect?v=2', null], [API + '/rest/v1/rpc/ingest_event?apikey=nope', { p_event: 'beacon' }],
  ];
  for (const [url, body] of noise) await worker.workerFetch(url, { method: body ? 'POST' : 'GET', headers: { apikey: 'k' }, ...(body ? { body: JSON.stringify(body) } : {}) }).catch(() => null);
  await loginOk(auth, server, 'an@example.invalid');
  assert.equal(worker.denied.length, 0);
  assert.equal(server.log.some(line => line.path === '/verify' && line.status === 200), true);
});

// ---- old / stale service worker clients ----------------------------------------------------------------------
test('a page the worker cannot admit heals itself once (drops service workers and caches, never the session) and then stops', async () => {
  const calls = []; let flag = null;
  const runtime = (policyOverride) => ({
    navigator: { serviceWorker: { register: async () => ({ active: { postMessage() {} }, installing: null, update: async () => {} }), ready: Promise.resolve(),
      controller: { postMessage(_m, [port]) { port.postMessage?.({ policy: policyOverride, sourceSha: 'b'.repeat(40) }); } }, addEventListener() {}, removeEventListener() {} } },
    document: { body: { textContent: '' } }, MessageChannel: class { constructor() { const self = this; this.port1 = { onmessage: null, close() {} }; this.port2 = { postMessage: data => setTimeout(() => self.port1.onmessage?.({ data }), 0), close() {} }; } },
    setTimeout, clearTimeout, loadEntry: async () => { calls.push('entry'); },
    healed: () => { flag = null; },
    recover: async () => { if (flag === '1') return false; flag = '1'; calls.push('reload'); return true; },
  });
  const config = { entry: '/assets/x.js', sourceSha: SHA, policy: PUBLIC_READING_POLICY_ID, timeoutMs: 2000 };
  const stale = runtime('public-reading-OLD');
  assert.equal(await startPublicReading(config, stale), false);
  assert.deepEqual(calls, ['reload'], 'first failure: one self-heal, application not imported');
  assert.equal(await startPublicReading(config, stale), false);
  assert.deepEqual(calls, ['reload'], 'second failure in the same tab session: no reload loop');
  assert.equal(stale.document.body.textContent, 'העמוד לא נפתח. אפשר לרענן ולנסות שוב.');
  const good = runtime(PUBLIC_READING_POLICY_ID);
  good.navigator.serviceWorker.controller.postMessage = (_m, [port]) => port.postMessage({ policy: PUBLIC_READING_POLICY_ID, sourceSha: SHA });
  flag = '1';
  assert.equal(await startPublicReading(config, good), true);
  assert.equal(flag, null, 'a healthy start re-arms the one-time heal for a later deployment');
  const html = publicReadingBootstrap('/assets/x.js', SHA);
  assert.match(html, /recover:async/); assert.match(html, /getRegistrations/); assert.match(html, /caches\.delete/);
  assert.doesNotMatch(html, /localStorage|indexedDB/, 'the heal never touches the stored session');
});

test('the user-facing recovery action removes workers and caches only; local/session storage and IndexedDB are untouched', async () => {
  const log = [];
  const registrations = [{ unregister: async () => { log.push('unregister'); return true; } }, { unregister: async () => { log.push('unregister'); return true; } }];
  const caches = { keys: async () => ['a', 'b', 'c'], delete: async key => { log.push('delete ' + key); return true; } };
  const result = await refreshAppRuntime({ navigatorRef: { serviceWorker: { getRegistrations: async () => registrations } }, cachesRef: caches, reload: () => log.push('reload') });
  assert.deepEqual(result, { unregistered: 2, deleted: 3 });
  assert.deepEqual(log, ['unregister', 'unregister', 'delete a', 'delete b', 'delete c', 'reload']);
  const code = readFileSync(new URL('../src/lib/authRecovery.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(code), false, 'the recovery code does not even reference session storage');
});

// ---- diagnostics ----------------------------------------------------------------------------------------------------
test('every failure class is identified with a fixed vocabulary and a recovery path where one exists', () => {
  const cases = [
    [{ status: 403, message: 'public_reading_auth_denied' }, 'blocked_by_worker'],
    [{ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' }, 'otp_expired'],
    [{ status: 429, code: 'over_email_send_rate_limit', message: 'x' }, 'rate_limited'],
    [{ status: 400, code: 'bad_code_verifier', message: 'x' }, 'pkce_mismatch'],
    [{ message: 'PKCE code verifier not found in storage' }, 'pkce_mismatch'],
    [{ status: 400, code: 'refresh_token_not_found', message: 'Invalid Refresh Token' }, 'refresh_failed'],
    [{ message: 'worker_identity_mismatch' }, 'stale_worker'],
    [{ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }, 'invalid_credentials'],
    [{ status: 422, code: 'validation_failed', message: 'unsupported verification type' }, 'invalid_verification_type'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'network'],
    [{ status: 502, message: 'bad gateway' }, 'server_error'],
    [{ message: 'something unforeseen' }, 'unknown'],
  ];
  for (const [error, kind] of cases) { assert.equal(classifyAuthError(error), kind, JSON.stringify(error)); assert.ok(AUTH_FAILURE_KINDS.includes(kind)); assert.ok(AUTH_MESSAGES[kind], kind); }
  assert.equal(classifyAuthError({ code: 'otp_expired', message: 'x' }, { step: 'verify_repeat' }), 'otp_consumed');
  assert.deepEqual([...RECOVERABLE_BY_REFRESH].sort(), ['blocked_by_worker', 'stale_worker']);
});

test('diagnostics never record passwords, codes, tokens, e-mail addresses or response bodies', () => {
  const store = new Map(); globalThis.sessionStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try {
    const secrets = ['hunter2-password', '123456', 'eyJhbGciOiJIUzI1NiJ9.payload.sig', 'someone@example.invalid', 'refresh-token-xyz'];
    const error = Object.assign(new Error(`failed for ${secrets.join(' ')}`), { status: 403, code: 'otp_expired', response: { body: secrets.join(',') } });
    recordAuthEvent(classifyAuthError(error), 'verify:' + secrets[3], error.status);
    for (let i = 0; i < 40; i++) recordAuthEvent('network', 'request', 0);
    const raw = JSON.stringify(readAuthTrail()) + [...store.values()].join('');
    for (const secret of secrets) assert.equal(raw.includes(secret), false, secret);
    assert.ok(readAuthTrail().length <= 20, 'bounded trail');
    for (const entry of readAuthTrail()) assert.deepEqual(Object.keys(entry).sort(), ['kind', 'status', 'step', 't']);
  } finally { delete globalThis.sessionStorage; }
});

test('the worker admits no request the application cannot emit and the application emits nothing the worker denies (drift guard)', async () => {
  // Every Auth-facing call the production client makes, end to end through the real worker.
  const { server, auth, client, worker } = setup();
  server.newUser('drift@example.invalid', true, 'pw-1');
  await client.auth.getSession();
  await fetch_settings(worker);
  await auth.requestEmailOtp('drift@example.invalid');
  await auth.verifyEmailOtp('drift@example.invalid', server.lastCode('drift@example.invalid'));
  await client.auth.getUser(); await client.auth.refreshSession(); await client.auth.signOut({ scope: 'local' });
  await auth.signInWithPassword('drift@example.invalid', 'pw-1');
  assert.deepEqual(worker.denied, [], 'the worker denied a request the client emitted');
  const source = buildPublicReadingWorker(SHA);
  assert.match(source, /\/auth\/v1\/verify/); assert.match(source, /onlyCallbackRedirect/);
});
async function fetch_settings(worker) { const response = await worker.workerFetch(API + '/auth/v1/settings', { headers: { apikey: 'k' } }); assert.equal(response.status, 200); }
