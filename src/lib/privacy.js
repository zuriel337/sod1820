// 🕶️ מצב אנונימי — חיפוש בלי שמירה בהיסטוריה האישית/הקיר.
// לפי החלטת המוצר: מכבה רק את ההיסטוריה האישית (search_log) ואת הקיר הציבורי (wall) —
// האנליטיקס הפנימי האנונימי (page_views/logView) ממשיך לעבוד כרגיל.
// נשמר ב-sessionStorage בלבד (לא בין דפדפנים) — בחירה מודעת לכל סשן, לא מתג דביק קבוע.
const KEY = "anon-search";
const subs = new Set();

export function isAnon() {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setAnon(on) {
  try { on ? sessionStorage.setItem(KEY, "1") : sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  subs.forEach(fn => { try { fn(!!on); } catch { /* ignore */ } });
}
export function onAnonChange(fn) { subs.add(fn); return () => subs.delete(fn); }
