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
import { planImport } from './planner.mjs';

export const EXECUTOR_CONFIRMATION_PHRASE = 'PHASE3_HUMAN_GATE_AUTHORIZED_EXECUTE';

export class ExecutorNotAuthorizedError extends Error {
  constructor(reason) {
    super(`community archive import executor refused to run: ${reason}`);
    this.name = 'ExecutorNotAuthorizedError';
    this.reason = reason;
  }
}

// ops (only required when execute:true):
//   insertContribution(op)   — called once per {op:'insert_contribution', ...} plan entry
//   skipDuplicate(op)        — called once per {op:'skip_duplicate', ...} plan entry
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

  const results = [];
  for (const op of plan) {
    if (op.op === 'insert_contribution') {
      results.push({ op: op.op, message_id: op.message_id, result: await ops.insertContribution(op) });
    } else {
      results.push({ op: op.op, message_id: op.message_id, result: await ops.skipDuplicate(op) });
    }
  }
  return { executed: true, plan, results };
}
