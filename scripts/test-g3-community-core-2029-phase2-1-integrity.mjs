// G3 Community Core 2029 Phase 2.1 — integrity-fix focused tests.
// task_key=G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1. Run:
//   npm run test:g3-community-core-2029-phase2-1
//
// Covers the defects a real OpenWeb-archive dry-run found in the Phase 1/2 planner and claim
// logic: source-native (user_id-keyed, never email-keyed) identity, true anonymity, reaction
// truth (missing != zero), neutral import-time intent, confirmed-email claim security, and the
// new post conversation projection's never-guess-unresolved invariant. SQL-level guarantees
// (contributors_claim_legacy's email_confirmed_at check, post_conversation_projection's join)
// are NOT executable-tested here — no live DB write/migration is authorized in this branch; the
// SQL text is the source of truth and was read/reasoned about live. See
// docs/g3-community-core-2029-phase2-1-integrity-fixes-branch-notes.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { planImport } from './g3-community-foundation-runtime/planner.mjs';
import { resolveLegacyClaim } from './g3-community-foundation-runtime/identityBridge.mjs';
import {
  projectPostConversation,
  findUnresolvedWordpressPostRefs,
} from './g3-community-foundation-runtime/postConversationProjection.mjs';

const messages = JSON.parse(fs.readFileSync('test/fixtures/openweb-import/synthetic-messages.json', 'utf8'));

function freshState() {
  return {
    importedMessageIds: new Set(['ow-0999-already-imported']),
    linkedOpenwebUserIds: new Map([['ow-user-dana', '11111111-1111-1111-1111-111111111111']]),
    contributorsByOpenwebUserId: new Map(),
  };
}

// ---- source-native identity (never email-keyed) --------------------------------------------

test('two distinct openweb_user_ids sharing one verified email remain two separate source identities', () => {
  const ops = planImport(messages, freshState());
  const a = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1007');
  const b = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1008');
  assert.ok(a.contribution.author_contributor_id);
  assert.ok(b.contribution.author_contributor_id);
  assert.notEqual(a.contribution.author_contributor_id, b.contribution.author_contributor_id);
  assert.equal(a.contributor_op.email, 'shared@example.com');
  assert.equal(b.contributor_op.email, 'shared@example.com');
  assert.notEqual(a.contributor_op.id, b.contributor_op.id);
});

test('a fully anonymous message (no user_id, no name, no email) never creates a contributor', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1009');
  assert.equal(op.contribution.author_user_id, null);
  assert.equal(op.contribution.author_contributor_id, null);
  assert.equal(op.contributor_op, null);
  assert.equal(op.visitor_identity_op, null);
  assert.equal(op.identity_link, null);
});

test('the same anonymous archetype (no user_id at all) never creates a contributor even with a moderation-deleted body', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1004');
  assert.equal(op.contribution.author_contributor_id, null);
  assert.equal(op.contributor_op, null);
});

test('an identified author plans a visitor_identity soft carrier keyed openweb:<user_id>, email as evidence only', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1001');
  assert.deepEqual(op.visitor_identity_op, { visitor: 'openweb:ow-user-avi', email: 'avi.legacy@example.com' });
});

test('an already-linked openweb_user_id (explicitly claimed in a prior session) needs no new contributor/visitor_identity plan', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1002');
  assert.equal(op.contributor_op, null);
  assert.equal(op.visitor_identity_op, null);
  assert.equal(op.identity_link, null);
});

// ---- reaction truth: missing must never become zero -----------------------------------------

test('a message with no likes/dislikes captured at all plans reactions: null, never {likes:0,dislikes:0}', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1007');
  assert.equal(op.contribution.reactions, null);
});

test('a message with an explicit zero reaction count preserves the real zero, distinct from missing', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1008');
  assert.deepEqual(op.contribution.reactions, { likes: 0, dislikes: 0 });
});

// ---- claim security: confirmed email only ----------------------------------------------------

test('claim: an unconfirmed current email is refused even when the address matches exactly', () => {
  const contributor = { id: 'c1', email: 'a@example.com', user_id: null };
  const caller = { id: 'u1', email: 'a@example.com', emailConfirmed: false };
  const r = resolveLegacyClaim(contributor, caller);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'caller_email_not_confirmed');
});

test('claim: the same confirmed mailbox may be eligible across two distinct historical contributor rows, each an explicit call', () => {
  const callerA = { id: 'u1', email: 'shared@example.com', emailConfirmed: true };
  const rowA = { id: 'contrib-a', email: 'shared@example.com', user_id: null };
  const rowB = { id: 'contrib-b', email: 'shared@example.com', user_id: null };
  const claimA = resolveLegacyClaim(rowA, callerA);
  const claimB = resolveLegacyClaim(rowB, callerA);
  assert.equal(claimA.eligible, true);
  assert.equal(claimB.eligible, true);
  assert.notEqual(claimA.contributor_id, claimB.contributor_id);
});

// ---- post conversation projection -------------------------------------------------------------

const wpComments = [
  { wp_id: 1, post_wp_id: 42, parent_wp_id: null, author_name: 'ותיק', date: '2024-01-01T00:00:00Z', content: 'תגובה ישנה', status: 'publish' },
  { wp_id: 2, post_wp_id: 42, parent_wp_id: 1, author_name: 'עוד ותיק', date: '2024-01-02T00:00:00Z', content: 'תגובה על תגובה', status: 'publish' },
  { wp_id: 3, post_wp_id: 42, parent_wp_id: null, author_name: 'ספאמר', date: '2024-01-03T00:00:00Z', content: 'הוסר', status: 'spam' },
  { wp_id: 99, post_wp_id: 777, parent_wp_id: null, author_name: 'לא ידוע', date: '2024-01-01T00:00:00Z', content: 'post_wp_id לא קיים באף פוסט', status: 'publish' },
];
const posts = [{ wp_id: 42, id: 9001 }];
const contributions = [
  { id: 'rc-1', parent_id: null, target_type: 'post', target_id: '9001', author_display_name: 'חדש', author_is_contributor: true, body: 'שיחה חדשה', reactions: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'rc-2', parent_id: 'other-post-thread', target_type: 'post', target_id: '9002', author_display_name: 'לא רלוונטי', author_is_contributor: false, body: 'פוסט אחר', reactions: null, created_at: '2026-01-02T00:00:00Z' },
];

test('post conversation projection unifies WordPress and native rows for one post, chronologically, dropping non-publish WP rows', () => {
  const merged = projectPostConversation(42, wpComments, contributions, { canonicalPostId: 9001 });
  assert.deepEqual(
    merged.map((m) => m.source_id),
    ['1', '2', 'rc-1']
  );
  assert.ok(merged.every((m, i) => i === 0 || new Date(m.created_at) >= new Date(merged[i - 1].created_at)));
});

test('post conversation projection never pulls in a different post\'s native contributions', () => {
  const merged = projectPostConversation(42, wpComments, contributions, { canonicalPostId: 9001 });
  assert.equal(merged.some((m) => m.source_id === 'rc-2'), false);
});

test('WordPress reply parent lineage is preserved within its own source_kind', () => {
  const merged = projectPostConversation(42, wpComments, contributions, { canonicalPostId: 9001 });
  const reply = merged.find((m) => m.source_id === '2');
  assert.equal(reply.parent_ref, '1');
});

test('an unresolved post_wp_id (no matching posts.wp_id) is reported, never guessed/attached to any post', () => {
  const unresolved = findUnresolvedWordpressPostRefs(wpComments, posts);
  assert.deepEqual(unresolved, [777]);
});
