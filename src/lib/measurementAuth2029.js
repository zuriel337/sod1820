// A memory-only snapshot of the existing AuthProvider session. It never grants
// authority: PostgREST verifies the captured JWT and SQL derives auth.uid().
let current = Object.freeze({ ready: false, userId: null, token: null });
const listeners = new Set();
export function measurementAuth() { return current; }
export function subscribeMeasurementAuth(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setMeasurementAuth(session, ready = true) {
  const next = Object.freeze({ ready, userId: session?.user?.id || null, token: session?.access_token || null });
  const changed = current.userId !== next.userId || current.ready !== next.ready;
  current = next;
  if (changed) for (const fn of listeners) { try { fn(next); } catch { /* telemetry cannot interrupt authentication */ } }
}
