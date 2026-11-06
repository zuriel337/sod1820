// MAIL_INTAKE_ZION_20261105 — pure tests for the held-only email intake decision layer.
// Fixtures use reserved .test addresses; no real mailbox, key or network is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planMailIntake, MAIL_INTAKE_CHANNEL } from '../supabase/functions/_shared/mailIntake.mjs';

const ZION = 'zion@example.test';
const ZID = '00000000-0000-4000-8000-000000000001';
const OTHER_ID = '00000000-0000-4000-8000-000000000002';
const approvals = [
  { email: ZION, active: true, author_key: 'zion-siboni', author_display: 'ציון דוד סיבוני', contributor_id: ZID },
  // Planned future expansion (ZURIEL 11.10 list) exists but is NOT active.
  { email: 'lior@example.test', active: false, author_key: 'lior', author_display: 'ליאור', contributor_id: OTHER_ID },
];
const ctx = { provider: 'resend', providerId: 'rcv-1' };
const proofOk = { dmarc: 'pass', dkim: 'pass' };

function mail(over = {}) {
  return {
    id: 'rcv-1',
    from: `ציון דוד סיבוני <${ZION}>`,
    to: ['info@example.test'],
    message_id: '<root-1@mail.example.test>',
    text: 'שורה ראשונה של הכותב\n\nמספר 1073 ו-1099.',
    html: '',
    headers: { date: 'Mon, 05 Oct 2026 11:03:23 +0000' },
    attachments: [],
    authentication: proofOk,
    ...over,
  };
}
const run = (email, extra = {}) => planMailIntake({
  email, providerContext: ctx, receivedAt: '2026-10-05T11:03:30Z', approvals,
  contributorMatches: [{ id: ZID }], ...extra,
});

test('approved sender with native proof is HELD, never live or public', async () => {
  const r = await run(mail());
  assert.equal(r.action, 'hold');
  assert.equal(r.update.status, 'private');
  assert.equal(r.update.group_source_intake_public, false);
  assert.equal(r.update.source, 'email');
  assert.equal(r.update.channel, MAIL_INTAKE_CHANNEL);
  assert.equal(r.update.contributor_id, ZID);
  assert.equal(r.mail_proof.identity_basis, 'verified_email_unique');
  // Existing public read policy (cu_public_read) exposes status='live' only.
  assert.notEqual(r.update.status, 'live');
});

test('privacy: no address, header, recipient or URL reaches the stored rows', async () => {
  const email = mail({
    text: 'כתובת zion@example.test ושליחה לאתר https://secret.example.test/x?t=1\nטלפון: 050-1234567\n\nסוף',
    headers: { date: 'Mon, 05 Oct 2026 11:03:23 +0000', 'x-secret': 'hdr-value' },
  });
  const r = await run(email);
  assert.equal(r.action, 'hold');
  const dump = JSON.stringify(r);
  for (const leak of [ZION, 'info@example.test', 'secret.example.test', 'hdr-value', '050-1234567']) {
    assert.ok(!dump.includes(leak), `leaked: ${leak}`);
  }
  assert.match(r.update.text, /\[דוא״ל\]/);
  assert.match(r.update.text, /\[קישור\]/);
  assert.equal(r.mail_proof.sender_mailbox_sha256.length, 64);
});

test('duplicate: same ext id or RFC message id is skipped', async () => {
  const first = await run(mail());
  const byExt = await run(mail(), { knownExtIds: new Set([first.update.ext_msg_id]) });
  assert.deepEqual([byExt.action, byExt.reason], ['skip', 'duplicate']);
  const byMsg = await run(mail(), { knownMessageIds: new Set(['root-1@mail.example.test']) });
  assert.deepEqual([byMsg.action, byMsg.reason], ['skip', 'duplicate']);
});

test('unauthorized address is skipped even with a passing provider proof', async () => {
  const r = await run(mail({ from: 'Someone <stranger@example.test>' }));
  assert.deepEqual([r.action, r.reason], ['skip', 'sender_not_approved']);
});

test('display name containing an approved address does not admit the sender', async () => {
  const r = await run(mail({ from: `"${ZION}" <stranger@example.test>` }));
  assert.deepEqual([r.action, r.reason], ['skip', 'sender_not_approved']);
});

test('inactive approval (future expansion) is not enabled', async () => {
  const r = await run(mail({ from: 'ליאור <lior@example.test>' }), { contributorMatches: [{ id: OTHER_ID }] });
  assert.deepEqual([r.action, r.reason], ['skip', 'sender_not_approved']);
});

test('double identity: two contributors or two approvals for one mailbox stay unverified', async () => {
  const twoContributors = await run(mail(), { contributorMatches: [{ id: ZID }, { id: OTHER_ID }] });
  assert.deepEqual([twoContributors.action, twoContributors.reason], ['skip', 'ambiguous_identity']);
  const wrongContributor = await run(mail(), { contributorMatches: [{ id: OTHER_ID }] });
  assert.deepEqual([wrongContributor.action, wrongContributor.reason], ['skip', 'ambiguous_identity']);
  const noContributor = await run(mail(), { contributorMatches: [] });
  assert.deepEqual([noContributor.action, noContributor.reason], ['skip', 'ambiguous_identity']);
  const twoApprovals = await planMailIntake({
    email: mail(), providerContext: ctx, contributorMatches: [{ id: ZID }],
    approvals: [approvals[0], { ...approvals[0], contributor_id: OTHER_ID }],
  });
  assert.deepEqual([twoApprovals.action, twoApprovals.reason], ['skip', 'ambiguous_identity']);
});

test('sender proof: missing, failing or non-Resend provider closes admission', async () => {
  for (const authentication of [undefined, { dmarc: 'pass', dkim: 'fail' }, { dmarc: 'fail', dkim: 'pass' }, { dmarc: 'pass' }]) {
    const r = await run(mail({ authentication }));
    assert.deepEqual([r.action, r.reason], ['skip', 'no_sender_proof']);
  }
  const gmail = await planMailIntake({
    email: mail(), providerContext: { provider: 'gmail', providerId: 'g-1' }, approvals, contributorMatches: [{ id: ZID }],
  });
  assert.deepEqual([gmail.action, gmail.reason], ['skip', 'provider_not_supported']);
  // The provider id must equal the authenticated receipt id.
  const mismatch = await planMailIntake({
    email: mail({ id: 'rcv-OTHER' }), providerContext: ctx, approvals, contributorMatches: [{ id: ZID }],
  });
  assert.deepEqual([mismatch.action, mismatch.reason], ['skip', 'no_sender_proof']);
});

test('thread: root, present parent, and explicit missing parent (never fabricated)', async () => {
  const root = await run(mail());
  assert.equal(root.mail_proof.thread_state, 'root');
  assert.equal(root.mail_proof.parent_ext_msg_id, null);

  const reply = mail({
    id: 'rcv-1', message_id: '<reply-1@mail.example.test>',
    headers: { date: 'Mon, 05 Oct 2026 12:00:00 +0000', 'in-reply-to': '<root-1@mail.example.test>', references: '<root-1@mail.example.test>' },
  });
  const missing = await run(reply);
  assert.equal(missing.mail_proof.thread_state, 'parent_missing');
  assert.equal(missing.mail_proof.parent_basis, 'in_reply_to');
  assert.ok(missing.mail_proof.parent_ext_msg_id, 'parent identity is recorded, not invented');

  const present = await run(reply, { knownParentExtIds: new Set([root.update.ext_msg_id]) });
  assert.equal(present.mail_proof.thread_state, 'parent_present');
  assert.equal(present.mail_proof.parent_ext_msg_id, root.update.ext_msg_id);
  assert.equal(present.mail_proof.thread_key, root.update.ext_msg_id);
});

test('quoted older messages are omitted and never credited to the latest sender', async () => {
  const quoted = mail({
    message_id: '<reply-2@mail.example.test>',
    headers: { date: 'Mon, 05 Oct 2026 12:00:00 +0000', 'in-reply-to': '<root-1@mail.example.test>' },
    text: 'התשובה החדשה של ציון\n\nבתאריך יום ב׳, 5 באוק׳ 2026, 14:46, מאת lior shitrit <lior@example.test>:\n> טקסט ישן של ליאור שלא שייך לשולח האחרון\n> עוד שורה ישנה',
  });
  const r = await run(quoted);
  assert.equal(r.action, 'hold');
  assert.equal(r.mail_proof.quoted_omitted, true);
  assert.match(r.update.text, /התשובה החדשה של ציון/);
  assert.ok(!r.update.text.includes('טקסט ישן של ליאור'));
  assert.equal(r.update.credit, 'ציון דוד סיבוני');
});

test('HTML-only or empty mail is not turned into source text', async () => {
  const r = await run(mail({ text: '', html: '<p>only html</p>' }));
  assert.deepEqual([r.action, r.reason], ['skip', 'no_text']);
});

test('no AI/analysis field is produced and original-text hash is of the untouched source', async () => {
  const r = await run(mail());
  assert.ok(!('analysis' in r.update) && !('ai' in r.update));
  assert.equal(r.mail_proof.text_kind, 'original_cleaned');
  assert.equal(r.mail_proof.original_text_sha256.length, 64);
});

test('public filtering is untouched: the draft SQL only adds a new table and never edits public readers', async () => {
  const sql = await readFile(new URL('../scripts/sql/mail-intake-zion-v1/001-channel-update-mail-proof.draft.sql', import.meta.url), 'utf8');
  assert.match(sql, /DRAFT — NOT APPLIED/);
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  assert.match(code, /create table if not exists public\.channel_update_mail_proof/i);
  assert.doesNotMatch(code, /cu_public_read/i);
  assert.doesNotMatch(code, /world_group_source_arrivals/i);
  assert.doesNotMatch(code, /alter table\s+public\.channel_updates/i);
  assert.doesNotMatch(code, /channel_update_group_proof/i);
  assert.doesNotMatch(code, /record_channel_update_group_proof_v1/i);
  assert.match(code, /enable row level security/i);
  assert.match(code, /revoke all on public\.channel_update_mail_proof from public, anon, authenticated/i);
  // Held shape is enforced in the guard trigger and in the RPC: status must be 'private', never 'live'.
  assert.match(code, /status\s*<>\s*'private'/i);
  assert.match(code, /'status'\)\s+is distinct from\s+'private'/i);
  assert.doesNotMatch(code, /status\s*=\s*'live'/i);
});

test('edge wiring is flag-gated off by default and cannot block the private inbox store', async () => {
  const src = await readFile(new URL('../supabase/functions/email-inbound/index.ts', import.meta.url), 'utf8');
  assert.match(src, /MAIL_INTAKE_ZION_ENABLED/);
  assert.match(src, /=== "true"/);
  assert.match(src, /mail_intake_failed/);
});
