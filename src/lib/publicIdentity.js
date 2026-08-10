// 🔒 מפענח־זהות קנוני יחיד (single source of truth) לכל תצוגת־כותב ציבורית באתר.
//
// עיקרון־על (חוק צוריאל, `identity_architecture_law` + החלטות מיפוי-הזהות):
//   מקור־חומר ≠ מי שעיבד ≠ author ציבורי.
//   • זהות פרטית (צוריאל פולייס) / מותג־מערכת (SOD1820) / provenance של AI/מנוע/זהב
//     → כולם byline ציבורי אחד ויחיד: «מערכת כי לה׳ המלוכה».
//   • שם־חוקר/כתב אמיתי (יניב לוי, ציון סיבוני, כריסטינה…) נשמר כ-sourceCredit —
//     בלי להפוך אותו ל-author הראשי כשהתוצר עצמו הוא של המערכת.
//
// ⚠️ חוק־ברזל: ה-resolver **אינו** משנה provenance פנימי (origin/created_by/source
//    נשמרים בנתונים כפי שהם) — הוא ממפה **רק את מה שנראה למשתמש**.
//
// חתימה עשירה (rich context) כדי שהסתעפות עתידית לפי עדשה/סוג-תוכן לא תיחסם:
//   publicIdentity({ internalIdentity, provenance, contentType, sourceResearcher, lens })
//   → { author, sourceCredit }
// אפשר גם לקרוא עם מחרוזת גולמית בלבד: publicIdentity("צוריאל") — המסלול הנפוץ.

// ה-byline הציבורי הקנוני (עם גרש ׳, לא apostrophe ') — חייב להתאים למפתח ב-authors.js.
export const SYSTEM_BYLINE = "מערכת כי לה׳ המלוכה";

// שמות סוכנים/בוטים פנימיים (agent_identity). כ-byline לבד = «המערכת» (הם *עיבוד*, לא author).
// כריסטינה **אינה** כאן — היא אדם/חוקרת/מקור־חומר, לא סוכן.
const AGENT_NAMES = new Set([
  "רזיאל", "מטטרון", "אוריאל", "גבריאל", "סנדלפון", "התשבי", "מיכאל", "אספקלריא",
  "כריסטינה-בוט", "wa-christina",
]);

// כל אלה = אותה ישות ציבורית אחת (המערכת): זהות־פרטית · מותג · provenance של AI/מנוע/זהב/אדמין.
// ההשוואה מתבצעת גם על המחרוזת כמות-שהיא וגם ב-lower-case.
const SYSTEM_ALIASES = new Set([
  "", "המערכת", "מערכת",
  "sod1820", "sod 1820", "agent:sod1820",
  "system",
  "צוריאל", "צוריאל פולייס", "zuriel", "zuriel polis",
  "צוריאל פולייס, סוד 1820, 2026",
  "ai", "בית המדרש", "בית המדרש · ai",
  "gap-fill",
  "זהב לא-מחובר", "זהב אחר",
  "admin-hunt", "מנוע התגליות", "מנוע הגילויים", "מנוע חידושי ההצלבות",
  // וריאנט עם apostrophe ישר של ה-byline עצמו → מנורמל לגרש הקנוני
  "מערכת כי לה' המלוכה", "מערכת כי לה׳ המלוכה",
]);

function isSystemIdentity(name) {
  const n = String(name == null ? "" : name).trim();
  if (!n) return true;
  if (SYSTEM_ALIASES.has(n) || SYSTEM_ALIASES.has(n.toLowerCase())) return true;
  if (AGENT_NAMES.has(n)) return true;   // סוכן בודד כ-byline = המערכת
  return false;
}

// מפרק «סוכן · מקור» (למשל «רזיאל · כריסטינה»): הסוכן = עיבוד/provenance, הצד האנושי = מקור־חומר.
// מחזיר { identity, sourceCredit } — identity הוא מה שיוכרע ל-author, sourceCredit נשמר בנפרד.
function splitAgentSource(raw) {
  if (!raw.includes("·")) return { identity: raw, sourceCredit: null };
  const parts = raw.split("·").map(s => s.trim()).filter(Boolean);
  const agentSide = parts.find(p => AGENT_NAMES.has(p));
  const humanSide = parts.find(p => !AGENT_NAMES.has(p) && !isSystemIdentity(p));
  if (agentSide && humanSide) {
    // «רזיאל · כריסטינה» → identity=«רזיאל» (→ המערכת), sourceCredit=«כריסטינה»
    return { identity: agentSide, sourceCredit: humanSide };
  }
  return { identity: raw, sourceCredit: null };
}

/**
 * ה-resolver הקנוני. מקבל מחרוזת גולמית או אובייקט-הקשר עשיר.
 * @returns {{ author: string, sourceCredit: string|null }}
 */
export function publicIdentity(input) {
  const ctx = (input && typeof input === "object") ? input : { internalIdentity: input };
  const raw = String(ctx.internalIdentity == null ? "" : ctx.internalIdentity).trim();

  // מקור־חומר מפורש מגובר על ניחוש מהמחרוזת.
  let sourceCredit = ctx.sourceResearcher ? String(ctx.sourceResearcher).trim() : null;

  const split = splitAgentSource(raw);
  const identity = split.identity;
  if (!sourceCredit && split.sourceCredit) sourceCredit = split.sourceCredit;

  // זהות־מערכת/פרטית/provenance/מנוע/זהב/סוכן → byline ציבורי אחיד.
  if (isSystemIdentity(identity)) {
    return { author: SYSTEM_BYLINE, sourceCredit: sourceCredit || null };
  }
  // כתב/חוקר אמיתי → נשאר author ציבורי לגיטימי.
  return { author: identity, sourceCredit: sourceCredit || null };
}

// נוחות: מחזיר רק את מחרוזת ה-author (רוב אתרי-הקריאה צריכים רק את הטקסט).
export function publicAuthorName(input) {
  return publicIdentity(input).author;
}
