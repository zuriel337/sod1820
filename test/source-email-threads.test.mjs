import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSourceText, messageId, exactMailbox, normalizeReceivedEmail, resolveApprovedSender } from '../supabase/functions/_shared/sourceEmail.mjs';
import { projectSourceEmailThreads, fetchSourceEmailThreads } from '../src/lib/research/sourceEmailThreads.js';
import { sourceEmailRows } from './fixtures/sourceEmailThreads.fixture.mjs';

const source = (changes = {}) => ({ from: 'Demo <source@example.invalid>', message_id: '<first@example.invalid>',
  text: 'כותרת\n' + 'מקור מלא '.repeat(400), headers: {}, attachments: [], ...changes });
const normalize = input => normalizeReceivedEmail(input, { providerId: 'provider-1', receivedAt: '2026-10-11T12:00:00Z' });

test('source text beyond old 900-character limit survives; mail identity survives provider replays', async () => {
  const a = await normalize(source());
  const b = await normalizeReceivedEmail(source(), { providerId: 'another-provider-id', receivedAt: '2026-10-12T00:00:00Z' });
  assert.ok(a.full_text.length > 3000);
  assert.equal(a.id, b.id);
  assert.equal(a.source_state, 'unverified');
  assert.equal(a.source_published_at, null);
});
test('punctuation-sensitive message ids do not collide; no subject-based merging', async () => {
  assert.notEqual((await normalize(source({ message_id: '<a-b@example.invalid>' }))).id,
    (await normalize(source({ message_id: '<ab@example.invalid>' }))).id);
  assert.equal(messageId('<a-b@example.invalid>'), 'a-b@example.invalid');
  assert.equal(messageId('a b'), null);
});
test('thread links and source date come only from source headers', async () => {
  const root = await normalize(source());
  const reply = await normalize(source({ message_id: '<second@example.invalid>', headers: {
    'In-Reply-To': '<first@example.invalid>', References: '<first@example.invalid>', Date: 'Sun, 11 Oct 2026 12:00:00 +0300' } }));
  assert.equal(reply.parent_id, root.id);
  assert.deepEqual(reply.reference_ids, [root.id]);
  assert.equal(reply.source_published_at, '2026-10-11T09:00:00.000Z');
});
test('quotes, headers, contacts and signatures never become latest author text', () => {
  const cleaned = cleanSourceText('תגובה\nCc: private@example.invalid\nכתבו source@example.invalid\n-- \nחתימה\nOn yesterday somebody wrote:\nטקסט ישן');
  assert.equal(cleaned.text, 'תגובה\nכתבו [דוא״ל]');
  assert.equal(cleaned.quoted_omitted, true);
  assert.equal(cleanSourceText('תגובה\n> ציטוט').text, 'תגובה');
});
test('HTML-only content is explicit unavailable; scripts and HTML never become full_text', async () => {
  const row = await normalize(source({ text: '', html: '<script>bad()</script><p>private</p>' }));
  assert.equal(row.full_text, '');
  assert.equal(row.text_state, 'html_only_unavailable');
});
test('oversized content fails explicitly instead of silently truncating', async () => {
  await assert.rejects(() => normalize(source({ text: 'x'.repeat(2_000_001) })), /source_too_large/);
});
test('attachments keep durable provider references, never arbitrary URLs or SVG', async () => {
  const row = await normalize(source({ attachments: [
    { id: 'one', content_type: 'image/png', download_url: 'https://private.invalid/token' },
    { id: 'two', content_type: 'image/svg+xml' },
    { content_type: 'image/jpeg' },
  ] }));
  assert.equal(row.images.length, 1);
  assert.equal(row.images[0].provider_id, 'one');
  assert.equal(JSON.stringify(row).includes('private.invalid'), false);
  assert.equal(row.images[0].is_quoted_reference, null, 'unknown is not independent evidence');
});
test('sender admission requires exactly one server-owned approval plus provider DMARC', () => {
  const approvals = [{ email: 'source@example.invalid', active: true, author_key: 'demo', author_display: 'דוגמה' }];
  const input = source({ authentication: { dmarc: 'pass' } });
  assert.equal(resolveApprovedSender(input, approvals)?.author_key, 'demo');
  assert.equal(resolveApprovedSender(source(), approvals), null);
  assert.equal(resolveApprovedSender({ ...input, from: 'other@example.invalid' }, approvals), null);
  assert.equal(resolveApprovedSender(input, [...approvals, ...approvals]), null);
  assert.equal(exactMailbox('a@example.invalid, b@example.invalid'), null);
});
test('one thread per root, real reply author preserved, source truth stays unverified', () => {
  const items = projectSourceEmailThreads(sourceEmailRows);
  assert.equal(items.length, 2);
  const thread = items.find(i => i.id === 'email-thread:demo-root');
  assert.equal(thread.thread.message_count, 2);
  assert.equal(thread.thread.participant_count, 2);
  assert.equal(thread.thread.messages[1].author_key, 'demo-author-b');
  assert.equal(thread.source_state, 'unverified');
  assert.equal(thread.images[0].full_url, null);
  assert.equal(thread.images[0].state, 'unavailable');
});
test('missing parents remain explicit; held or unadmitted parents never leak', () => {
  const items = projectSourceEmailThreads(sourceEmailRows.map(r => r.id === 'demo-root' ? { ...r, held: true } : r));
  assert.equal(JSON.stringify(items).includes('כאן יופיע הטקסט המלא'), false);
  assert.ok(items.every(i => i.thread.missing_parent));
  assert.ok(items.every(i => i.full_text === ''));
});
test('replay duplicates counted, cycles excluded, arrival ties stable', () => {
  const rows = [...sourceEmailRows, sourceEmailRows[0]];
  assert.equal(projectSourceEmailThreads(rows).find(i => i.id === 'email-thread:demo-root').hidden_duplicate_count, 1);
  assert.deepEqual(projectSourceEmailThreads(sourceEmailRows), projectSourceEmailThreads([...sourceEmailRows].reverse()));
  assert.deepEqual(projectSourceEmailThreads([{ ...sourceEmailRows[0], parent_id: 'demo-root' }]), []);
});
test('unconnected reader is unavailable, connected empty is empty; cursor preserved', async () => {
  assert.equal((await fetchSourceEmailThreads()).state, 'unavailable');
  assert.equal((await fetchSourceEmailThreads({ load: async () => ({ state: 'available', rows: [] }) })).state, 'empty');
  const result = await fetchSourceEmailThreads({ load: async () => ({ state: 'available', rows: sourceEmailRows, cursor: 'next' }) });
  assert.equal(result.cursor, 'next');
  assert.equal(result.items.length, 2);
});
