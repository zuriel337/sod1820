// Real Edge handler, bundled for Node with only Supabase/network/Deno boundaries mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
const secretBytes = Buffer.from('synthetic-test-secret-only');
const env = { RESEND_API_KEY: 'test-only', RESEND_WEBHOOK_SECRET: `whsec_${secretBytes.toString('base64')}`,
  SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' };
let handler, writes, existing, providerStatus, providerMessage, records, approvals, publishError, publishCalls, writeError;
globalThis.Deno = { env: { get: key => env[key] }, serve: callback => { handler = callback; } };
globalThis.__emailTestDb = { rpc: async (name, args) => {
  assert.equal(name, 'admit_email_source_v1'); publishCalls.push(args);
  return { data: { state: 'public' }, error: publishError };
}, from: table => {
  assert.ok(['inbound_emails', 'contributors'].includes(table), 'only existing canonical carriers');
  let payload, operation, lookup;
  const query = {
    select() { return this; }, eq(key, value) { if (key === 'message_id') lookup=value; return this; }, is() { return this; },
    then(resolve) { return Promise.resolve({ data: approvals, error: null }).then(resolve); },
    insert(value) { payload = value; operation = 'insert'; return this; },
    update(value) { payload = value; operation = 'update'; return this; },
    async maybeSingle() {
      if (!payload) return { data: records.get(lookup) || existing, error: null };
      writes.push({ operation, payload }); return { data: { id: 7 }, error: writeError };
    },
  };
  return query;
} };
const source = (await readFile('supabase/functions/email-inbound/index.ts', 'utf8'))
  .replace('import { createClient } from "jsr:@supabase/supabase-js@2";', 'const createClient = () => globalThis.__emailTestDb;')
  .replace('"../_shared/sourceEmail.mjs"', JSON.stringify(pathToFileURL(resolve('supabase/functions/_shared/sourceEmail.mjs')).href));
await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const originalFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = originalFetch; delete globalThis.Deno; delete globalThis.__emailTestDb; });
test.beforeEach(() => {
  writes = []; existing = null; records = new Map(); approvals = []; publishCalls = []; publishError = null; writeError = null; providerStatus = 200;
  providerMessage = { from: 'Demo <source@example.invalid>', to: ['inbox@example.invalid'],
    subject: 'Test', text: 'טקסט מלא '.repeat(4000), html: '', message_id: '<root@example.invalid>',
    created_at: '2026-10-13T06:40:38.713Z', headers: { 'in-reply-to': '<parent@example.invalid>' },
    attachments: [{ id: 'image-1', content_type: 'image/png' }] };
  globalThis.fetch = async url => {
    assert.equal(new URL(url).searchParams.get('html_format'), 'cid');
    return new Response(JSON.stringify(providerMessage), { status: providerStatus });
  };
});
function request(valid = true, providerId = 'provider-1') {
  const body = JSON.stringify({ type: 'email.received', created_at: '2026-10-13T06:41:00Z', data: { email_id: providerId } });
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secretBytes).update(`evt-test.${ts}.${body}`).digest('base64');
  return new Request('https://test.invalid', { method: 'POST', body, headers: {
    'svix-id': 'evt-test', 'svix-timestamp': ts, 'svix-signature': valid ? `v1,${signature}` : 'v1,invalid',
  } });
}
test('invalid webhook signature cannot fetch or write', async () => {
  globalThis.fetch = async () => { throw new Error('must not fetch'); };
  assert.equal((await handler(request(false))).status, 400);
  assert.equal(writes.length, 0);
});
test('provider failure remains retryable; no metadata-only success', async () => {
  providerStatus = 503;
  assert.equal((await handler(request())).status, 502);
  assert.equal(writes.length, 0);
});
test('real handler preserves >20k raw text and attachment/thread references privately', async () => {
  assert.equal((await handler(request())).status, 200);
  const payload = writes[0].payload;
  assert.equal(payload.body_text, providerMessage.text.trim());
  assert.ok(payload.body_text.length > 20000);
  assert.equal(payload.in_reply_to, 'parent@example.invalid');
  assert.equal(payload.meta.source_email_v1.images.length, 1);
  assert.equal(payload.meta.source_email_v1.publication_state, 'private');
  assert.equal(payload.meta.source_email_v1.admission, 'unresolved');
});
test('completed replay never overwrites a stored source', async () => {
  existing = { id: 7, from_email: 'source@example.invalid', meta: { provider_id: 'provider-1', source_email_v1: { id: 'existing' } } };
  assert.equal((await handler(request())).status, 200);
  assert.equal(writes.length, 0);
});
test('legacy metadata row gets hydration without resetting read/reply status', async () => {
  existing = { id: 7, from_email: 'source@example.invalid', meta: { provider_id: 'provider-1', preserved: true } };
  assert.equal((await handler(request())).status, 200);
  assert.equal(writes[0].operation, 'update');
  assert.equal(writes[0].payload.meta.preserved, true);
  assert.equal('read' in writes[0].payload, false);
  assert.equal('reply_count' in writes[0].payload, false);
});

function approvedSource() {
  approvals = [{ id: 'canonical-demo', slug: 'demo', display_name: 'דוגמה', email: 'source@example.invalid', page_config: { email_source_public: true } }];
  providerMessage.authentication = { dmarc: 'pass', verified_from: 'source@example.invalid', provider_authenticated: true };
}
test('same RFC message id from another sender cannot overwrite or hide the real mail', async () => {
  records.set('root@example.invalid', { id: 1, from_email: 'forger@example.invalid', meta: { provider_id: 'forger-1' } });
  assert.equal((await handler(request())).status, 200);
  assert.equal(writes[0].operation, 'insert');
  assert.match(writes[0].payload.message_id, /^provider_/);
});
test('unproven legacy rows are preserved and do not receive hydration', async () => {
  records.set('root@example.invalid', { id: 1, from_email: 'source@example.invalid', meta: { provider: 'resend' } });
  await handler(request());
  assert.equal(writes[0].operation, 'insert');
});
test('explicit canonical approval without provider proof remains private', async () => {
  approvedSource(); delete providerMessage.authentication;
  await handler(request());
  assert.equal(publishCalls.length, 0);
  assert.equal(writes[0].payload.meta.source_email_v1.author, null);
});
test('authenticated approved source invokes bounded publication after private persistence', async () => {
  approvedSource();
  const result = await (await handler(request())).json();
  assert.equal(result.publication, 'public');
  assert.deepEqual(publishCalls, [{ p_inbound_id: 7 }]);
  assert.equal(writes[0].payload.received_at, '2026-10-13T06:40:38.713Z');
});
test('known technical test provider ids never publish, even with positive mock proof', async () => {
  approvedSource();
  await handler(request(true, '3aff2258-5acb-4c07-99d3-055c19416c0e'));
  assert.equal(publishCalls.length, 0);
  assert.equal(writes[0].payload.meta.source_email_v1.technical_test, true);
});
test('failed publication preserves private delivery and can retry on provider replay', async () => {
  approvedSource(); publishError = { message: 'RPC not installed' };
  const first = await (await handler(request())).json();
  assert.equal(first.publication, 'reader_not_ready');
  existing = { id: 7, from_email: 'source@example.invalid', meta: writes[0].payload.meta };
  publishError = null;
  const replay = await (await handler(request())).json();
  assert.equal(replay.publication, 'public');
  assert.equal(replay.dup, true);
  assert.equal(writes.length, 1);
});
test('oversized input stores a private metadata-only locator, never a shortened source', async () => {
  providerMessage.text = 'x'.repeat(2_000_001);
  await handler(request());
  assert.equal(writes[0].payload.body_text, null);
  assert.equal(writes[0].payload.meta.source_email_v1.text_state, 'source_too_large');
});
test('dedup conflict is not acknowledged as a successful replay', async () => {
  writeError = { code: '23505' };
  assert.equal((await handler(request())).status, 409);
});
