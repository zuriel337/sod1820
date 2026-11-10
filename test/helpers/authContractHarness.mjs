// Shared harness for the authentication contract.
// Real pieces: the emitted public-reading service worker (buildPublicReadingWorker), the real
// @supabase/supabase-js client configured like production, and the real src/lib/auth.js.
// Test double: only the Supabase Auth server (an in-memory GoTrue model with the behaviour that
// matters for sign-in: single-use codes, newest code wins, 429 on rapid re-requests, `signup` type for
// unconfirmed accounts, PKCE binding). No request can leave the process.
import vm from 'node:vm';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { buildPublicReadingWorker } from '../../public-reading-deploy/transport.js';
import { readingSessionOptions } from '../../src/lib/publicReadingAuthSession.js';

export const API = 'https://linswmnnkjxvweumprav.supabase.co';
export const SITE = 'https://sod1820.co.il';
export const ANON = 'publishable-synthetic';
export const SHA = 'a'.repeat(40);

const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
export const jwt = (sub, extra = {}) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...extra })}.${b64('sig')}`;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

// ---- GoTrue model -------------------------------------------------------------------------------
export function createAuthServer({ codeLength = 6, resendWindowMs = 60_000, now = () => Date.now() } = {}) {
  const users = new Map();      // email -> {id,email,confirmed,password}
  const codes = new Map();      // email -> {code,type,challenge,consumed,sentAt,link}
  const authCodes = new Map();  // auth_code -> {userId,challenge}
  const refresh = new Map();    // refresh_token -> userId
  const log = [];               // {method,path,status,errorCode} only: never credentials
  let id = 0, lastSent = new Map();
  const state = { sent: [], rejectNextSend: null };

  const newUser = (email, confirmed, password = null) => {
    const user = { id: `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`, email, confirmed, password };
    users.set(email, user); return user;
  };
  const session = user => {
    const refreshToken = randomBytes(12).toString('base64url');
    refresh.set(refreshToken, user.id);
    return { access_token: jwt(user.id), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(now() / 1000) + 3600, refresh_token: refreshToken,
      user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', email_confirmed_at: user.confirmed ? new Date(now()).toISOString() : null } };
  };
  const byId = uid => [...users.values()].find(user => user.id === uid);
  const err = (status, errorCode, msg) => json({ code: status, error_code: errorCode, msg }, status);
  const sha256 = value => createHash('sha256').update(value).digest('base64url');

  async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/auth/v1', '');
    const body = request.method === 'POST' ? await request.clone().json().catch(() => ({})) : {};
    let response;
    if (path === '/settings') response = json({ external: { email: true, google: true, facebook: true, phone: false }, disable_signup: false });
    else if (path === '/otp') {
      const email = String(body.email || '').toLowerCase();
      const last = lastSent.get(email);
      if (last && now() - last < resendWindowMs) response = err(429, 'over_email_send_rate_limit', `For security purposes, you can only request this after ${Math.ceil((resendWindowMs - (now() - last)) / 1000)} seconds.`);
      else if (state.rejectNextSend) { response = err(state.rejectNextSend, 'unexpected_failure', 'Error sending confirmation email'); state.rejectNextSend = null; }
      else {
        let user = users.get(email);
        if (!user) { if (body.create_user === false) response = err(422, 'otp_disabled', 'Signups not allowed for otp'); else user = newUser(email, false); }
        if (!response) {
          const code = String(Math.floor(Math.random() * 10 ** codeLength)).padStart(codeLength, '0');
          const authCode = randomBytes(8).toString('base64url');
          authCodes.set(authCode, { userId: user.id, challenge: body.code_challenge });
          const record = { code, type: user.confirmed ? 'email' : 'signup', challenge: body.code_challenge, consumed: false, sentAt: now(),
            link: `${url.searchParams.get('redirect_to') || SITE}?code=${authCode}`, authCode };
          codes.set(email, record); lastSent.set(email, now()); state.sent.push({ email, ...record });
          response = json({});
        }
      }
    } else if (path === '/verify') {
      const email = String(body.email || '').toLowerCase(), record = codes.get(email), user = users.get(email);
      if (!record || !user || record.consumed || record.code !== body.token || record.type !== body.type) response = err(403, 'otp_expired', 'Token has expired or is invalid');
      else { record.consumed = true; authCodes.delete(record.authCode); user.confirmed = true; response = json(session(user)); }
    } else if (path === '/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const user = users.get(String(body.email || '').toLowerCase());
        response = user && user.confirmed && user.password && user.password === body.password ? json(session(user)) : err(400, 'invalid_credentials', 'Invalid login credentials');
      } else if (grant === 'refresh_token') {
        const uid = refresh.get(body.refresh_token);
        if (!uid) response = err(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        else { refresh.delete(body.refresh_token); response = json(session(byId(uid))); }   // rotation: a reused token fails
      } else if (grant === 'pkce') {
        const grantRecord = authCodes.get(body.auth_code);
        if (!grantRecord) response = err(404, 'flow_state_not_found', 'invalid flow state, no valid flow state found');
        else if (!grantRecord.challenge || sha256(body.code_verifier) !== grantRecord.challenge) response = err(400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
        else { authCodes.delete(body.auth_code); const user = byId(grantRecord.userId); user.confirmed = true; response = json(session(user)); }
      } else response = err(400, 'validation_failed', 'unsupported grant_type');
    } else if (path === '/user') {
      const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '')?.[1];
      let uid; try { uid = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub; } catch { /* unauthenticated */ }
      const user = uid && byId(uid);
      response = user ? json({ id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated' }) : err(401, 'bad_jwt', 'invalid JWT');
    } else if (path === '/logout') response = new Response(null, { status: 204 });
    else response = err(404, 'not_found', 'not found');
    log.push({ method: request.method, path, search: url.search.replace(/=[^&]*/g, '=…'), status: response.status });
    return response;
  }
  return { handle, users, codes, state, log, newUser, lastCode: email => codes.get(email.toLowerCase())?.code, lastLink: email => codes.get(email.toLowerCase())?.link,
    reset: () => { lastSent = new Map(); } , forgetSendTimes: () => { lastSent = new Map(); } };
}

// ---- the real worker, in a VM ------------------------------------------------------------------
export function createWorkerFetch(server, { origin = SITE, sourceSha = SHA } = {}) {
  let listener; const passed = [], denied = [], forwarded = [];
  const context = {
    Request, Response, URL, Set, Map, JSON, atob, Headers, URLSearchParams,
    fetch: async (input, init) => { const request = input instanceof Request ? input : new Request(input, init); passed.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`); forwarded.push({ path: new URL(request.url).pathname, cache: request.cache, credentials: request.credentials, redirect: request.redirect }); return server.handle(request); },
    self: { location: { origin }, addEventListener: (type, fn) => { if (type === 'fetch') listener = fn; } },
  };
  vm.runInNewContext(buildPublicReadingWorker(sourceSha, { anonKey: ANON }), context);
  // A request the worker does not respond to goes to the network (as in a browser).
  const workerFetch = async (input, init) => {
    const request = new Request(input, init);
    let reply;
    listener({ request, respondWith(promise) { reply = promise; } });
    if (!reply) return context.fetch(request);
    const response = await reply;
    if (response.status === 403 && (await response.clone().text()).includes('public_reading_auth_denied')) denied.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`);
    return response;
  };
  return { workerFetch, passed, denied, forwarded, telemetryOrigin: origin };
}

// ---- real SDK client configured as production does ---------------------------------------------
export function createProductionLikeClient({ server, storage = new MemoryStorage(), pathname = '/login', worker = createWorkerFetch(server) } = {}) {
  const client = createClient(API, ANON, {
    auth: { ...readingSessionOptions(storage, { pathname, origin: SITE }, { productionArtifact: true, canonicalStorage: storage }), autoRefreshToken: false },
    global: { fetch: worker.workerFetch },
  });
  return { client, storage, worker };
}

// ---- the real src/lib/*.js modules, loaded with the SDK client as `supabase` -----------------------
const load = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/import\.meta\.env/g, 'ENV').replaceAll('export ', '');
export function loadAuthModule(client, { reading = true, location = { origin: SITE } } = {}) {
  const ctx = {
    PUBLIC_READING_RELEASE: reading, ENV: { VITE_AUTH_VERIFIED_PREVIEW_ORIGINS: '[]' }, URL, Date, Error, Promise, JSON, Number, Math, String, Boolean, Object, Array, Set,
    window: { location }, supabase: client, signupAttribution: () => ({}), visitorId: () => 'v',
    classifyAuthError: undefined, reportAuthFailure: undefined,
  };
  vm.createContext(ctx);
  vm.runInContext(load('src/lib/oauthReturn.js') + ';globalThis.providerOAuthRequest=providerOAuthRequest;', ctx);
  vm.runInContext(load('src/lib/authDiagnostics.js') + ';globalThis.classifyAuthError=classifyAuthError;globalThis.reportAuthFailure=reportAuthFailure;', ctx);
  vm.runInContext(load('src/lib/auth.js') + ';globalThis.api={requestEmailOtp,verifyEmailOtp,signInWithPassword,signOut,getSession,emailLinkRedirect};', ctx);
  return ctx.api;
}
