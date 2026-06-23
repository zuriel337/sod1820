import { supabase } from "./supabase.js";

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
