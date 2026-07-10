// ===== Google AdSense — הצגת מודעות על האתר (מונטיזציה) =====
// נטען בפועל רק אם הוגדר VITE_ADSENSE_CLIENT (מזהה מפרסם, ca-pub-XXXXXXXXXXXXXXXX).
// בלי מזהה — no-op מוחלט: הסקריפט לא נטען ושום יחידת מודעה לא מוצגת.
//
// מדיניות מיקום (החלטת המוצר): מודעות *רק בדפי קריאה* (פוסטים/רשימת פוסטים),
// לעולם לא בדף הבית / בית-המדרש / חוויות — כדי לשמור על תחושת הפרימיום.
// לכן את סקריפט ה-AdSense טוענים *עצלן* (מתוך רכיב AdSlot), כך שגם אם ב-AdSense
// מופעל Auto-Ads — הוא יחול רק בדפים שבהם הצבנו יחידה.
//
// משתני סביבה (Vercel → Settings → Environment Variables):
//   VITE_ADSENSE_CLIENT      = ca-pub-XXXXXXXXXXXXXXXX  (מזהה המפרסם)
//   VITE_ADSENSE_SLOT_POST   = מזהה יחידת מודעה לתוך הפוסט (in-article)
//   VITE_ADSENSE_SLOT_LIST   = מזהה יחידת מודעה לרשימת הפוסטים/ארכיון
//   VITE_ADSENSE_SLOT_ANCHOR = מזהה יחידת מודעה לרצועה הנעוצה בתחתית (banner אופקי)
//   VITE_ADSENSE_SLOT_SIDE   = מזהה יחידת מודעה לצד בדסקטופ (אנכי 300×600)

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "";
// 🛑 מתג כיבוי גלובלי — כשהוא true אין שום מודעה (גם אם הוגדר מזהה מפרסם).
// כובה (false) לבקשת צוריאל 10.7.2026 — מודעות בפוסטים הישנים בלבד. עדיין no-op מוחלט
// עד שמגדירים VITE_ADSENSE_CLIENT ב-Vercel, כך שבלי מזהה-מפרסם כלום לא מוצג.
const ADSENSE_KILL_SWITCH = false;
export const ADSENSE_ENABLED = !ADSENSE_KILL_SWITCH && !!ADSENSE_CLIENT;

// מזהי יחידות פר-מיקום (ברירת-מחדל מ-env; אפשר לעקוף דרך prop ב-AdSlot).
//   VITE_ADSENSE_SLOT_SIDE       = רצועת-צד ימין (וגם ברירת-מחדל לשמאל אם אין נפרד)
//   VITE_ADSENSE_SLOT_SIDE_LEFT  = רצועת-צד שמאל (אופציונלי — אחרת נופל ל-SIDE)
export const ADSENSE_SLOTS = {
  post: import.meta.env.VITE_ADSENSE_SLOT_POST || "",
  list: import.meta.env.VITE_ADSENSE_SLOT_LIST || "",
  anchor: import.meta.env.VITE_ADSENSE_SLOT_ANCHOR || "",
  side: import.meta.env.VITE_ADSENSE_SLOT_SIDE || "",
  sideLeft: import.meta.env.VITE_ADSENSE_SLOT_SIDE_LEFT || "",
};

let scriptLoaded = false;

// טעינת סקריפט ה-AdSense פעם אחת (נקרא מתוך AdSlot, לא גלובלית).
export function ensureAdSenseScript() {
  if (scriptLoaded || !ADSENSE_ENABLED || typeof document === "undefined") return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}
