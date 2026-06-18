// 🆕 "חדשים" בחידושי הצלבות — מעקב פר-משתמש (localStorage).
// המהבהב + המונה נדלקים רק על הצלבות שנוספו מאז שהמשתמש ראה לאחרונה.
// כשנכנסים לטאב "חידושי הצלבות" → מסמנים נראה → המונה מתאפס (לא יהבהב שוב).
const KEY = "sod-crosses-seen";
const WINDOW_DAYS = 14; // מבקר ראשון: "חדש" = נוסף ב-14 הימים האחרונים

export function getCrossesSeen() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function markCrossesSeen(ts) {
  try { localStorage.setItem(KEY, ts || new Date().toISOString()); } catch { /* ignore */ }
}

// סף ה"חדש": מתי המשתמש ראה לאחרונה, או לפני 14 יום אם מעולם לא ראה.
export function crossesCutoff() {
  return getCrossesSeen() || new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
}

// כמה הצלבות נוספו מאז שנראו לאחרונה.
export function countNewCrosses(items) {
  if (!items || !items.length) return 0;
  const cutoff = crossesCutoff();
  return items.filter(c => c.created_at && c.created_at > cutoff).length;
}

export function isNewCross(item, cutoff) {
  return !!(item && item.created_at && item.created_at > (cutoff || crossesCutoff()));
}

// תאריך עברי קצר להצגה (dd.mm.yyyy)
export function crossDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return ""; }
}
