// Failure-only, lazy-loaded public application diagnostics.
// Extends events/ingest_event; no second collector, no persistent browser queue,
// no AI call, and no transmission of personal content or raw error messages.
import { captureMeasurement, measurementBody, sendMeasurement } from './measurement2029.js';
import { readingActionProps, readingTelemetryPath } from './publicReadingTelemetry2029.js';

const KINDS = new Set(['save_started', 'save_confirmed', 'save_failed', 'auth_failed', 'load_failed', 'runtime_error']);
const REASONS = new Set(['storage_full', 'storage_blocked', 'storage_unavailable', 'sync_error', 'sync_conflict', 'no_receipt',
  'network', 'server_error', 'session_missing', 'refresh_failed', 'chunk_error', 'render_error', 'unknown']);
const STAGES = new Set(['save', 'auth', 'load', 'runtime']);
const seen = new Set();
let savedSignals = 0;
let firstMinute = 0, inMinute = 0, total = 0;
export function normalizeAppFailure(kind, { reason = 'unknown', stage = 'runtime' } = {}) {
  if (!KINDS.has(kind)) return null;
  return { kind, reason: REASONS.has(reason) ? reason : 'unknown',
    stage: STAGES.has(stage) ? stage : 'runtime' };
}

// Never run in normal browsing. A single failed operation can be reported once per
// tab/load; bound retries and repeated render errors even if callers malfunction.
export function appFailureAdmission(value, now = Date.now()) {
  if (!value) return false;
  if (total >= 8) return false;
  if (now - firstMinute >= 60000) { firstMinute = now; inMinute = 0; }
  if (inMinute >= 3) return false;
  const key = [value.kind, value.reason, value.stage].join('|');
  if (seen.has(key)) return false;
  seen.add(key); total++; inMinute++;
  return true;
}

export function reportAppHealth(kind, details = {}) {
  try {
    const data = normalizeAppFailure(kind, details);
    if (!appFailureAdmission(data)) return Promise.resolve(false);
    // Private/auth routes are never transmitted. Instead use one fixed
    // operational route label, not the user's personal URL or query/hash.
    const route = readingTelemetryPath(globalThis.location?.pathname || '') || '/app-health';
    const context = captureMeasurement(route);
    if (!context) return Promise.resolve(false);
    const props = readingActionProps('app_health', data.kind, { reason: data.reason, stage: data.stage });
    const body = measurementBody(context, 'app_health', data.kind, props);
    return body ? sendMeasurement(context, body).catch(() => false) : Promise.resolve(false);
  } catch { return Promise.resolve(false); }
}

// Explicit ELS save attempts only (no events from normal browsing). Keep
// started and receipt-backed result separate so missing receipts are visible.
export function recordCipherSave(kind) {
  if (kind !== 'save_started' && kind !== 'save_confirmed' && kind !== 'save_failed') return Promise.resolve(false);
  if (savedSignals >= 12) return Promise.resolve(false);
  savedSignals++;
  try {
    const context = captureMeasurement('/code');
    if (!context) return Promise.resolve(false);
    const reason = kind === 'save_failed' ? 'no_receipt' : 'unknown';
    const props = readingActionProps('app_health', kind, { reason, stage: 'save' });
    const body = measurementBody(context, 'app_health', kind, props);
    return body ? sendMeasurement(context, body).catch(() => false) : Promise.resolve(false);
  } catch { return Promise.resolve(false); }
}
