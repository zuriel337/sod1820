import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSourceText, messageId, replyMessageId, exactMailbox, normalizeReceivedEmail, resolveApprovedSender } from '../supabase/functions/_shared/sourceEmail.mjs';
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
test('oversized content keeps a private provider locator and explicit unavailable state', async () => {
  const row = await normalize(source({ text: 'x'.repeat(2_000_001) }));
  assert.equal(row.text_state, 'source_too_large');
  assert.equal(row.full_text, '');
  assert.equal(row.provider_id, 'provider-1');
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
  const approvals = [{ email: 'source@example.invalid', active: true, author_key: 'demo', author_display: 'דוגמה', contributor_id: 'canonical-demo' }];
  const input = source({ authentication: { dmarc: 'pass', verified_from: 'source@example.invalid', provider_authenticated: true } });
  assert.equal(resolveApprovedSender(input, approvals)?.author_key, 'demo');
  assert.equal(resolveApprovedSender(source(), approvals), null);
  assert.equal(resolveApprovedSender({ ...input, from: 'other@example.invalid' }, approvals), null);
  assert.equal(resolveApprovedSender(input, [...approvals, ...approvals]), null);
  assert.equal(exactMailbox('a@example.invalid, b@example.invalid'), null);
});

test('Outlook and wrapped Gmail quotes are cut at the boundary, without prior-body leakage', () => {
  for (const quote of ['From: Private <p@example.invalid>\nSent: Monday\nTo: Other\nprivate prior body',
    'On Monday Private <p@example.invalid>\nwrote:\nprivate prior body']) {
    const clean = cleanSourceText(`תגובה חדשה\n${quote}`);
    assert.equal(clean.text, 'תגובה חדשה');
    assert.equal(clean.quoted_omitted, true);
  }
});
test('dates and research values survive; contact numbers redact only with explicit context', () => {
  const text = '13.10.2026\n1820 444 12582\nטלפון: 050-1234567';
  assert.equal(cleanSourceText(text).text, '13.10.2026\n1820 444 12582\nטלפון: [מספר]');
});
test('quote-only messages are explicitly cleaned_empty', async () => {
  assert.equal((await normalize(source({ text: '> private old text' }))).text_state, 'cleaned_empty');
});
test('headers, misaligned proof, revoked and unresolved contributors cannot admit a sender', () => {
  const approval = { email: 'source@example.invalid', active: true, author_key: 'demo', author_display: 'דוגמה', contributor_id: 'canonical-demo' };
  const proof = { dmarc: 'pass', verified_from: 'source@example.invalid', provider_authenticated: true };
  assert.equal(resolveApprovedSender(source({ headers: { 'Authentication-Results': 'dmarc=pass' } }), [approval]), null);
  assert.equal(resolveApprovedSender(source({ authentication: { ...proof, verified_from: 'other@example.invalid' } }), [approval]), null);
  assert.equal(resolveApprovedSender(source({ authentication: proof }), [{ ...approval, active: false }]), null);
  assert.equal(resolveApprovedSender(source({ authentication: proof }), [{ ...approval, contributor_id: null }]), null);
});
test('provider delivery keys differ for forged identical RFC IDs and survive replay', async () => {
  const a = await normalize(source());
  const b = await normalizeReceivedEmail(source({ from: 'forger@example.invalid' }), { providerId: 'provider-2' });
  assert.notEqual(a.storage_key, b.storage_key);
  assert.equal(a.storage_key, (await normalize(source())).storage_key);
  assert.equal(a.id, b.id, 'ambiguous RFC lineage is separately held at publication');
});
test('admin replies use preserved RFC identity instead of new delivery dedup keys', () => {
  assert.equal(replyMessageId({ message_id:'provider_hash',meta:{source_email_v1:{message_id:'root@example.invalid'}} }), 'root@example.invalid');
  assert.equal(replyMessageId({ message_id:'legacy@example.invalid' }), 'legacy@example.invalid');
  assert.equal(replyMessageId({ message_id:'provider_hash' }), null);
  assert.equal(replyMessageId({ message_id:'x@example.invalid\r\nInjected: yes' }), null);
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

test('References-only reply joins its parent; an explicit parent takes precedence', async () => {
  const root = await normalize(source());
  const referenced = await normalize(source({ message_id: '<reply@example.invalid>',
    headers: { References: '<older@example.invalid> <first@example.invalid>' } }));
  assert.equal(referenced.parent_id, root.id);
  assert.equal(referenced.parent_basis, 'references');
  const direct = await normalize(source({ headers: { 'In-Reply-To': '<other@example.invalid>',
    References: '<first@example.invalid>' } }));
  assert.notEqual(direct.parent_id, root.id);
  assert.equal(direct.parent_basis, 'in_reply_to');
});

test('a reply arriving before the original reconnects without subject guessing', async () => {
  const root = await normalize(source());
  const reply = await normalize(source({ message_id: '<reply@example.invalid>',
    headers: { References: '<first@example.invalid>' }, text: 'תשובה חדשה' }));
  const admit = row => ({ ...row, source_admitted: true, held: false, status: 'live',
    author_key: 'demo', author_display: 'דוגמה' });
  assert.equal(projectSourceEmailThreads([admit(reply)])[0].thread.missing_parent, true);
  const joined = projectSourceEmailThreads([admit(reply), admit(root)]);
  assert.equal(joined.length, 1);
  assert.equal(joined[0].thread.missing_parent, false);
  assert.equal(joined[0].thread.message_count, 2);
});

test('replies use source chronology when import arrives in reverse order', () => {
  const root = { ...sourceEmailRows[0], source_published_at: '2026-10-11T09:00:00Z' };
  const early = { ...sourceEmailRows[1], id: 'early', source_published_at: '2026-10-11T10:00:00Z',
    arrival_at: '2026-10-13T12:00:00Z' };
  const late = { ...sourceEmailRows[1], id: 'late', source_published_at: '2026-10-11T11:00:00Z',
    arrival_at: '2026-10-12T12:00:00Z' };
  const item = projectSourceEmailThreads([late, early, root])[0];
  assert.deepEqual(item.thread.messages.map(row => row.id), ['demo-root', 'early', 'late']);
  assert.equal(item.thread.last_activity_at, '2026-10-13T12:00:00.000Z');
});

test('a parent stays before its child even with contradictory source clocks', () => {
  const root = { ...sourceEmailRows[0], source_published_at: '2026-10-11T12:00:00Z' };
  const parent = { ...sourceEmailRows[1], id: 'parent', source_published_at: '2026-10-11T14:00:00Z' };
  const child = { ...sourceEmailRows[1], id: 'child', parent_id: 'parent',
    source_published_at: '2026-10-11T13:00:00Z' };
  assert.deepEqual(projectSourceEmailThreads([child, parent, root])[0].thread.messages.map(row => row.id),
    ['demo-root', 'parent', 'child']);
});

test('References never bypass a held explicit parent or merge unrelated same-title messages', async () => {
  const root = { ...sourceEmailRows[0], held: true };
  const reply = { ...sourceEmailRows[1], reference_ids: ['another-root'] };
  const unrelated = { ...sourceEmailRows[0], id: 'another-root' };
  const items = projectSourceEmailThreads([root, reply, unrelated]);
  assert.equal(items.length, 2);
  assert.equal(items.find(row => row.thread.missing_parent).thread.message_count, 1);
  const a = { ...unrelated, id: 'a', full_text: 'אותו נושא' };
  const b = { ...unrelated, id: 'b', full_text: 'אותו נושא' };
  assert.equal(projectSourceEmailThreads([a, b]).length, 2);
});
