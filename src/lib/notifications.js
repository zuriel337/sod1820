// ===== מרכז התראות — נושאים וערוצים (תשתית, ערוץ-אגנוסטי) =====
// מקור אחד לכל ההתראות: Follow נשמר ככוונת-מעקב, וה-Dispatcher החי שולח כרגע In-App.
// Email / Push / WhatsApp הם ערוצי delivery נפרדים שדורשים consent מפורש לפני הפעלה.
// העדפות נשמרות ב-notification_prefs (לפי user_id / visitor_id).

// רשימה רזה בכוונה — נושא רחב אחד לכל "עולם". אין צורך לפצל (התכנסות/הצלבה =
// "חידושי בית המדרש" אחד); אפשר תמיד לשלוח מדויק יותר בצד השולח. רשימה ארוכה
// = עומס החלטה = פחות הרשמות.
export const NOTIFICATION_TOPICS = [
  { key: "beit_midrash", label: "חידושי בית המדרש", emoji: "🔮" }, // התכנסויות + הצלבות + חידושי AI
  { key: "gematria",     label: "גימטריה",          emoji: "🔢" },
  { key: "hints",        label: "רמזים",            emoji: "🔍" },
  { key: "news",         label: "חדשות ואירועים",   emoji: "🗞️" },
  { key: "codes:new",    label: "צפנים חדשים",      emoji: "🧩" },
  { key: "number:1820",  label: "מספר 1820",        emoji: "👑" },
  { key: "courses",      label: "קורסים ושיעורים",  emoji: "🎓" },
];

// Follow v19: אין ערוץ חיצוני פעיל כברירת-מחדל. בחירה בערוץ היא שלב נפרד אחרי זהות/consent.
export const NOTIFICATION_CHANNELS = [
  { key: "email",    label: "מייל",         emoji: "📧", available: false, note: "הפעלה מפורשת בהמשך" },
  { key: "push",     label: "התראות דפדפן", emoji: "🔔", available: false, note: "בקרוב" },
  { key: "whatsapp", label: "וואטסאפ",      emoji: "💬", available: false, note: "עתיד" },
];

export const DEFAULT_CHANNELS = [];

// ===== טקס הכניסה (Onboarding) — שערים = עדשה חווייתית מעל אותם topics =====
// אין מערכת מקבילה: בחירת שער = בחירת קבוצת נושאים שנשמרת ל-notification_prefs.
export const ONBOARDING_GATES = [
  { key: "consciousness", emoji: "🔮", title: "שער התודעה", desc: "מחשבה, עומק, חיבורים בין רעיונות", topics: ["beit_midrash", "gematria"] },
  { key: "signs",         emoji: "🔢", title: "שער הרמזים", desc: "גימטריה, מספרים, 1820, סימני מציאות", topics: ["hints", "number:1820", "gematria"] },
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

// ===== 🔔 תיבת ההתראות האישית (inbox) — עדשה על user_notifications =====
// RLS מסננת אוטומטית לשורות של המשתמש המחובר. נכתב רק בצד-השרת; הלקוח קורא
// ומסמן «נקרא» בלבד. אותה מערכת לכל התראה עתידית — לא מקביל.
import { supabase } from "./supabase.js";

// שם-התצוגה של מדור חידושי-הקהילה — מקור-אמת אחד (החלטת שם: «חידושי הקהילה»).
// הערה: תגית-המנוע נשארת 'חידושי גולשים' כמפתח-סינון פנימי יציב (לא מוצג למשתמש).
export const COMMUNITY_LABEL = "חידושי הקהילה";

export async function getMyNotifications(limit = 30) {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("user_notifications")
      .select("id,kind,title,body,link,read_at,created_at,source_topic")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
}

// ===== שכבת-הייצוג (label resolution) — ההופכי של resolve_topics שב-DB =====
// topic קנוני (cat:/author:/number:/stream:reality/codes:new/channel:or-geula) → תצוגה ידידותית.
// aliases ישנים מוצגים כאותה זהות כדי שמרכז-המעקבים לא יחשוף migration jargon למשתמש.
export function topicLabel(topic) {
  if (!topic) return null;
  let t = String(topic);

  // Legacy representation aliases — presentation only; DB resolver handles delivery parity.
  if (t.startsWith("category:")) t = `cat:${t.slice(9)}`;
  if (/^num_\d+$/.test(t)) t = `number:${t.slice(4)}`;
  if (t === "els") t = "codes:new";
  if (["orgeula:new", "or-geula", "channel:orgeula"].includes(t)) t = "channel:or-geula";

  if (t.startsWith("cat:"))    { const v = t.slice(4);  return { icon: "📁", label: v, link: `/category/${encodeURIComponent(v)}`, kind: "קטגוריה" }; }
  if (t.startsWith("author:")) { const v = t.slice(7);  return { icon: "✍️", label: v, link: `/community/researcher/${encodeURIComponent(v)}`, kind: "כתב" }; }
  if (t.startsWith("number:")) { const v = t.slice(7);  return { icon: "🔢", label: v, link: `/number/${v}`, kind: "מספר" }; }
  if (t === "stream:reality")  return { icon: "🌊", label: "זרם המציאות", link: "/archive", kind: "ערוץ" };
  if (t === "channel:or-geula") return { icon: "🎬", label: "אור הגאולה", link: "/or-geula", kind: "ערוץ" };
  if (t.startsWith("channel:")) { const v = t.slice(8); return { icon: "📡", label: v, link: "/broadcasts", kind: "ערוץ" }; }
  if (t === "codes:new")       return { icon: "🧩", label: "צפנים חדשים", link: "/codes", kind: "ערוץ" };
  const g = NOTIFICATION_TOPICS.find(x => x.key === t);
  if (g) return { icon: g.emoji, label: g.label, link: null, kind: "נושא" };
  return { icon: "🔔", label: t, link: null, kind: "" };
}

// שלושת המצבים — לעולם לא מתערבבים (subscription_funnel_law). כרגע רק הראשון פעיל.
export const FOLLOW_STATES = [
  { key: "follow",  icon: "🔔", label: "אני עוקב",     note: "בחירה מפורשת שלך",       live: true  },
  { key: "signal",  icon: "🟢", label: "רלוונטי אליך", note: "סיגנל שהמערכת תזהה",     live: false },
  { key: "raziel",  icon: "✨", label: "רזיאל מציע",   note: "המלצה אישית",            live: false },
];

export async function getUnreadCount() {
  if (!supabase) return 0;
  try {
    const { count } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    return count || 0;
  } catch { return 0; }
}

export async function markNotificationRead(id) {
  if (!supabase || !id) return;
  try { await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null); }
  catch { /* noop */ }
}

export async function markAllRead() {
  if (!supabase) return;
  try { await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); }
  catch { /* noop */ }
}
