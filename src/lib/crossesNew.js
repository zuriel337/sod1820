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

// ⏳ תקרת-טריות (החלטת צוריאל): תג «חדש» חי מקסימום 48 שעות מהעלייה — גם אם טרם נראה.
// ראה → נעלם מיד (markSeen). כך רק חדשות-ממש קופצות, והשאר חלק לגמרי (בלי הבהוב תמידי).
export const FRESH_HOURS = 48;
export function withinFresh(iso, hours = FRESH_HOURS) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && (Date.now() - t) < hours * 3600000;
}

// כמה הצלבות נוספו מאז שנראו לאחרונה (ובתוך חלון ה-48 שעות).
export function countNewCrosses(items) {
  if (!items || !items.length) return 0;
  const cutoff = crossesCutoff();
  return items.filter(c => c.created_at && c.created_at > cutoff && withinFresh(c.created_at)).length;
}

export function isNewCross(item, cutoff) {
  return !!(item && item.created_at && item.created_at > (cutoff || crossesCutoff()) && withinFresh(item.created_at));
}

// תאריך עברי קצר להצגה (dd.mm.yyyy)
export function crossDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return ""; }
}

// ===== גרסה גנרית — "חדש מאז ביקור אחרון" לכל משטח (בית, התכנסויות, חידושים) =====
// אותו עיקרון, מפתח נפרד לכל משטח. ביקור ראשון: חלון windowDays. משתמש ותיק: מאז שראה.
export function seenCutoff(key, windowDays = 14) {
  let saved = null;
  try { saved = localStorage.getItem("sod-seen-" + key); } catch { /* ignore */ }
  return saved || new Date(Date.now() - windowDays * 86400000).toISOString();
}
export function markSeenKey(key, ts) {
  try { localStorage.setItem("sod-seen-" + key, ts || new Date().toISOString()); } catch { /* ignore */ }
}
export function isNewSince(item, cutoff) {
  return !!(item && item.created_at && item.created_at > cutoff);
}
