// ===== התקנת PWA — לכידת ההצעה + כפתור מותאם =====
// במקום להסתמך על הבר הקטן של הדפדפן, לוכדים את אירוע beforeinstallprompt,
// מבטלים את הבר, וחושפים כפתור «התקן» משלנו שמודד accept/dismiss.
// iOS לא תומך כלל באירוע — שם הרכיב מציג הנחיה ידנית («הוסף למסך הבית»).

import { track } from "./tracking.js";
import { trackConversion } from "./marketing.js";

let deferredPrompt = null;
const subs = new Set();
const emit = () => subs.forEach(fn => { try { fn(); } catch { /* noop */ } });

// מנוי לשינוי זמינות ההצעה (כדי שהרכיב יתעדכן כשהיא מגיעה/נעלמת)
export function onInstallChange(fn) { subs.add(fn); return () => subs.delete(fn); }

// כבר רץ כאפליקציה מותקנת (standalone) ולא בכרטיסיית דפדפן
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try { if (window.matchMedia?.("(display-mode: standalone)").matches) return true; } catch { /* noop */ }
  return window.navigator?.standalone === true; // iOS Safari
}

export function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
}

// האם יש הצעת התקנה ממתינה (כרום/אדג'/אנדרואיד)
export function canInstall() { return !!deferredPrompt; }

// מפעיל את ההצעה ומחזיר 'accepted' | 'dismissed' | 'unavailable'.
// מודד את בחירת המשתמש — כך סוף-סוף יודעים כמה לחצו «התקן» מול «ביטול».
export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const dp = deferredPrompt;
  deferredPrompt = null; emit();
  dp.prompt();
  let outcome = "dismissed";
  try { const res = await dp.userChoice; outcome = res?.outcome || "dismissed"; } catch { /* noop */ }
  track("app", null, outcome === "accepted" ? "prompt_accept" : "prompt_dismiss", {});
  if (outcome === "accepted") trackConversion("app_install_click", {});
  return outcome;
}

let inited = false;
export function initInstall() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();        // מבטלים את הבר של הדפדפן — נשתמש בכפתור שלנו
    deferredPrompt = e; emit();
  });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; emit(); });
}
