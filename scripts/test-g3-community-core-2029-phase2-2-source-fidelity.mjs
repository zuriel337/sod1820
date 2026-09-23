// G3 Community Core 2029 Phase 2.2 — source-fidelity focused tests.
// task_key=G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1. Run:
//   npm run test:g3-community-core-2029-phase2-2
//
// Covers the final defects a real-archive + live-schema cross-check found before Phase 3:
// `research_contributions.reactions` is `jsonb NOT NULL DEFAULT '{}'`, so a plan that returns
// JS `null` for "unknown reaction counts" would violate that constraint on direct execution;
// and 3,329 real rows have a blank/missing source body that must never render as an empty
// authored message. SQL-level guarantees (the display-payload filter re-applied in
// community_stream_projection/community_search_facts/post_conversation_projection) are NOT
// executable-tested here — no live DB write/migration is authorized in this branch; the SQL
// text is the source of truth and was read/reasoned about live. See
// docs/g3-community-core-2029-phase2-2-source-fidelity-branch-notes.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { planImport } from './g3-community-foundation-runtime/planner.mjs';
import { projectPostConversation } from './g3-community-foundation-runtime/postConversationProjection.mjs';

const messages = JSON.parse(fs.readFileSync('test/fixtures/openweb-import/synthetic-messages.json', 'utf8'));

function freshState() {
  return {
    importedMessageIds: new Set(['ow-0999-already-imported']),
    linkedOpenwebUserIds: new Map([['ow-user-dana', '11111111-1111-1111-1111-111111111111']]),
    contributorsByOpenwebUserId: new Map(),
  };
}

// ---- reaction truth: unknown must be DB-compatible, never top-level null ------------------

test('a message with no likes/dislikes captured at all plans reactions: {} (jsonb NOT NULL compatible), never null', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1007');
  assert.notEqual(op.contribution.reactions, null);
  assert.deepEqual(op.contribution.reactions, {});
});

test('a message with an explicit zero reaction count still preserves the real zero, distinct from {} unknown', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1008');
  assert.deepEqual(op.contribution.reactions, { likes: 0, dislikes: 0 });
});

// ---- blank/missing source body: never a fabricated authored message -----------------------

test('a whitespace-only source body plans body: null, never the literal whitespace as authored text', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1010');
  assert.equal(op.contribution.body, null);
});

test('a null source body plans body: null', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1011');
  assert.equal(op.contribution.body, null);
});

test('a blank-body row carries representation_payload_missing:true in its provenance note, and no other field is dropped', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1010');
  const note = JSON.parse(op.provenance_link.note);
  assert.equal(note.representation_payload_missing, true);
  // moderation carry-forward, reactions, identity/thread all stay intact — only the authored
  // payload is absent.
  assert.equal(op.contribution.status, 'approved');
  assert.deepEqual(op.contribution.reactions, { likes: 6, dislikes: 1 });
  assert.ok(op.contribution.author_contributor_id);
  assert.ok(op.visitor_identity_op);
});

test('a non-blank body row carries representation_payload_missing:false', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1001');
  const note = JSON.parse(op.provenance_link.note);
  assert.equal(note.representation_payload_missing, false);
  assert.equal(op.contribution.body, 'מישהו בדק את הגימטריה של הביטוי הזה?');
});

test('a blank-body row is never rewritten from approved to hidden merely to hide an empty projection', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1010');
  // Source-native moderation_state was 'approved'; carry-forward status stays 'approved' even
  // though the row will be display-filtered by the read-seam projections, not by this planner.
  assert.equal(op.contribution.status, 'approved');
});

// ---- post conversation projection: never a visually empty Community item ------------------

const contributions = [
  { id: 'rc-1', parent_id: null, target_type: 'post', target_id: '9001', author_display_name: 'חדש', author_is_contributor: true, body: 'שיחה חדשה', reactions: {}, created_at: '2026-01-01T00:00:00Z' },
  { id: 'rc-2', parent_id: 'rc-1', target_type: 'post', target_id: '9001', author_display_name: 'ריק', author_is_contributor: true, body: '   ', reactions: { likes: 3 }, created_at: '2026-01-02T00:00:00Z' },
  { id: 'rc-3', parent_id: null, target_type: 'post', target_id: '9001', author_display_name: 'תמונה', author_is_contributor: true, body: null, image_url: 'https://example.com/x.jpg', reactions: {}, created_at: '2026-01-03T00:00:00Z' },
];

test('post conversation projection omits a community row with no displayable authored payload (blank body, no media/image)', () => {
  const merged = projectPostConversation(42, [], contributions, { canonicalPostId: 9001 });
  assert.equal(merged.some((m) => m.source_id === 'rc-2'), false);
});

test('post conversation projection keeps a community row with real media even though body is null', () => {
  const merged = projectPostConversation(42, [], contributions, { canonicalPostId: 9001 });
  assert.ok(merged.some((m) => m.source_id === 'rc-3'));
});

test('post conversation projection keeps a normal non-blank community row', () => {
  const merged = projectPostConversation(42, [], contributions, { canonicalPostId: 9001 });
  assert.ok(merged.some((m) => m.source_id === 'rc-1'));
});
