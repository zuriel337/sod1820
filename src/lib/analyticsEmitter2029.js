// The complete 2029 analytics/network emitter. Nothing imports this module
// statically from the 2029 entry graph; fx_analytics owns its dynamic boundary.
import { initGA, trackPageview } from "./analytics.js";
import { initMarketing, trackConversion, trackMarketingPageview, trackSubscribe } from "./marketing.js";
import { trackVisit } from "./visits.js";
import { startPageEngagement } from "./engagement.js";
import { cancelPageEngagementTracker2029 } from "./engagementLifecycle2029.js";
import { ensureIdentity } from "./identity.js";
import { track, trackResearch, trackShare } from "./tracking.js";
import { attachRuntimeErrorReporter2029 } from "./runtimeErrorCollector2029.js";
import { attachTrackingEntryEmitter2029 } from "./trackingEntryFacade2029.js";
import { startWebVitalsEmitter2029 } from "./webVitalsEmitter2029.js";

let active = false;
let stopVitals = null;
let detachRuntimeErrors = null;
let detachEntryTracking = null;
let activeEngagement = null;

export function startAnalyticsEmitter2029() {
  if (active) return;
  active = true;
  initGA();
  initMarketing();
  ensureIdentity();
  detachRuntimeErrors = attachRuntimeErrorReporter2029(track);
  detachEntryTracking = attachTrackingEntryEmitter2029({ track, trackResearch, trackShare, trackConversion, trackSubscribe });
  stopVitals = startWebVitalsEmitter2029();
}

export function stopAnalyticsEmitter2029() {
  if (!active) return;
  active = false;
  cancelPageEngagementTracker2029(activeEngagement);
  activeEngagement = null;
  try { stopVitals?.(); } catch { /* observability never blocks runtime */ }
  try { detachRuntimeErrors?.(); } catch { /* observability never blocks runtime */ }
  try { detachEntryTracking?.(); } catch { /* observability never blocks runtime */ }
  stopVitals = null;
  detachRuntimeErrors = null;
  detachEntryTracking = null;
}

export function startRouteAnalytics2029(pathname) {
  trackVisit(pathname);
  activeEngagement = startPageEngagement(pathname);
}

export function finishRoutePageview2029(pathname) {
  trackPageview(pathname);
  trackMarketingPageview();
}
