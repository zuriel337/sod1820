// Test harness: runs the real email-inbound Edge handler (any source text) against a recording fake DB and fake fetch.
// Used by test/email-inbound-mail-intake-flag.test.mjs. No network, no real keys.
import { stripTypeScriptTypes } from 'node:module';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';

const SHARED_URL = new URL('../../supabase/functions/_shared/', import.meta.url).href;
let seq = 0;

export function makeDb({ existingMessageIds = [], approvals = [], contributors = [], rpcResult = { ok: true, held: true }, rpcError = null } = {}) {
  const log = [];
  const resolve = (op) => {
    if (op.table === 'inbound_emails') {
      if (op.insert) return { data: { id: 101 }, error: null };
      const key = op.calls.find(c => c[0] === 'eq' && c[1] === 'message_id')?.[2];
      return { data: existingMessageIds.includes(key) ? { id: 1 } : null, error: null };
    }
    if (op.table === 'mail_source_approvals') {
      const mb = op.calls.find(c => c[0] === 'eq' && c[1] === 'mailbox_lc')?.[2];
      return { data: approvals.filter(a => a.mailbox_lc === mb && a.active), error: null };
    }
    if (op.table === 'contributors') return { data: contributors, error: null };
    return { data: null, error: { message: 'unexpected_table' } };
  };
  const from = (table) => {
    const op = { table, calls: [] };
    const b = {
      select: (...a) => { op.calls.push(['select', ...a]); return b; },
      eq: (...a) => { op.calls.push(['eq', ...a]); return b; },
      ilike: (...a) => { op.calls.push(['ilike', ...a]); return b; },
      insert: (v) => { op.calls.push(['insert', v]); op.insert = v; return b; },
      maybeSingle: () => { log.push(op); return Promise.resolve(resolve(op)); },
      then: (res, rej) => { log.push(op); return Promise.resolve(resolve(op)).then(res, rej); },
    };
    return b;
  };
  const rpc = (name, args) => {
    log.push({ rpc: name, args });
    return Promise.resolve(rpcError ? { data: null, error: { message: rpcError } } : { data: rpcResult, error: null });
  };
  return { from, rpc, log };
}

export async function loadHandler(sourceText, env, db) {
  const js = stripTypeScriptTypes(sourceText)
    .replace('import { createClient } from "jsr:@supabase/supabase-js@2";', 'const createClient = () => globalThis.__emailTestDb;')
    .replaceAll('import("../_shared/', `import("${SHARED_URL}`);
  if (/jsr:|from "\.\.\/_shared/.test(js)) throw new Error('harness: unexpected static import left in source');
  const dir = await mkdtemp(join(tmpdir(), 'email-inbound-'));
  const file = join(dir, `handler-${++seq}.mjs`);
  await writeFile(file, js);
  let handler = null;
  globalThis.__emailTestDb = db;
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; } };
  await import(`${pathToFileURL(file).href}?v=${seq}`);
  if (!handler) throw new Error('harness: handler not registered');
  return handler;
}

const SECRET_B64 = Buffer.from('k'.repeat(32)).toString('base64');
export const BASE_ENV = {
  RESEND_API_KEY: 'test-key', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'svc-test',
  RESEND_WEBHOOK_SECRET: `whsec_${SECRET_B64}`,
};

export function signedRequest(event) {
  const body = JSON.stringify(event);
  const id = 'msg_test', ts = String(Math.floor(Date.now() / 1000));
  const mac = createHmac('sha256', Buffer.from(SECRET_B64, 'base64')).update(`${id}.${ts}.${body}`).digest('base64');
  return new Request('https://fn.test/', {
    method: 'POST', body,
    headers: { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${mac}` },
  });
}

export async function invoke(handler, event, receipt) {
  const fetchCalls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    if (String(url).includes('/emails/receiving/')) return new Response(JSON.stringify(receipt), { status: 200 });
    return new Response('{}', { status: 404 });
  };
  try {
    const res = await handler(signedRequest(event));
    return { status: res.status, body: await res.json(), fetchCalls };
  } finally { globalThis.fetch = realFetch; }
}
