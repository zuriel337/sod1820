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

// ---- password recovery (also the first password for an account that began with Google) --------------------------------
import {
  watchPasswordRecovery, getPasswordRecovery, clearPasswordRecovery, recoveryAppliesTo, subscribePasswordRecovery,
  resetPasswordRecoveryForTests, PASSWORD_RECOVERY_TTL_MS, PASSWORD_RECOVERY_KEY,
} from '../src/lib/passwordRecovery.js';
import { passwordResetKey } from '../src/lib/passwordResetThrottle.js';

const challenge = 'a'.repeat(43);
const recoverBody = (extra = {}) => JSON.stringify({ email: 'x@example.invalid', code_challenge: challenge, code_challenge_method: 's256', gotrue_meta_security: {}, ...extra });
const authCodeOf = link => new URL(link).searchParams.get('code');
async function googleSignIn(env, email) {
  const request = await env.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: CALLBACK, skipBrowserRedirect: true } });
  const code = env.server.issueOAuthCode(email, new URL(request.data.url).searchParams.get('code_challenge'));
  const exchanged = await env.client.auth.exchangeCodeForSession(code);
  assert.equal(exchanged.error, null);
  return exchanged.data.session.user;
}

test('recovery request: the answer is identical for an address with and without an account, and only the account gets a link', async () => {
  resetPasswordRecoveryForTests();
  const { server, auth, worker } = setup();
  server.newUser('known@example.invalid', true);
  const known = await auth.requestPasswordReset('  known@example.invalid ');
  const unknown = await auth.requestPasswordReset('nobody@example.invalid');
  assert.equal(JSON.stringify(known), '{"ok":true}'); assert.equal(JSON.stringify(unknown), JSON.stringify(known));
  assert.deepEqual(worker.denied, [], 'the production client\'s own request is admitted by the worker');
  assert.equal(server.state.sent.filter(item => item.kind === 'recovery').length, 1);
  const link = new URL(server.lastRecoveryLink('known@example.invalid'));
  assert.equal(link.origin + link.pathname, CALLBACK, 'the link returns to the exact callback');
  const recover = server.log.filter(item => item.path === '/recover');
  assert.equal(recover.length, 2); assert.ok(recover.every(item => item.search === '?redirect_to=…' && item.status === 200));
});

test('recovery request and password update: the worker admits only the exact shapes', async () => {
  const exact = SITE + '/auth/callback';
  const post = (workerFetch, query, body, method = 'POST') => workerFetch(API + '/auth/v1/recover' + query, { method, headers: { apikey: 'k' }, body });
  const cases = [
    ['no destination at all', '', recoverBody()],
    ['a foreign destination', '?redirect_to=' + encodeURIComponent('https://evil.invalid/auth/callback'), recoverBody()],
    ['the callback with a query', '?redirect_to=' + encodeURIComponent(exact + '?next=1'), recoverBody()],
    ['another path on this site', '?redirect_to=' + encodeURIComponent(SITE + '/'), recoverBody()],
    ['an extra query parameter', '?redirect_to=' + encodeURIComponent(exact) + '&type=signup', recoverBody()],
    ['a role/data field', '?redirect_to=' + encodeURIComponent(exact), recoverBody({ data: { role: 'admin' } })],
    ['no PKCE challenge', '?redirect_to=' + encodeURIComponent(exact), JSON.stringify({ email: 'x@example.invalid' })],
    ['a plain challenge method', '?redirect_to=' + encodeURIComponent(exact), recoverBody({ code_challenge_method: 'plain' })],
    ['a phone number', '?redirect_to=' + encodeURIComponent(exact), JSON.stringify({ phone: '+15555555555', code_challenge: challenge, code_challenge_method: 's256' })],
  ];
  for (const [name, query, body] of cases) {
    const { server, worker } = setup();
    assert.equal((await post(worker.workerFetch, query, body)).status, 403, name);
    assert.equal(server.log.length, 0, name + ': nothing reaches Auth');
  }
  { const { server, worker } = setup(); assert.equal((await post(worker.workerFetch, '?redirect_to=' + encodeURIComponent(exact), recoverBody(), 'GET').catch(() => ({ status: 403 }))).status, 403); assert.equal(server.log.length, 0); }
  // The password update: bearer-bound, password only, bounded.
  const bearer = 'Bearer ' + jwtFor();
  const put = (workerFetch, body, { query = '', headers = { Authorization: bearer, apikey: 'k' }, method = 'PUT' } = {}) =>
    workerFetch(API + '/auth/v1/user' + query, { method, headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const update = [
    ['an e-mail change', { password: 'long-enough-1', email: 'other@example.invalid' }], ['user data', { password: 'long-enough-1', data: { role: 'admin' } }],
    ['no password', { code_challenge: null }], ['a non-string password', { password: 12345678 }], ['a PKCE challenge', { password: 'long-enough-1', code_challenge: challenge }],
    ['a password over 72 bytes', { password: 'x'.repeat(73) }], ['an empty password', { password: '' }], ['an array', ['password']], ['not JSON', '{'],
  ];
  for (const [name, body] of update) {
    const { server, worker } = setup();
    assert.equal((await put(worker.workerFetch, body)).status, 403, name);
    assert.equal(server.log.length, 0, name + ': nothing reaches Auth');
  }
  for (const [name, options] of [['a query string', { query: '?x=1' }], ['no bearer token', { headers: { apikey: 'k' } }], ['no api key', { headers: { Authorization: bearer } }], ['a non-JWT bearer', { headers: { Authorization: 'Bearer abc', apikey: 'k' } }]]) {
    const { server, worker } = setup();
    assert.equal((await put(worker.workerFetch, { password: 'long-enough-1' }, options)).status, 403, name);
    assert.equal(server.log.length, 0, name);
  }
  for (const method of ['PATCH', 'DELETE']) { const { server, worker } = setup(); assert.equal((await put(worker.workerFetch, { password: 'long-enough-1' }, { method })).status, 403, method); assert.equal(server.log.length, 0); }
});
function jwtFor(sub = '00000000-0000-4000-8000-000000000001') { const b = value => Buffer.from(JSON.stringify(value)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ sub, role: 'authenticated' })}.${b('sig')}`; }

test('a forged or expired bearer token reaches Auth only as a preflight read and never changes a password', async () => {
  const { server, worker } = setup();
  server.newUser('victim@example.invalid', true, 'old-password-1');
  const forged = await worker.workerFetch(API + '/auth/v1/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + jwtFor('99999999-9999-4999-8999-999999999999'), apikey: 'k' }, body: JSON.stringify({ password: 'attacker-pass-1' }) });
  assert.equal(forged.status, 401);
  assert.deepEqual(server.log.map(item => item.method + ' ' + item.path), ['GET /user'], 'Auth confirmed the session first and the update never left the worker');
  assert.deepEqual(server.state.passwordChanges, []);
  assert.equal(server.users.get('victim@example.invalid').password, 'old-password-1');
  server.state.failNetwork = true;
  const down = await worker.workerFetch(API + '/auth/v1/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + jwtFor(server.users.get('victim@example.invalid').id), apikey: 'k' }, body: JSON.stringify({ password: 'new-password-1' }) });
  assert.equal(down.status, 503, 'an unreachable Auth is a network failure, not a policy denial');
});

test('Google-only account: reset by e-mail sets the FIRST password on the same user_id; Google and password both return that user', async () => {
  resetPasswordRecoveryForTests();
  const env = setup(); const { server, auth, client } = env;
  watchPasswordRecovery(client);
  const email = 'esther.like@example.invalid';
  const viaGoogle = await googleSignIn(env, email);                         // the account exists because of Google; no password yet
  assert.equal(server.users.get(email).password, null);
  await assert.rejects(auth.signInWithPassword(email, 'anything-1'), error => classifyAuthError(error) === 'invalid_credentials');
  await client.auth.signOut({ scope: 'local' });
  assert.equal(await auth.requestPasswordReset(email).then(result => result.ok), true);
  // The link opens in the same browser (same storage): the SDK exchanges the code and announces a recovery session.
  const exchanged = await client.auth.exchangeCodeForSession(authCodeOf(server.lastRecoveryLink(email)));
  assert.equal(exchanged.error, null); assert.equal(exchanged.data.session.user.id, viaGoogle.id, 'the link signs in the existing user');
  assert.equal(getPasswordRecovery()?.userId, viaGoogle.id); assert.equal(recoveryAppliesTo(viaGoogle.id), true);
  const saved = await auth.updatePassword('first-password-1');
  assert.equal(saved.user.id, viaGoogle.id); assert.deepEqual(server.state.passwordChanges, [viaGoogle.id]);
  clearPasswordRecovery(); assert.equal(getPasswordRecovery(), null);
  await client.auth.signOut({ scope: 'local' });
  const byPassword = await auth.signInWithPassword(email, 'first-password-1');
  assert.equal(byPassword.user.id, viaGoogle.id, 'password sign-in reaches the same user_id');
  await client.auth.signOut({ scope: 'local' });
  const again = await googleSignIn(env, email);
  assert.equal(again.id, viaGoogle.id, 'Google still returns the same user_id'); assert.equal(server.users.size, 1, 'no second account was created');
});

test('account that already has a password: reset replaces it; the old password stops working and e-mail code sign-in keeps working', async () => {
  resetPasswordRecoveryForTests();
  const { server, auth, client } = setup(); watchPasswordRecovery(client);
  const user = server.newUser('has.password@example.invalid', true, 'old-password-1');
  await auth.requestPasswordReset('has.password@example.invalid');
  assert.equal((await client.auth.exchangeCodeForSession(authCodeOf(server.lastRecoveryLink('has.password@example.invalid')))).error, null);
  await assert.rejects(auth.updatePassword('old-password-1'), error => classifyAuthError(error) === 'same_password');
  await assert.rejects(auth.updatePassword('abc1234'), error => classifyAuthError(error) === 'weak_password');
  assert.equal((await auth.updatePassword('brand-new-password-2')).user.id, user.id);
  await client.auth.signOut({ scope: 'local' });
  await assert.rejects(auth.signInWithPassword('has.password@example.invalid', 'old-password-1'), error => classifyAuthError(error) === 'invalid_credentials');
  assert.equal((await auth.signInWithPassword('has.password@example.invalid', 'brand-new-password-2')).user.id, user.id);
  await client.auth.signOut({ scope: 'local' }); server.forgetSendTimes();
  assert.equal((await loginOk(auth, server, 'has.password@example.invalid')).user.id, user.id, 'the existing code sign-in is unchanged');
});

test('failure paths: another browser, a used link, an expired link, rate limit, server error, no session', async () => {
  resetPasswordRecoveryForTests();
  const { server, auth, client } = setup(); watchPasswordRecovery(client);
  server.newUser('fail@example.invalid', true, 'old-password-1');
  await auth.requestPasswordReset('fail@example.invalid');
  const link = server.lastRecoveryLink('fail@example.invalid');
  // Opened in another browser or the installed app: no verifier there. Classified (not blocked) and no recovery session appears.
  const other = createProductionLikeClient({ server, pathname: '/auth/callback' }); watchPasswordRecovery(other.client);
  const foreign = await other.client.auth.exchangeCodeForSession(authCodeOf(link));
  assert.equal(classifyAuthError(foreign.error), 'pkce_mismatch'); assert.equal(getPasswordRecovery(), null);
  const otherAuth = loadAuthModule(other.client);
  await assert.rejects(otherAuth.updatePassword('attempt-password-1', other.client), error => classifyAuthError(error) === 'session_missing');
  assert.equal(server.log.filter(item => item.method === 'PUT').length, 0, 'with no session nothing is even sent');
  // The same link, used once in the right browser and then again.
  assert.equal((await client.auth.exchangeCodeForSession(authCodeOf(link))).error, null);
  const reused = await client.auth.exchangeCodeForSession(authCodeOf(link));
  assert.ok(reused.error, 'a link is single use'); assert.ok(['pkce_mismatch', 'link_expired'].includes(classifyAuthError(reused.error)));
  // What Auth appends to the callback address for an expired or used link.
  const fromAddress = classifyAuthError({ code: 'otp_expired', message: 'Email link is invalid or has expired' }, { step: 'callback' });
  assert.equal(fromAddress, 'link_expired'); assert.ok(AUTH_MESSAGES.link_expired && AUTH_FAILURE_KINDS.includes('link_expired'));
  // Rate limit and mail-server failure while requesting.
  await assert.rejects(auth.requestPasswordReset('fail@example.invalid'), error => classifyAuthError(error) === 'rate_limited');
  server.forgetSendTimes(); server.state.rejectNextSend = 500;
  await assert.rejects(auth.requestPasswordReset('fail@example.invalid'), error => error.status === 500 && classifyAuthError(error) === 'server_error');
  server.state.failNetwork = true;
  await assert.rejects(auth.requestPasswordReset('fail@example.invalid'), error => classifyAuthError(error) === 'network');
});

test('an unverified preview origin never asks Auth for a recovery link (it would land on the production site root)', async () => {
  const { server, client } = setup();
  const auth = loadAuthModule(client, { location: { origin: 'https://unlisted-preview.vercel.app' } });
  await assert.rejects(auth.requestPasswordReset('p@example.invalid'), error => error.code === 'RECOVERY_ORIGIN_UNVERIFIED' && classifyAuthError(error) === 'recovery_origin_unverified');
  assert.equal(server.log.length, 0); assert.ok(AUTH_MESSAGES.recovery_origin_unverified);
});

test('the recovery mark: bound to one user, expires, survives a reload of the same tab, and ends with sign-out', () => {
  const store = new Map(); globalThis.sessionStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  try {
    resetPasswordRecoveryForTests();
    const calls = []; let handler; const client = { auth: { onAuthStateChange: fn => { handler = fn; return { data: { subscription: {} } }; } } };
    watchPasswordRecovery(client);
    handler('SIGNED_IN', { user: { id: 'u1' } }); assert.equal(getPasswordRecovery(), null, 'an ordinary sign-in is not a recovery');
    handler('PASSWORD_RECOVERY', { user: { id: 'u1' } });
    assert.equal(recoveryAppliesTo('u1'), true); assert.equal(recoveryAppliesTo('u2'), false, 'another account never inherits it');
    assert.deepEqual(Object.keys(JSON.parse(store.get(PASSWORD_RECOVERY_KEY))).sort(), ['createdAt', 'userId'], 'only the id and a time are kept');
    resetPasswordRecoveryForTests(); assert.equal(getPasswordRecovery()?.userId, 'u1', 'a reload of the tab still knows');
    const stored = JSON.parse(store.get(PASSWORD_RECOVERY_KEY)); stored.createdAt -= PASSWORD_RECOVERY_TTL_MS + 1000; store.set(PASSWORD_RECOVERY_KEY, JSON.stringify(stored));
    resetPasswordRecoveryForTests(); assert.equal(getPasswordRecovery(), null, 'it expires');
    const stop = subscribePasswordRecovery(() => calls.push('changed'));
    handler('PASSWORD_RECOVERY', { user: { id: 'u3' } }); handler('SIGNED_OUT', null); assert.equal(getPasswordRecovery(), null);
    assert.deepEqual([...calls], ['changed', 'changed']); stop();
    assert.notEqual(passwordResetKey('A@b.co '), 'a@b.co', 'reset requests are throttled apart from code requests'); assert.equal(passwordResetKey('A@b.co '), passwordResetKey('a@b.co'));
  } finally { delete globalThis.sessionStorage; resetPasswordRecoveryForTests(); }
});

test('new failure kinds are classified, have a plain explanation and never record secrets', () => {
  const cases = [
    [{ status: 422, code: 'weak_password', message: 'Password should be at least 8 characters.' }, 'weak_password'],
    [{ status: 422, code: 'same_password', message: 'New password should be different from the old password.' }, 'same_password'],
    [{ name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' }, 'session_missing'],
    [{ status: 401, code: 'bad_jwt', message: 'invalid JWT' }, 'session_missing'],
    [{ status: 403, code: 'otp_expired', message: 'Email link is invalid or has expired' }, 'otp_expired'],
  ];
  for (const [error, kind] of cases) { assert.equal(classifyAuthError(error), kind, JSON.stringify(error)); assert.ok(AUTH_FAILURE_KINDS.includes(kind)); assert.ok(AUTH_MESSAGES[kind]); }
  for (const kind of AUTH_FAILURE_KINDS) assert.ok(AUTH_MESSAGES[kind], 'every kind has a message: ' + kind);
});

test('drift guard (recovery): every Auth call the recovery flow makes goes through the real worker without a denial', async () => {
  resetPasswordRecoveryForTests();
  const { server, auth, client, worker } = setup(); watchPasswordRecovery(client);
  server.newUser('drift2@example.invalid', true);
  await auth.requestPasswordReset('drift2@example.invalid');
  await client.auth.exchangeCodeForSession(authCodeOf(server.lastRecoveryLink('drift2@example.invalid')));
  await auth.updatePassword('drift-password-1');
  await client.auth.getUser(); await client.auth.signOut({ scope: 'local' });
  await auth.signInWithPassword('drift2@example.invalid', 'drift-password-1');
  assert.deepEqual(worker.denied, [], 'the worker denied a request the client emitted');
  const source = buildPublicReadingWorker(SHA);
  assert.match(source, /\/auth\/v1\/recover/); assert.match(source, /PUT/);
  assert.equal(PUBLIC_READING_POLICY_ID, 'public-reading-password-recovery-20261111');
});
