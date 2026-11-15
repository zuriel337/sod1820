import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['supabase/functions/ga-sync-server/index.ts'], bundle: true, write: false,
  platform: 'node', format: 'cjs', plugins: [{ name: 'local-supabase', setup(b) {
    b.onResolve({ filter: /^jsr:@supabase\/supabase-js/ }, () => ({ path: 'client', namespace: 'local-supabase' }));
    b.onLoad({ filter: /.*/, namespace: 'local-supabase' }, () => ({ contents: 'export const createClient=()=>globalThis.fixture.client;' }));
  } }] });

function fixture({ reportStatus = 200, config = true } = {}) {
  const calls = [], requests = [];
  const env = { SUPABASE_URL: 'https://database.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-fixture-service-key', GA_PROPERTY_ID: '123456789' };
  const key = 'synthetic-fixture-sync-key';
  const client = { rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'gsc_secrets') return { data: [{ sync_key: key, sa: JSON.stringify({ client_email: 'fixture@example.invalid', private_key: '-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----' }) }] };
    if (['ingest_ga_daily', 'ingest_ga_country_daily'].includes(name)) return { data: args.p_rows.length };
    throw new Error(`Unexpected RPC ${name}`);
  } };
  let handler;
  const context = { module: { exports: {} }, fixture: { client }, Response, TextEncoder, Uint8Array, URLSearchParams, atob, btoa,
    Deno: { env: { get: key => config ? env[key] : undefined }, serve: fn => { handler = fn; } },
    crypto: { subtle: { importKey: async () => ({}), sign: async () => new Uint8Array([0]) } },
    fetch: async (url, options) => {
      requests.push({ url, body: options.body });
      if (url === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'synthetic-fixture-token' }));
      assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport');
      const body = JSON.parse(options.body);
      assert.deepEqual(body.metrics, [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }]);
      assert.equal(body.dateRanges[0].endDate, 'today');
      assert.equal(body.limit, 100000);
      const il = Boolean(body.dimensionFilter);
      if (il) assert.equal(body.dimensionFilter.filter.stringFilter.value, 'IL');
      return new Response(JSON.stringify(reportStatus === 200 ? { rows: [{ dimensionValues: [{ value: '20261114' }], metricValues: [{ value: il ? '4' : '10' }, { value: '3' }, { value: '2' }] }] } : { error: { message: 'synthetic report failure' } }), { status: reportStatus });
    },
  };
  context.exports = context.module.exports;
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  return { calls, requests, run: (body = '', authorized = true) => handler(new Request('https://edge.example.invalid/ga-sync-server', {
    method: 'POST', headers: { 'x-gsc-key': authorized ? key : 'wrong-fixture-key', 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })) };
}
const writes = f => f.calls.filter(x => x.name.startsWith('ingest_'));

test('dry_run reads both real report paths but calls neither ingestion writer', async () => {
  const f = fixture(), response = await f.run({ days: 7, dry_run: true });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(writes(f).length, 0);
  assert.equal(f.requests.length, 3, 'one token exchange, global and Israel reports');
  assert.equal(body.dry_run, true);
  assert.equal(body.source, 'GA4_MEASURED');
  assert.deepEqual(body.total_preview, [{ date: '2026-11-14', views: 10, users: 3, sessions: 2 }]);
  assert.deepEqual(body.il_preview, [{ date: '2026-11-14', views: 4, users: 3, sessions: 2 }]);
  assert.equal(body.total_rows, 1); assert.equal(body.il_rows, 1);
});

for (const [name, input] of [['omitted flag', { days: 7 }], ['explicit false', { dry_run: false }], ['empty scheduled body', '']]) {
  test(`${name} preserves the existing two canonical writes`, async () => {
    const f = fixture(), response = await f.run(input);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.total_written, 1); assert.equal(body.il_written, 1);
    assert.equal(body.total_preview, undefined);
    assert.deepEqual(writes(f).map(x => x.name), ['ingest_ga_daily', 'ingest_ga_country_daily']);
    assert.equal(writes(f)[1].args.p_country_id, 'IL');
  });
}

for (const input of [{ dry_run: 'true' }, { dry_run: 1 }, { dry_run: null }, '{', 'null', '[]', 'true']) {
  test(`invalid preview/body ${JSON.stringify(input)} cannot accidentally import`, async () => {
    const f = fixture(), response = await f.run(input);
    assert.equal(response.status, 400);
    assert.equal(f.requests.length, 0); assert.equal(writes(f).length, 0);
  });
}

test('preview uses the same authorization gate, and report errors never import', async () => {
  for (const dry_run of [true, false]) {
    const f = fixture(), denied = await f.run({ dry_run }, false);
    assert.equal(denied.status, 401); assert.equal(f.requests.length, 0); assert.equal(writes(f).length, 0);
    const failed = fixture({ reportStatus: 403 }), response = await failed.run({ dry_run });
    assert.equal(response.status, 500); assert.equal(writes(failed).length, 0);
  }
  const absent = fixture({ config: false });
  assert.equal((await absent.run({ dry_run: true })).status, 500);
  assert.equal(absent.calls.length, 0);
});
