// Microsoft Clarity — הקלטות סשן של גולשים אמיתיים + מפות חום (חינם לגמרי).
// מופעל רק אם VITE_CLARITY_ID מוגדר ב-Vercel env. בלי ID — no-op מוחלט.
// ליצירת ID: clarity.microsoft.com → New project → להעתיק את ה-Project ID.
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;
export const CLARITY_CONFIGURED = !!CLARITY_ID;

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
