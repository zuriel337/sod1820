// Lossless bound for the PASSIVE part of the pending queue (navigation history and Context), part of the journal-lifecycle draft.
//
// A tab that records history on every load appends one `history_add` / `context_set` batch per load; those never grant write intent, so
// they never flush and the queue grows without bound. Both the client (researchSyncState.applyResearchOps) and the server
// (apply_ops in 20260929123500_research_sync_40001_retry_storm_hotfix_v1.sql) define them the same way:
//   history_add  : remove the entry with the same id, put the new one first, keep the newest 50
//   history_clear: empty the list
//   context_set  : replace the whole context
// so an op is OVERWRITTEN (has no effect on the final state, whatever the starting state) when
//   * a later history_clear exists, or
//   * a later history_add has the same entity id, or
//   * at least 50 distinct entity ids are added later (it falls off the end of the list), or
//   * (context_set) a later context_set exists.
// Only a batch made ONLY of such overwritten ops is dropped. Batches containing any other op (research items, collections, journeys,
// clears) are never touched, order is preserved, and the batch currently in flight (an immutable request) is never touched.
// Result: at most ~50 history batches and one context batch are kept, whatever the number of page loads.
export const HISTORY_LIMIT = 50;
const PASSIVE = new Set(['history_add', 'context_set']);

export function compactPassiveQueue(queue, { protectedBatchId = null } = {}) {
  if (!Array.isArray(queue) || queue.length < 2) return queue;
  const keep = new Array(queue.length).fill(true);
  const laterIds = new Set(); let clearLater = false, contextLater = false;
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const batch = queue[i], ops = batch?.ops;
    if (!Array.isArray(ops) || !ops.length) continue;
    const overwritten = op => (op.kind === 'history_add'
      ? clearLater || laterIds.has(op.entity?.id) || laterIds.size >= HISTORY_LIMIT
      : contextLater);
    if (batch.batch_id !== protectedBatchId && ops.every(op => PASSIVE.has(op?.kind) && overwritten(op))) keep[i] = false;
    for (const op of ops) {   // later-state for the EARLIER batches is taken from the original sequence
      if (op?.kind === 'history_clear') { clearLater = true; laterIds.clear(); }
      else if (op?.kind === 'history_add' && typeof op.entity?.id === 'string') laterIds.add(op.entity.id);
      else if (op?.kind === 'context_set') contextLater = true;
    }
  }
  return keep.every(Boolean) ? queue : queue.filter((_, i) => keep[i]);
}
