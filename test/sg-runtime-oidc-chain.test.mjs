import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPair } from 'jose';
import { browserRequest, chainSandbox, signingFixture, localPostgres } from './helpers/sg-runtime-chain.mjs';

test('context-only runtime token reaches the real OIDC verifier after valid quarantine proof', async t => {
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, token: await signing.token() });
  assert.equal(process.env.VERCEL_OIDC_TOKEN, undefined);
  const challenge = await chain.run(browserRequest({ proof: false }));
  assert.equal(challenge.headers.get('x-sod-edge-policy'), 'quarantine');
  assert.equal(chain.events.limiter.length, 0);
  const response = await chain.run(browserRequest());
  assert.notEqual(response.status, 429);
  assert.equal(chain.events.limiter.length, 1);
  assert.equal(chain.events.rpc.length, 1);
  assert.equal(chain.events.jwks, 1);
  assert.deepEqual(chain.events.warnings, []);
  assert.equal(chain.events.rpc[0].p_window_seconds, 300);
});

test('request token wins over an invalid environment token and is read afresh per request', async t => {
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, token: await signing.token(), envToken: 'invalid-stale-env-fixture' });
  await chain.run(browserRequest());
  assert.equal(chain.events.rpc.length, 1);
  chain.token(await signing.token({ project_id: 'wrong-project' }));
  await chain.run(browserRequest());
  assert.equal(chain.events.rpc.length, 1, 'wrong-project token must never increment the bucket');
  chain.token(await signing.token());
  await chain.run(browserRequest());
  assert.equal(chain.events.rpc.length, 2, 'fresh valid context token must not be replaced by a cached one');
});

test('existing environment fallback still works', async t => {
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, envToken: await signing.token() });
  await chain.run(browserRequest());
  assert.equal(chain.events.rpc.length, 1);
});

test('a raw client OIDC header is not a server request context or an authentication bypass', async t => {
  const signing = await signingFixture();
  const token = await signing.token();
  const chain = await chainSandbox(t, { jwks: signing.jwks });
  await chain.run(browserRequest({ extraHeaders: { 'x-vercel-oidc-token': token } }));
  assert.equal(chain.events.limiter.length, 0);
  assert.equal(chain.events.rpc.length, 0);
  assert.equal(chain.events.warnings.length, 1);
  assert.ok(!chain.events.warnings.join('').includes(token), 'never log a token');
});

test('real signature and project/environment/subject gates remain production-only', async t => {
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, token: await signing.token() });
  const other = await generateKeyPair('RS256');
  const rejected = [await signing.token({}, other.privateKey),
    await signing.token({ environment: 'preview', sub: 'owner:sod1820-s-projects:project:sod1820:environment:preview' }),
    await signing.token({ owner_id: 'wrong-owner' }), await signing.token({ project_id: 'wrong-project' }),
    await signing.token({ project: 'wrong-name' }), await signing.token({ sub: 'wrong-subject' }),
    await signing.token({ iss: 'https://invalid.example' }), await signing.token({ aud: 'wrong-audience' }),
    await signing.token({ exp: Math.floor(Date.now() / 1000) - 30 })];
  for (const token of rejected) { chain.token(token); await chain.run(browserRequest()); }
  assert.equal(chain.events.limiter.length, rejected.length);
  assert.equal(chain.events.rpc.length, 0);
  assert.equal(chain.events.warnings.length, 1);
});

test('proof ordering, CN L2, public goodbot/AI and bad-bot behavior are preserved', async t => {
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, token: await signing.token() });
  for (const ua of ['Googlebot/2.1', 'bingbot/2.0', 'GPTBot/1.0']) {
    const result = await chain.run(browserRequest({ ua })); assert.notEqual(result.status, 429);
  }
  assert.equal(chain.events.limiter.length, 0);
  const bad = await chain.run(browserRequest({ ua: 'python-requests/2.31' })); assert.equal(bad.status, 403);
  const cn = await chain.run(browserRequest({ country: 'CN', proof: false }));
  assert.equal(cn.headers.get('x-sod-edge-policy'), 'quarantine');
  await chain.run(browserRequest({ proof: 'sod_edge_q_SG=q2029v1:high' }));
  assert.equal(chain.events.limiter.length, 0);
});

test('full chain: signed context OIDC → real local PostgreSQL 300s bucket → HTTP429', {
  skip: process.env.SOD_SG_LOCAL_PG !== '1', timeout: 60000,
}, async t => {
  const pg = await localPostgres(t);
  const signing = await signingFixture();
  const chain = await chainSandbox(t, { jwks: signing.jwks, token: await signing.token(), rateRpc: pg.rateRpc });
  const challenge = await chain.run(browserRequest({ proof: false, path: '/research' }));
  assert.equal(challenge.headers.get('x-sod-edge-policy'), 'quarantine');
  assert.equal(chain.events.rpc.length, 0);
  for (let n = 1; n <= 8; n++) assert.notEqual((await chain.run(browserRequest({ path: '/research' }))).status, 429);
  const result = await chain.run(browserRequest({ path: '/research' }));
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('retry-after'), '300');
  assert.equal(result.headers.get('x-sod-edge-policy'), 'sg-rate-limit');
  const row = JSON.parse(pg.sql("select row_to_json(b) from (select count, bucket, floor(extract(epoch from clock_timestamp())/300)::bigint as expected_bucket, floor(extract(epoch from clock_timestamp())/3600)::bigint as hourly_bucket from private.edge_rate_limit_buckets) b;"));
  assert.equal(row.count, 9); assert.equal(row.bucket, row.expected_bucket); assert.notEqual(row.bucket, row.hourly_bucket);
  assert.equal(chain.events.rpc.length, 9); assert.deepEqual(chain.events.warnings, []);
});
