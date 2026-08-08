// 🗂️ שולחן השופט כתור-עבודה אישי — שכבת UX פר-משתמש (localStorage) מעל המועמדים הקיימים.
// אין מנגנון-למידה חדש ואין מקור-אמת נוסף: רק «חדש מאז ביקורי» + «כבר ראיתי» לכל משתמש,
// בדיוק כמו whats_new_law/crossesNew. הכלל החקוק:
//   ראיתי ≠ אישרתי · לא ראיתי ≠ דחיתי · התעלמתי ≠ דחיתי · רק דחייה מפורשת = החלטה נלמדת.
// «כבר ראיתי» נשמר מקומית בלבד ואינו נכתב ל-decision_ledger/Learned-Pattern — הצפייה אינה החלטה.

const VISIT_KEY = "sod-judge-lastvisit";  // מתי המשתמש בדק לאחרונה את השולחן (סף ה«חדש»)
const SEEN_KEY = "sod-judge-seen";        // { subject_ref: ISO } — מועמדים שהמשתמש כבר פתח/ראה
const WINDOW_DAYS = 14;                    // ביקור-ראשון: «חדש» = עד 14 יום אחורה
export const AGING_DAYS = 7;              // «ממתין הרבה» = מעל שבוע על השולחן

const fallbackIso = () => new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();

// סף ה«חדש»: מתי בדקת לאחרונה, או 14 יום אחורה אם מעולם לא.
export function judgeLastVisit() {
  try { return localStorage.getItem(VISIT_KEY) || fallbackIso(); }
  catch { return fallbackIso(); }
}
// מסמן שבדקת עכשיו → הפעם הבאה תראה «חדש» רק מה שנכנס מאז.
export function markJudgeVisited(ts) {
  try { localStorage.setItem(VISIT_KEY, ts || new Date().toISOString()); } catch { /* ignore */ }
}

export function getSeenMap() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch { return {}; }
}
// מסמן מועמד יחיד כ«כבר ראיתי» (לא דורס תאריך קיים).
export function markCandidateSeen(ref, ts) {
  if (!ref) return getSeenMap();
  try {
    const m = getSeenMap();
    if (!m[ref]) { m[ref] = ts || new Date().toISOString(); localStorage.setItem(SEEN_KEY, JSON.stringify(m)); }
    return m;
  } catch { return getSeenMap(); }
}
// מסמן אצווה שלמה כ«כבר ראיתי» (כפתור «סמן הכל כנראה»).
export function markAllSeen(refs) {
  try {
    const m = getSeenMap(); const now = new Date().toISOString();
    (refs || []).forEach(r => { if (r && !m[r]) m[r] = now; });
    localStorage.setItem(SEEN_KEY, JSON.stringify(m));
    return m;
  } catch { return getSeenMap(); }
}

// גיל המועמד על השולחן, בימים שלמים (0 = היום). הגיל אינו מעלה חשיבות — לתצוגה בלבד.
export function ageDays(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
}
export function ageLabel(iso) {
  const d = ageDays(iso);
  return d <= 0 ? "היום" : d === 1 ? "יום" : d + " ימים";
}

// שיוך מועמד למצבי-התור (לא בלעדיים): 🆕 חדש · 👀 כבר ראיתי · 🔥 דורש תשומת לב · 🕰️ ממתין הרבה.
// חשוב: 🔥 = דירוג-חוזק של השופט (recommendation), לא הגיל. מועמד ישן לא הופך חזק מעצמו.
export function candidateState(c, cutoff, seen) {
  const ref = c.subject_ref;
  const isSeen = !!(seen && seen[ref]);
  const isNew = !isSeen && !!(c.created_at && c.created_at > cutoff);
  const isStrong = c.recommendation === "strong";
  const days = ageDays(c.created_at);
  return { isNew, isSeen, isStrong, days, isAging: days >= AGING_DAYS };
}
