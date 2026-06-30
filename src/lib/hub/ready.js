// 🔒 שער-מוכנוּת — הכלים הפתוחים. השאר מציגים «בשדרוג — ייפתח בקרוב».
// פתוחים: דף-המספר · מחשבון · דילוגי-אותיות (3 הכלים הבולטים) + חיפוש-פסוקים.
// כשכלי מוכן — מוסיפים אותו ל-READY_TOOLS, בלי שינוי קוד אחר.
export const READY_TOOLS = new Set(["number", "gematria", "els", "verse"]);
// 👑 כלי-הדגל — מוצגים ראשונים ובולטים במרכז-הגילוי
export const FLAGSHIP_TOOLS = ["number", "gematria", "els"];
export const isToolReady = (id) => READY_TOOLS.has(id);
export const UPGRADE_MSG = "🔬 הכלי בשדרוג — ייפתח בקרוב לכל החוקרים";
