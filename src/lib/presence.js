// ===== נוכחות חיה באתר (Realtime Presence) =====
// כל דפדפן פתוח מצטרף לערוץ אחד ('site-presence') ומדווח על עצמו.
// כך אפשר לראות בזמן אמת כמה גולשים מחוברים כרגע — מחוברים (עם חשבון) מול אנונימיים.
// אין כתיבות DB, אין שריפת מכסה — הכל דרך Supabase Realtime. סנכרון תוך שנייה בכניסה/יציאה.
import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { getVisitorId } from "./tracking.js";

let channel = null;
let joined = false;
let self = { uid: null, path: "/" };
const listeners = new Set();

function vid() {
  try { return getVisitorId(); } catch { return "anon"; }
}

// תמונת-מצב: סופר ישויות ייחודיות (לפי uid למחובר, vid לאנונימי) — לא כפול-לשוניות.
function snapshot() {
  if (!channel) return { total: 0, members: 0, guests: 0 };
  let state = {};
  try { state = channel.presenceState() || {}; } catch { return { total: 0, members: 0, guests: 0 }; }
  const seen = new Set();
  let members = 0, guests = 0;
  for (const key of Object.keys(state)) {
    for (const meta of state[key] || []) {
      const id = meta.uid || meta.vid || key;
      if (seen.has(id)) continue;
      seen.add(id);
      if (meta.uid) members++; else guests++;
    }
  }
  return { total: seen.size, members, guests };
}

function notify() {
  const snap = snapshot();
  listeners.forEach(fn => { try { fn(snap); } catch { /* noop */ } });
}

async function track() {
  if (!channel || !joined) return;
  try { await channel.track({ vid: vid(), uid: self.uid, path: self.path, at: Date.now() }); }
  catch { /* noop */ }
}

// מפעילים פעם אחת בעליית האפליקציה; מעדכנים uid/path בכל שינוי.
export function startPresence(next = {}) {
  self = { ...self, ...next };
  if (!supabase || typeof window === "undefined") return;
  if (channel) { track(); return; }
  channel = supabase.channel("site-presence", { config: { presence: { key: vid() } } });
  channel
    .on("presence", { event: "sync" }, notify)
    .on("presence", { event: "join" }, notify)
    .on("presence", { event: "leave" }, notify)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") { joined = true; track(); notify(); }
    });
}

export function updatePresence(next = {}) {
  self = { ...self, ...next };
  track();
}

export function subscribePresence(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}

// Hook נוח: מחזיר { total, members, guests } ומתעדכן חי.
export function useSiteOnline() {
  const [snap, setSnap] = useState({ total: 0, members: 0, guests: 0 });
  useEffect(() => subscribePresence(setSnap), []);
  return snap;
}
