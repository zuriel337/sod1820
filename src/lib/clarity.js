// Microsoft Clarity — הקלטות סשן של גולשים אמיתיים + מפות חום (חינם לגמרי).
// פרויקט SOD1820. ה-Project ID הוא מזהה ציבורי (ממילא חשוף ב-JS בצד הלקוח),
// ולכן בטוח להטמיעו כברירת מחדל בקוד — בלי תלות במשתנה סביבה ב-Vercel.
// אפשר עדיין לעקוף אותו דרך VITE_CLARITY_ID אם רוצים פרויקט אחר.
export const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || "xdwf0gps8h";
export const CLARITY_CONFIGURED = !!CLARITY_ID;
// קישורים-עומק לדשבורד Clarity (לא ניתן להטמעה ב-iframe — פותחים בלשונית חדשה)
export const clarityUrl = (view = "dashboard") => `https://clarity.microsoft.com/projects/view/${CLARITY_ID}/${view}`;

let started = false;
export function initClarity() {
  if (started || !CLARITY_ID || typeof window === "undefined") return;
  started = true;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);
}
