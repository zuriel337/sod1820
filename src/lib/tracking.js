import { supabase } from "./supabase.js";
import { trackConversion } from "./marketing.js";

// ===== אנליטיקה פנימית — מעקב מדורים ופעולות =====
// כל גולש = visitor_id אנונימי ב-localStorage (לא PII).
// שולח ל-visitor_events ב-Supabase. debounce על view כדי לא לספור scroll.

const KEY = "sod_vid";

export function getVisitorId() {
  let vid = localStorage.getItem(KEY);
  if (!vid) {
    vid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, vid);
  }
  return vid;
}

const pending = new Map(); // debounce per section key

export function track(section, slug = null, eventType = "view", meta = null) {
  if (!supabase) return;
  const key = `${section}:${slug ?? ""}:${eventType}`;
  if (eventType === "view") {
    if (pending.has(key)) return; // כבר בדרך
    pending.set(key, setTimeout(() => { pending.delete(key); }, 2000));
  }
  const visitor_id = getVisitorId();
  supabase.from("visitor_events").insert({
    visitor_id, section, slug, event_type: eventType,
    meta: meta ?? undefined,
  }).then(() => {}).catch(() => {});
}

export const trackShare = (platform, slug) =>
  track("share", slug, "share", { platform });

export const trackImageClick = (imageId, value) =>
  track("reality-stream", null, "image_click", { image_id: imageId, value });

export const trackWhatsapp = slug => trackShare("whatsapp", slug);

// ===== מעקב התקנות אפליקציה (PWA install) =====
// האתר ניתן להתקנה בכרום (יש manifest). כאן סופרים כמה התקינו וכמה פותחים
// דרך האפליקציה המותקנת. נשען על visitor_events הקיים — אין סכימה חדשה.

// האם רץ כאפליקציה מותקנת (standalone) ולא בכרטיסיית דפדפן רגילה.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch { /* noop */ }
  return window.navigator?.standalone === true; // iOS Safari
}

let appInstallInited = false;

// אתחול פעם אחת (בעליית האפליקציה). תופס:
//  • appinstalled  → רישום התקנה (פנימי + Meta/CAPI דרך trackConversion).
//  • פתיחה מהאפליקציה המותקנת → רישום launch פעם אחת ל-session.
export function initAppInstallTracking() {
  if (appInstallInited || typeof window === "undefined") return;
  appInstallInited = true;

  const platform = window.navigator?.userAgentData?.platform
    || window.navigator?.platform
    || undefined;

  window.addEventListener("appinstalled", () => {
    track("app", null, "install", { platform, ua: window.navigator?.userAgent });
    trackConversion("app_install", { platform });
  });

  // ספירת משתמש פעיל מהאפליקציה — פעם אחת ל-session (לא בכל ניווט).
  if (isStandalone()) {
    try {
      if (!sessionStorage.getItem("sod_app_launched")) {
        sessionStorage.setItem("sod_app_launched", "1");
        track("app", null, "launch", { platform });
      }
    } catch {
      track("app", null, "launch", { platform });
    }
  }
}
