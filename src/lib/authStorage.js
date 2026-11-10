// Resilient storage for the existing Supabase Auth client (not a second Auth system: it is the `storage` the one client is given).
//
// Why: the SDK writes the PKCE code verifier and the session to its storage *before* any request. With `localStorage` as the only
// store, a full quota or blocked site data made every sign-in method fail before a request left the browser.
//
// Behaviour
//  * Writes go to the primary store (localStorage on the canonical origin). If that write throws, the SAME key is written to the
//    secondary store (sessionStorage: it survives reload and the OAuth redirect inside the tab), and if that also throws, to memory
//    (this page load only). The write never throws.
//  * Reads check memory, then secondary, then primary, so a fresh value written to a fallback is never shadowed by a stale one that
//    could not be replaced in the primary.
//  * A later successful primary write removes the key from the fallbacks (the primary is again the source of truth).
//  * Nothing is evicted: no key of the application, the research store, drafts or ciphers is ever removed to make room.
//
// Durability is reported honestly: 'durable' (primary), 'tab' (kept for this tab only, lost when it closes), 'none' (this page load
// only: an OAuth redirect or reload loses it).
const str = value => String(value ?? '');

function resolveStore(reference) {
  try { return (typeof reference === 'function' ? reference() : reference) || null; } catch { return null; }
}

export function isStorageError(error) {
  if (!error) return false;
  const name = str(error.name), message = str(error.message);
  if (/^(QuotaExceededError|NS_ERROR_DOM_QUOTA_REACHED)$/.test(name) || (name === 'SecurityError' && /storage|access is denied|denied for this document/i.test(message))) return true;
  if (Number(error.code) === 22 && /quota|storage/i.test(message + name)) return true;
  return /\b(setItem|getItem|removeItem)\b|exceeded the quota|quota[_ ]?(exceeded|reached)|'(local|session)Storage'|access is denied for this document/i.test(message);
}

export function createResilientAuthStorage({ primary, secondary, onChange } = {}) {
  const memory = new Map();
  const lastKnown = new Map();   // last value this page read from or wrote to the primary: used only when a later primary read THROWS
  const state = { mode: 'normal', lastFailure: null, degradedKeys: new Set() };
  const notify = () => { try { onChange?.(status()); } catch { /* observers never affect storage */ } };
  const failure = (op, error) => { state.lastFailure = { op, name: str(error?.name) || 'Error' }; };

  function status() {
    const persistence = state.mode === 'normal' ? 'durable' : state.mode === 'session' ? 'tab' : 'none';
    return { mode: state.mode, persistence, degradedKeys: state.degradedKeys.size, lastFailure: state.lastFailure };
  }
  function stores() {
    const first = resolveStore(primary), second = resolveStore(secondary);
    return { first, second: second && second !== first ? second : null };
  }
  const safeRemove = (store, key) => { try { store?.removeItem(key); } catch { /* best effort */ } };

  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      const { first, second } = stores();
      if (second) {
        try {
          const value = second.getItem(key);
          if (value != null) {
            // A value that lives only in the tab store means the primary could not hold it: report that after a reload too.
            if (!state.degradedKeys.has(key)) { state.degradedKeys.add(key); if (state.mode === 'normal') state.mode = 'session'; notify(); }
            return value;
          }
        } catch (error) { failure('read', error); }
      }
      if (first) {
        try { const value = first.getItem(key); if (value != null) lastKnown.set(key, value); return value; }
        catch (error) { failure('read', error); if (lastKnown.has(key)) { state.degradedKeys.add(key); if (state.mode === 'normal') state.mode = 'session'; return lastKnown.get(key); } }
      }
      return null;
    },
    setItem(key, value) {
      const { first, second } = stores();
      if (first) {
        try {
          first.setItem(key, value);
          lastKnown.set(key, value);
          // The primary holds the truth again: drop any fallback copy so it can never shadow a newer primary value.
          memory.delete(key); safeRemove(second, key);
          if (state.degradedKeys.delete(key)) { if (!state.degradedKeys.size) state.mode = 'normal'; notify(); }
          return;
        } catch (error) { failure('write', error); }
      }
      state.degradedKeys.add(key);
      if (second) {
        try { second.setItem(key, value); memory.delete(key); state.mode = state.mode === 'memory' ? 'memory' : 'session'; notify(); return; }
        catch (error) { failure('write', error); }
      }
      memory.set(key, value); state.mode = 'memory'; notify();
    },
    removeItem(key) {
      memory.delete(key); lastKnown.delete(key);
      const { first, second } = stores();
      safeRemove(first, key); safeRemove(second, key);
      if (state.degradedKeys.delete(key) && !state.degradedKeys.size) { state.mode = 'normal'; notify(); }
    },
    // Can a value written now survive a reload / redirect? Writes and removes a tiny probe key; touches nothing else.
    probe() {
      const key = 'sod_auth_probe';
      const { first, second } = stores();
      for (const [store, level] of [[first, 'durable'], [second, 'tab']]) {
        if (!store) continue;
        try { store.setItem(key, '1'); store.removeItem(key); return level; } catch { /* try the next store */ }
      }
      return 'none';
    },
    status,
  };
}

// The one resilient storage of this page, reachable by the UI for honest messages.
let activeStorage = null;
export function registerAuthStorage(storage) { activeStorage = storage; return storage; }
export function authStorageStatus() { return activeStorage?.status?.() || { mode: 'normal', persistence: 'durable', degradedKeys: 0, lastFailure: null }; }
export function probeAuthStorage() { return activeStorage?.probe?.() || 'durable'; }

// Names and sizes only, never values. Identifiers inside key names are masked and keys of the same shape are grouped, so a pile of
// per-load or per-day keys shows up as one line ("... :pending:<id> x312"), which is how an unbounded writer becomes visible.
export function summarizeLocalStorage(store = resolveStore(() => globalThis.localStorage), { top = 8 } = {}) {
  const groups = new Map(); let total = 0;
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i); const value = store.getItem(key) ?? '';
      const chars = key.length + value.length; total += chars;
      const shape = key.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>').replace(/(:pending:|:conflict:|_cmt_|ua_visit_<id>_).*$/, '$1<…>').replace(/\d{4}-\d{2}-\d{2}/g, '<date>').replace(/\d{6,}/g, '<n>').slice(0, 64);
      const group = groups.get(shape) || { key: shape, count: 0, chars: 0 }; group.count++; group.chars += chars; groups.set(shape, group);
    }
  } catch { return { available: false, totalChars: 0, entries: [] }; }
  return { available: true, totalChars: total, entries: [...groups.values()].sort((a, b) => b.chars - a.chars).slice(0, top) };
}
