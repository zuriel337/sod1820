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
