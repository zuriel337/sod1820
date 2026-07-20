// 🔒 שער-מוכנוּת — הכלים הפתוחים לציבור. השאר מציגים «בשדרוג — ייפתח בקרוב».
// פתוחים לציבור: דף-המספר · מחשבון · חיפוש-פסוקים · בית-המדרש · ראשי/סופי-תיבות.
// כשכלי מוכן לציבור — מוסיפים אותו ל-READY_TOOLS, בלי שינוי קוד אחר.

// 🔓 דגל-מאסטר יחיד לפתיחת דילוגי-האותיות (ELS) לציבור.
// כרגע false → ELS אדמין-בלבד: גם כלי-המעבדה (/research?tool=els) וגם העמוד /code.
// היום למנהל הכל עובד ומסודר; ביום שתחליט — הופכים ל-true והשניים נפתחים לציבור
// **בבת-אחת, בשורה אחת** (READY_TOOLS למעבדה + CodePage ל-/code קוראים את אותו דגל).
export const ELS_PUBLIC = false;

// 👁 פתיחת-פרוביו: /code נפתח אוטומטית בלי התחברות בכל host שאינו הדומיין הפרודקשן
// (Vercel preview / localhost) — כדי שצוריאל יראה את הדילוגים בפרוביו בלי סיסמה.
// פרודקשן (sod1820.co.il) נשאר נעול לפי ELS_PUBLIC/אדמין — אין דליפה גם אם הענף ימוזג.
export const ELS_PREVIEW_OPEN =
  typeof window !== "undefined" && !/(^|\.)sod1820\.co\.il$/i.test(window.location.hostname);

// 🔓 היכל-הגילוי נפתח בהדרגה. הכלים שברשימה פתוחים לציבור; השאר מסומנים «בבנייה».
// (החלטת צוריאל 7.2026). המנהל ממשיך לעבוד על הכל דרך IMPLEMENTED_TOOLS. כשנפתח לציבור —
// מחזירים כלים לרשימה כאן (number/gematria/verse/notarikon/els) בשורה אחת.
export const READY_TOOLS = new Set([
  "midrash",
  "number",     // 🔓 דף המספר — נפתח לציבור במרכז הגילוי (מסע 3 השכבות)
  "gematria",   // 🔓 מחשבון גימטריה (מנתב לבית המדרש · טאב מחשבון)
  "compare",    // 🔓 השוואת מילים (השוואת שניים)
  "verse",      // 🔓 חיפוש בפסוקים
  "import",     // 🔓 ניתוח קובץ
  "notarikon",  // 🔓 ראשי / אמצעי / סופי תיבות
  "name",       // 🔓 מנוע השמות (מעבדת השם — כל המנועים + התכנסויות + גשרים)
  "dates",      // 🔓 תאריכים עבריים (לועזי → עברי + גימטריה, hebcal)
  "maftech",    // 🔓 שיטת המפתח (lab) — נפתח לציבור באישור כריסטינה (20.7.2026)
]);

// 👑 כלי-הדגל — מוצגים ראשונים ובולטים במרכז-הגילוי
export const FLAGSHIP_TOOLS = ["number", "gematria"];

// 🔑 כלים שכבר *ממומשים* (יש רכיב עובד) — נעולים לציבור אך פתוחים למנהל לבדיקות.
// אלו הכלים שיש להם ענף-רינדור ב-ResearchPage. כלים שעדיין לא נבנו (cross/dates/ai)
// אינם כאן → גם למנהל מציגים «בשדרוג» (כדי לא להציג מסך ריק).
export const IMPLEMENTED_TOOLS = new Set([
  "number", "gematria", "verse", "midrash", "notarikon",
  "els", "journey", "name", "family", "compare", "life", "import", "dates",
  "maftech", // 🔑 שיטת המפתח (lab) — אדמין-בלבד עד אישור כריסטינה; אז מוסיפים ל-READY_TOOLS בשורה אחת.
]);

// שער-המוכנוּת: פתוח אם ציבורי, או — למנהל — אם הכלי ממומש (לבדיקות).
export const isToolReady = (id, isAdmin = false) =>
  READY_TOOLS.has(id) || (isAdmin && IMPLEMENTED_TOOLS.has(id));

// כלי שפתוח רק בזכות הרשאת-מנהל (להצגת תווית «🔑 אדמין» בלבד).
export const isAdminOnlyTool = (id, isAdmin = false) =>
  isAdmin && !READY_TOOLS.has(id) && IMPLEMENTED_TOOLS.has(id);

export const UPGRADE_MSG = "🔬 הכלי בשדרוג — ייפתח בקרוב לכל החוקרים";

// 🔡 לוגו «דילוגי אותיות» (זכוכית-מגדלת זהב) — סמל-תמונה שמחליף את האימוג'י/SVG בתפריטים ובהיכל.
export const ELS_LOGO = "/els-icon.png";   // סמל הצפנים הרשמי (זכוכית-מגדלת + אותיות עבריות) — לא אותיות אנגלית
