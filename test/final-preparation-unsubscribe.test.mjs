import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHmac, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = fileURLToPath(new URL('../', import.meta.url));
const proposal = resolve(repo, 'docs/reviews/public-url-exceptions-20261103/residual205/evidence/final-preparation/mail/unsubscribe');
const { build } = createRequire(resolve(repo, 'package.json'))('esbuild');
const endpoint = 'https://mail.invalid/functions/v1/newsletter-unsubscribe';
const secret = 'isolated-fixture-hmac-only';
const serviceKey = 'isolated-fixture-service-only';
const now = '2026-11-03T12:00:00.000Z';
const baseRow = { email: 'owner@example.invalid', active: true, unsubscribed_at: null,
  email_purposes: ['site-updates'], site_updates_consented_at: '2026-11-01T00:00:00Z', source: 'fixture-only', name: 'preserve' };
const clone = value => JSON.parse(JSON.stringify(value));
const bundles = new Map();
const receipts = [];
test.after(() => { for (const receipt of receipts) assert.equal(receipt.blockedNetworkCalls, 0); });
async function compiled(path) {
  if (!bundles.has(path)) {
    const { outputFiles } = await build({ entryPoints: [path], bundle: true, write: false, format: 'iife', platform: 'neutral', plugins: [{ name: 'offline-supabase', setup(b) {
      b.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({ path: 'client', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const createClient = globalThis.offlineClient;' }));
    } }] });
    bundles.set(path, outputFiles[0].text);
  }
  return bundles.get(path);
}
async function fixture({ row = baseRow, mode = '', env = {}, source = process.env.UNSUBSCRIBE_SOURCE || resolve(proposal, 'index.proposed.ts') } = {}) {
  let state = row ? clone(row) : null, handler;
  const receipt = { requests: [], persistedWrites: 0, clientCalls: 0, blockedNetworkCalls: 0 };
  receipts.push(receipt);
  const client = { from(table) {
    assert.equal(table, 'subscribers');
    const request = { table, operation: 'read', eq: [], body: null, fields: null, single: false };
    const chain = {
      update(body) { request.operation = 'update'; request.body = clone(body); return this; },
      eq(column, value) { request.eq.push([column, value]); return this; },
      select(fields) { request.fields = fields; return this; },
      maybeSingle() { request.single = true; return this; },
      async then(yes, no) {
        try {
          receipt.requests.push(clone(request));
          if (request.operation === 'update') {
            if (mode === 'sdk-error') return yes({ data: null, error: { message: 'synthetic private diagnostic' } });
            if (mode === 'exception') throw new Error('synthetic private diagnostic');
            assert.deepEqual(Object.keys(request.body).sort(), ['active', 'unsubscribed_at']);
            assert.equal(request.body.active, false);
            assert.equal(request.fields, 'email,active,unsubscribed_at');
            assert.deepEqual(request.eq, [['email', row?.email || baseRow.email], ['active', true]]);
            if (mode === 'malformed-ack') return yes({ data: null, error: null });
            if (mode === 'wrong-ack') return yes({ data: [{ email: baseRow.email, active: true, unsubscribed_at: now }], error: null });
            if (mode === 'wrong-time-ack') return yes({ data: [{ email: baseRow.email, active: false, unsubscribed_at: '1999-01-01T00:00:00Z' }], error: null });
            if (mode === 'multiple-ack') return yes({ data: [baseRow, baseRow], error: null });
            const matches = state && request.eq.every(([column, value]) => state[column] === value);
            if (matches && mode !== 'zero-update-active') {
              state = { ...state, ...request.body }; receipt.persistedWrites++;
              return yes({ data: [{ email: state.email, active: state.active, unsubscribed_at: state.unsubscribed_at }], error: null });
            }
            return yes({ data: [], error: null });
          }
          assert.equal(request.fields, 'email,active,unsubscribed_at');
          assert.deepEqual(request.eq, [['email', row?.email || baseRow.email]]);
          assert.equal(request.single, true);
          if (mode === 'read-error') return yes({ data: null, error: { message: 'synthetic private diagnostic' } });
          if (mode === 'read-exception') throw new Error('synthetic private diagnostic');
          return yes({ data: state && { email: state.email, active: state.active, unsubscribed_at: state.unsubscribed_at }, error: null });
        } catch (error) { return no(error); }
      },
    };
    return chain;
  } };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return Date.parse(now); } }
  const ctx = { Deno: { env: { get: k => ({ SUPABASE_URL: 'https://mail.invalid', SUPABASE_SERVICE_ROLE_KEY: serviceKey, NEWSLETTER_SECRET: secret, ...env }[k]) }, serve: fn => { handler = fn; } },
    offlineClient: (url, key) => { receipt.clientCalls++; assert.equal(url, 'https://mail.invalid'); assert.equal(key, serviceKey); return client; },
    fetch: () => { receipt.blockedNetworkCalls++; throw Error('NETWORK_FORBIDDEN'); },
    Response, Request, URL, crypto: webcrypto, TextEncoder, btoa, atob, Date: FixedDate };
  vm.runInNewContext(await compiled(source), ctx);
  assert.equal(typeof handler, 'function');
  return { handler, receipt, row: () => clone(state) };
}
function request({ email = baseRow.email, method = 'GET', json = true, signature, key = secret, append = '' } = {}) {
  const e = Buffer.from(email, 'binary').toString('base64url');
  const t = signature ?? createHmac('sha256', key).update(email.trim().toLowerCase()).digest('base64url');
  return new Request(`${endpoint}?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}${json ? '&format=json' : ''}${append}`,
    { method, ...(method === 'POST' ? { body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } } : {}) });
}
async function result(f, req = request()) { const response = await f.handler(req); return { response, data: await response.json() }; }

test('v9 baseline reproduces false success for an SDK failure; synthetic only', async () => {
  const f = await fixture({ mode: 'sdk-error', source: resolve(proposal, 'index.v9.rollback.ts') });
  const r = await result(f); assert.equal(r.response.status, 200); assert.equal(r.data.ok, true);
  assert.equal(f.receipt.persistedWrites, 0); assert.equal(f.receipt.blockedNetworkCalls, 0);
});
test('signed GET acknowledges only one confirmed suppression, preserving consent/source fields', async () => {
  const f = await fixture(), r = await result(f);
  assert.equal(r.response.status, 200); assert.deepEqual(r.data, { ok: true, email: baseRow.email });
  assert.equal(f.receipt.persistedWrites, 1); assert.equal(f.receipt.requests.length, 1);
  assert.deepEqual(f.row(), { ...baseRow, active: false, unsubscribed_at: now });
  assert.equal(r.response.headers.get('cache-control'), 'no-store'); assert.equal(r.response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(f.receipt.blockedNetworkCalls, 0);
});
test('signed one-click POST keeps existing machine contract and HTML acknowledgement', async () => {
  const f = await fixture(), response = await f.handler(request({ method: 'POST', json: false }));
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /הוסרת מרשימת התפוצה/); assert.equal(f.receipt.persistedWrites, 1);
});
test('sequential replay and concurrent duplicate requests never rewrite suppression timestamp', async () => {
  const f = await fixture();
  for (const r of await Promise.all([result(f), result(f)])) assert.equal(r.data.ok, true);
  const before = f.row(); assert.equal((await result(f)).data.ok, true);
  assert.deepEqual(f.row(), before); assert.equal(f.receipt.persistedWrites, 1);
});
test('already-inactive recipients remain unchanged, including historical null timestamp', async () => {
  for (const date of ['2026-09-01T03:04:05Z', null]) {
    const row = { ...baseRow, active: false, unsubscribed_at: date }, f = await fixture({ row });
    assert.equal((await result(f)).data.ok, true); assert.equal(f.receipt.persistedWrites, 0); assert.deepEqual(f.row(), row);
  }
});
test('SDK update errors and exceptions cannot report success or expose their diagnostic', async () => {
  for (const mode of ['sdk-error', 'exception']) {
    const f = await fixture({ mode }), r = await result(f);
    assert.equal(r.response.status, 503); assert.equal(r.data.ok, false); assert.equal(r.data.email, '');
    assert.doesNotMatch(JSON.stringify(r.data), /private diagnostic/); assert.equal(f.receipt.persistedWrites, 0);
  }
});
test('zero matches plus missing subscriber is not successful opt-out', async () => {
  const f = await fixture({ row: null }), r = await result(f);
  assert.equal(r.response.status, 400); assert.equal(r.data.ok, false); assert.equal(f.receipt.requests.length, 2); assert.equal(f.receipt.persistedWrites, 0);
});
test('zero-update acknowledgement while row remains active fails closed', async () => {
  const f = await fixture({ mode: 'zero-update-active' }), r = await result(f);
  assert.equal(r.response.status, 503); assert.equal(r.data.ok, false); assert.equal(f.row().active, true);
});
test('malformed/wrong/multiple acknowledgement rows cannot report success', async () => {
  for (const mode of ['malformed-ack', 'wrong-ack', 'wrong-time-ack', 'multiple-ack']) {
    const f = await fixture({ mode }), r = await result(f); assert.equal(r.response.status, 503); assert.equal(r.data.ok, false);
  }
});
test('idempotency lookup error or exception is not an empty/success result', async () => {
  for (const mode of ['read-error', 'read-exception']) {
    const f = await fixture({ row: { ...baseRow, active: false }, mode }), r = await result(f);
    assert.equal(r.response.status, 503); assert.equal(r.data.ok, false); assert.equal(f.receipt.persistedWrites, 0);
  }
});
test('missing URL/service/HMAC config fails closed before DB client creation', async () => {
  for (const env of [{ SUPABASE_URL: '' }, { SUPABASE_SERVICE_ROLE_KEY: '' }, { NEWSLETTER_SECRET: '' }]) {
    const f = await fixture({ env }), r = await result(f); assert.equal(r.response.status, 503); assert.equal(r.data.ok, false); assert.equal(f.receipt.clientCalls, 0);
  }
});
test('existing fallback HMAC key remains compatible when separate secret is absent', async () => {
  const f = await fixture({ env: { NEWSLETTER_SECRET: undefined } }), r = await result(f, request({ key: serviceKey }));
  assert.equal(r.data.ok, true); assert.equal(f.receipt.persistedWrites, 1);
});
test('invalid signature/email/encoding and duplicate identity parameters never touch DB', async () => {
  const bad = [request({ signature: 'x'.repeat(43) }), request({ signature: 'short' }), request({ email: 'bad-address' }),
    request({ append: '&e=duplicate' }), request({ append: '&t=duplicate' }), new Request(endpoint + '?e=%25%25%25&t=abc&format=json'), new Request(endpoint + '?format=json')];
  for (const req of bad) {
    const f = await fixture(), r = await result(f, req); assert.equal(r.response.status, 400); assert.equal(r.data.ok, false); assert.equal(f.receipt.clientCalls, 0);
  }
});
test('GET/POST only; unsupported methods fail before mutation and OPTIONS remains inert', async () => {
  for (const method of ['PUT', 'PATCH', 'DELETE', 'HEAD']) {
    const f = await fixture(), r = await result(f, request({ method })); assert.equal(r.response.status, 405); assert.equal(r.data.ok, false); assert.equal(f.receipt.clientCalls, 0);
  }
  const f = await fixture({ env: { SUPABASE_SERVICE_ROLE_KEY: '' } });
  assert.equal((await f.handler(new Request(endpoint, { method: 'OPTIONS' }))).status, 200); assert.equal(f.receipt.clientCalls, 0);
});
test('HTML reports error status honestly and escapes signed email text', async () => {
  const email = '<b>x</b>&\'"@example.invalid', f = await fixture({ row: { ...baseRow, email } });
  const response = await f.handler(request({ email, json: false })), html = await response.text();
  assert.equal(response.status, 200); assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;&amp;&#39;&quot;@example.invalid')); assert.ok(!html.includes(email));
  const failed = await fixture({ mode: 'sdk-error' }), bad = await failed.handler(request({ json: false }));
  assert.equal(bad.status, 503); assert.doesNotMatch(await bad.text(), /הוסרת מרשימת התפוצה|private diagnostic/);
  const invalid = await fixture(), badLink = await invalid.handler(request({ json: false, signature: 'x'.repeat(43) }));
  assert.equal(badLink.status, 400);
});
test('proposal retains single existing handler, no mail/model calls or schema changes', async () => {
  const source = await readFile(resolve(proposal, 'index.proposed.ts'), 'utf8');
  assert.equal((source.match(/Deno\.serve\(/g) || []).length, 1);
  assert.doesNotMatch(source, /send-newsletter|resend\.com|ai-analyze|create table|alter table|\.insert\(|\.upsert\(/i);
});
