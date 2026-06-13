import { useSyncExternalStore } from "react";

// חנות גלובלית קטנה ל"מגירת המספר" — נפתחת מכל מקום באתר (חיפוש, לחיצה על מספר).
let state = { open: false, term: null };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function openNumberDrawer(term) {
  state = { open: true, term: String(term).trim() };
  emit();
}
export function closeNumberDrawer() {
  state = { ...state, open: false };
  emit();
}
export function useNumberDrawer() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb); },
    () => state, () => state
  );
}
