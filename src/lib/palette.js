// ===== מערכת התמות — מקור אמת לטוקנים סמנטיים (חוק העץ האחד) =====
// בעלות: הסוכן הראשי (הלוגיקה). ערכי ה-hex של תמת light = הסוכן השני.
// טוקנים לפי תפקיד (semantic), לא לפי צבע — כל תמה ממלאת בדיוק את אותם מפתחות.
// מערכת אחת בלבד, לא מקבילה. כל הרכיבים קוראים מכאן (לעתיד: גלגול ל-CSS vars).
//
// כלל ברזל: בכל תמה, ink חייב ניגודיות ≥4.5:1 מול pageBg (קריאוּת — קדוש).

// רשימת הטוקנים הקנונית — החוזה שהסוכן השני ממלא לכל תמה.
export const TOKENS = [
  "pageBg",       // רקע הדף
  "card",         // רקע כרטיס
  "cardSoft",     // כרטיס משני
  "cardGrad",     // גרדיאנט כרטיס
  "border",       // קו מסגרת
  "borderStrong", // קו מסגרת חזק
  "ink",          // טקסט ראשי (כותרות)
  "inkSoft",      // טקסט גוף
  "accent",       // זהב — אייקונים/קווים
  "accentText",   // זהב-טקסט קריא
  "accentDim",    // זהב מעומעם
  "heroNum",      // המספר הענק
  "accentBtn",    // רקע כפתור זהב (gradient)
  "onAccent",     // טקסט על כפתור זהב
  "glow",         // זוהר
  "labBg",        // רקע המעבדה
];

export const PALETTES = {
  // 🌙 שחור מלכותי — התמה הקיימת (זהב-על-שחור). מקור: theme.js (C).
  dark: {
    label: "מלכותי", icon: "🌙",
    pageBg: "#07050E",
    card: "rgba(20,15,12,.6)",
    cardSoft: "rgba(8,5,2,.42)",
    cardGrad: "linear-gradient(160deg,rgba(20,15,12,.7),rgba(8,5,2,.55))",
    border: "rgba(212,175,55,0.18)",
    borderStrong: "rgba(212,175,55,0.38)",
    ink: "#e8c840",
    inkSoft: "#cfc9d6",
    accent: "#d4af37",
    accentText: "#f6e27a",
    accentDim: "#9a7818",
    heroNum: "#f6e27a",
    accentBtn: "linear-gradient(135deg,#e9c84a,#9a7818)",
    onAccent: "#1a0e00",
    glow: "rgba(212,175,55,.4)",
    labBg: "#0d0a0e",
  },

  // 📜 קרם/קלף — חם, תלמודי, "ספר עתיק". נבנה — לשנות רק בתיאום.
  cream: {
    label: "קלף", icon: "📜",
    pageBg: "#f6f1e6",
    card: "#ffffff",
    cardSoft: "#faf6ec",
    cardGrad: "linear-gradient(160deg,#ffffff,#f4ecda)",
    border: "rgba(154,120,24,.22)",
    borderStrong: "rgba(154,120,24,.45)",
    ink: "#2c2719",
    inkSoft: "#6b6354",
    accent: "#9a7818",
    accentText: "#7a5e12",
    accentDim: "#b08a2e",
    heroNum: "#b8901f",
    accentBtn: "linear-gradient(135deg,#c9a83e,#9a7818)",
    onAccent: "#3a2a00",
    glow: "rgba(154,120,24,.18)",
    labBg: "#f2ead9",
  },

  // ☀ בהיר/לבן — נקי, קריר, מודרני (אפליקציה).
  // ❗ ערכים זמניים בלבד — הסוכן השני ממלא את ה-hex הסופי דרך החוזה (TOKENS).
  // כלל ברזל: ink ניגודיות ≥4.5:1 מול pageBg. שיהיה שונה במצב-רוח מ-cream.
  light: {
    label: "בהיר", icon: "☀",
    pageBg: "#ffffff",       // TODO(agent-2)
    card: "#ffffff",         // TODO(agent-2)
    cardSoft: "#f4f6f8",     // TODO(agent-2)
    cardGrad: "linear-gradient(160deg,#ffffff,#eef1f5)", // TODO(agent-2)
    border: "rgba(30,40,60,.12)",        // TODO(agent-2)
    borderStrong: "rgba(30,40,60,.28)",  // TODO(agent-2)
    ink: "#1b2330",          // TODO(agent-2)
    inkSoft: "#566072",      // TODO(agent-2)
    accent: "#b8901f",       // TODO(agent-2)
    accentText: "#8a6a12",   // TODO(agent-2)
    accentDim: "#c9a850",    // TODO(agent-2)
    heroNum: "#b8901f",      // TODO(agent-2)
    accentBtn: "linear-gradient(135deg,#e9c84a,#b8901f)", // TODO(agent-2)
    onAccent: "#2a1e00",     // TODO(agent-2)
    glow: "rgba(184,144,31,.22)",        // TODO(agent-2)
    labBg: "#eef1f5",        // TODO(agent-2)
  },
};

// סדר המתג המחזורי: ☀ → 📜 → 🌙
export const THEME_ORDER = ["light", "cream", "dark"];

export const DEFAULT_MODE = "dark"; // ברירת מחדל = התמה הקיימת (לא להפתיע משתמשים)

export const getPalette = (mode) => PALETTES[mode] || PALETTES[DEFAULT_MODE];
