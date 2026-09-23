import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { planImport, OPENWEB_SOURCE_TARGET_TYPE } from './g3-community-foundation-runtime/planner.mjs';

const messages = JSON.parse(fs.readFileSync('test/fixtures/openweb-import/synthetic-messages.json', 'utf8'));

function freshState() {
  return {
    importedMessageIds: new Set(['ow-0999-already-imported']),
    usersByVerifiedEmail: new Map([['dana.verified@example.com', '11111111-1111-1111-1111-111111111111']]),
    contributorsByEmail: new Map(),
  };
}

test('cross-batch replay is skipped, never re-inserted', () => {
  const ops = planImport(messages, freshState());
  const skipped = ops.filter((o) => o.op === 'skip_duplicate' && o.message_id === 'ow-0999-already-imported');
  assert.equal(skipped.length, 1);
  assert.equal(ops.some((o) => o.op === 'insert_contribution' && o.message_id === 'ow-0999-already-imported'), false);
});

test('same-batch duplicate message_id is skipped exactly once, not inserted twice', () => {
  const ops = planImport(messages, freshState());
  const inserts = ops.filter((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1005');
  const skips = ops.filter((o) => o.op === 'skip_duplicate' && o.message_id === 'ow-1005');
  assert.equal(inserts.length, 1);
  assert.equal(skips.length, 1);
});

test('running the same batch twice is fully idempotent (second run is all skips)', () => {
  const state = freshState();
  const firstRun = planImport(messages, state);
  const importedAfterFirstRun = new Set([
    ...state.importedMessageIds,
    ...firstRun.filter((o) => o.op === 'insert_contribution').map((o) => o.message_id),
  ]);
  const secondRun = planImport(messages, { ...state, importedMessageIds: importedAfterFirstRun });
  assert.ok(secondRun.every((o) => o.op === 'skip_duplicate'));
});

test('verified email matching a known user links author_user_id, never a contributor row', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1002');
  assert.equal(op.contribution.author_user_id, '11111111-1111-1111-1111-111111111111');
  assert.equal(op.contribution.author_contributor_id, null);
  assert.equal(op.contributor_op, null);
});

test('unverified/unmatched email becomes a private legacy contributor, never auth.users', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1001');
  assert.equal(op.contribution.author_user_id, null);
  assert.ok(op.contribution.author_contributor_id);
  assert.ok(op.contributor_op, 'a new contributor row must be planned');
  assert.equal(op.contributor_op.dossier_settings.visibility, 'private');
  // The RLS default on contributors.dossier_settings->>'visibility' is public
  // (COALESCE(..., 'public')), so an unresolved legacy identity MUST set this
  // explicitly or its email leaks through contributors_read to every visitor.
  assert.equal(op.contributor_op.email, 'avi.legacy@example.com');
});

test('no operation ever creates an auth.users row from an import', () => {
  const ops = planImport(messages, freshState());
  assert.ok(ops.every((o) => o.op !== 'create_auth_user' && o.op !== 'insert_auth_user'));
});

test('reply chain preserves parent_id and forces the existing thread invariant (intent/state)', () => {
  const ops = planImport(messages, freshState());
  const parent = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1001');
  const reply = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1002');
  assert.equal(reply.contribution.parent_id, parent.contribution.id);
  assert.equal(reply.contribution.intent, 'תגובה');
  assert.equal(reply.contribution.research_state, 'discussion');
});

test('hidden and deleted moderation states never surface as approved/published', () => {
  const ops = planImport(messages, freshState());
  const hidden = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1003');
  const deleted = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1004');
  assert.equal(hidden.contribution.status, 'hidden');
  assert.equal(deleted.contribution.status, 'hidden');
});

test('classification (intent) never sets status/research_state beyond the conservative default', () => {
  const ops = planImport(messages, freshState());
  for (const op of ops) {
    if (op.op !== 'insert_contribution') continue;
    assert.notEqual(op.contribution.status, 'approved');
    assert.notEqual(op.contribution.research_state, 'canonical');
    assert.notEqual(op.contribution.research_state, 'validated');
  }
});

test('likes/dislikes, article vs general-chat URL, and original moderation state are all preserved losslessly', () => {
  const ops = planImport(messages, freshState());
  const withReactions = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1002');
  assert.deepEqual(withReactions.contribution.reactions, { likes: 2, dislikes: 1 });

  const article = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1003');
  const note = JSON.parse(article.provenance_link.note);
  assert.equal(note.url_kind, 'article');
  assert.equal(note.original_moderation_state, 'hidden');

  const generalChat = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1001');
  const generalNote = JSON.parse(generalChat.provenance_link.note);
  assert.equal(generalNote.url_kind, 'general_chat');
});

test('every insert carries an openweb_message derived_from provenance link keyed by message_id', () => {
  const ops = planImport(messages, freshState());
  for (const op of ops.filter((o) => o.op === 'insert_contribution')) {
    assert.equal(op.provenance_link.target_type, OPENWEB_SOURCE_TARGET_TYPE);
    assert.equal(op.provenance_link.target_id, op.message_id);
    assert.equal(op.provenance_link.relation_type, 'derived_from');
    assert.equal(op.provenance_link.from_contribution_id, op.contribution.id);
  }
});

test('no email is ever written onto a research_contributions row (PII stays off the public-read table)', () => {
  const ops = planImport(messages, freshState());
  for (const op of ops.filter((o) => o.op === 'insert_contribution')) {
    const values = JSON.stringify(op.contribution);
    assert.equal(/@/.test(values), false, `contribution for ${op.message_id} must not embed an email`);
  }
});

test('a message with no author email at all still plans a legacy contributor without an email field crash', () => {
  const ops = planImport(messages, freshState());
  const op = ops.find((o) => o.op === 'insert_contribution' && o.message_id === 'ow-1006');
  assert.equal(op.contribution.author_user_id, null);
  assert.ok(op.contribution.author_contributor_id);
  assert.equal(op.contributor_op.email, null);
});
