// One operational contract router; descriptive only. Never grants roles,
// modifies feature flags, opens a PR, deploys or applies a database migration.
// All owners refer to existing SOD1820 laws, not new authorities.
const MAP = Object.freeze({
  save_failed: { owner: 'research_workspace_law', gate: 'research-sync-acceptance', kind: 'storage_sync' },
  save_started: { owner: 'research_workspace_law', gate: 'research-sync-acceptance', kind: 'storage_sync' },
  save_confirmed: { owner: 'research_workspace_law', gate: 'research-sync-acceptance', kind: 'storage_sync' },
  auth_failed: { owner: 'public_reading_auth', gate: '2029-live-contracts', kind: 'auth' },
  load_failed: { owner: 'foundation_closure_protocol_law', gate: '2029-isolation-and-release-visual', kind: 'release' },
  runtime_error: { owner: 'system_suggestions_law', gate: 'g3-reliability-preclose', kind: 'reliability' },
  issue_report: { owner: 'canonical_ui_components_law', gate: 'issue-report-acceptance', kind: 'user_report' },
  web_vital: { owner: 'traffic_intelligence_law', gate: 'observability-seo-build', kind: 'performance' },
});
export function routeAppIncident(eventType) {
  return MAP[eventType] || { owner: null, gate: null, kind: 'unclassified' };
}
export function classifyAppIncident(input) {
  const eventType = typeof input?.event_type === 'string' ? input.event_type : '';
  const surface = input?.surface === 'app_health' || input?.surface === 'issue_report'
    || input?.surface === 'performance' ? input.surface : null;
  if (!surface) return { owner: null, gate: null, kind: 'unclassified' };
  const type = surface === 'issue_report' ? 'issue_report'
    : surface === 'performance' && eventType === 'web_vital' ? 'web_vital'
    : surface === 'app_health' ? eventType : '';
  return { ...routeAppIncident(type), detected: type || null };
}
