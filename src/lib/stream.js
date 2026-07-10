import { useSyncExternalStore } from "react";

// ===== זרם המבקר — שתי דלתות-בית לאותו עץ אחד (root primitive) =====
// "kingdom" = לשם המלוכה (דתי/מאמין) · "reality" = קוד המציאות (חילוני/סקרן).
// "" = עוד לא בחר (מבקר חדש → מקבל ברירת מחדל kingdom; השער מגודר לאדמין כרגע).
// נשמר ב-localStorage, מסונכרן בין כל הרכיבים (useSyncExternalStore), וקובע
// data-stream על <html> כדי שעיצוב/CSS יוכלו להגיב לזרם בלי prop-drilling.
// השכבה הזו היא רק התשתית: היא לא מסגרת תוכן לפי ישות — זה שלב מאוחר יותר.

const KEY = "sod_stream";

// מטא-דאטה של הזרמים — מקור אמת יחיד לתווית/route/אקסנט. כל שכבה מעליה קוראת מכאן.
export const STREAMS = {
  kingdom: {
    key: "kingdom",
    label: "כי לה' המלוכה",
    tagline: "גאולה · מלכות שמים · שם ה׳ 1820",
    emoji: "👑",
    home: "/",          // דף הבית הדתי = הבית הקיים
    accent: "#e8c840",  // זהב מלכותי
  },
  reality: {
    key: "reality",
    label: "קוד המציאות",
    tagline: "המספרים שמאחורי המציאות",
    emoji: "🎬",
    home: "/reality",   // דף הבית החילוני
    accent: "#7fc8ff",  // קולנועי/כחול
  },
};

export const isStream = (s) => s === "kingdom" || s === "reality";

const read = () => {
  try { const v = localStorage.getItem(KEY); return isStream(v) ? v : ""; }
  catch { return ""; }
};

let stream = read();
const subs = new Set();

function emit() {
  try { document.documentElement.setAttribute("data-stream", stream || "none"); }
  catch { /* ignore */ }
  subs.forEach(f => f());
}

// קביעת ה-attribute כבר בטעינה (לפני React) למניעת הבהוב
if (typeof document !== "undefined") {
  try { document.documentElement.setAttribute("data-stream", stream || "none"); }
  catch { /* ignore */ }
}

export function getStream() { return stream; }

export function setStream(s) {
  stream = isStream(s) ? s : "";
  try {
    if (stream) localStorage.setItem(KEY, stream);
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  emit();
}

export function clearStream() { setStream(""); }

// 🧪 A/B עדשות — שיוך מבקר-חדש: ~35% → «קוד המציאות» (reality), השאר → «כי לה' המלוכה» (kingdom).
// דביק לכל מבקר (localStorage), מכבד בחירה קיימת, ומחזיר {variant,isNew} כדי לתעד את השיוך פעם אחת.
const AB_KEY = "sod_ab_lens";
const AB_REALITY_SHARE = 0.35;
export function assignLensAB() {
  try {
    const prior = localStorage.getItem(AB_KEY);
    if (prior && isStream(prior)) return { variant: prior, isNew: false };
    const existing = getStream();                                   // מבקר שכבר בחר עדשה — לא משנים
    const variant = existing || (Math.random() < AB_REALITY_SHARE ? "reality" : "kingdom");
    localStorage.setItem(AB_KEY, variant);
    if (!existing) setStream(variant);
    return { variant, isNew: true };
  } catch { return { variant: "kingdom", isNew: false }; }
}

function subscribe(f) { subs.add(f); return () => subs.delete(f); }

// hook ראשי — מחזיר את הזרם הנוכחי ("malchut" | "code" | ""). SSR fallback = "".
export function useStream() {
  return useSyncExternalStore(subscribe, () => stream, () => "");
}

// נוחות: מטא-דאטה של הזרם הנבחר (או null אם לא נבחר)
export function useStreamMeta() {
  const s = useStream();
  return s ? STREAMS[s] : null;
}
