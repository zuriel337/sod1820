import { useEffect, useReducer } from "react";

// 👁 «תצוגת משתמש» — מתג שמאפשר למנהל לראות את ההיכל בדיוק כמו משתמש רגיל (בלי 🔑, בלי כלים נעולים,
// בלי באנר-מנהל). נשמר ב-localStorage כדי לשרוד ניווט ורענון. מקור-אמת יחיד לכל רכיבי ההיכל.
let _asUser = false;
try { _asUser = localStorage.getItem("sod_view_as_user") === "1"; } catch { /* noop */ }
const subs = new Set();

export function isViewAsUser() { return _asUser; }

export function setViewAsUser(v) {
  _asUser = !!v;
  try { localStorage.setItem("sod_view_as_user", _asUser ? "1" : "0"); } catch { /* noop */ }
  subs.forEach(f => { try { f(); } catch { /* noop */ } });
}

// hook ריאקטיבי — כל רכיב שקורא אותו יתעדכן כשהמתג משתנה.
export function useViewAsUser() {
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => { subs.add(force); return () => subs.delete(force); }, []);
  return _asUser;
}
