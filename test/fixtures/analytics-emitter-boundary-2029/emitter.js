import { attachRuntimeErrorReporter2029 } from "@errors";

window.__analyticsBoundary.moduleLoads += 1;
let active = false;
let detach = null;

export function startAnalyticsEmitter2029() {
  if (active) return;
  active = true;
  window.__analyticsBoundary.writes.push({ kind: "emitter_start" });
  detach = attachRuntimeErrorReporter2029((section, slug, eventType, meta) => {
    window.__analyticsBoundary.writes.push({ kind: "runtime_error", section, slug, event_type: eventType, meta });
  });
}

export function stopAnalyticsEmitter2029() {
  if (!active) return;
  active = false;
  detach?.();
  detach = null;
}

export function startRouteAnalytics2029(path) {
  window.__analyticsBoundary.writes.push({ kind: "track_visit", path });
  window.__analyticsBoundary.writes.push({ kind: "engagement_start", path });
}

export function finishRoutePageview2029(path) {
  window.__analyticsBoundary.writes.push({ kind: "ga_page_view", path });
  window.__analyticsBoundary.writes.push({ kind: "marketing_page_view", path });
}
