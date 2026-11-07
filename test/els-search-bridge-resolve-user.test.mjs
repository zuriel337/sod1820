// A4: els-search-bridge resolveUser() must not ask Auth about a bearer that can never identify a user.
//
// Production evidence (Auth logs, 24h): 213 x GET /auth/v1/user -> 403 bad_jwt "missing sub claim",
// 1:1 with anonymous els-search-bridge POSTs. A guest's bearer is the project anon key (role=anon, no sub);
// resolveUser() forwarded it, treated !ok as anonymous, and the function returned 200 - pure noise.
//
// This executes the REAL handler source (types stripped, Deno + network replaced), the same boundary the
// research-run / ai-analyze handler tests use, so the runtime code is unchanged and nothing is re-implemented
// here. Every outbound request is recorded; anything that is not the isolated origin fails the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

const SOURCE = readFileSync(new URL('../supabase/functions/els-search-bridge/index.ts', import.meta.url), 'utf8');

const ORIGIN = 'http://127.0.0.1:1';
const SERVICE_KEY = 'synthetic-service-role-key';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const b64u = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const jwt = (payload) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u(payload)}.${b64u('synthetic-signature')}`;
const bearer = (token) => `Bearer ${token}`;

// Shapes taken from real Supabase tokens: the anon/service keys carry a role and no sub; a user session carries
// role=authenticated and a sub; anonymous-auth sessions are role=authenticated + is_anonymous=true + a sub.
const ANON_KEY_JWT = jwt({ iss: 'supabase', ref: 'synthetic', role: 'anon', iat: 1700000000, exp: 2000000000 });
const SERVICE_ROLE_JWT = jwt({ iss: 'supabase', ref: 'synthetic', role: 'service_role', iat: 1700000000, exp: 2000000000 });
const USER_JWT = jwt({ aud: 'authenticated', role: 'authenticated', sub: USER_ID, email: 'user@example.test', exp: 2000000000 });
// Hebrew + symbols in user_metadata is realistic for this site and forces non-ASCII UTF-8 plus base64url '-'/'_'.
const HEBREW_USER_JWT = jwt({ aud: 'authenticated', role: 'authenticated', sub: USER_ID, user_metadata: { full_name: 'ישראל ישראלי ✓ ??>>' }, exp: 2000000000 });
const ANONYMOUS_AUTH_JWT = jwt({ aud: 'authenticated', role: 'authenticated', sub: USER_ID, is_anonymous: true, exp: 2000000000 });

function load({ env = { SUPABASE_URL: ORIGIN, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY }, authUser = null } = {}) {
  const calls = [];
  const unexpected = [];
  let handler = null;
  const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const transport = async (input, init = {}) => {
    const url = String(input instanceof Request ? input.url : input);
    const u = new URL(url);
    const call = {
      url,
      path: u.pathname,
      method: init.method || 'GET',
      headers: { ...(init.headers || {}) },
      body: init.body ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    if (u.origin !== ORIGIN) { unexpected.push(url); throw new Error('Unexpected destination'); }
    if (u.pathname === '/auth/v1/user') {
      if (typeof authUser === 'function') return authUser(call, respond);
      return respond({ id: USER_ID });
    }
    // The only RPC the handler tests need: stop at the rate limiter so the identity it was given is observable.
    if (u.pathname === '/rest/v1/rpc/edge_rate_limit_check') return respond({ allowed: false, remaining: 0 });
    unexpected.push(url);
    throw new Error('Unexpected request');
  };
  const ctx = {
    Deno: { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } },
    fetch: transport,
    Request, Response, Headers, URL, TextEncoder, TextDecoder, atob, crypto: globalThis.crypto,
  };
  runInNewContext(stripTypeScriptTypes(SOURCE), ctx, { filename: 'els-search-bridge/index.ts', timeout: 5000 });
  assert.equal(typeof ctx.resolveUser, 'function', 'resolveUser must remain a top-level function of the handler');
  assert.equal(typeof handler, 'function', 'Deno.serve must register the handler');
  const authCalls = () => calls.filter((c) => c.path === '/auth/v1/user');
  return { resolveUser: ctx.resolveUser, handler, calls, authCalls, unexpected };
}

const request = (authorization) => new Request(`${ORIGIN}/functions/v1/els-search-bridge`, {
  method: 'POST',
  headers: authorization === undefined ? {} : { authorization },
});

test('fixtures: the user tokens really exercise non-ASCII UTF-8 and base64url characters', () => {
  const payload = HEBREW_USER_JWT.split('.')[1];
  assert.match(payload, /[-_]/, 'payload segment must contain base64url-only characters');
  assert.ok(payload.length % 4 !== 0, 'payload segment must be unpadded like a real JWT');
  assert.ok(Buffer.from(payload, 'base64url').toString('utf8').includes('ישראל'));
  const anonPayload = JSON.parse(Buffer.from(ANON_KEY_JWT.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(anonPayload.role, 'anon');
  assert.equal('sub' in anonPayload, false);
});

test('anon key bearer (guest): no /auth/v1/user call, resolved as anonymous', async () => {
  const rt = load();
  assert.equal(await rt.resolveUser(request(bearer(ANON_KEY_JWT))), null);
  assert.equal(rt.calls.length, 0, 'the anon key must never be sent to Auth');
  assert.deepEqual(rt.unexpected, []);
});

test('other bearers that cannot name a user are not sent to Auth: service_role, role=anon even with a sub, empty/non-string sub', async () => {
  for (const token of [
    SERVICE_ROLE_JWT,
    jwt({ role: 'anon', sub: USER_ID }),
    jwt({ role: 'authenticated' }),
    jwt({ role: 'authenticated', sub: '' }),
    jwt({ role: 'authenticated', sub: 12345 }),
    jwt({ role: 'authenticated', sub: null }),
  ]) {
    const rt = load();
    assert.equal(await rt.resolveUser(request(bearer(token))), null, token);
    assert.equal(rt.calls.length, 0, `no Auth call for ${token}`);
  }
});

test('user bearer: Auth is asked exactly once, with the unchanged request, and its id is returned', async () => {
  for (const token of [USER_JWT, HEBREW_USER_JWT, ANONYMOUS_AUTH_JWT]) {
    const rt = load();
    assert.equal(await rt.resolveUser(request(bearer(token))), USER_ID);
    assert.equal(rt.authCalls().length, 1);
    const [call] = rt.authCalls();
    assert.equal(call.url, `${ORIGIN}/auth/v1/user`);
    assert.equal(call.method, 'GET');
    assert.equal(call.headers.apikey, SERVICE_KEY, 'apikey stays the service key, exactly as before');
    assert.equal(call.headers.authorization, bearer(token), 'the caller authorization header is forwarded unchanged');
    assert.deepEqual(rt.unexpected, []);
  }
});

test('user bearer: surrounding whitespace in the header does not change the decision', async () => {
  const rt = load();
  assert.equal(await rt.resolveUser(request(`Bearer   ${USER_JWT}  `)), USER_ID);
  assert.equal(rt.authCalls().length, 1);
  const anon = load();
  assert.equal(await anon.resolveUser(request(`Bearer   ${ANON_KEY_JWT}  `)), null);
  assert.equal(anon.calls.length, 0);
});

test('user bearer: every Auth failure mode still resolves to anonymous (behaviour unchanged)', async () => {
  const cases = {
    'rejected 401': (_c, respond) => respond({ message: 'expired' }, 401),
    'rejected 403': (_c, respond) => respond({ code: 'bad_jwt' }, 403),
    'server error 500': (_c, respond) => respond({ message: 'boom' }, 500),
    'ok but no id': (_c, respond) => respond({}),
    'ok but non-string id': (_c, respond) => respond({ id: 42 }),
    'ok but not JSON': () => new Response('<html>', { status: 200 }),
    'network error': () => { throw new Error('ECONNRESET'); },
  };
  for (const [name, authUser] of Object.entries(cases)) {
    const rt = load({ authUser });
    assert.equal(await rt.resolveUser(request(bearer(USER_JWT))), null, name);
    assert.equal(rt.authCalls().length, 1, `${name}: Auth was still consulted for a real user token`);
  }
});

test('missing or non-Bearer authorization: anonymous, no network', async () => {
  for (const authorization of [undefined, '', 'Bearer', 'Bearer ', `Basic ${USER_JWT}`, `bearer ${USER_JWT}`, USER_JWT]) {
    const rt = load();
    assert.equal(await rt.resolveUser(request(authorization)), null, JSON.stringify(authorization));
    assert.equal(rt.calls.length, 0, JSON.stringify(authorization));
  }
});

test('malformed bearer: anonymous, no network (Auth could only answer bad_jwt)', async () => {
  const enc = (v) => b64u(v);
  for (const token of [
    'not-a-jwt',
    'only.two',
    'a.b.c.d',
    '..',
    `${enc('{}')}..${enc('s')}`,
    `${enc('{}')}.!!!not-base64!!!.${enc('s')}`,
    `${enc('{}')}.${enc('not json')}.${enc('s')}`,
    `${enc('{}')}.${enc('null')}.${enc('s')}`,
    `${enc('{}')}.${enc('[1,2]')}.${enc('s')}`,
    `${enc('{}')}.${enc('"a string"')}.${enc('s')}`,
    `${enc('{}')}.${enc('42')}.${enc('s')}`,
    `${enc('{}')}.${enc(JSON.stringify({ sub: USER_ID }).slice(0, 12))}.${enc('s')}`,
    'sb_publishable_synthetic_key',
  ]) {
    const rt = load();
    assert.equal(await rt.resolveUser(request(bearer(token))), null, token);
    assert.equal(rt.calls.length, 0, `no Auth call for malformed ${token}`);
    assert.deepEqual(rt.unexpected, []);
  }
});

test('missing server configuration still short-circuits before any network, even for a user bearer', async () => {
  for (const env of [{ SUPABASE_URL: ORIGIN }, { SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY }, {}]) {
    const rt = load({ env });
    assert.equal(await rt.resolveUser(request(bearer(USER_JWT))), null);
    assert.equal(rt.calls.length, 0);
  }
});

// End to end through the real handler: the identity that reaches the rate limiter (and so the capability gate and
// the trace) is what resolveUser decided. The stub rate limiter denies, so nothing past it is exercised.
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const pageBody = JSON.stringify({ op: 'page', term: 'תורה', skip_max: 100 });
const handlerRequest = (authorization) => new Request(`${ORIGIN}/functions/v1/els-search-bridge`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', 'user-agent': 'synthetic-agent/1.0', ...(authorization ? { authorization } : {}) },
  body: pageBody,
});
const rateCall = (rt) => {
  const rate = rt.calls.filter((c) => c.path === '/rest/v1/rpc/edge_rate_limit_check');
  assert.equal(rate.length, 1, 'rate limiter is consulted exactly once per request');
  return rate[0];
};

test('handler: a guest (anon key) reaches the rate limiter as the anonymous ip+ua bucket without touching Auth', async () => {
  const rt = load();
  const res = await rt.handler(handlerRequest(bearer(ANON_KEY_JWT)));
  assert.equal(res.status, 429);
  assert.equal(rt.authCalls().length, 0, 'guest traffic produces zero Auth requests');
  const { body } = rateCall(rt);
  assert.equal(body.p_key_hash, sha256('els-search-bridge|anon:203.0.113.7:synthetic-agent/1.0'));
  assert.equal(body.p_limit, 60, 'anonymous page limit is unchanged');
  assert.deepEqual(rt.unexpected, []);
});

test('handler: a request with no authorization header is the same anonymous bucket, no Auth request', async () => {
  const rt = load();
  const res = await rt.handler(handlerRequest(null));
  assert.equal(res.status, 429);
  assert.equal(rt.authCalls().length, 0);
  assert.equal(rateCall(rt).body.p_key_hash, sha256('els-search-bridge|anon:203.0.113.7:synthetic-agent/1.0'));
});

test('handler: a real user is still resolved through Auth and reaches the rate limiter as that user', async () => {
  const rt = load();
  const res = await rt.handler(handlerRequest(bearer(HEBREW_USER_JWT)));
  assert.equal(res.status, 429);
  assert.equal(rt.authCalls().length, 1);
  assert.equal(rt.authCalls()[0].headers.authorization, bearer(HEBREW_USER_JWT));
  const { body } = rateCall(rt);
  assert.equal(body.p_key_hash, sha256(`els-search-bridge|user:${USER_ID}`));
  assert.equal(body.p_limit, 120, 'authenticated page limit is unchanged');
  assert.deepEqual(rt.unexpected, []);
});

test('handler: a user token Auth rejects falls back to the anonymous bucket exactly as before', async () => {
  const rt = load({ authUser: (_c, respond) => respond({ code: 'bad_jwt' }, 403) });
  const res = await rt.handler(handlerRequest(bearer(USER_JWT)));
  assert.equal(res.status, 429);
  assert.equal(rt.authCalls().length, 1);
  assert.equal(rateCall(rt).body.p_key_hash, sha256('els-search-bridge|anon:203.0.113.7:synthetic-agent/1.0'));
});

test('source guard: only the Auth-bound path was touched - the verifier call and its headers are unchanged', () => {
  assert.match(SOURCE, /fetch\(`\$\{SUPABASE_URL\}\/auth\/v1\/user`, \{\s*headers: \{ apikey: SERVICE_KEY, authorization \},\s*\}\)/);
  assert.match(SOURCE, /typeof data\?\.id === "string" \? data\.id : null/);
  // routing-only decode: the payload is never trusted for identity, the id always comes from Auth's response
  assert.doesNotMatch(SOURCE, /return\s+claims\.sub/);
  assert.doesNotMatch(SOURCE, /claims\.sub\s*;/);
});

console.log('els-search-bridge resolveUser (A4): PASS');
