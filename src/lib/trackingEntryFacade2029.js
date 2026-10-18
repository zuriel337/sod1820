// Small synchronous facade for 2029 modules that are shared by the first shell.
// Network-capable tracking stays behind fx_analytics; early calls are bounded in
// memory and retain their call order until the owner emitter is available.
import { getVisitorId } from "./visitorId.js";

const MAX_PENDING = 50;
const pending = [];
let sinks = null;
let collecting = true;

let firstEverVisit = false;
try { firstEverVisit = typeof localStorage !== "undefined" && !localStorage.getItem("sod_acq_first"); }
catch { firstEverVisit = false; }

function externalReferrer() {
  try {
    const ref = (typeof document !== "undefined" && document.referrer) || "";
    if (!ref) return null;
    const host = new URL(ref).hostname;
    return /(^|\.)sod1820\.co\.il$/i.test(host) ? null : host;
  } catch { return null; }
}

function dispatch(name, args) {
  if (!collecting) return undefined;
  const sink = sinks?.[name];
  if (typeof sink === "function") {
    try { return sink(...args); } catch { return undefined; }
  }
  if (pending.length < MAX_PENDING) pending.push({ name, args });
  return undefined;
}

export { getVisitorId };
export const track = (...args) => dispatch("track", args);
export const trackResearch = (...args) => dispatch("trackResearch", args);
export const trackShare = (...args) => dispatch("trackShare", args);
export const trackConversion = (...args) => dispatch("trackConversion", args);
export const trackSubscribe = (...args) => dispatch("trackSubscribe", args);
export function isFreshSearchLanding() { return firstEverVisit && Boolean(externalReferrer()); }

export function attachTrackingEntryEmitter2029(nextSinks) {
  collecting = true;
  sinks = nextSinks && typeof nextSinks === "object" ? nextSinks : null;
  if (sinks) {
    for (const entry of pending.splice(0)) dispatch(entry.name, entry.args);
  }
  return () => {
    if (sinks === nextSinks) sinks = null;
  };
}

export function trackingEntryFacadeState2029() {
  return { collecting, pending: pending.length, authorized: Boolean(sinks) };
}

export function resumeTrackingEntryCollection2029() {
  collecting = true;
}

export function suspendTrackingEntryCollection2029() {
  collecting = false;
  sinks = null;
  pending.length = 0;
}

export function resetTrackingEntryFacadeForTest2029() {
  sinks = null;
  collecting = true;
  pending.length = 0;
}
