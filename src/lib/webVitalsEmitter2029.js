// Network/identity half of the 2029 RUM collector. This module is intentionally
// reachable only through the fx_analytics dynamic boundary.
import { supabase, SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";
import { getSodId, appContext, sessionId } from "./identity.js";
import { startWebVitals2029 } from "./webVitals2029.js";

const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/ingest_event?apikey=${SUPABASE_ANON}`;

function ordinarySend(payload) {
  if (!supabase) return;
  try { supabase.rpc("ingest_event", payload).then(() => {}).catch(() => {}); }
  catch { /* observability never blocks runtime */ }
}

function keepaliveSend(payload, win) {
  const body = JSON.stringify(payload);
  try {
    if (typeof win?.navigator?.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (win.navigator.sendBeacon(RPC_URL, blob)) return;
    }
  } catch { /* fall through */ }
  try {
    win?.fetch?.(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })?.catch?.(() => {});
  } catch { /* observability never blocks runtime */ }
}

function transport(payload, { keepalive = false, win } = {}) {
  if (keepalive) keepaliveSend(payload, win);
  else ordinarySend(payload);
}

export function startWebVitalsEmitter2029() {
  return startWebVitals2029({ transport, getSodId, appContext, sessionId });
}
