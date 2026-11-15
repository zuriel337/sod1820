// traffic_intelligence_law: extend events/ingest_event; no second collector
// store and no historical identity merge. Account authority stays in SQL.
import { SUPABASE_URL, SUPABASE_ANON } from './supabase.js';
import { getSodId, sessionId, appContext } from './identity.js';
import { getVisitorId } from './visitorId.js';
import { measurementAuth, subscribeMeasurementAuth } from './measurementAuth2029.js';
import { readingTelemetryPath, readingMeasurementPath, readingMeasurementBody } from './publicReadingTelemetry2029.js';
import { startPageEngagement } from './engagement.js';

export function captureMeasurement(path = globalThis.location?.pathname) {
  const auth = measurementAuth(), pagePath = readingMeasurementPath(path);
  if (!auth.ready || !pagePath) return null;
  return Object.freeze({ auth, pagePath, path: readingTelemetryPath(pagePath),
    sodId: getSodId({ bridgeLegacy: false }), visitorId: getVisitorId(),
    sessionId: sessionId({ accountBoundary: auth.userId || 'guest' }), appContext: appContext() });
}

export function measurementBody(context, surface, eventType, props = {}) {
  if (!context) return null;
  const body = { p_sod_id: context.sodId, p_session_id: context.sessionId, p_path: context.path,
    p_app_context: context.appContext, p_surface: surface, p_event_type: eventType, p_is_bot: false,
    p_props: { ...props, measurement: { version: 2, visitor_id: context.visitorId, page_path: context.pagePath } } };
  return readingMeasurementBody(body) ? body : null;
}

export function sendMeasurement(context, body, { keepalive = false, fetchFn = globalThis.fetch } = {}) {
  if (!context || !readingMeasurementBody(body)) return Promise.resolve(false);
  // Capture credentials at occurrence, including an explicit anonymous key.
  // Never ask the SDK for "the current user" after a delayed flush. A rejected
  // expired token is not retried as a guest or as the next signed-in account.
  return Promise.resolve().then(() => fetchFn(`${SUPABASE_URL}/rest/v1/rpc/ingest_event`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', keepalive,
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${context.auth.token || SUPABASE_ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })).then(response => response.ok, () => false);
}

export function startPublicPageEngagement(path) {
  const context = captureMeasurement(path);
  if (!context) return () => {};
  const tracker = startPageEngagement(context.path, {
    getSodIdFn: () => context.sodId, sessionIdFn: () => context.sessionId,
    appContextFn: () => context.appContext,
    sendFn: (payload, reason) => sendMeasurement(context,
      measurementBody(context, 'page', 'engagement', payload.p_props), { keepalive: reason === 'pagehide' }),
  });
  const unsubscribe = subscribeMeasurementAuth(next => {
    if (!next.ready || next.userId !== context.auth.userId) tracker.flush('route_change');
  });
  return () => { unsubscribe(); tracker.flush('route_change'); };
}
