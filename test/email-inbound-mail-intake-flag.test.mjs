// MAIL_INTAKE_ZION_20261105 — email-inbound flag behaviour, exercised through the real handler with a recording fake DB.
// Flag OFF must leave the existing inbox flow untouched; flag ON must never block or change the inbox store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadHandler, makeDb, invoke, BASE_ENV } from './helpers/emailInboundHarness.mjs';

const SRC = await readFile(new URL('../supabase/functions/email-inbound/index.ts', import.meta.url), 'utf8');
const ZION = 'zion@example.test';
const ZID = '00000000-0000-4000-8000-000000000001';
const event = { type: 'email.received', data: { email_id: 'rcv-1', from: `Z <${ZION}>`, to: ['info@example.test'], subject: 's', message_id: 'm1@mail.test' } };
const receipt = (over = {}) => ({
  id: 'rcv-1', from: `Z <${ZION}>`, to: ['info@example.test'], subject: 's', text: 'שלום 1073', html: '',
  message_id: '<m1@mail.test>', headers: {}, authentication: { dkim: 'pass', dmarc: 'pass' }, ...over,
});
const approvedDb = (over = {}) => makeDb({
  approvals: [{ mailbox_lc: ZION, author_key: 'zion-siboni', author_display: 'ציון', contributor_id: ZID, active: true }],
  contributors: [{ id: ZID }], ...over,
});
const tables = (db) => db.log.map(o => o.table || `rpc:${o.rpc}`);

test('flag OFF (unset): exact original flow — dup check, insert, nothing else, same response', async () => {
  for (const flag of [undefined, '', 'false', 'TRUE', '1', 'yes', ' false ']) {
    const db = approvedDb();
    const h = await loadHandler(SRC, { ...BASE_ENV, ...(flag === undefined ? {} : { MAIL_INTAKE_ZION_ENABLED: flag }) }, db);
    const r = await invoke(h, event, receipt());
    assert.equal(r.status, 200, `flag=${flag}`);
    assert.deepEqual(r.body, { ok: true, id: 101 }, `flag=${flag}`);
    assert.deepEqual(tables(db), ['inbound_emails', 'inbound_emails'], `flag=${flag}`);
    assert.equal(db.log[1].insert.meta.provider, 'resend');
    assert.equal(r.fetchCalls.length, 1);
    assert.match(r.fetchCalls[0], /emails\/receiving\/rcv-1$/);
  }
});

test('flag OFF: a sender that is NOT approved and an unsigned request behave exactly as before', async () => {
  const db = approvedDb();
  const h = await loadHandler(SRC, BASE_ENV, db);
  const bad = await h(new Request('https://fn.test/', { method: 'POST', body: '{}', headers: {} }));
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { ok: false, error: 'invalid_webhook' });
  assert.deepEqual(db.log, []);
});

test('flag OFF: duplicate delivery returns the original dup response with no extra calls', async () => {
  const db = approvedDb({ existingMessageIds: ['m1@mail.test'] });
  const h = await loadHandler(SRC, BASE_ENV, db);
  const r = await invoke(h, event, receipt());
  assert.deepEqual(r.body, { ok: true, dup: true, id: 1 });
  assert.deepEqual(tables(db), ['inbound_emails']);
});

test('flag ON, approved sender with native proof: inbox row stored FIRST, then held admission via the RPC', async () => {
  const db = approvedDb();
  const h = await loadHandler(SRC, { ...BASE_ENV, MAIL_INTAKE_ZION_ENABLED: 'true' }, db);
  const r = await invoke(h, event, receipt());
  assert.deepEqual(r.body, { ok: true, id: 101, intake: 'held' });
  const order = tables(db);
  assert.equal(order[1], 'inbound_emails'); // dup check, then the insert
  assert.ok(db.log[1].insert, 'inbox insert happens before any intake step');
  assert.deepEqual(order.slice(2), ['mail_source_approvals', 'contributors', 'rpc:admit_mail_source_held_v1']);
  const rpc = db.log.at(-1);
  assert.equal(rpc.args.p_inbound_email_id, 101);
  assert.equal(rpc.args.p_update.status, 'private');
  assert.equal(rpc.args.p_update.group_source_intake_public, false);
  assert.equal(rpc.args.p_update.source, 'email');
  assert.ok(!JSON.stringify(rpc.args).includes(ZION), 'sender address does not travel in the held rows');
});

test('flag ON, sender not approved: no contributor lookup, no RPC, inbox response unchanged otherwise', async () => {
  const db = approvedDb();
  const h = await loadHandler(SRC, { ...BASE_ENV, MAIL_INTAKE_ZION_ENABLED: 'true' }, db);
  const r = await invoke(h, event, receipt({ from: 'Other <other@example.test>' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.intake, 'skip:sender_not_approved');
  assert.deepEqual(tables(db), ['inbound_emails', 'inbound_emails', 'mail_source_approvals']);
});

test('flag ON, no sender proof (dkim fail): skipped, nothing admitted', async () => {
  const db = approvedDb();
  const h = await loadHandler(SRC, { ...BASE_ENV, MAIL_INTAKE_ZION_ENABLED: 'true' }, db);
  const r = await invoke(h, event, receipt({ authentication: { dkim: 'fail', dmarc: 'pass' } }));
  assert.equal(r.body.intake, 'skip:no_sender_proof');
  assert.ok(!tables(db).includes('rpc:admit_mail_source_held_v1'));
});

test('flag ON, RPC error: inbox store is NOT affected (200, same id), failure token only', async () => {
  const db = approvedDb({ rpcError: 'boom' });
  const h = await loadHandler(SRC, { ...BASE_ENV, MAIL_INTAKE_ZION_ENABLED: 'true' }, db);
  const r = await invoke(h, event, receipt());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, id: 101, intake: 'mail_intake_failed' });
});

test('flag ON, duplicate webhook delivery: returns dup before any intake step', async () => {
  const db = approvedDb({ existingMessageIds: ['m1@mail.test'] });
  const h = await loadHandler(SRC, { ...BASE_ENV, MAIL_INTAKE_ZION_ENABLED: 'true' }, db);
  const r = await invoke(h, event, receipt());
  assert.deepEqual(r.body, { ok: true, dup: true, id: 1 });
  assert.deepEqual(tables(db), ['inbound_emails']);
});
