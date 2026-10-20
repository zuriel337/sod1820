import assert from 'node:assert/strict';
import { test } from 'node:test';

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json' },
});

const request = (country, { cookie = '', path = '/world', userAgent } = {}) => new Request(
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
    },
  },
);

test('isolated CN/SG chain preserves quarantine, proof, limiter, and 429 order', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalOidc = process.env.VERCEL_OIDC_TOKEN;
  const calls = [];
  const pending = [];
  let limiterCalls = 0;

  process.env.VERCEL_OIDC_TOKEN = 'fixture-oidc-token';
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const call = { url, method, body: init.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);

    if (url.includes('/edge_blocked_countries?select=mode,strict_level&code=eq.SG')) {
      assert.equal(headers.get('apikey'), headers.get('authorization')?.replace(/^Bearer /, ''));
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
      assert.equal(headers.get('authorization'), 'Bearer fixture-oidc-token');
      return json({
        allowed: limiterCalls === 1,
        limit: call.body.limit,
        window_seconds: call.body.window_seconds,
      });
    }
    if (url.includes('/rest/v1/rpc/log_edge') || url.includes('/rest/v1/rpc/log_crawl')) {
      return json({ ok: true });
    }
    throw new Error(`unexpected isolated fetch: ${method} ${url}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = originalOidc;
  });

  const { default: middleware } = await import(`../middleware.js?isolated=${Date.now()}`);
  const context = { waitUntil(promise) { pending.push(Promise.resolve(promise)); } };

  const goodBot = await middleware(request('SG', { userAgent: 'Googlebot/2.1' }), context);
  assert.notEqual(goodBot.status, 429);
  assert.equal(calls.filter((call) => call.url.includes('select=mode,strict_level&code=eq.SG')).length, 0);

  const challenge = await middleware(request('SG'), context);
  assert.equal(challenge.status, 200);
  assert.equal(challenge.headers.get('x-sod-edge-policy'), 'quarantine');
  assert.equal(limiterCalls, 0, 'limiter must not run before quarantine proof');

  const proof = 'sod_edge_q_SG=q2029v1:low';
  const allowed = await middleware(request('SG', { cookie: proof }), context);
  assert.notEqual(allowed.status, 429);
  assert.equal(limiterCalls, 1);
  const firstLimiterBody = calls.filter((call) => call.url.endsWith('/functions/v1/sg-rate-limit'))[0].body;
  assert.match(firstLimiterBody.key_hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    firstLimiterBody,
    { key_hash: firstLimiterBody.key_hash, window_seconds: 300, limit: 30 },
  );

  const limited = await middleware(request('SG', { cookie: proof, path: '/research' }), context);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('x-sod-edge-policy'), 'sg-rate-limit');
  assert.equal(limited.headers.get('retry-after'), '300');
  assert.equal(limiterCalls, 2);
  assert.equal(
    calls.filter((call) => call.url.endsWith('/functions/v1/sg-rate-limit'))[1].body.limit,
    8,
  );

  const beforeCnLimiterCalls = limiterCalls;
  const cn = await middleware(request('CN'), context);
  assert.equal(cn.status, 200);
  assert.equal(cn.headers.get('x-sod-edge-policy'), 'quarantine');
  assert.equal(limiterCalls, beforeCnLimiterCalls, 'CN L2 must not enter the SG limiter');

  await Promise.all(pending);
  assert.equal(calls.filter((call) => call.url.includes('select=mode,strict_level&code=eq.SG')).length, 1);
});
