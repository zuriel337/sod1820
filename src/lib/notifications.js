// ===== מרכז התראות — נושאים וערוצים (תשתית, ערוץ-אגנוסטי) =====
// מקור אחד לכל הערוצים: מייל (פעיל), Push ו-WhatsApp (עתיד). כל משתמש בוחר
// אילו נושאים מעניינים אותו — וכל ערוץ ישלח בעתיד רק את מה שסומן.
// העדפות נשמרות ב-notification_prefs (לפי user_id / visitor_id).

// רשימה רזה בכוונה — נושא רחב אחד לכל "עולם". אין צורך לפצל (התכנסות/הצלבה =
// "חידושי בית המדרש" אחד); אפשר תמיד לשלוח מדויק יותר בצד השולח. רשימה ארוכה
// = עומס החלטה = פחות הרשמות.
export const NOTIFICATION_TOPICS = [
  { key: "beit_midrash", label: "חידושי בית המדרש", emoji: "🔮" }, // התכנסויות + הצלבות + חידושי AI
  { key: "gematria",     label: "גימטריה",          emoji: "🔢" },
  { key: "hints",        label: "רמזים",            emoji: "🔍" },
  { key: "news",         label: "חדשות ואירועים",   emoji: "🗞️" },
  { key: "els",          label: "דילוגי אותיות",    emoji: "🧩" },
  { key: "num_1820",     label: "מספר 1820",        emoji: "👑" },
  { key: "courses",      label: "קורסים ושיעורים",  emoji: "🎓" },
];

// ערוץ פעיל אחד (מייל) + שניים עתידיים שמוצגים מנוטרלים — שומר על החזון בלי לבלבל.
export const NOTIFICATION_CHANNELS = [
  { key: "email",    label: "מייל",         emoji: "📧", available: true,  note: "" },
  { key: "push",     label: "התראות דפדפן", emoji: "🔔", available: false, note: "בקרוב" },
  { key: "whatsapp", label: "וואטסאפ",      emoji: "💬", available: false, note: "עתיד" },
];

export const DEFAULT_CHANNELS = ["email"];

// ===== טקס הכניסה (Onboarding) — שערים = עדשה חווייתית מעל אותם topics =====
// אין מערכת מקבילה: בחירת שער = בחירת קבוצת נושאים שנשמרת ל-notification_prefs.
export const ONBOARDING_GATES = [
  { key: "consciousness", emoji: "🔮", title: "שער התודעה", desc: "מחשבה, עומק, חיבורים בין רעיונות", topics: ["beit_midrash", "gematria"] },
  { key: "signs",         emoji: "🔢", title: "שער הרמזים", desc: "גימטריה, מספרים, 1820, סימני מציאות", topics: ["hints", "num_1820", "gematria"] },
  { key: "flow",          emoji: "🗞️", title: "שער הזרימה", desc: "חדשות, עדכונים, אירועים בזמן אמת", topics: ["news"] },
];

// שלב 1 (מה אתה מחפש) → רמז רך שמסמן מראש שער.
export const ONBOARDING_INTENTS = [
  { key: "consciousness", emoji: "🔍", label: "להבין עומק של המציאות" },
  { key: "signs",         emoji: "🔢", label: "לזהות רמזים וסימנים" },
  { key: "flow",          emoji: "⚡", label: "לקבל עדכונים חיים מהעולם" },
];

// קבוצת שערים → רשימת נושאים ייחודית (union).
export function gatesToTopics(gateKeys = []) {
  const set = new Set();
  ONBOARDING_GATES.forEach(g => { if (gateKeys.includes(g.key)) g.topics.forEach(t => set.add(t)); });
  return [...set];
}
