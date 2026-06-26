// ===== מרכז התראות — נושאים וערוצים (תשתית, ערוץ-אגנוסטי) =====
// מקור אחד לכל הערוצים: מייל (פעיל), Push ו-WhatsApp (עתיד). כל משתמש בוחר
// אילו נושאים מעניינים אותו — וכל ערוץ ישלח בעתיד רק את מה שסומן.
// העדפות נשמרות ב-notification_prefs (לפי user_id / visitor_id).

export const NOTIFICATION_TOPICS = [
  { key: "gematria",    label: "גימטריה",          emoji: "🔢" },
  { key: "hints",       label: "רמזים",            emoji: "🔍" },
  { key: "convergence", label: "התכנסויות",        emoji: "🔥" },
  { key: "news",        label: "חדשות",            emoji: "🗞️" },
  { key: "els",         label: "דילוגי אותיות",    emoji: "🧩" },
  { key: "num_1820",    label: "מספר 1820",        emoji: "👑" },
  { key: "num_73",      label: "מספר 73",          emoji: "✨" },
  { key: "courses",     label: "קורסים ושיעורים",  emoji: "🎓" },
  { key: "events",      label: "אירועים",          emoji: "📅" },
];

// ערוץ פעיל אחד (מייל) + שניים עתידיים שמוצגים מנוטרלים — שומר על החזון בלי לבלבל.
export const NOTIFICATION_CHANNELS = [
  { key: "email",    label: "מייל",         emoji: "📧", available: true,  note: "" },
  { key: "push",     label: "התראות דפדפן", emoji: "🔔", available: false, note: "בקרוב" },
  { key: "whatsapp", label: "וואטסאפ",      emoji: "💬", available: false, note: "עתיד" },
];

export const DEFAULT_CHANNELS = ["email"];
