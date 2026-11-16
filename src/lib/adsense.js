// ===== Google AdSense — מודעות בעמודי קריאה (2029) =====
// שוחזר מההיסטוריה (src/lib/adsense.js לפני הסרת Legacy) והותאם ל־2029. נטען רק אם הוגדר VITE_ADSENSE_CLIENT (ca-pub-…);
// בלי מזהה — no-op מוחלט: הסקריפט לא נטען ושום מודעה לא מוצגת.
//
// מדיניות מיקום (החלטת מוצר שנשמרת): מודעות *רק בדפי קריאה* (פוסט ורשימת פוסטים), לעולם לא בבית / בית־המדרש / חוויות / חשבון.
// הסקריפט נטען עצלן מתוך AdSlot, כך שגם עם Auto-Ads בחשבון הוא חל רק על דפים שבהם הוצבה יחידה.
//
// החלטת ZURIEL 11.11.2026: AdSense מופעל גם ב־2029.
// החלטת ZURIEL 16.11.2026: "בנוסף גם לבטל את הפרסומות באתר אני לא רוצה כרגע" — המודעות מושהות בקוד (ADSENSE_PAUSED), בלי תלות במשתני
// הבנייה: שום יחידה לא מוצגת והסקריפט לא נטען גם כש־VITE_ADSENSE_CLIENT מוגדר. חידוש = החלטת ZURIEL: ADSENSE_PAUSED=false, ופריסה.
//
// משתני בנייה (Vercel → Environment Variables, production): VITE_ADSENSE_CLIENT, VITE_ADSENSE_SLOT_POST, VITE_ADSENSE_SLOT_LIST.
// (יחידות anchor/side של Legacy לא שוחזרו: הן קבועות/צדדיות ומשנות פריסה; נוספות רק בהחלטה נפרדת.)
import { sideEffectAllowed } from "./botVerdict.js";

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "";
const ADSENSE_PAUSED = true;
export const ADSENSE_ENABLED = !ADSENSE_PAUSED && /^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT);

export const ADSENSE_SLOTS = {
  post: import.meta.env.VITE_ADSENSE_SLOT_POST || "",
  list: import.meta.env.VITE_ADSENSE_SLOT_LIST || "",
};

// 🇮🇱 גידור מדינה — מודעות רק למבקרים מישראל (בקשת צוריאל: פרסומות לא־צנועות הגיעו מתנועה זרה). ב־Legacy האות היה cookie `vc`
// שנקבע ב־middleware; ב־2029 אין cookie כזה, ולכן האות הוא אזור הזמן של הדפדפן (Asia/Jerusalem). ברירת מחדל זהירה: אם אין ודאות — לא מציגים.
export function adCountryAllowed() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone === "Asia/Jerusalem" || zone === "Asia/Tel_Aviv";
  } catch { return false; }
}

// בוטים לא טוענים סקריפט פרסום ולא יוצרים חשיפות.
export const adsAllowedHere = () => ADSENSE_ENABLED && typeof document !== "undefined" && adCountryAllowed() && sideEffectAllowed("adsense_load");

let scriptLoaded = false;
export function ensureAdSenseScript() {
  if (scriptLoaded || !adsAllowedHere()) return;
  scriptLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}
