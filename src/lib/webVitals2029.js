// SOD1820 2029 real-user performance collector.
// EXTEND_EXISTING only: the existing public.events -> public.ingest_event path
// remains the sole store. Preview builds collect nothing outside memory and make
// zero telemetry/identity writes.

import { isBot } from "./botVerdict.js";
import {
  RUM_METRIC_SCOPE,
  WEB_VITALS_VERSION,
  buildWebVitalsSnapshot,
  createClsState,
  createInpState,
} from "./webVitalsCore.js";
import { primaryContentState2029 } from "./usableContent2029.js";

const CANONICAL_HOSTS = new Set(["sod1820.co.il", "www.sod1820.co.il"]);
const CHECKPOINT_MS = 15000;
const USABLE_TIMEOUT_MS = 30000;
const AUTHORIZATION_TIMEOUT_MS = 30000;
const USABLE_POLL_MS = 100;
const COMPILED_BUILD_SHA = typeof __SOD_BUILD_SHA__ === "string" ? __SOD_BUILD_SHA__ : "unknown";
const COMPILED_DEPLOY_ENV = typeof __SOD_DEPLOY_ENV__ === "string" ? __SOD_DEPLOY_ENV__ : "unknown";

let preparedRuntime = null;

function canonicalProduction(win) {
  try { return CANONICAL_HOSTS.has(String(win?.location?.hostname || "").toLowerCase()); }
  catch { return false; }
}

function newId(prefix, cryptoObject = globalThis.crypto) {
  try { return `${prefix}-${cryptoObject?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
  catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function nodeLabel(node) {
  try {
    if (!node || node.nodeType !== 1) return null;
    const tag = String(node.tagName || "").toLowerCase();
    // No ids, text or content-derived values enter diagnostics.
    const cls = typeof node.className === "string"
      ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((x) => `.${x}`).join("")
      : "";
    return `${tag}${cls}`.slice(0, 180) || null;
  } catch { return null; }
}

function navigationDiagnostics(win) {
  try {
    const nav = win.performance?.getEntriesByType?.("navigation")?.[0] || null;
    if (!nav) return { ttfbMs: null, navType: null };
    return {
      ttfbMs: Math.max(0, Number(nav.responseStart || 0) - Number(nav.startTime || 0)),
      navType: nav.type || null,
    };
  } catch { return { ttfbMs: null, navType: null }; }
}

function deviceClass(win) {
  try {
    const ua = String(win.navigator?.userAgent || "");
    const width = Number(win.innerWidth || win.document?.documentElement?.clientWidth || 0);
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/i.test(ua) && Number(win.navigator?.maxTouchPoints || 0) > 1)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua) || (width > 0 && width < 768)) return "mobile";
    if (width > 0 && width <= 1100 && win.matchMedia?.("(pointer: coarse)")?.matches) return "tablet";
    return "desktop";
  } catch { return "unknown"; }
}

function trafficHint(doc, win, botVerdict) {
  if (botVerdict) return "suspected";
  try {
    const edge = doc.cookie.match(/(?:^|;\s*)vb=([a-z]+)/i)?.[1]?.toLowerCase() || null;
    if (edge === "browser" && win.navigator?.webdriver !== true) return "human_like";
  } catch { /* unknown remains explicit */ }
  return "unknown";
}

function currentRoute(win) {
  try { return win.location?.pathname || "/"; }
  catch { return "/"; }
}

function hardNavKind(navType) {
  if (navType === "reload") return "hard_reload";
  if (navType === "back_forward") return "hard_back_forward";
  return "hard_load";
}

function phaseRank(phase) {
  return phase === "final" ? 2 : phase === "checkpoint" ? 1 : 0;
}

export function createWebVitalsRuntime2029(deps = {}) {
  const win = deps.win ?? (typeof window !== "undefined" ? window : null);
  const doc = deps.doc ?? (typeof document !== "undefined" ? document : null);
  const PerfObserver = Object.prototype.hasOwnProperty.call(deps, "PerformanceObserverCtor")
    ? deps.PerformanceObserverCtor
    : (typeof PerformanceObserver !== "undefined" ? PerformanceObserver : null);
  if (!win || !doc) return null;

  const setTimeoutFn = deps.setTimeoutFn ?? win.setTimeout.bind(win);
  const clearTimeoutFn = deps.clearTimeoutFn ?? win.clearTimeout.bind(win);
  const now = deps.now ?? (() => Number(win.performance?.now?.() || 0));
  const production = deps.production ?? canonicalProduction(win);
  const buildSha = String((deps.buildSha ?? COMPILED_BUILD_SHA) || "unknown").slice(0, 80);
  const deployEnv = String((deps.deployEnv ?? COMPILED_DEPLOY_ENV) || "unknown").slice(0, 40);
  const botVerdict = deps.bot ?? (() => { try { return Boolean(isBot()); } catch { return false; } })();
  const audienceHint = deps.trafficHint ?? trafficHint(doc, win, botVerdict);
  const device = deps.deviceClass ?? deviceClass(win);
  // The early collector deliberately has no transport or identity import. The
  // fx_analytics owner injects those dependencies only after the switch is ON.
  let emitter = {
    transport: deps.transport ?? null,
    getSodId: deps.getSodId ?? null,
    appContext: deps.appContext ?? null,
    sessionId: deps.sessionId ?? null,
  };
  const readiness = deps.readiness ?? ((route) => primaryContentState2029({ pathname: route, doc, win }));
  const checkpointMs = Number(deps.checkpointMs ?? CHECKPOINT_MS);
  const usableTimeoutMs = Number(deps.usableTimeoutMs ?? USABLE_TIMEOUT_MS);
  const authorizationTimeoutMs = Number(deps.authorizationTimeoutMs ?? AUTHORIZATION_TIMEOUT_MS);
  const usablePollMs = Number(deps.usablePollMs ?? USABLE_POLL_MS);
  const initialRoute = deps.initialPath || currentRoute(win);
  const { ttfbMs, navType } = deps.navigation ?? navigationDiagnostics(win);
  const clsState = createClsState();
  const inpState = createInpState();
  const observers = [];
  const pending = new Map();
  const sentPhase = new Map();
  const listeners = [];
  const originalHistory = {};
  let authorization = "unknown";
  let disposed = false;
  let lcpMs = null;
  let fcpMs = null;
  let sequence = 0;
  let hardFinalized = false;
  let activeRoute = null;
  let checkpointTimer = null;
  let authorizationTimer = null;
  let hardUsableStop = null;
  let softUsableStop = null;

  const hardSample = {
    sampleId: deps.sampleId || newId("rum", deps.cryptoObject),
    routeInstanceId: deps.routeInstanceId || newId("route", deps.cryptoObject),
    route: initialRoute,
    navKind: hardNavKind(navType),
    navType,
    startedAt: 0,
    usableMs: null,
    usableKind: null,
  };

  function addListener(target, type, callback, options) {
    target?.addEventListener?.(type, callback, options);
    listeners.push(() => target?.removeEventListener?.(type, callback, options));
  }

  function observe(type, callback, options = {}) {
    if (!PerfObserver) return false;
    try {
      const observer = new PerfObserver((list) => {
        try { callback(list.getEntries()); } catch { /* isolate metric failure */ }
      });
      observer.observe({ type, ...options });
      observers.push(observer);
      return true;
    } catch { return false; }
  }

  const metricSupport = { cls: false, lcp: false, fcp: false, inp: false };
  metricSupport.cls = observe("layout-shift", (entries) => {
    for (const entry of entries) {
      clsState.add({
        value: entry.value,
        startTime: entry.startTime,
        hadRecentInput: entry.hadRecentInput,
        sources: Array.from(entry.sources || []).map((source) => nodeLabel(source?.node)).filter(Boolean),
      });
    }
  }, { buffered: true });
  metricSupport.lcp = observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcpMs = Number(last.startTime || 0);
  }, { buffered: true });
  metricSupport.fcp = observe("paint", (entries) => {
    const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
    if (fcp) fcpMs = Number(fcp.startTime || 0);
  }, { buffered: true });
  metricSupport.inp = observe("event", (entries) => {
    for (const entry of entries) inpState.add(entry);
  }, { durationThreshold: 40 });
  if (!metricSupport.inp) {
    metricSupport.inp = observe("event", (entries) => {
      for (const entry of entries) inpState.add(entry);
    });
  }

  function disconnectMetricObservers() {
    for (const observer of observers.splice(0)) {
      try { observer.disconnect(); } catch { /* ignore */ }
    }
  }

  function makeMeasurement(sample, { phase = "final", reason, hard = false } = {}) {
    const common = {
      vitals_version: WEB_VITALS_VERSION,
      build_sha: buildSha,
      deploy_env: deployEnv,
      route: sample.route,
      route_instance_id: sample.routeInstanceId,
      nav_kind: sample.navKind,
      device_class: device,
      sample_id: sample.sampleId,
      phase,
      sequence: ++sequence,
      flush_reason: reason,
      usable_ms: sample.usableMs,
      usable_kind: sample.usableKind,
      usable_state: sample.usableMs == null ? "not_observed" : "usable",
      collector: "performance_observer",
      traffic_hint: audienceHint,
      visibility_at_flush: doc.visibilityState || null,
    };
    if (!hard) return { ...common, measurement_scope: RUM_METRIC_SCOPE.SPA_NAVIGATION };
    const snapshot = buildWebVitalsSnapshot({ clsState, inpState, lcpMs, fcpMs, ttfbMs });
    if (!metricSupport.cls) {
      snapshot.cls = null;
      snapshot.cls_shift_sources = [];
      snapshot.ratings.cls = null;
    }
    return {
      ...snapshot,
      ...common,
      measurement_scope: RUM_METRIC_SCOPE.HARD_LOAD,
      nav_type: sample.navType,
      metric_support: { ...metricSupport, navigation: ttfbMs != null },
    };
  }

  function rpcPayload(measurement) {
    const pIsBot = audienceHint === "suspected" || botVerdict;
    return {
      p_sod_id: emitter.getSodId?.() ?? null,
      p_surface: "performance",
      p_event_type: "web_vital",
      p_path: measurement.route,
      p_app_context: emitter.appContext?.() ?? null,
      p_device: device,
      p_session_id: emitter.sessionId?.() ?? null,
      p_is_bot: pIsBot,
      p_props: measurement,
    };
  }

  function transmit(record) {
    if (!production || authorization !== "enabled" || disposed) return;
    const previousRank = sentPhase.get(record.measurement.sample_id) || 0;
    const nextRank = phaseRank(record.measurement.phase);
    if (nextRank < previousRank || (nextRank === previousRank && nextRank > 0)) return;
    try {
      if (typeof emitter.transport !== "function") return;
      emitter.transport(rpcPayload(record.measurement), { keepalive: record.keepalive, win });
      sentPhase.set(record.measurement.sample_id, nextRank);
    } catch { /* observability never blocks runtime */ }
  }

  function queue(record) {
    if (authorization === "disabled" || disposed) return;
    const id = record.measurement.sample_id;
    const prior = pending.get(id);
    if (!prior || phaseRank(record.measurement.phase) >= phaseRank(prior.measurement.phase)) pending.set(id, record);
    if (authorization === "enabled") {
      const next = pending.get(id);
      pending.delete(id);
      transmit(next);
    }
  }

  function flushPending() {
    for (const record of pending.values()) transmit(record);
    pending.clear();
  }

  function watchUsable(sample, onOutcome, { deferFirst = false } = {}) {
    let stopped = false;
    let pollTimer = null;
    const deadline = now() + usableTimeoutMs;
    const check = () => {
      if (stopped || disposed) return;
      let state = null;
      try { state = readiness(sample.route); } catch { state = null; }
      sample.usableKind = state?.kind || sample.usableKind;
      if (state?.usable) {
        sample.usableMs = Math.max(0, Math.round((now() - sample.startedAt) * 10) / 10);
        stopped = true;
        onOutcome?.("usable");
        return;
      }
      if (now() >= deadline) {
        stopped = true;
        onOutcome?.("timeout");
        return;
      }
      pollTimer = setTimeoutFn(check, usablePollMs);
    };
    if (deferFirst) pollTimer = setTimeoutFn(check, 0);
    else check();
    return () => {
      stopped = true;
      if (pollTimer != null) clearTimeoutFn(pollTimer);
    };
  }

  function sendHard(phase, reason, keepalive = false) {
    if (phase === "final" && hardFinalized) return;
    if (phase === "final") hardFinalized = true;
    queue({ measurement: makeMeasurement(hardSample, { phase, reason, hard: true }), keepalive });
    if (phase === "final") {
      disconnectMetricObservers();
      hardUsableStop?.();
      hardUsableStop = null;
      if (checkpointTimer != null) clearTimeoutFn(checkpointTimer);
      checkpointTimer = null;
    }
  }

  function finishActiveRoute(reason, keepalive = false) {
    if (!activeRoute || activeRoute.sent) return;
    activeRoute.sent = true;
    softUsableStop?.();
    softUsableStop = null;
    queue({ measurement: makeMeasurement(activeRoute, { phase: "final", reason, hard: false }), keepalive });
  }

  function beginRoute(route, navKind, force = false, startedAt = now()) {
    if (!force && route === (activeRoute?.route || hardSample.route) && !hardFinalized) return;
    if (!hardFinalized) sendHard("final", "spa_departure", false);
    else finishActiveRoute("navigation_superseded", false);
    activeRoute = {
      sampleId: newId("rum", deps.cryptoObject),
      routeInstanceId: newId("route", deps.cryptoObject),
      route,
      navKind,
      startedAt,
      usableMs: null,
      usableKind: null,
      sent: false,
    };
    softUsableStop = watchUsable(activeRoute, (outcome) => {
      finishActiveRoute(outcome === "usable" ? "usable_content" : "usable_timeout", false);
    }, { deferFirst: true });
  }

  function routeChanged(navKind, force = false, startedAt = now()) {
    const route = currentRoute(win);
    const current = activeRoute?.route || (!hardFinalized ? hardSample.route : null);
    if (!force && route === current) return;
    beginRoute(route, navKind, force, startedAt);
  }

  function wrapHistory(method, navKind) {
    const history = win.history;
    if (!history || typeof history[method] !== "function") return;
    const original = history[method];
    const wrapped = function wrappedHistory(...args) {
      const result = original.apply(this, args);
      // Close hard-load CWV at the route boundary, before destination rendering
      // can contaminate it. The destination readiness check itself waits a task.
      routeChanged(navKind, false, now());
      return result;
    };
    originalHistory[method] = { original, wrapped };
    history[method] = wrapped;
  }

  function pageHidden(reason) {
    if (!hardFinalized) sendHard("final", reason, true);
    else finishActiveRoute(reason, true);
  }

  hardUsableStop = watchUsable(hardSample);
  checkpointTimer = setTimeoutFn(() => {
    if (!hardFinalized) sendHard("checkpoint", "15s_checkpoint", false);
  }, checkpointMs);
  authorizationTimer = setTimeoutFn(() => {
    if (authorization === "unknown") dispose();
  }, authorizationTimeoutMs);

  addListener(doc, "visibilitychange", () => {
    if (doc.visibilityState === "hidden") pageHidden("visibility_hidden");
  });
  addListener(win, "pagehide", () => pageHidden("pagehide"));
  addListener(win, "popstate", () => routeChanged("spa_pop"));
  addListener(win, "pageshow", (event) => {
    if (event.persisted) routeChanged("bfcache_restore", true);
  });
  wrapHistory("pushState", "spa_push");
  wrapHistory("replaceState", "spa_replace");

  function authorize(emitterDeps = {}) {
    if (disposed) return;
    emitter = {
      transport: emitterDeps.transport ?? emitter.transport,
      getSodId: emitterDeps.getSodId ?? emitter.getSodId,
      appContext: emitterDeps.appContext ?? emitter.appContext,
      sessionId: emitterDeps.sessionId ?? emitter.sessionId,
    };
    authorization = "enabled";
    if (authorizationTimer != null) clearTimeoutFn(authorizationTimer);
    authorizationTimer = null;
    if (!production) {
      pending.clear();
      dispose();
      return;
    }
    flushPending();
  }

  function suspend() {
    if (disposed) return;
    authorization = "disabled";
    pending.clear();
  }

  function dispose() {
    if (disposed) return;
    pending.clear();
    disconnectMetricObservers();
    hardUsableStop?.();
    softUsableStop?.();
    hardUsableStop = null;
    softUsableStop = null;
    if (checkpointTimer != null) clearTimeoutFn(checkpointTimer);
    if (authorizationTimer != null) clearTimeoutFn(authorizationTimer);
    checkpointTimer = null;
    authorizationTimer = null;
    for (const remove of listeners.splice(0)) {
      try { remove(); } catch { /* ignore */ }
    }
    for (const [method, entry] of Object.entries(originalHistory)) {
      try {
        // Never erase a history wrapper installed by another owner after ours.
        if (win.history[method] === entry.wrapped) win.history[method] = entry.original;
      } catch { /* ignore */ }
    }
    disposed = true;
  }

  return {
    authorize,
    suspend,
    dispose,
    isDisposed: () => disposed,
    state: () => ({
      authorization,
      production,
      buildSha,
      deployEnv,
      deviceClass: device,
      trafficHint: audienceHint,
      pending: pending.size,
      hardFinalized,
      activeRoute: activeRoute?.route || null,
    }),
  };
}

// Called from the 2029 entry module before React renders. Observation is memory-only
// until the existing fx_analytics effect calls startWebVitals2029 after the switch resolves.
export function prepareWebVitals2029(deps = {}) {
  if (!preparedRuntime || preparedRuntime.isDisposed()) preparedRuntime = createWebVitalsRuntime2029(deps);
  return preparedRuntime;
}

export function startWebVitals2029(deps = {}) {
  const runtime = prepareWebVitals2029(deps);
  runtime?.authorize(deps);
  return () => runtime?.suspend();
}

export function suspendWebVitalsCollection2029() {
  preparedRuntime?.dispose();
  preparedRuntime = null;
}

export function resetWebVitalsRuntimeForTest2029() {
  preparedRuntime?.dispose();
  preparedRuntime = null;
}

export { RUM_METRIC_SCOPE, WEB_VITALS_VERSION };
