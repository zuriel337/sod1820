// 🔒 שער-מוכנוּת — הכלים הפתוחים. השאר מציגים «בשדרוג — ייפתח בקרוב».
// פתוחים: דף-המספר · מחשבון · דילוגי-אותיות (3 הכלים הבולטים) + חיפוש-פסוקים + בית-המדרש.
// כשכלי מוכן — מוסיפים אותו ל-READY_TOOLS, בלי שינוי קוד אחר.
// els (דילוגים/צפנים) סגור — «בבנייה» עד החלטת צוריאל.
export const READY_TOOLS = new Set(["number", "gematria", "verse", "midrash", "notarikon"]);
// 👑 כלי-הדגל — מוצגים ראשונים ובולטים במרכז-הגילוי
export const FLAGSHIP_TOOLS = ["number", "gematria"];
export const isToolReady = (id) => READY_TOOLS.has(id);
export const UPGRADE_MSG = "🔬 הכלי בשדרוג — ייפתח בקרוב לכל החוקרים";
