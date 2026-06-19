// ===== חוק הצבעים הגלובלי של העולמות (worlds_color_law) =====
// מקור אמת יחיד: כל עולם (nodes.metadata.world) משויך למשפחת-צבע קבועה, אחידה בכל האתר.
// ציר רוחני: דין (אדום) → רם/חסד (תכלת). כך הסינון מדויק והצבע זהה בכל מקום.

export const WORLD_FAMILIES = {
  geula:   { label: "גאולה וקודש",        color: "#c9a227" }, // זהב
  shem:    { label: "שמות הקודש ואלוהות", color: "#d4af37" }, // זהב בהיר
  kabbala: { label: "קבלה וסוד",          color: "#8b5cf6" }, // סגול
  avoda:   { label: "עבודת ה' ומידות",     color: "#3ea6ff" }, // תכלת — רם
  malachim:{ label: "מלאכים",             color: "#5bc8e6" }, // תכלת בהיר
  avot:    { label: "אבות ונביאים",        color: "#2f9e6b" }, // ירוק
  din:     { label: "דין וסטרא אחרא",      color: "#d64545" }, // אדום
  zman:    { label: "זמן ומועד",          color: "#e08a2e" }, // כתום
  olam:    { label: "עולם ואקטואליה",      color: "#6b7a99" }, // כחול-אפור
  teva:    { label: "טבע וגוף",           color: "#8a7a4a" }, // חום
  other:   { label: "כללי",               color: "#9a9285" }, // אפור נייטרלי
};

// מיפוי 42 העולמות → משפחות
const WORLD_TO_FAMILY = {
  "גאולה": "geula", "חתימות 1820": "geula", "מקומות קדושים": "geula", "תורה וקודש": "geula", "ספרי קודש": "geula",
  "שמות הקודש": "shem", "אלוהות": "shem", "צירופים קדושים": "shem",
  "מושגי קבלה": "kabbala", "קבלה": "kabbala", "ספירות": "kabbala", "בריאה": "kabbala", "עץ המספרים": "kabbala", "סמלים": "kabbala",
  "עבודת ה'": "avoda", "מידות ומושגים": "avoda", "רגש": "avoda", "רפואה והחיים": "avoda",
  "מלאכים": "malachim",
  "אבות ואמהות": "avot", "נביאים": "avot", "שבטים ונביאים": "avot", "שבטי ישראל": "avot", "רבנים וחכמים": "avot",
  "צל וסטרא אחרא": "din", "מלחמה ותיקון": "din",
  "זמן": "zman", "חודשי השנה": "zman", "חגים ומועדים": "zman", "אירועי הזמן": "zman",
  "אקטואליה ואומות": "olam", "מודרני ומדע": "olam", "טכנולוגיה": "olam", "דמויות בנות-זמננו": "olam", "אנשים": "olam",
  "שמות פרטיים": "olam", "מקומות": "olam", "ארץ ועם": "olam", "מלכות ושלטון": "olam", "כסף ושפע": "olam",
  "טבע ויסודות": "teva", "גוף האדם": "teva",
};

export function worldFamily(world) {
  return WORLD_FAMILIES[WORLD_TO_FAMILY[world] || "other"];
}
export function worldColor(world) {
  return worldFamily(world).color;
}
