// The units of the Post being read (identity + references) and which one is ACTIVE, shared between the Post page (producer) and the
// left panel's context tab (consumer). A tiny presentational bridge: it holds NO content, creates no relation and is not a store of
// truth. The same identities are published as plain strings on the existing research context (`postUnitRefs`, `postUnitLinkRefs`,
// `activeUnitRef`), the only shape that context accepts; this bridge only carries the richer display fields to the panel.
const listeners = new Set();
let state = { postId: null, units: [], activeKey: null };
export const getPostUnitState = () => state;
export const subscribePostUnits = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => { for (const fn of listeners) { try { fn(); } catch { /* a listener never breaks the page */ } } };
export function setPostUnits(postId, units) {
  const same = state.postId === postId && JSON.stringify(state.units) === JSON.stringify(units);
  if (same) return;
  state = { ...state, postId, units, activeKey: units.some((u) => u.key === state.activeKey) && state.postId === postId ? state.activeKey : (units[0]?.key || null) };
  emit();
}
export function setActivePostUnit(key) { if (state.activeKey !== key) { state = { ...state, activeKey: key }; emit(); } }
export function clearPostUnits() { if (state.units.length || state.postId != null) { state = { postId: null, units: [], activeKey: null }; emit(); } }

// Plain strings for the existing research context (identities and canonical references only).
export function unitContextStrings(units) {
  return {
    postUnitRefs: units.map((u) => u.ref),
    postUnitLinkRefs: units.flatMap((u) => u.references.map((r) => `${u.ref}>${r.kind}:${r.ref}`)),
  };
}
