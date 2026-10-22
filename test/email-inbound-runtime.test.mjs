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
let handler, writes, existing, providerStatus, providerMessage;
globalThis.Deno = { env: { get: key => env[key] }, serve: callback => { handler = callback; } };
globalThis.__emailTestDb = { from: table => {
  assert.equal(table, 'inbound_emails', 'handler must never publish or create another store');
  let payload, operation;
  const query = {
    select() { return this; }, eq() { return this; },
    insert(value) { payload = value; operation = 'insert'; return this; },
    update(value) { payload = value; operation = 'update'; return this; },
    async maybeSingle() {
      if (!payload) return { data: existing, error: null };
      writes.push({ operation, payload }); return { data: { id: 7 }, error: null };
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
  writes = []; existing = null; providerStatus = 200;
  providerMessage = { from: 'Demo <source@example.invalid>', to: ['inbox@example.invalid'],
    subject: 'Test', text: 'טקסט מלא '.repeat(4000), html: '', message_id: '<root@example.invalid>',
    headers: { 'in-reply-to': '<parent@example.invalid>' },
    attachments: [{ id: 'image-1', content_type: 'image/png' }] };
  globalThis.fetch = async url => {
    assert.equal(new URL(url).searchParams.get('html_format'), 'cid');
    return new Response(JSON.stringify(providerMessage), { status: providerStatus });
  };
});
function request(valid = true) {
  const body = JSON.stringify({ type: 'email.received', data: { email_id: 'provider-1' } });
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
  existing = { id: 7, meta: { source_email_v1: { id: 'existing' } } };
  assert.equal((await handler(request())).status, 200);
  assert.equal(writes.length, 0);
});
test('legacy metadata row gets hydration without resetting read/reply status', async () => {
  existing = { id: 7, meta: { preserved: true } };
  assert.equal((await handler(request())).status, 200);
  assert.equal(writes[0].operation, 'update');
  assert.equal(writes[0].payload.meta.preserved, true);
  assert.equal('read' in writes[0].payload, false);
  assert.equal('reply_count' in writes[0].payload, false);
});
