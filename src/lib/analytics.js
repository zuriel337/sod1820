// ===== Google Analytics 4 — איסוף נתונים =====
// נטען בפועל רק אם הוגדר VITE_GA_ID (Measurement ID, למשל G-XXXXXXXXXX).
// בלי ID — כל הפונקציות הן no-op (לא שובר כלום).

const GA_ID = import.meta.env.VITE_GA_ID;
import { readingTelemetryPath } from "./publicReadingTelemetry2029.js";
export const GA_ENABLED = !!GA_ID;
let inited = false;

// Traffic Intelligence consumes the existing SEO projection. First-party RUM
// and visit schemas keep their current labels; these fields are for GA4 only.
export function publicPageviewFields(path, { doc = globalThis.document, loc = globalThis.window?.location } = {}) {
  const safe = readingTelemetryPath(path);
  if (!safe || !loc?.origin) return null;
  const requested = new URL(path, loc.origin).pathname;
  const title = doc?.head?.querySelector?.("title");
  // Post mounts a noindex loading title before the admitted source is ready.
  // A matching route alone is not a resolved public page identity.
  const ready = title?.dataset?.analyticsRoute === requested && title.dataset.analyticsPublic === "true";
  let pagePath = safe, pageTitle = "SOD1820";
  if (ready) {
    const canonical = title.dataset.analyticsPath;
    if (typeof canonical === "string" && readingTelemetryPath(canonical)) {
      // Expressions can contain personal text even on an otherwise public
      // number surface. Only a literal numeric value identifies this GA page.
      const number = /^\/(?:2029\/)?number\/([^/?#]+)\/?$/.exec(canonical);
      if (!number || /^\d{1,12}$/.test(number[1])) {
        pagePath = new URL(canonical, loc.origin).pathname;
        pageTitle = String(title.textContent || doc.title || "SOD1820").slice(0, 300);
      }
    }
  }
  let referrer = "";
  try {
    const source = new URL(doc?.referrer || "");
    const sameSite = source.hostname.replace(/^www\./, "") === loc.hostname.replace(/^www\./, "");
    if (["https:", "http:"].includes(source.protocol) && !sameSite) referrer = source.origin + "/";
  } catch { /* Direct or unavailable source remains unknown. */ }
  const campaign = {};
  try {
    const query = new URL(loc.href).searchParams;
    for (const [parameter, field] of [["utm_source", "campaign_source"], ["utm_medium", "campaign_medium"],
      ["utm_campaign", "campaign_name"], ["utm_content", "campaign_content"], ["utm_id", "campaign_id"]]) {
      const value = query.get(parameter);
      if (value && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value)) campaign[field] = value;
    }
  } catch { /* Malformed location contributes no campaign. */ }
  return { ready, fields: { page_path: pagePath, page_location: loc.origin + pagePath,
    page_title: pageTitle, page_referrer: referrer, ...campaign } };
}

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
  if (publicReading) window.gtag("set", {
    page_location: window.location.origin + (readingTelemetryPath(path) || "/"),
    page_path: readingTelemetryPath(path) || "/", page_title: "SOD1820", page_referrer: "",
  });
  // אנחנו שולחים page_view ידנית בכל מעבר route (SPA), אז מכבים את האוטומטי
  window.gtag("config", GA_ID, { send_page_view: false, ...(publicReading ? {
    allow_google_signals: false, allow_ad_personalization_signals: false,
  } : {}) });
}

export function trackPageview(path, { publicReading = false } = {}) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  if (publicReading) {
    if (!readingTelemetryPath(path)) return;
    let observer, timer, finished = false;
    const stop = () => { finished = true; observer?.disconnect(); if (timer != null) clearTimeout(timer); };
    const send = (fallback = false) => {
      if (finished) return;
      const page = publicPageviewFields(path);
      if (!page || (!page.ready && !fallback)) return;
      stop();
      // Automatic events (scroll/download/etc.) inherit the destination's
      // context, not parameters of our explicit page_view event. Refresh only
      // the already-filtered page identity, without emitting another view.
      window.gtag("set", {
        page_location: page.fields.page_location, page_path: page.fields.page_path,
        page_title: page.fields.page_title, page_referrer: page.fields.page_referrer });
      window.gtag("event", "page_view", { ...page.fields, send_to: GA_ID });
    };
    // SEO may arrive after the lazy page/source. Observe only the document head,
    // with one bounded fallback; route cleanup cancels stale pending work.
    if (typeof MutationObserver === "undefined" || !document.head) send(true);
    else {
      observer = new MutationObserver(() => send());
      observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["data-analytics-route", "data-analytics-path", "data-analytics-public"] });
      timer = setTimeout(() => send(true), 5000);
      send();
    }
    return stop;
  }
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
