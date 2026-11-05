import assert from 'node:assert/strict';
import { test } from 'node:test';

// SG limiter OIDC token resolution (Vercel delivers the token in the
// `x-vercel-oidc-token` request header; VERCEL_OIDC_TOKEN is only a fallback).
// All network traffic and identity is a fixture: no Production call, no real token.

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json' },
});

const SG_PROOF = 'sod_edge_q_SG=q2029v1:low';

const sgRequest = ({ oidcHeader, cookie = SG_PROOF, country = 'SG', path = '/world', userAgent } = {}) => new Request(
  `https://example.test${path}`,
  {
    headers: {
      'x-vercel-ip-country': country,
      'x-forwarded-for': '203.0.113.10',
      'user-agent': userAgent || 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
      accept: 'text/html',
      'accept-language': 'he-IL,he;q=0.9',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
      ...(cookie ? { cookie } : {}),
      ...(oidcHeader ? { 'x-vercel-oidc-token': oidcHeader } : {}),
    },
  },
);

let importCounter = 0;

// Runs `fn` with an isolated middleware module instance, a fixture fetch and a
// captured console.warn. `limiterReply(callIndex, call)` decides the limiter response.
async function withHarness({ envToken, limiterReply }, fn) {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalEnv = process.env.VERCEL_OIDC_TOKEN;
  const calls = [];
  const warnings = [];
  const pending = [];
  let limiterCalls = 0;

  if (envToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = envToken;

  console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const call = { url, method, headers, body: init.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);

    if (url.includes('/edge_blocked_countries?select=mode,strict_level&code=eq.SG')) {
      return json([{ mode: 'quarantine', strict_level: 3 }]);
    }
    if (url.includes('/edge_blocked_countries?select=code,mode,strict_level&enabled=eq.true')) {
      return json([
        { code: 'CN', mode: 'quarantine', strict_level: 2 },
        { code: 'SG', mode: 'quarantine', strict_level: 3 },
      ]);
    }
    if (url.endsWith('/functions/v1/sg-rate-limit')) {
      limiterCalls += 1;
      return limiterReply(limiterCalls, call);
    }
    if (url.includes('/rest/v1/rpc/log_edge') || url.includes('/rest/v1/rpc/log_crawl')) {
      return json({ ok: true });
    }
    throw new Error(`unexpected isolated fetch: ${method} ${url}`);
  };

  try {
    importCounter += 1;
    const { default: middleware } = await import(`../middleware.js?oidc-resolver=${importCounter}-${Date.now()}`);
    const context = { waitUntil(promise) { pending.push(Promise.resolve(promise)); } };
    const limiterCallList = () => calls.filter((call) => call.url.endsWith('/functions/v1/sg-rate-limit'));
    const result = await fn({ middleware, context, calls, warnings, limiterCallList });
    await Promise.all(pending);
    return result;
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    if (originalEnv === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = originalEnv;
  }
}

const allow = (_n, call) => json({ allowed: true, limit: call.body.limit, window_seconds: call.body.window_seconds });
const deny = (_n, call) => json({ allowed: false, limit: call.body.limit, window_seconds: call.body.window_seconds });

test('header-only token (no env var) reaches the limiter and a refusal becomes HTTP 429', async () => {
  await withHarness({ envToken: undefined, limiterReply: deny }, async ({ middleware, context, limiterCallList, warnings }) => {
    const response = await middleware(sgRequest({ oidcHeader: 'header-token-fixture' }), context);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('x-sod-edge-policy'), 'sg-rate-limit');
    assert.equal(response.headers.get('retry-after'), '300');
    assert.equal(limiterCallList().length, 1);
    assert.equal(limiterCallList()[0].headers.get('authorization'), 'Bearer header-token-fixture');
    assert.deepEqual(
      { window_seconds: limiterCallList()[0].body.window_seconds, limit: limiterCallList()[0].body.limit },
      { window_seconds: 300, limit: 30 },
    );
    assert.equal(warnings.length, 0, 'no fail-open warning when a header token exists');
  });
});

test('429 is friction only: no cookie that could be read as Human proof', async () => {
  await withHarness({ envToken: undefined, limiterReply: deny }, async ({ middleware, context }) => {
    const response = await middleware(sgRequest({ oidcHeader: 'header-token-fixture' }), context);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('x-sod-edge-policy'), 'sg-rate-limit');
  });
});

test('header token wins over the env fallback', async () => {
  await withHarness({ envToken: 'env-token-fixture', limiterReply: allow }, async ({ middleware, context, limiterCallList }) => {
    const response = await middleware(sgRequest({ oidcHeader: 'header-token-fixture' }), context);
    assert.notEqual(response.status, 429);
    assert.equal(limiterCallList().length, 1);
    assert.equal(limiterCallList()[0].headers.get('authorization'), 'Bearer header-token-fixture');
  });
});

test('env var is still used when the request has no header', async () => {
  await withHarness({ envToken: 'env-token-fixture', limiterReply: allow }, async ({ middleware, context, limiterCallList }) => {
    const response = await middleware(sgRequest(), context);
    assert.notEqual(response.status, 429);
    assert.equal(limiterCallList().length, 1);
    assert.equal(limiterCallList()[0].headers.get('authorization'), 'Bearer env-token-fixture');
  });
});

test('no token anywhere stays fail-open: no limiter call, no 429, one warning', async () => {
  await withHarness({ envToken: undefined, limiterReply: deny }, async ({ middleware, context, limiterCallList, warnings }) => {
    const first = await middleware(sgRequest(), context);
    const second = await middleware(sgRequest(), context);
    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(limiterCallList().length, 0);
    assert.equal(warnings.length, 1, 'warn once per instance, not per request');
    assert.match(warnings[0], /^sg-rate-limit fail-open: missing VERCEL_OIDC_TOKEN/);
  });
});

test('a rejected token (limiter 401) stays fail-open and the token is never logged', async () => {
  const secret = 'secret-header-token-must-not-leak';
  await withHarness(
    { envToken: undefined, limiterReply: () => json({ error: 'unauthorized' }, 401) },
    async ({ middleware, context, warnings, limiterCallList }) => {
      const response = await middleware(sgRequest({ oidcHeader: secret }), context);
      assert.notEqual(response.status, 429);
      assert.equal(limiterCallList().length, 1);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /fail-open: edge function status 401/);
      assert.ok(!warnings.join('\n').includes(secret), 'token value must never reach the logs');
    },
  );
});

test('limiter stays out of non-SG and non-browser traffic even with a token present', async () => {
  await withHarness({ envToken: undefined, limiterReply: deny }, async ({ middleware, context, limiterCallList }) => {
    const cn = await middleware(sgRequest({ country: 'CN', oidcHeader: 'header-token-fixture', cookie: 'sod_edge_q_CN=q2029v1:low' }), context);
    assert.notEqual(cn.status, 429);
    const goodBot = await middleware(sgRequest({ oidcHeader: 'header-token-fixture', userAgent: 'Googlebot/2.1' }), context);
    assert.notEqual(goodBot.status, 429);
    const aiBot = await middleware(sgRequest({ oidcHeader: 'header-token-fixture', userAgent: 'GPTBot/1.1' }), context);
    assert.notEqual(aiBot.status, 429);
    assert.equal(limiterCallList().length, 0);
  });
});

test('limiter still requires the quarantine proof first', async () => {
  await withHarness({ envToken: undefined, limiterReply: deny }, async ({ middleware, context, limiterCallList }) => {
    const challenge = await middleware(sgRequest({ oidcHeader: 'header-token-fixture', cookie: '' }), context);
    assert.equal(challenge.status, 200);
    assert.equal(challenge.headers.get('x-sod-edge-policy'), 'quarantine');
    assert.equal(limiterCallList().length, 0, 'no limiter call before a valid quarantine proof');
  });
});
