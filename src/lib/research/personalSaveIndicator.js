import { SYNC_FAILURE_STATUSES, isCloudConfirmed, saveFailureNotice } from './personalSaveDecision.js';

// The ONE visible save indicator (idle -> saving -> confirmed | failed with a retry). Kept out of personalSaveDecision.js on purpose: that file is imported by the
// research runtime that every page loads, and this one is only needed where a save control is on screen (the shell budget, Speed Law).
//
// Success is only ever 'confirmed', and that is only the server's receipt (a synced runtime with an empty queue); a local commit, a queued batch or a request in
// flight is 'saving' at best. `attempt` is this control's own click: 'idle' | 'saving' | 'failed'.
export function saveIndicatorPhase({ saved, syncStatus, syncPending = 0, syncAwaitingAction = false, attempt = 'idle' }) {
  if (saved && isCloudConfirmed({ syncStatus, syncPending })) return 'confirmed';
  if (SYNC_FAILURE_STATUSES.includes(syncStatus) && (saved || attempt !== 'idle')) return 'failed';
  if (attempt === 'failed') return 'failed';
  if (attempt === 'saving') return 'saving';
  if (saved && (['syncing', 'loading', 'resolving'].includes(syncStatus) || (syncStatus === 'pending' && !syncAwaitingAction))) return 'saving';
  return 'idle';
}

// A conflict (the server holds a newer revision) may be re-applied on top of it with one explicit click only when the waiting queue merely ADDS (upserts keyed by
// identity): it cannot delete or overwrite what the account gained meanwhile. The disputed batch is preserved by the existing resolveConflict before anything is re-sent.
export const ADDITIVE_OP_KINDS = Object.freeze(['item_upsert', 'history_add', 'context_set', 'collection_add', 'journey_add']);
export function conflictReapplySafe(pending) {
  const batches = [...(pending?.queue || []), ...(pending?.inflight ? [pending.inflight] : [])];
  return batches.length > 0 && batches.every(b => Array.isArray(b?.ops) && b.ops.every(op => ADDITIVE_OP_KINDS.includes(op?.kind)));
}

// The truthful reason a save is not confirmed. A conflict and a plain server failure get their own text (and the one action that fixes a conflict);
// everything else is the existing saveFailureNotice (full store with its reclaim, blocked, corrupt, ...).
export function indicatorFailureNotice({ syncStatus, storageIssue = null, reclaimablePassiveJournals = 0, syncPending = 0, conflictReapplyOffered = false } = {}) {
  const base = { syncStatus, storageIssue, reclaimablePassiveJournals, syncPending };
  // CLOUD FIRST (stage 2): a failed device store no longer stops the send. When the account was reachable (the server was asked and did not confirm, or answered with a conflict) the notice
  // says where the item waits: in this tab's memory only. Without an account to write to, or with an unreadable local record, the existing "not sent" text is still the truth.
  const memory = ['quota', 'blocked', 'unavailable'].includes(storageIssue);
  if (storageIssue && !(memory && ['error', 'conflict'].includes(syncStatus))) return saveFailureNotice(base);
  const code = ` (קוד: ${syncStatus})`;
  const held = memory ? 'הפריט ממתין בזיכרון הלשונית הזו בלבד, כי אחסון המכשיר מלא או חסום, ולכן אל תסגרו אותה לפני האישור. לא נמחק דבר.' : 'הפריט נשמר במכשיר ולא נמחק דבר.';
  if (syncStatus === 'conflict') {
    return conflictReapplyOffered
      ? { action: 'resolve', text: `השרת מחזיק גרסה חדשה יותר של המחקר מזו שבמכשיר (עדכון ממכשיר או מלשונית אחרת), ולכן השמירה עוד לא אושרה. ${held} אפשר לצרף אותו לגרסה העדכנית (עותק של הגרסה השנויה במחלוקת נשמר).${code}` }
      : { action: null, text: `השרת מחזיק גרסה חדשה יותר של המחקר מזו שבמכשיר, ובתור ממתינה גם פעולת מחיקה, ולכן היא לא תוחל אוטומטית. ${held}${code}` };
  }
  if (syncStatus === 'error') {
    const reclaim = storageIssue === 'quota' && reclaimablePassiveJournals > 0;
    return { action: reclaim ? 'reclaim' : null, text: `השרת לא אישר את השמירה (אין חיבור, או שהשרת לא ענה). ${memory ? held.replace(' לא נמחק דבר.', '') : 'הפריט נשמר במכשיר ולא נמחק;'} אפשר ללחוץ שוב כדי לנסות.${reclaim ? ` אפשר גם לפנות ${reclaimablePassiveJournals} יומני צפייה ישנים (לא נוגע בפריטים ששמרת).` : ''}${code}` };
  }
  return saveFailureNotice(base);
}
