// ===== Google Analytics 4 — איסוף נתונים =====
// נטען בפועל רק אם הוגדר VITE_GA_ID (Measurement ID, למשל G-XXXXXXXXXX).
// בלי ID — כל הפונקציות הן no-op (לא שובר כלום).

const GA_ID = import.meta.env.VITE_GA_ID;
export const GA_ENABLED = !!GA_ID;
let inited = false;

export function initGA() {
  if (inited || !GA_ID || typeof window === "undefined") return;
  inited = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  // אנחנו שולחים page_view ידנית בכל מעבר route (SPA), אז מכבים את האוטומטי
  window.gtag("config", GA_ID, { send_page_view: false });
}

export function trackPageview(path) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
