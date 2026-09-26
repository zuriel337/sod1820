// SOD1820 2029 real-user Web Vitals collector.
// EXTEND_EXISTING only: writes one semantic event family into the existing
// public.events pipeline through public.ingest_event. No second analytics store.
// Release-gate measurement remains separate browser evidence; this module is RUM.

import { supabase, SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";
import { getSodId, appContext, sessionId } from "./identity.js";
import { isBot } from "./botVerdict.js";
import {
  WEB_VITALS_VERSION,
  buildWebVitalsSnapshot,
  createClsState,
  createInpState,
} from "./webVitalsCore.js";

const CANONICAL_HOSTS = new Set(["sod1820.co.il", "www.sod1820.co.il"]);
const CHECKPOINT_MS = 15000;
const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/ingest_event?apikey=${SUPABASE_ANON}`;

function canonicalProduction() {
  try { return CANONICAL_HOSTS.has(String(location.hostname || "").toLowerCase()); }
  catch { return false; }
}

function sampleId() {
  try { return crypto?.randomUUID?.() || `wv-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  catch { return `wv-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function nodeLabel(node) {
  try {
    if (!node || node.nodeType !== 1) return null;
    const tag = String(node.tagName || "").toLowerCase();
    // RUM diagnostics deliberately omit DOM ids/text/content. Class names are
    // sufficient to find the shifting component while avoiding accidental
    // capture of user- or content-derived identifiers.
    const cls = typeof node.className === "string"
      ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((x) => `.${x}`).join("")
      : "";
    return `${tag}${cls}`.slice(0, 180) || null;
  } catch { return null; }
}

function navDiagnostics() {
  try {
    const nav = performance.getEntriesByType("navigation")?.[0] || null;
    if (!nav) return { ttfbMs: null, navType: null };
    return {
      ttfbMs: Math.max(0, Number(nav.responseStart || 0) - Number(nav.startTime || 0)),
      navType: nav.type || null,
    };
  } catch { return { ttfbMs: null, navType: null }; }
}

function keepaliveSend(payload) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(RPC_URL, blob)) return;
    }
  } catch { /* fall through */ }

  try {
    fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch { /* observability must never break navigation */ }
}

function ordinarySend(payload) {
  if (!supabase) return;
  try { supabase.rpc("ingest_event", payload).then(() => {}).catch(() => {}); }
  catch { /* observability must never break navigation */ }
}

function makePayload({ id, initialPath, phase, reason, snapshot, navType }) {
  return {
    p_sod_id: getSodId(),
    p_surface: "performance",
    p_event_type: "web_vital",
    p_path: initialPath,
    p_app_context: appContext(),
    p_session_id: sessionId(),
    p_is_bot: false,
    p_props: {
      ...snapshot,
      sample_id: id,
      phase,
      flush_reason: reason,
      initial_path: initialPath,
      current_path: typeof location !== "undefined" ? location.pathname : initialPath,
      collector: "performance_observer",
      measurement_scope: "document_navigation_hard_load_only",
      nav_type: navType,
      visibility_at_flush: typeof document !== "undefined" ? document.visibilityState : null,
    },
  };
}

export function startWebVitals2029(deps = {}) {
  const win = deps.win ?? (typeof window !== "undefined" ? window : null);
  const doc = deps.doc ?? (typeof document !== "undefined" ? document : null);
  const PerfObserver = deps.PerformanceObserverCtor ?? (typeof PerformanceObserver !== "undefined" ? PerformanceObserver : null);
  const setTimeoutFn = deps.setTimeoutFn ?? (win ? win.setTimeout.bind(win) : null);
  const clearTimeoutFn = deps.clearTimeoutFn ?? (win ? win.clearTimeout.bind(win) : null);
  const production = deps.production ?? canonicalProduction();
  const bot = deps.bot ?? (() => { try { return !!isBot(); } catch { return false; } })();

  if (!production || bot || !win || !doc || !PerfObserver) return () => {};

  const initialPath = deps.initialPath || win.location?.pathname || "/";
  const id = deps.sampleId || sampleId();
  const clsState = createClsState();
  const inpState = createInpState();
  const observers = [];
  let lcpMs = null;
  let fcpMs = null;
  let finalized = false;
  let checkpointSent = false;
  let checkpointTimer = null;
  const { ttfbMs, navType } = navDiagnostics();

  // This collector intentionally measures the hard document navigation only.
  // SPA route changes are not silently re-labeled as Core Web Vitals for the
  // destination URL. Observer callbacks after a client-side route change are ignored.
  const stillInitialPath = () => {
    try { return (win.location?.pathname || "/") === initialPath; }
    catch { return false; }
  };

  function observe(type, callback, options = {}) {
    try {
      const observer = new PerfObserver((list) => {
        if (!stillInitialPath()) return;
        try { callback(list.getEntries()); } catch { /* metric failure is isolated */ }
      });
      observer.observe({ type, ...options });
      observers.push(observer);
      return true;
    } catch { return false; }
  }

  observe("layout-shift", (entries) => {
    for (const entry of entries) {
      clsState.add({
        value: entry.value,
        startTime: entry.startTime,
        hadRecentInput: entry.hadRecentInput,
        sources: Array.from(entry.sources || []).map((source) => nodeLabel(source?.node)).filter(Boolean),
      });
    }
  }, { buffered: true });

  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcpMs = Number(last.startTime || 0);
  }, { buffered: true });

  observe("paint", (entries) => {
    const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
    if (fcp) fcpMs = Number(fcp.startTime || 0);
  }, { buffered: true });

  if (!observe("event", (entries) => {
    for (const entry of entries) inpState.add(entry);
  }, { durationThreshold: 40 })) {
    observe("event", (entries) => {
      for (const entry of entries) inpState.add(entry);
    });
  }

  function snapshot() {
    return buildWebVitalsSnapshot({ clsState, inpState, lcpMs, fcpMs, ttfbMs });
  }

  function send(phase, reason, keepalive = false) {
    if (phase === "checkpoint" && checkpointSent) return null;
    if (phase === "final" && finalized) return null;
    if (phase === "checkpoint") checkpointSent = true;
    if (phase === "final") finalized = true;

    const payload = makePayload({ id, initialPath, phase, reason, snapshot: snapshot(), navType });
    try {
      if (keepalive) keepaliveSend(payload);
      else ordinarySend(payload);
    } catch { /* never break UI */ }
    return payload;
  }

  function disconnect() {
    for (const observer of observers) {
      try { observer.disconnect(); } catch { /* ignore */ }
    }
    if (checkpointTimer && clearTimeoutFn) clearTimeoutFn(checkpointTimer);
    checkpointTimer = null;
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    win.removeEventListener("pagehide", onPageHide);
  }

  function finalize(reason) {
    if (finalized) return;
    send("final", reason, true);
    disconnect();
  }

  function onVisibilityChange() {
    if (doc.visibilityState === "hidden") finalize("visibility_hidden");
  }
  function onPageHide() { finalize("pagehide"); }

  doc.addEventListener("visibilitychange", onVisibilityChange);
  win.addEventListener("pagehide", onPageHide);

  if (setTimeoutFn) {
    checkpointTimer = setTimeoutFn(() => {
      if (!finalized) send("checkpoint", "15s_checkpoint", false);
    }, CHECKPOINT_MS);
  }

  return () => {
    // React/runtime teardown is not a user page finalization signal. Disconnect only.
    disconnect();
  };
}

export { WEB_VITALS_VERSION };
