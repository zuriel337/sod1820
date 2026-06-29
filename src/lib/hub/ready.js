// 🔒 שער-מוכנוּת — בתקופת השדרוג רק שני כלים פתוחים: דף-המספר והמחשבון.
// כל השאר מציגים «בשדרוג — ייפתח בקרוב» (בדוק, בתפריטי-המעבדה ובכניסה ישירה).
// כשכלי מוכן — מוסיפים אותו ל-READY_TOOLS, בלי שינוי קוד אחר.
export const READY_TOOLS = new Set(["number", "gematria"]);
export const isToolReady = (id) => READY_TOOLS.has(id);
export const UPGRADE_MSG = "🔬 הכלי בשדרוג — ייפתח בקרוב לכל החוקרים";
