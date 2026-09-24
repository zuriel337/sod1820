// G3 Community Core 2029 Phase 2 — bounded archive import executor.
// Extends Phase 1's `planImport` (planner.mjs, pure/no-DB) with an execution layer that is
// OFF by default and cannot write production without an explicit invocation/gate, per the
// assignment's own boundary: "No actual 41,080-row import in this task."
//
// This file still never opens a DB connection itself. `runImport` only *executes* a plan by
// calling the async `ops` object the caller supplies (e.g. a real Supabase client wrapper, or
// — for tests — an in-memory recorder). Three independent gates must all be satisfied before
// a single write callback fires:
//   1. `execute: true` passed explicitly (default is a dry-run: `planOnly()` is called instead).
//   2. A non-null `ops` implementation is supplied (no default DB client is wired in here).
//   3. `confirm === EXECUTOR_CONFIRMATION_PHRASE` — a deliberate, hard-to-accidentally-pass
//      literal, so a stray `{execute:true}` in a test or a copy-pasted call can't silently
//      start writing.
//
// Two-phase insert/link (task_key=G3_COMMUNITY_CORE_PR636_TWO_PHASE_EXECUTOR_V1): live schema
// verification found `research_contributions_parent_id_fkey` is NOT DEFERRABLE / NOT INITIALLY
// DEFERRED. `planImport`'s parent resolution is already order-independent (see
// docs/g3-community-core-pr636-parent-reconstruction-branch-notes.md), but the plan it emits
// still carries each reply's *desired* parent_id inline on the same op that would insert it —
// executing plan ops in that order, one DB write per op, could still try to insert a child row
// whose parent_id references a row this batch has not created yet, which the live FK would
// reject regardless of how correctly the planner resolved the reference. So this executor never
// inserts a plan's resolved parent_id directly:
//   Phase 1 — insert every `insert_contribution` op with `parent_id` forced to null. This makes
//             every insert in the batch independent of every other, so no DB-execution order can
//             violate the immediate FK. The plan's real desired parent reference is preserved
//             per-row (`pendingLinks`), never discarded.
//   Phase 2 — only after every row phase 1 was going to create has been created, resolve and
//             apply each pending parent_id link: an in-batch reference (`planned:<message_id>`)
//             resolves via the real id phase 1 returned for that same batch; a cross-batch
//             reference (`existing-via:<message_id>`) resolves via `ops.resolveExistingParentId`.
// A genuinely absent parent (`desired parent_id === null`) is never added to `pendingLinks` at
// all — it stays null forever, exactly as the planner intended; nothing in this file guesses one.
import { planImport } from './planner.mjs';

export const EXECUTOR_CONFIRMATION_PHRASE = 'PHASE3_HUMAN_GATE_AUTHORIZED_EXECUTE';
const EXISTING_VIA_PREFIX = 'existing-via:';

export class ExecutorNotAuthorizedError extends Error {
  constructor(reason) {
    super(`community archive import executor refused to run: ${reason}`);
    this.name = 'ExecutorNotAuthorizedError';
    this.reason = reason;
  }
}

// ops (only required when execute:true):
//   insertContribution(op)         — phase 1: called once per {op:'insert_contribution', ...}
//                                    plan entry, with op.contribution.parent_id forced to null.
//                                    Must resolve to an object exposing the row's real id, e.g.
//                                    `{ id: <real contribution id> }`.
//   skipDuplicate(op)              — called once per {op:'skip_duplicate', ...} plan entry.
//   linkParent({contribution_id,   — phase 2: only called for a row whose plan-desired parent_id
//     parent_id, message_id})        was non-null. Applies the real parent_id now that both rows
//                                    are guaranteed to exist. Required only when the batch
//                                    actually contains a pending link.
//   resolveExistingParentId(        — phase 2: only called for an `existing-via:<message_id>`
//     parent_message_id)              reference (a parent imported in a *prior* batch). Must
//                                    resolve to that parent's real, already-committed id, or
//                                    null if it cannot be found. Required only when the batch
//                                    actually contains a cross-batch pending link.
export async function runImport(messages, state, { execute = false, confirm = null, ops = null } = {}) {
  const plan = planImport(messages, state);

  if (!execute) {
    return { executed: false, plan };
  }
  if (confirm !== EXECUTOR_CONFIRMATION_PHRASE) {
    throw new ExecutorNotAuthorizedError('missing_or_incorrect_confirmation_phrase');
  }
  if (!ops || typeof ops.insertContribution !== 'function' || typeof ops.skipDuplicate !== 'function') {
    throw new ExecutorNotAuthorizedError('no_ops_implementation_supplied');
  }

  // Phase 1 — see module header. Errors thrown by ops here (a real, unexpected DB failure —
  // never an FK violation, since parent_id is always null at this point) propagate to the
  // caller rather than being swallowed, exactly as before this change: a batch that failed to
  // even finish creating its rows must never be reported as executed/complete.
  const results = [];
  const pendingLinks = [];
  const plannedIdToRealId = new Map();

  for (const op of plan) {
    if (op.op !== 'insert_contribution') {
      const result = await ops.skipDuplicate(op);
      results.push({ op: op.op, message_id: op.message_id, result });
      continue;
    }

    const desiredParentId = op.contribution.parent_id;
    const insertOp = { ...op, contribution: { ...op.contribution, parent_id: null } };
    const result = await ops.insertContribution(insertOp);
    results.push({ op: op.op, message_id: op.message_id, result, desired_parent_id: desiredParentId });
    plannedIdToRealId.set(op.contribution.id, result && result.id);
    if (desiredParentId !== null) {
      pendingLinks.push({ message_id: op.message_id, contribution_id: result && result.id, desired_parent_id: desiredParentId });
    }
  }

  // Phase 2 — see module header. Unlike phase 1, a per-row link that cannot be resolved (an
  // in-batch parent id phase 1 somehow never recorded, or a cross-batch lookup that returns
  // nothing) is recorded as a failure and the run keeps going rather than throwing, so one
  // unresolved link can never mask the state of every other row in the batch — but the run is
  // never reported as `completed` while any such failure exists, so no half-linked state is
  // silently reported as complete.
  const linkResults = [];
  const linkFailures = [];
  if (pendingLinks.length > 0 && typeof ops.linkParent !== 'function') {
    throw new ExecutorNotAuthorizedError('no_link_parent_ops_implementation_supplied');
  }

  for (const link of pendingLinks) {
    let realParentId = null;
    if (link.desired_parent_id.startsWith(EXISTING_VIA_PREFIX)) {
      const parentMessageId = link.desired_parent_id.slice(EXISTING_VIA_PREFIX.length);
      if (typeof ops.resolveExistingParentId !== 'function') {
        linkFailures.push({ message_id: link.message_id, desired_parent_id: link.desired_parent_id, reason: 'no_resolve_existing_parent_id_ops_implementation_supplied' });
        continue;
      }
      try {
        realParentId = await ops.resolveExistingParentId(parentMessageId);
      } catch (error) {
        linkFailures.push({ message_id: link.message_id, desired_parent_id: link.desired_parent_id, reason: 'resolve_existing_parent_id_threw', error });
        continue;
      }
      if (!realParentId) {
        linkFailures.push({ message_id: link.message_id, desired_parent_id: link.desired_parent_id, reason: 'existing_parent_not_resolved' });
        continue;
      }
    } else {
      realParentId = plannedIdToRealId.get(link.desired_parent_id);
      if (!realParentId) {
        linkFailures.push({ message_id: link.message_id, desired_parent_id: link.desired_parent_id, reason: 'in_batch_parent_not_resolved' });
        continue;
      }
    }

    try {
      const result = await ops.linkParent({ contribution_id: link.contribution_id, parent_id: realParentId, message_id: link.message_id });
      linkResults.push({ message_id: link.message_id, contribution_id: link.contribution_id, parent_id: realParentId, result });
    } catch (error) {
      linkFailures.push({ message_id: link.message_id, desired_parent_id: link.desired_parent_id, reason: 'link_parent_threw', error });
    }
  }

  return {
    executed: true,
    plan,
    results,
    pendingLinks,
    linkResults,
    linkFailures,
    completed: linkFailures.length === 0,
  };
}
