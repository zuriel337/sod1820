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
