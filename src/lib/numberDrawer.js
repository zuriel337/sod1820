import { useSyncExternalStore } from "react";

// חנות גלובלית קטנה ל"מגירת המספר" — נפתחת מכל מקום באתר (חיפוש, לחיצה על מספר).
let state = { open: false, term: null };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function openNumberDrawer(term) {
  state = { open: true, term: term != null ? String(term).trim() : (state.term || null) };
  emit();
}

// 👁️ תצוגה פרטית בעורך הפוסטים:
// PostEditorPage כבר מרנדר את גוף הפוסט עם אותם data-gem של הפוסט הציבורי,
// אבל עד עכשיו הקליקים בתצוגה לא הגיעו ל-NumberDrawer הקנוני.
// הגשר הזה מצומצם ל-.pe-prev בלבד, כדי לא ליצור מערכת Preview/Calculator מקבילה.
// במצב עריכה-חיה (contentEditable) לא פותחים Drawer כדי לא להפריע לעריכה.
const EDITOR_PREVIEW_BRIDGE_KEY = "__sodEditorNumberDrawerBridgeV1";
if (typeof window !== "undefined" && typeof document !== "undefined" && !window[EDITOR_PREVIEW_BRIDGE_KEY]) {
  document.addEventListener("click", (event) => {
    const gem = event.target?.closest?.(".pe-prev [data-gem]");
    if (!gem || gem.closest?.('[contenteditable="true"]')) return;
    const term = gem.getAttribute("data-gem");
    if (!term || !term.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    openNumberDrawer(term);
  });
  window[EDITOR_PREVIEW_BRIDGE_KEY] = true;
}

export function toggleNumberDrawer() {
  state = { ...state, open: !state.open };
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
