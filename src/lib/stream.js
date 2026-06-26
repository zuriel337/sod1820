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
    label: "לשם המלוכה",
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
