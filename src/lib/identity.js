// ===== שדרת זהות מאוחדת (sod_id) — שלב 1 =====
// מזהה יחיד ל-cookie ראשוני + localStorage, עם אימוץ מפתחות-ישנים כ-seed (המשכיות).
// שכבת-תאימות: לא נוגע במפתחות/בטבלאות הישנים — רק ממפה אותם ל-sod_id דרך identity_edges.
import { supabase } from "./supabase.js";

const SOD_KEY = "sod_id";
const COOKIE = "sod_id";
const LEGACY_KEYS = ["sod_visitor", "sod_vid", "sod_visitor_id"]; // visits / tracking / feedback
const YEAR = 60 * 60 * 24 * 365;

function uuid() {
  try { return crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  catch { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}
function readCookie(name) {
  try { const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : null; }
  catch { return null; }
}
function writeCookie(name, val) {
  try { document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${YEAR}; SameSite=Lax`; } catch { /* ignore */ }
}

let _sodId = null;
let _seeded = false;

// המזהה היציב. סדר: cookie → localStorage → אימוץ מפתח-ישן (seed) → מטבע חדש.
export function getSodId() {
  if (_sodId) return _sodId;
  let id = readCookie(COOKIE);
  if (!id) { try { id = localStorage.getItem(SOD_KEY); } catch { /* ignore */ } }
  if (!id) { // אימוץ ערך מפתח-ישן => מבקר חוזר שומר את זהותו, בלי איפוס
    for (const k of LEGACY_KEYS) { try { const v = localStorage.getItem(k); if (v) { id = v; break; } } catch { /* ignore */ } }
  }
  if (!id) id = uuid();
  _sodId = id;
  try { localStorage.setItem(SOD_KEY, id); } catch { /* ignore */ }
  writeCookie(COOKIE, id);
  seedLegacyOnce(id);
  return id;
}

// ממפה את כל המפתחות-הישנים (אם קיימים ושונים) ל-sod_id ב-identity_edges (legacy_seed). פעם אחת.
function seedLegacyOnce(sodId) {
  if (_seeded) return; _seeded = true;
  if (!supabase) return;
  try {
    const seen = new Set();
    for (const k of LEGACY_KEYS) {
      let v = null; try { v = localStorage.getItem(k); } catch { /* ignore */ }
      if (v && v !== sodId && !seen.has(v)) {
        seen.add(v);
        supabase.rpc("link_identity", { p_sod_id: sodId, p_kind: "legacy_seed", p_legacy_id: v }).then(() => {}).catch(() => {});
      }
    }
  } catch { /* ignore */ }
}

// app_context — דפדפן-אפליקציה מול דפדפן רגיל (מכריע לניתוח ההטיה)
export function appContext() {
  try {
    const ua = navigator.userAgent || "";
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
    if (/Instagram/i.test(ua)) return "instagram";
    if (/WhatsApp/i.test(ua)) return "whatsapp";
    if (/Telegram/i.test(ua)) return "telegram";
    if (/Line\//i.test(ua)) return "line";
    if (/CriOS/i.test(ua)) return "chrome-ios";
    if (/EdgA?\//i.test(ua)) return "edge";
    if (/OPR\/|Opera/i.test(ua)) return "opera";
    if (/FxiOS|Firefox\//i.test(ua)) return "firefox";
    if (/; wv\)|\bwv\b|WebView/i.test(ua)) return "android-webview";
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "chrome";
    if (/Version\/.*Safari\//i.test(ua)) return "safari";
    return "other";
  } catch { return "other"; }
}

// session_id — GA-style: מזהה חדש אחרי 30 דק' חוסר-פעילות
const SID_KEY = "sod_sid", SIDT_KEY = "sod_sid_t", GAP = 30 * 60 * 1000;
export function sessionId() {
  try {
    const now = Date.now();
    let sid = localStorage.getItem(SID_KEY);
    const last = Number(localStorage.getItem(SIDT_KEY) || 0);
    if (!sid || now - last > GAP) sid = uuid();
    localStorage.setItem(SID_KEY, sid); localStorage.setItem(SIDT_KEY, String(now));
    return sid;
  } catch { return null; }
}

// תפירת זהות — מוכן לחיווט בהתחברות / מנוי-פוש (יופעל ב-M2/M3, לא שובר כלום כשלא נקרא)
export function stitchLogin(userId) {
  if (supabase && userId) supabase.rpc("link_identity", { p_sod_id: getSodId(), p_kind: "login", p_user_id: userId }).then(() => {}).catch(() => {});
}
export function stitchPush(meta) {
  if (supabase) supabase.rpc("link_identity", { p_sod_id: getSodId(), p_kind: "push", p_meta: meta || null }).then(() => {}).catch(() => {});
}
