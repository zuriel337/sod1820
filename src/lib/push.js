// ===== Web Push — הרשמת התראות דפדפן (שלב B) =====
// פעיל רק אם הוגדר VITE_VAPID_PUBLIC_KEY ב-env. בלי מפתח — PUSH_CONFIGURED=false
// וכל הזרימה no-op (הערוץ יוצג כ"בקרוב"). השליחה עצמה דרך edge function send-push.

import { supabase } from "./supabase.js";
import { getVisitorId } from "./tracking.js";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;
export const PUSH_CONFIGURED = !!VAPID_PUBLIC;

export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function pushPermission() {
  if (!pushSupported()) return "unsupported";
  return Notification.permission; // default | granted | denied
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

let swRegPromise = null;
export function registerPushSW() {
  if (!pushSupported()) return Promise.resolve(null);
  if (!swRegPromise) swRegPromise = navigator.serviceWorker.register("/sw.js");
  return swRegPromise;
}

// מבקש רשות → נרשם ל-PushManager → שומר ב-push_subscriptions.
// מחזיר { ok, reason }. reason: not_configured | unsupported | denied | error.
export async function enablePush({ userId = null, topics = [] } = {}) {
  if (!PUSH_CONFIGURED) return { ok: false, reason: "not_configured" };
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
    const reg = await registerPushSW();
    if (!reg) return { ok: false, reason: "unsupported" };
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const json = sub.toJSON();
    if (supabase && json?.endpoint) {
      await supabase.from("push_subscriptions").upsert({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_id: userId || null,
        visitor_id: userId ? null : getVisitorId(),
        topics,
        user_agent: navigator.userAgent,
        last_seen: new Date().toISOString(),
      }, { onConflict: "endpoint" });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "error", error: String(e) };
  }
}

// ביטול הרשמה + מחיקת השורה.
export async function disablePush() {
  if (!pushSupported()) return { ok: true };
  try {
    const reg = await registerPushSW();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch { /* noop */ }
      if (supabase && endpoint) {
        try { await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint); } catch { /* noop */ }
      }
    }
  } catch { /* noop */ }
  return { ok: true };
}
