// 🔒 שער-מוכנוּת — הכלים הפתוחים לציבור. השאר מציגים «בשדרוג — ייפתח בקרוב».
// פתוחים לציבור: דף-המספר · מחשבון · חיפוש-פסוקים · בית-המדרש · ראשי/סופי-תיבות.
// כשכלי מוכן לציבור — מוסיפים אותו ל-READY_TOOLS, בלי שינוי קוד אחר.
export const READY_TOOLS = new Set(["number", "gematria", "verse", "midrash", "notarikon"]);

// 👑 כלי-הדגל — מוצגים ראשונים ובולטים במרכז-הגילוי
export const FLAGSHIP_TOOLS = ["number", "gematria"];

// 🔑 כלים שכבר *ממומשים* (יש רכיב עובד) — נעולים לציבור אך פתוחים למנהל לבדיקות.
// אלו הכלים שיש להם ענף-רינדור ב-ResearchPage. כלים שעדיין לא נבנו (cross/dates/ai)
// אינם כאן → גם למנהל מציגים «בשדרוג» (כדי לא להציג מסך ריק).
export const IMPLEMENTED_TOOLS = new Set([
  "number", "gematria", "verse", "midrash", "notarikon",
  "els", "journey", "name", "family", "compare", "life", "import",
]);

// שער-המוכנוּת: פתוח אם ציבורי, או — למנהל — אם הכלי ממומש (לבדיקות).
export const isToolReady = (id, isAdmin = false) =>
  READY_TOOLS.has(id) || (isAdmin && IMPLEMENTED_TOOLS.has(id));

// כלי שפתוח רק בזכות הרשאת-מנהל (להצגת תווית «🔑 אדמין» בלבד).
export const isAdminOnlyTool = (id, isAdmin = false) =>
  isAdmin && !READY_TOOLS.has(id) && IMPLEMENTED_TOOLS.has(id);

export const UPGRADE_MSG = "🔬 הכלי בשדרוג — ייפתח בקרוב לכל החוקרים";
