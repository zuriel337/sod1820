// Marks the session that a password-recovery link created, so the page can ask for a new password instead of treating it as an
// ordinary sign-in. The SDK announces it once (PASSWORD_RECOVERY) while the callback URL is processed, which can happen before any
// React component has subscribed; src/lib/supabase.js therefore registers this watcher right after the client is created.
// Only the user id and a timestamp are kept (tab-scoped sessionStorage, never a token, address or password).
export const PASSWORD_RECOVERY_KEY = 'sod_pw_recovery_v1';
export const PASSWORD_RECOVERY_TTL_MS = 30 * 60 * 1000;

const listeners = new Set();
let memory = null;
const store = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };
const emit = () => { for (const listener of [...listeners]) { try { listener(); } catch { /* a listener never blocks the others */ } } };

function load(now = Date.now()) {
  if (memory) return memory.createdAt && now - memory.createdAt <= PASSWORD_RECOVERY_TTL_MS ? memory : null;
  try {
    const value = JSON.parse(store()?.getItem(PASSWORD_RECOVERY_KEY) || 'null');
    if (value && typeof value.userId === 'string' && Number.isFinite(value.createdAt) && now - value.createdAt >= 0 && now - value.createdAt <= PASSWORD_RECOVERY_TTL_MS) { memory = value; return value; }
  } catch { /* unreadable: treated as absent */ }
  return null;
}

export function markPasswordRecovery(userId, now = Date.now()) {
  if (typeof userId !== 'string' || !userId) return;
  memory = { userId, createdAt: now };
  try { store()?.setItem(PASSWORD_RECOVERY_KEY, JSON.stringify(memory)); } catch { /* the in-memory mark still serves this page */ }
  emit();
}
export function clearPasswordRecovery() {
  const had = memory !== null || Boolean((() => { try { return store()?.getItem(PASSWORD_RECOVERY_KEY); } catch { return null; } })());
  memory = null;
  try { store()?.removeItem(PASSWORD_RECOVERY_KEY); } catch { /* best effort */ }
  if (had) emit();
}
// A stable reference until the mark changes, so it can back useSyncExternalStore.
export const getPasswordRecovery = () => load();
export function subscribePasswordRecovery(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
// Does this recovery mark belong to the person currently signed in?
export const recoveryAppliesTo = userId => Boolean(userId) && load()?.userId === userId;

export function watchPasswordRecovery(client) {
  try {
    // Only flags are set inside the callback: the SDK forbids calling its own methods from here.
    return client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user?.id) markPasswordRecovery(session.user.id);
      else if (event === 'SIGNED_OUT') clearPasswordRecovery();
    });
  } catch { return null; }
}
export function resetPasswordRecoveryForTests() { memory = null; listeners.clear(); }
