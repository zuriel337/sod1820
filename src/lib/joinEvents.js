import { supabase } from "./supabase.js";

// ערוץ Realtime לחגיגת הצטרפות — כשמישהו משלים הרשמה/אימות מייל,
// קופצת לכל המבקרים הנוכחיים הודעה חגיגית. ללא PII — רק חגיגה.
const CHANNEL = "site-joins";

// משדר אירוע הצטרפות לכל המבקרים האחרים שמחוברים כעת
export function broadcastJoin(payload = {}) {
  try {
    const ch = supabase.channel(CHANNEL);
    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      ch.send({ type: "broadcast", event: "join", payload: { ts: Date.now(), ...payload } });
      setTimeout(() => { try { supabase.removeChannel(ch); } catch { /* ignore */ } }, 1500);
    });
  } catch { /* ignore */ }
}

// מאזין לאירועי הצטרפות; מחזיר פונקציית ניקוי
export function subscribeJoins(cb) {
  const ch = supabase
    .channel(CHANNEL)
    .on("broadcast", { event: "join" }, ({ payload }) => cb(payload || {}))
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
}
