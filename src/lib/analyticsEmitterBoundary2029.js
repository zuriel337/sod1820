// One retryable import promise for all 2029 analytics owners. Callers reach
// this module only after fx_analytics has resolved ON.
export function createAnalyticsEmitterBoundary2029({
  importer = () => import("./analyticsEmitter2029.js"),
} = {}) {
  let loadPromise = null;
  let startedEmitter = null;
  const owners = new Set();

  function start(emitter) {
    if (startedEmitter === emitter) return;
    emitter.startAnalyticsEmitter2029();
    startedEmitter = emitter;
  }

  function load() {
    if (!loadPromise) {
      loadPromise = Promise.resolve().then(importer).catch((error) => {
        loadPromise = null;
        throw error;
      });
    }
    return loadPromise;
  }

  function activate() {
    const owner = {};
    owners.add(owner);
    void load().then((emitter) => {
      if (!owners.has(owner)) return;
      start(emitter);
    }).catch(() => { /* analytics loading never blocks navigation */ });
    return () => {
      owners.delete(owner);
      if (owners.size > 0 || !startedEmitter) return;
      const emitter = startedEmitter;
      try { emitter.stopAnalyticsEmitter2029(); } catch { /* observability never blocks runtime */ }
      if (startedEmitter === emitter) startedEmitter = null;
    };
  }

  function beginRoute(pathname, {
    delayMs = 350,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
  } = {}) {
    let routeLive = true;
    let loaded = null;
    let pageviewDue = false;
    const emitterLoad = load();
    const timer = setTimeoutFn(() => {
      if (!routeLive) return;
      if (loaded) loaded.finishRoutePageview2029(pathname);
      else pageviewDue = true;
    }, delayMs);

    void emitterLoad.then((emitter) => {
      if (!routeLive || owners.size === 0) return;
      loaded = emitter;
      // The route effect is declared after the owner effect, but this idempotent
      // call also protects tests and unusual scheduling from emitting pre-init.
      start(emitter);
      emitter.startRouteAnalytics2029(pathname);
      if (routeLive && pageviewDue) emitter.finishRoutePageview2029(pathname);
    }).catch(() => { /* a later ON/path effect retries the failed import */ });

    return () => {
      routeLive = false;
      clearTimeoutFn(timer);
    };
  }

  return { load, activate, beginRoute };
}

let boundary = createAnalyticsEmitterBoundary2029();

export const loadAnalyticsEmitter2029 = () => boundary.load();
export const activateAnalyticsEmitter2029 = () => boundary.activate();
export const beginRouteAnalytics2029 = (pathname, options) => boundary.beginRoute(pathname, options);

export function resetAnalyticsEmitterBoundaryForTest2029() {
  boundary = createAnalyticsEmitterBoundary2029();
}
