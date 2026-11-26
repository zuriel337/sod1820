// Pure decision logic for the personal save button. No state, no storage, no network.
// "Present in the local list" is NOT "confirmed by the server": only a synced runtime
// with an empty queue is a cloud receipt.
export const SYNC_FAILURE_STATUSES = ['error', 'conflict', 'local_error', 'local_recovery_required'];

export const isCloudConfirmed = ({ syncStatus, syncPending }) => syncStatus === 'synced' && syncPending === 0;

// What a click on the button must do, given whether the item is already in the local list.
//   save    -> not in the list: start a normal save
//   confirm -> already confirmed by the server: nothing to do
//   retry   -> in the list with queued work: retry the existing queue
//   resave  -> in the list but nothing queued and no receipt (local-only): re-enqueue the
//              idempotent upsert so it reaches the server. Never deletes anything.
//   wait    -> sync already in flight
//   blocked -> local storage is unusable or conflict needs an explicit resolution
export function decideSaveClick({ saved, syncStatus, syncPending }) {
  if (!saved) return 'save';
  if (isCloudConfirmed({ syncStatus, syncPending })) return 'confirm';
  if (syncStatus === 'conflict' || syncStatus === 'local_recovery_required') return 'blocked';
  if (syncStatus === 'syncing' || syncStatus === 'loading' || syncStatus === 'resolving') return 'wait';
  if (syncPending > 0) return 'retry';
  return 'resave';
}

export function saveLabelState({ saved, syncStatus, syncPending }) {
  if (!saved) return 'unsaved';
  return isCloudConfirmed({ syncStatus, syncPending }) ? 'confirmed' : 'local';
}


// The truthful reason a save could not even start. It names the REAL cause the runtime observed (research.storageIssue), never a guess from the queue length:
// a non-empty queue says nothing about the browser's store. `action: 'reclaim'` is offered only for a full store that holds abandoned passive journals (the existing "פנה מקום" of "המחקר שלי", offered here at the point of failure).
export function saveFailureNotice({ syncStatus, storageIssue = null, reclaimablePassiveJournals = 0, syncPending = 0 } = {}) {
  // reclaimablePassiveJournals is the count the EXISTING reclaim reports in its read-only dry run (researchLocalOnly.reclaim): one reclaim, one owner.
  const code = ` (קוד: ${storageIssue || syncStatus || 'unknown'})`;
  if (storageIssue === 'quota') {
    return reclaimablePassiveJournals > 0
      ? { action: 'reclaim', text: `האחסון המקומי של הדפדפן מלא, ולכן השמירה לא נשלחה לחשבון. אפשר לפנות ${reclaimablePassiveJournals} יומני צפייה ישנים (לא נוגע בפריטים ששמרת) ולשמור.${code}` }
      : { action: null, text: `האחסון המקומי של הדפדפן מלא, ולכן השמירה לא נשלחה לחשבון. אפשר לפנות מקום בהגדרות הדפדפן ולנסות שוב.${code}` };
  }
  if (storageIssue === 'blocked') return { action: null, text: `הדפדפן חוסם אחסון מקומי (מצב פרטי או הגדרות), ולכן השמירה לא נשלחה לחשבון.${code}` };
  if (storageIssue === 'corrupt_state') return { action: null, text: `הנתונים המקומיים של המחקר אינם קריאים. הם נשמרו כפי שהם לשחזור, והשמירה לא נשלחה לחשבון. אפשר לפתוח לשונית חדשה או לשחזר באזור האישי.${code}` };
  if (storageIssue === 'invalid_journal') return { action: null, text: `יומן שמירה מקומי ישן בלשונית הזו אינו תקין. הוא נשמר לשחזור, והשמירה לא נשלחה. פתחו לשונית חדשה ונסו שוב.${code}` };
  if (storageIssue === 'unavailable') return { action: null, text: `האחסון המקומי אינו זמין, ולכן השמירה לא נשלחה לחשבון.${code}` };
  if (syncStatus === 'conflict') return { action: null, text: 'יש התנגשות בין המכשיר לחשבון. אפשר לפתור אותה באזור האישי.' };
  return { action: null, text: `לא ניתן להתחיל את השמירה כרגע.${code}${syncPending > 0 ? ` · ${syncPending} פעולות ממתינות לסנכרון` : ''}` };
}
