// Installs the reliability listeners before React paints, but keeps incidents
// in memory until fx_analytics authorizes the network emitter.
import {
  _resetSharedCaptureForTests,
  installRuntimeErrorCapture,
} from "./runtimeErrorCapture.js";

const pending = [];
let reporter = null;
let prepared = false;
let collecting = true;

function reportOrQueue(...args) {
  if (!collecting) return;
  if (reporter) {
    try { reporter(...args); } catch { /* observability never blocks runtime */ }
    return;
  }
  pending.push(args);
}

export function prepareRuntimeErrorCapture2029(win = typeof window !== "undefined" ? window : null) {
  collecting = true;
  if (!prepared) prepared = installRuntimeErrorCapture(reportOrQueue, win) || prepared;
  return prepared;
}

export function attachRuntimeErrorReporter2029(nextReporter) {
  if (typeof nextReporter !== "function") return () => {};
  reporter = nextReporter;
  for (const args of pending.splice(0)) reportOrQueue(...args);
  return () => {
    if (reporter === nextReporter) reporter = null;
  };
}

export function runtimeErrorCollectorState2029() {
  return { prepared, collecting, pending: pending.length, authorized: Boolean(reporter) };
}

export function suspendRuntimeErrorCollector2029() {
  collecting = false;
  reporter = null;
  pending.length = 0;
}

export function resetRuntimeErrorCollectorForTest2029() {
  reporter = null;
  prepared = false;
  collecting = true;
  pending.length = 0;
  _resetSharedCaptureForTests();
}
