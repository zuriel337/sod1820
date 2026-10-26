import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { rolldown } from 'rolldown';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

export const CONTEXT = Symbol.for('@vercel/request-context');
const issuer = 'https://oidc.vercel.com/sod1820-s-projects';
const production = {
  owner_id: 'team_vtfWHZfKvdbob8gvynQb5N89',
  project_id: 'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq',
  project: 'sod1820', environment: 'production',
  sub: 'owner:sod1820-s-projects:project:sod1820:environment:production',
};

// Synthetic keys exist in memory only. No token is valid against Vercel's live JWKS.
export async function signingFixture() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = { ...await exportJWK(publicKey), kid: 'isolated-sg-canary', alg: 'RS256', use: 'sig' };
  return {
    jwks: { keys: [publicJwk] },
    token: (overrides = {}, key = privateKey) => new SignJWT({ ...production, ...overrides })
      .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid }).setIssuer(overrides.iss ?? issuer)
      .setAudience(overrides.aud ?? 'https://vercel.com/sod1820-s-projects').setIssuedAt().setExpirationTime(overrides.exp ?? '5m')
      .sign(key),
  };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

export function browserRequest({ country = 'SG', proof = true, path = '/world', ua, extraHeaders = {} } = {}) {
  return new Request(`https://isolated-sg.test${path}`, { headers: {
    'x-vercel-ip-country': country, 'x-forwarded-for': '203.0.113.57',
    'user-agent': ua || 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
    accept: 'text/html', 'accept-language': 'he-IL,he;q=0.9',
    'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document',
    ...(proof ? { cookie: typeof proof === 'string' ? proof : 'sod_edge_q_SG=q2029v1:low' } : {}),
    ...extraHeaders,
  } });
}

export async function chainSandbox(t, { jwks, token, envToken, rateRpc } = {}) {
  const saved = { fetch: globalThis.fetch, Deno: globalThis.Deno, context: globalThis[CONTEXT],
    env: process.env.VERCEL_OIDC_TOKEN, warn: console.warn };
  const events = { limiter: [], rpc: [], jwks: 0, policy: 0, warnings: [] };
  const pending = [];
  let currentToken = token, handler;
  globalThis[CONTEXT] = { get: () => ({ headers: currentToken ? { 'x-vercel-oidc-token': currentToken } : {} }) };
  if (envToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = envToken;
  console.warn = value => events.warnings.push(String(value));
  globalThis.Deno = { env: { get: name => ({ SUPABASE_URL: 'https://local-rate-rpc.test',
    SUPABASE_SERVICE_ROLE_KEY: 'isolated-fixture-service-key' })[name] || '' }, serve: fn => { handler = fn; } };
  t.after(async () => {
    await Promise.all(pending);
    globalThis.fetch = saved.fetch; console.warn = saved.warn;
    if (saved.Deno === undefined) delete globalThis.Deno; else globalThis.Deno = saved.Deno;
    if (saved.context === undefined) delete globalThis[CONTEXT]; else globalThis[CONTEXT] = saved.context;
    if (saved.env === undefined) delete process.env.VERCEL_OIDC_TOKEN; else process.env.VERCEL_OIDC_TOKEN = saved.env;
  });

  // Execute the unchanged real limiter handler with real JOSE, not a jwtVerify stub.
  const bundle = await rolldown({ input: new URL('../../supabase/functions/sg-rate-limit/index.ts', import.meta.url).pathname,
    platform: 'neutral', plugins: [{ name: 'real-jose-fixture-resolution', resolveId(id) {
      return id === 'npm:jose@6.2.12' ? new URL(import.meta.resolve('jose')).pathname : null;
    } }] });
  const output = await bundle.generate({ format: 'esm' }); await bundle.close();
  const code = output.output.find(x => x.type === 'chunk').code;
  await import(`data:text/javascript;base64,${Buffer.from(code + '\n//' + crypto.randomUUID()).toString('base64')}`);
  assert.equal(typeof handler, 'function');

  const counts = new Map();
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'oidc.vercel.com' && url.pathname === '/.well-known/jwks') {
      events.jwks++; return json(jwks);
    }
    if (url.href.includes('/edge_blocked_countries?')) {
      events.policy++;
      return json(url.searchParams.has('code') ? [{ mode: 'quarantine', strict_level: 3 }] : [
        { code: 'CN', mode: 'quarantine', strict_level: 2 }, { code: 'SG', mode: 'quarantine', strict_level: 3 },
      ]);
    }
    if (url.pathname === '/functions/v1/sg-rate-limit') {
      events.limiter.push(JSON.parse(init.body));
      return handler(new Request('https://isolated-sg-limiter.test', init));
    }
    if (url.hostname === 'local-rate-rpc.test' && url.pathname === '/rest/v1/rpc/edge_rate_limit_check') {
      const body = JSON.parse(init.body); events.rpc.push(body);
      assert.match(body.p_key_hash, /^[0-9a-f]{64}$/); assert.equal(body.p_window_seconds, 300);
      if (rateRpc) return json(await rateRpc(body));
      const n = (counts.get(body.p_key_hash) || 0) + 1; counts.set(body.p_key_hash, n);
      return json({ allowed: n <= body.p_limit, count: n, limit: body.p_limit, window_seconds: body.p_window_seconds });
    }
    if (/\/rest\/v1\/rpc\/log_(edge|crawl)$/.test(url.pathname)) return json({ ok: true });
    throw new Error(`Unexpected isolated request: ${url.origin}${url.pathname}`);
  };
  const { default: middleware } = await import(`../../middleware.js?runtime-oidc=${crypto.randomUUID()}`);
  return { events, token(value) { currentToken = value; },
    run: request => middleware(request, { waitUntil(p) { pending.push(Promise.resolve(p)); } }) };
}

export async function localPostgres(t) {
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  const docker = args => execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
    env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000,
  }).trim();
  // Local cached image only: no network, exposed ports, mounts or real credentials.
  const image = 'postgres:17-alpine'; docker(['image', 'inspect', image]);
  const name = `sod1820-sg-oidc-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const id = docker(['run', '--detach', '--name', name, '--network', 'none',
    '--label', 'sod1820-isolated-test=sg-oidc', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image]);
  assert.match(id, /^[0-9a-f]{64}$/);
  t.after(() => { assert.equal(docker(['inspect', '--format', '{{index .Config.Labels "sod1820-isolated-test"}}', id]), 'sg-oidc'); docker(['rm', '--force', id]); });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      // The image briefly starts and stops an init server before final startup.
      // Do not mistake that temporary socket for a ready test database.
      assert.ok(docker(['logs', id]).includes('PostgreSQL init process complete; ready for start up.'));
      docker(['exec', id, 'pg_isready', '-U', 'postgres']); ready = true; break;
    } catch { await setTimeout(300); }
  }
  assert.ok(ready, 'owned local test PostgreSQL must become ready');
  const sql = query => execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', id,
    'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
    env, input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000,
  }).trim();
  sql(readFileSync(new URL('../fixtures/sg-rate-limit-local.sql', import.meta.url), 'utf8'));
  return { sql, rateRpc: body => {
    assert.match(body.p_key_hash, /^[0-9a-f]{64}$/); assert.equal(body.p_window_seconds, 300);
    assert.ok(Number.isInteger(body.p_limit));
    return JSON.parse(sql(`select public.edge_rate_limit_check('${body.p_key_hash}',300,${body.p_limit});`));
  } };
}
