import test from 'node:test';
import assert from 'node:assert/strict';
import { planAvatarBackfill } from './g3-community-foundation-runtime/avatarBackfill.mjs';
import { displayAvatarUrl } from '../src/lib/avatar.js';

const link = (id, extra = {}) => ({ source_user_id: id, contributor_id: `legacy-${id}`, current_avatar_url: null, account_linked: false, ...extra });
const photo = (id, extra = {}) => ({ source_user_id: id, avatar_url: `https://images.example.com/${id}.jpg`, visibility: 'public', observed_at: '2026-10-10T12:00:00Z', ...extra });

test('maps only exact source IDs, ignoring equal names/emails and unrelated exported profiles', () => {
  const result = planAvatarBackfill([link('a'), link('b')], [photo('a', { name: 'same', email: 'same@example.com' }), photo('b', { name: 'same', email: 'same@example.com' }), photo('unrelated')]);
  assert.equal(result.summary.ready_for_review, 2);
  assert.equal(result.unmatched_source_count, 1);
  assert.deepEqual(result.rows.map(row => [row.contributor_id, row.avatar_url]), [['legacy-a', 'https://images.example.com/a.jpg'], ['legacy-b', 'https://images.example.com/b.jpg']]);
  assert.doesNotMatch(JSON.stringify(result), /same@example|"email"|"name"/);
});
test('missing source is explicit, and private/unknown source visibility cannot become public', () => {
  assert.deepEqual(planAvatarBackfill([link('a'), link('b')], [photo('b', { visibility: 'private' })]).summary, { missing_source: 1, source_not_public: 1 });
  assert.equal(planAvatarBackfill([link('a')], [photo('a', { visibility: undefined })]).rows[0].status, 'source_not_public');
});
test('preserves existing and claimed avatars and is idempotent after application', () => {
  const report = planAvatarBackfill([link('a')], [photo('a')]);
  const rerun = planAvatarBackfill([link('a', { current_avatar_url: report.rows[0].avatar_url })], [photo('a')]);
  assert.equal(rerun.rows[0].status, 'existing_avatar_preserved');
  assert.equal(planAvatarBackfill([link('a', { account_linked: true })], [photo('a')]).rows[0].status, 'linked_account_preserved');
});
test('rejects ambiguous identity links, shared targets and conflicting source images', () => {
  assert.equal(planAvatarBackfill([link('a'), link('a', { contributor_id: 'other' })], [photo('a')]).rows[0].status, 'ambiguous_or_missing_identity');
  const shared = planAvatarBackfill([link('a'), link('b', { contributor_id: 'legacy-a' })], [photo('a'), photo('b')]);
  assert.equal(shared.summary.ambiguous_target_identity, 2);
  assert.ok(shared.rows.every(row => !row.avatar_url));
  assert.equal(planAvatarBackfill([link('a')], [photo('a'), photo('a', { avatar_url: 'https://images.example.com/other.jpg' })]).rows[0].status, 'conflicting_source_avatars');
});
test('rejects invalid image URLs and missing provenance date', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'file:///secret', 'http://images.example.com/a.jpg', 'https://user:secret@example.com/a.jpg', 'https://example.com:444/a.jpg']) assert.equal(displayAvatarUrl(url), null);
  assert.equal(planAvatarBackfill([link('a')], [photo('a', { avatar_url: 'javascript:alert(1)' })]).rows[0].status, 'missing_or_invalid_avatar');
  assert.equal(planAvatarBackfill([link('a')], [photo('a', { observed_at: '' })]).rows[0].status, 'missing_observation_date');
  assert.equal(planAvatarBackfill([link('a')], [photo('a', { observed_at: 0 })]).rows[0].status, 'missing_observation_date');
  assert.equal(planAvatarBackfill([link('a')], [photo('a', { observed_at: '2026-10-10T14:00:00+03:00' }), photo('a')]).rows[0].observed_at, '2026-10-10T12:00:00.000Z');
});
