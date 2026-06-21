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

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "";
export const ADSENSE_ENABLED = !!ADSENSE_CLIENT;

// מזהי יחידות פר-מיקום (ברירת-מחדל מ-env; אפשר לעקוף דרך prop ב-AdSlot).
export const ADSENSE_SLOTS = {
  post: import.meta.env.VITE_ADSENSE_SLOT_POST || "",
  list: import.meta.env.VITE_ADSENSE_SLOT_LIST || "",
};

let scriptLoaded = false;

// טעינת סקריפט ה-AdSense פעם אחת (נקרא מתוך AdSlot, לא גלובלית).
export function ensureAdSenseScript() {
  if (scriptLoaded || !ADSENSE_CLIENT || typeof document === "undefined") return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}
