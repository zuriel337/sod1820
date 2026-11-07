// Password-account transport admission, proven against the EMITTED service worker (the exact source the production artifact ships)
// and against the real @supabase/supabase-js client, so an SDK change that alters a request shape fails here, not in production.
// Everything is synthetic and local: the upstream is a stub, no request can leave the process.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createClient } from '@supabase/supabase-js';
import { buildPublicReadingWorker } from '../public-reading-deploy/transport.js';
import { readingSessionOptions } from '../src/lib/publicReadingAuthSession.js';
import { interceptPublicReadingAdminAuth } from '../preview-deploy/admin-readonly-auth.js';

const API = 'https://linswmnnkjxvweumprav.supabase.co', SITE = 'https://preview.invalid';
const UID = '11111111-1111-4111-8111-111111111111', EMAIL = 'owner@example.invalid', CHALLENGE = 'a'.repeat(43);
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = () => 'eyJhbGciOiJIUzI1NiJ9.' + b64({ sub: UID, role: 'authenticated' }) + '.synthetic';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const session = () => ({ access_token: token(), refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } });

function worker() {
  let listener;
  const upstream = [];
  const context = { Request, Response, URL, Set, Map, JSON, atob, self: { location: { origin: SITE }, addEventListener: (type, fn) => { if (type === 'fetch') listener = fn; } },
    fetch: async (input, options) => {
      const req = input instanceof Request ? input : new Request(input, options);
      upstream.push(req);
      const path = new URL(req.url).pathname;
      if (path === '/auth/v1/verify') return json(session());
      if (path === '/auth/v1/user') return json(session().user);
      return json({});
    } };
  vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40)), context);
  async function dispatch(request) {
    let response;
    listener({ request, respondWith(p) { response = p; } });
    return response ? await response : null;
  }
  return { upstream, dispatch, async send(path, { method = 'POST', body, raw, jwt = token(), headers = {} } = {}) {
    const init = { method, headers: { apikey: 'publishable-synthetic', ...(jwt !== null ? { Authorization: 'Bearer ' + jwt } : {}), ...headers } };
    if (method !== 'GET' && method !== 'HEAD') init.body = raw ?? JSON.stringify(body ?? {});
    return dispatch(new Request(API + path, init));
  } };
}

const GOOD = {
  signup: { email: EMAIL, password: 'correct horse 9', data: {}, gotrue_meta_security: {}, code_challenge: CHALLENGE, code_challenge_method: 's256' },
  resend: { email: EMAIL, type: 'signup', gotrue_meta_security: {}, code_challenge: CHALLENGE, code_challenge_method: 's256' },
  recover: { email: EMAIL, code_challenge: CHALLENGE, code_challenge_method: 's256', gotrue_meta_security: {} },
  verify: { email: EMAIL, token: '123456', type: 'signup', gotrue_meta_security: {} },
  update: { password: 'new password 9', code_challenge: null, code_challenge_method: null },
};
const without = (value, key) => { const copy = { ...value }; delete copy[key]; return copy; };

test('password account: sign-up, resend, recovery, code verification and a password-only update are admitted in their exact shapes', async () => {
  for (const [label, method, path, body] of [
    ['sign-up', 'POST', '/auth/v1/signup', GOOD.signup],
    ['sign-up carrying only a captcha token field', 'POST', '/auth/v1/signup', { ...GOOD.signup, gotrue_meta_security: { captcha_token: 'synthetic' } }],
    ['resend the sign-up code', 'POST', '/auth/v1/resend', GOOD.resend],
    ['request a recovery code', 'POST', '/auth/v1/recover', GOOD.recover],
    ['verify a sign-up code', 'POST', '/auth/v1/verify', GOOD.verify],
    ['verify a recovery code', 'POST', '/auth/v1/verify', { ...GOOD.verify, type: 'recovery' }],
    ['verify an e-mail code (existing path, kept for the follow/subscribe gates)', 'POST', '/auth/v1/verify', { ...GOOD.verify, type: 'email' }],
    ['a ten digit code', 'POST', '/auth/v1/verify', { ...GOOD.verify, token: '1234567890' }],
    ['password update as the SDK sends it (null PKCE fields)', 'PUT', '/auth/v1/user', GOOD.update],
    ['password update without PKCE fields', 'PUT', '/auth/v1/user', { password: 'new password 9' }],
  ]) {
    const w = worker();
    const response = await w.send(path, { method, body });
    assert.equal(response.status, 200, label);
    assert.equal(w.upstream.length, 1, label);
    const forwarded = w.upstream[0];
    assert.equal(forwarded.method, method, label);
    assert.equal(forwarded.url, API + path, label);
    assert.equal(forwarded.redirect, 'error', label);
    assert.equal(forwarded.cache, 'no-store', label);
    assert.equal(forwarded.credentials, 'omit', label);
    assert.deepEqual(await forwarded.clone().json(), body, label + ': the request is forwarded unchanged');
    if (method === 'PUT') assert.equal(forwarded.headers.get('authorization'), 'Bearer ' + token(), label + ': the original bearer is preserved');
  }
});

const DENIED = [];
const deny = (label, method, path, body, options = {}) => DENIED.push([label, method, path, body, options]);
for (const [label, mutation] of [
  ['an extra role key', { ...GOOD.signup, role: 'admin' }],
  ['a phone number instead of an e-mail', { phone: '+15555555555', password: 'correct horse 9', data: {}, channel: 'sms' }],
  ['an SMS channel', { ...GOOD.signup, channel: 'sms' }],
  ['an options object', { ...GOOD.signup, options: {} }],
  ['profile metadata (full_name)', { ...GOOD.signup, data: { full_name: 'x' } }],
  ['a role in metadata', { ...GOOD.signup, data: { role: 'admin' } }],
  ['a newsletter consent smuggled in metadata', { ...GOOD.signup, data: { site_updates_consent: true } }],
  ['acquisition metadata', { ...GOOD.signup, data: { acquisition: { source: 'x' }, visitor_id: 'v' } }],
  ['missing metadata object', without(GOOD.signup, 'data')],
  ['metadata as an array', { ...GOOD.signup, data: [] }],
  ['a 7 character password', { ...GOOD.signup, password: 'abcdefg' }],
  ['a 73 character password', { ...GOOD.signup, password: 'x'.repeat(73) }],
  ['no password', without(GOOD.signup, 'password')],
  ['a numeric password', { ...GOOD.signup, password: 12345678 }],
  ['an invalid e-mail', { ...GOOD.signup, email: 'owner@example' }],
  ['an e-mail with a space', { ...GOOD.signup, email: 'own er@example.invalid' }],
  ['an over-long e-mail', { ...GOOD.signup, email: 'a'.repeat(310) + '@example.invalid' }],
  ['no e-mail', without(GOOD.signup, 'email')],
  ['no PKCE challenge', without(without(GOOD.signup, 'code_challenge'), 'code_challenge_method')],
  ['a 42 character challenge', { ...GOOD.signup, code_challenge: 'a'.repeat(42) }],
  ['a 44 character challenge', { ...GOOD.signup, code_challenge: 'a'.repeat(44) }],
  ['a challenge outside base64url', { ...GOOD.signup, code_challenge: '+'.repeat(43) }],
  ['the plain challenge method', { ...GOOD.signup, code_challenge_method: 'plain' }],
  ['an upper-case challenge method', { ...GOOD.signup, code_challenge_method: 'S256' }],
  ['an unexpected security key', { ...GOOD.signup, gotrue_meta_security: { foo: 1 } }],
  ['a null security object', { ...GOOD.signup, gotrue_meta_security: null }],
]) deny('sign-up with ' + label, 'POST', '/auth/v1/signup', mutation);
deny('sign-up with a redirect_to query', 'POST', '/auth/v1/signup?redirect_to=https://evil.invalid', GOOD.signup);
deny('sign-up with any query', 'POST', '/auth/v1/signup?x=1', GOOD.signup);
deny('an oversized sign-up body', 'POST', '/auth/v1/signup', null, { raw: JSON.stringify({ ...GOOD.signup, padding: 'x'.repeat(9000) }) });
deny('a sign-up body that is not JSON', 'POST', '/auth/v1/signup', null, { raw: 'not json' });
deny('a sign-up body that is an array', 'POST', '/auth/v1/signup', [GOOD.signup]);

for (const type of ['email_change', 'sms', 'phone_change', 'magiclink', 'recovery', 'invite', 'email', '', 'SIGNUP']) deny(`resend of type "${type}"`, 'POST', '/auth/v1/resend', { ...GOOD.resend, type });
deny('resend without a type', 'POST', '/auth/v1/resend', without(GOOD.resend, 'type'));
deny('resend for a phone', 'POST', '/auth/v1/resend', { phone: '+15555555555', type: 'sms', gotrue_meta_security: {} });
deny('resend without a PKCE challenge', 'POST', '/auth/v1/resend', without(without(GOOD.resend, 'code_challenge'), 'code_challenge_method'));
deny('resend with a redirect_to query', 'POST', '/auth/v1/resend?redirect_to=https://evil.invalid', GOOD.resend);
deny('resend with an extra key', 'POST', '/auth/v1/resend', { ...GOOD.resend, options: {} });

deny('recover with a redirect_to query', 'POST', '/auth/v1/recover?redirect_to=https://evil.invalid', GOOD.recover);
deny('recover with an extra key', 'POST', '/auth/v1/recover', { ...GOOD.recover, redirect_to: 'https://evil.invalid' });
deny('recover without a PKCE challenge', 'POST', '/auth/v1/recover', without(without(GOOD.recover, 'code_challenge'), 'code_challenge_method'));
deny('recover with an invalid e-mail', 'POST', '/auth/v1/recover', { ...GOOD.recover, email: 'nope' });
deny('recover for a phone', 'POST', '/auth/v1/recover', { phone: '+15555555555', code_challenge: CHALLENGE, code_challenge_method: 's256' });

for (const type of ['magiclink', 'invite', 'email_change', 'sms', 'phone_change', 'reauthentication', '', 'SIGNUP']) deny(`verify of type "${type}"`, 'POST', '/auth/v1/verify', { ...GOOD.verify, type });
deny('verify without a type', 'POST', '/auth/v1/verify', without(GOOD.verify, 'type'));
deny('verify with a token hash (a link token)', 'POST', '/auth/v1/verify', { email: EMAIL, token_hash: 'abc', type: 'signup', gotrue_meta_security: {} });
deny('verify with a token hash next to a code', 'POST', '/auth/v1/verify', { ...GOOD.verify, token_hash: 'abc' });
for (const code of ['12345', '12345678901', 'abcdef', ' 123456', '123456 ', '12 3456']) deny(`verify with code "${code}"`, 'POST', '/auth/v1/verify', { ...GOOD.verify, token: code });
deny('verify for a phone', 'POST', '/auth/v1/verify', { phone: '+15555555555', token: '123456', type: 'sms', gotrue_meta_security: {} });
deny('verify with an options key', 'POST', '/auth/v1/verify', { ...GOOD.verify, options: {} });
deny('verify with a redirect_to query', 'POST', '/auth/v1/verify?redirect_to=https://evil.invalid', GOOD.verify);

for (const [label, body] of [
  ['an e-mail change', { email: 'new@example.invalid' }],
  ['a password with an e-mail change', { password: 'new password 9', email: 'new@example.invalid' }],
  ['a password with a phone', { password: 'new password 9', phone: '+15555555555' }],
  ['a password with user metadata', { password: 'new password 9', data: { role: 'admin' } }],
  ['a password with app metadata', { password: 'new password 9', app_metadata: { role: 'admin' } }],
  ['a password with a nonce', { password: 'new password 9', nonce: '123456' }],
  ['a password with the current password', { password: 'new password 9', current_password: 'old' }],
  ['a 7 character password', { password: 'abcdefg' }],
  ['a 73 character password', { password: 'x'.repeat(73) }],
  ['a numeric password', { password: 12345678 }],
  ['an empty update', {}],
  ['a PKCE challenge (the e-mail change shape)', { password: 'new password 9', code_challenge: CHALLENGE, code_challenge_method: 's256' }],
  ['an array', [GOOD.update]],
]) deny('password update with ' + label, 'PUT', '/auth/v1/user', body);
deny('password update without a bearer', 'PUT', '/auth/v1/user', GOOD.update, { jwt: null });
deny('password update with a malformed bearer', 'PUT', '/auth/v1/user', GOOD.update, { jwt: 'malformed' });
deny('password update with a query', 'PUT', '/auth/v1/user?x=1', GOOD.update);
deny('an oversized password update', 'PUT', '/auth/v1/user', null, { raw: JSON.stringify({ password: 'new password 9', padding: 'x'.repeat(2000) }) });
deny('a password update that is not JSON', 'PUT', '/auth/v1/user', null, { raw: 'not json' });

for (const [method, path] of [
  ['GET', '/auth/v1/signup'], ['GET', '/auth/v1/resend'], ['GET', '/auth/v1/recover'], ['GET', '/auth/v1/verify'],
  ['PUT', '/auth/v1/signup'], ['PUT', '/auth/v1/recover'], ['PUT', '/auth/v1/resend'], ['PUT', '/auth/v1/verify'], ['PUT', '/auth/v1/token?grant_type=password'], ['PUT', '/auth/v1/otp'], ['PUT', '/auth/v1/logout?scope=local'], ['PUT', '/auth/v1/settings'],
  ['PATCH', '/auth/v1/user'], ['DELETE', '/auth/v1/user'], ['POST', '/auth/v1/user'],
  ['POST', '/auth/v1/reauthenticate'], ['GET', '/auth/v1/reauthenticate'], ['POST', '/auth/v1/invite'], ['POST', '/auth/v1/magiclink'], ['POST', '/auth/v1/sso'],
  ['POST', '/auth/v1/admin/users'], ['GET', '/auth/v1/admin/users'], ['POST', '/auth/v1/factors'], ['GET', '/auth/v1/user/identities/authorize?provider=google'],
  ['DELETE', '/auth/v1/user/identities/00000000-0000-4000-8000-000000000000'], ['POST', '/auth/v1/token?grant_type=id_token'],
]) deny(`${method} ${path}`, method, path, method === 'GET' || method === 'DELETE' ? undefined : {});

test('password account: every deviation is refused at the Worker, before any network request', async () => {
  assert.ok(DENIED.length > 100, 'the matrix must stay broad (' + DENIED.length + ' cases)');
  for (const [label, method, path, body, options] of DENIED) {
    const w = worker();
    const response = await w.send(path, { method, body, ...options });
    assert.equal(response.status, 403, label);
    assert.equal(w.upstream.length, 0, label + ': nothing may reach Supabase');
    assert.equal((await response.json()).error, 'public_reading_auth_denied', label);
  }
});

function vmIntercept(request, options) {
  const upstream = [];
  const ctx = { URL, Request, Response, JSON, fetch: async req => { upstream.push(req); return json({}); } };
  vm.createContext(ctx);
  // The function is stringified into the service worker: run exactly its source in an empty realm to prove it is self-contained.
  vm.runInContext(interceptPublicReadingAdminAuth.toString() + ';globalThis.check=interceptPublicReadingAdminAuth;', ctx);
  let result;
  const handled = ctx.check({ request, respondWith(p) { result = p; } }, API, options);
  return (async () => ({ handled, response: result ? await result : null, upstream }))();
}

test('historical Preview modes (accountAccess false or "existing") admit none of the password-account operations', async () => {
  const requests = [
    ['POST', '/auth/v1/signup', GOOD.signup], ['POST', '/auth/v1/resend', GOOD.resend], ['POST', '/auth/v1/recover', GOOD.recover],
    ['POST', '/auth/v1/verify', GOOD.verify], ['POST', '/auth/v1/verify', { ...GOOD.verify, type: 'recovery' }], ['PUT', '/auth/v1/user', GOOD.update],
  ];
  for (const accountAccess of [false, 'existing', undefined]) {
    for (const [method, path, body] of requests) {
      const request = new Request(API + path, { method, headers: { Authorization: 'Bearer ' + token(), apikey: 'publishable-synthetic' }, body: JSON.stringify(body) });
      const { handled, response, upstream } = await vmIntercept(request, { accountAccess, clientOrigin: SITE });
      assert.equal(handled, true, String(accountAccess) + ' ' + method + ' ' + path);
      assert.equal(response.status, 403, String(accountAccess) + ' ' + method + ' ' + path);
      assert.equal(upstream.length, 0);
    }
  }
  // "existing" keeps its documented e-mail-code verification and nothing more.
  const existing = new Request(API + '/auth/v1/verify', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: JSON.stringify({ ...GOOD.verify, type: 'email' }) });
  assert.equal((await (await vmIntercept(existing, { accountAccess: 'existing' })).response).status, 200);
});

function sdk(w, { seeded = false } = {}) {
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
  if (seeded) map.set('sod-public-reading-account', JSON.stringify(session()));
  const client = createClient(API, 'publishable-synthetic', { auth: { ...readingSessionOptions(storage, { pathname: '/login' }), autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const response = await w.dispatch(new Request(input, init));
    if (!response) throw new Error('worker_did_not_handle_request');
    return response;
  } } });
  return { client, map };
}
const lastBody = async w => JSON.parse(await w.upstream.at(-1).clone().text());
const lastPath = w => new URL(w.upstream.at(-1).url).pathname + new URL(w.upstream.at(-1).url).search;

test('the real SDK, through the emitted Worker, completes sign-up, code confirmation, resend, recovery and a password update', async () => {
  const w = worker();
  const { client } = sdk(w);
  let result = await client.auth.signUp({ email: EMAIL, password: 'correct horse 9' });
  assert.equal(result.error, null);
  assert.equal(lastPath(w), '/auth/v1/signup');
  const signupBody = await lastBody(w);
  assert.deepEqual(Object.keys(signupBody).sort(), ['code_challenge', 'code_challenge_method', 'data', 'email', 'gotrue_meta_security', 'password']);
  assert.deepEqual(signupBody.data, {}, 'no metadata, no consent, no role');
  assert.equal(signupBody.code_challenge_method, 's256');

  result = await client.auth.resend({ type: 'signup', email: EMAIL });
  assert.equal(result.error, null);
  assert.equal(lastPath(w), '/auth/v1/resend');
  assert.equal((await lastBody(w)).type, 'signup');

  result = await client.auth.verifyOtp({ email: EMAIL, token: '123456', type: 'signup' });
  assert.equal(result.error, null);
  assert.equal(lastPath(w), '/auth/v1/verify');
  assert.deepEqual(await lastBody(w), { email: EMAIL, token: '123456', type: 'signup', gotrue_meta_security: {} });
  assert.equal(result.data.session.access_token, token(), 'the code yields a session directly: no link and no second browser needed');

  result = await client.auth.resetPasswordForEmail(EMAIL);
  assert.equal(result.error, null);
  assert.equal(lastPath(w), '/auth/v1/recover', 'no redirect_to is sent, so the mail can carry only a code');
  assert.deepEqual(Object.keys(await lastBody(w)).sort(), ['code_challenge', 'code_challenge_method', 'email', 'gotrue_meta_security']);

  result = await client.auth.verifyOtp({ email: EMAIL, token: '654321', type: 'recovery' });
  assert.equal(result.error, null);
  assert.equal((await lastBody(w)).type, 'recovery');

  result = await client.auth.updateUser({ password: 'brand new pass 9' });
  assert.equal(result.error, null);
  assert.equal(w.upstream.at(-1).method, 'PUT');
  assert.equal(lastPath(w), '/auth/v1/user');
  assert.deepEqual(await lastBody(w), { password: 'brand new pass 9', code_challenge: null, code_challenge_method: null });
  assert.equal(w.upstream.at(-1).headers.get('authorization'), 'Bearer ' + token());
  await client.auth.stopAutoRefresh();
});

test('the real SDK cannot ask the Worker for a link, metadata, an e-mail change or any wider Auth operation', async () => {
  for (const [label, call] of [
    ['sign-up with a role in metadata', client => client.auth.signUp({ email: EMAIL, password: 'correct horse 9', options: { data: { role: 'admin' } } })],
    ['sign-up with a newsletter consent in metadata', client => client.auth.signUp({ email: EMAIL, password: 'correct horse 9', options: { data: { site_updates_consent: true } } })],
    ['sign-up with a redirect', client => client.auth.signUp({ email: EMAIL, password: 'correct horse 9', options: { emailRedirectTo: 'https://evil.invalid/x' } })],
    ['sign-up with a short password', client => client.auth.signUp({ email: EMAIL, password: 'short' })],
    ['sign-up with a phone', client => client.auth.signUp({ phone: '+15555555555', password: 'correct horse 9' })],
    ['resend of an e-mail change', client => client.auth.resend({ type: 'email_change', email: EMAIL })],
    ['resend with a redirect', client => client.auth.resend({ type: 'signup', email: EMAIL, options: { emailRedirectTo: 'https://evil.invalid/x' } })],
    ['verification by token hash (a link token)', client => client.auth.verifyOtp({ token_hash: 'abc', type: 'email' })],
    ['verification of a magic link', client => client.auth.verifyOtp({ email: EMAIL, token: '123456', type: 'magiclink' })],
    ['recovery with a redirect', client => client.auth.resetPasswordForEmail(EMAIL, { redirectTo: 'https://evil.invalid/x' })],
    ['an e-mail change', client => client.auth.updateUser({ email: 'new@example.invalid' })],
    ['a metadata update', client => client.auth.updateUser({ data: { role: 'admin' } })],
    ['a password update carrying metadata', client => client.auth.updateUser({ password: 'brand new pass 9', data: { role: 'admin' } })],
    ['a magic-link sign-in with a redirect', client => client.auth.signInWithOtp({ email: EMAIL, options: { emailRedirectTo: 'https://evil.invalid/x' } })],
    ['re-authentication', client => client.auth.reauthenticate()],
  ]) {
    const w = worker();
    const { client } = sdk(w, { seeded: true });
    let outcome;
    try { outcome = await call(client); } catch (error) { outcome = { error }; }
    assert.ok(outcome.error, label + ': must be refused');
    assert.equal(w.upstream.filter(req => new URL(req.url).pathname !== '/auth/v1/user' || req.method !== 'GET').length, 0, label + ': nothing may be forwarded');
    await client.auth.stopAutoRefresh();
  }
});

test('sign-in with a password and the local-only logout stay exactly as before', async () => {
  const w = worker();
  const body = { email: EMAIL, password: 'correct horse 9', gotrue_meta_security: {} };
  let response = await w.send('/auth/v1/token?grant_type=password', { body });
  assert.equal(response.status, 200);
  response = await w.send('/auth/v1/token?grant_type=password', { body: { ...body, phone: '+15555555555' } });
  assert.equal(response.status, 403);
  response = await w.send('/auth/v1/logout?scope=local', { raw: '' });
  assert.equal(response.status, 200);
  response = await w.send('/auth/v1/logout?scope=global', { raw: '' });
  assert.equal(response.status, 403);
  assert.equal(w.upstream.length, 2);
});
