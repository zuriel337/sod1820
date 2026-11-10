// Safe recovery for a page stuck on an outdated runtime (stale service worker or cached code).
// Unregisters service workers and deletes CacheStorage, then reloads. It deliberately does NOT touch localStorage,
// sessionStorage or IndexedDB, so the signed-in session, drafts and saved work survive. Nothing is reinstalled by hand.
export async function refreshAppRuntime({ navigatorRef = globalThis.navigator, cachesRef = globalThis.caches, reload = () => globalThis.location.reload() } = {}) {
  let unregistered = 0, deleted = 0;
  try {
    const registrations = (await navigatorRef?.serviceWorker?.getRegistrations?.()) || [];
    for (const registration of registrations) { if (await registration.unregister()) unregistered++; }
  } catch { /* continue: the reload below still fetches a fresh document */ }
  try {
    const keys = (await cachesRef?.keys?.()) || [];
    for (const key of keys) { if (await cachesRef.delete(key)) deleted++; }
  } catch { /* best effort */ }
  reload();
  return { unregistered, deleted };
}
