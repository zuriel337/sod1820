// ===== Google Analytics 4 — איסוף נתונים =====
// נטען בפועל רק אם הוגדר VITE_GA_ID (Measurement ID, למשל G-XXXXXXXXXX).
// בלי ID — כל הפונקציות הן no-op (לא שובר כלום).

const GA_ID = import.meta.env.VITE_GA_ID;
import { readingTelemetryPath } from "./publicReadingTelemetry2029.js";
export const GA_ENABLED = !!GA_ID;
let inited = false;

export function initGA({ publicReading = false, path = "/" } = {}) {
  if (publicReading && !readingTelemetryPath(path)) return;
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
  window.gtag("config", GA_ID, { send_page_view: false, ...(publicReading ? {
    page_location: window.location.origin + (readingTelemetryPath(path) || "/"),
    page_path: readingTelemetryPath(path) || "/", page_title: "SOD1820", page_referrer: "",
    allow_google_signals: false, allow_ad_personalization_signals: false,
  } : {}) });
}

export function trackPageview(path, { publicReading = false } = {}) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  if (publicReading) {
    const safe = readingTelemetryPath(path);
    if (!safe) return;
    window.gtag("event", "page_view", { page_path: safe, page_location: window.location.origin + safe,
      page_title: "SOD1820", page_referrer: "" });
    return;
  }
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
