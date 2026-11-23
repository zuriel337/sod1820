// SOD1820 read-only interpretation of existing action-telemetry aggregates.
// Does not collect personal content, create a store or assume that missing events mean zero.
// Called after the existing Control Plane has supplied evidence from its own owners.
const finiteCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const percentage = (part, total) => total ? part / total : null;

export function evaluateActionHealth({ action, previous = null, current = null, minimumSample = 20 } = {}) {
  const metrics = current && {
    started: finiteCount(current.started),
    uiConfirmed: finiteCount(current.uiConfirmed),
    serverAck: finiteCount(current.serverAck),
    reloadVerified: finiteCount(current.reloadVerified),
    reloadChecks: finiteCount(current.reloadChecks),
    explicitFailures: finiteCount(current.explicitFailures),
  };
  if (!action || !metrics || metrics.started === null || metrics.started === 0 || metrics.serverAck === null) {
    return { action: action || null, status: "UNKNOWN", reason: "MISSING_ACTION_RECEIPT_COVERAGE", evidence: "No complete attempt-to-server-ack denominator" };
  }
  if (metrics.serverAck > metrics.started || metrics.uiConfirmed !== null && metrics.uiConfirmed > metrics.started) {
    return { action, status: "UNKNOWN", reason: "INCONSISTENT_ACTION_TELEMETRY", evidence: "Check dedupe and event identity" };
  }
  if (metrics.uiConfirmed !== null && metrics.uiConfirmed > metrics.serverAck) {
    return { action, status: "FAIL", reason: "CLIENT_SUCCESS_WITHOUT_SERVER_ACK", evidence: { ...metrics } };
  }
  if (metrics.reloadChecks !== null && metrics.reloadChecks > 0 && metrics.reloadVerified !== null && metrics.reloadVerified < metrics.reloadChecks) {
    return { action, status: "FAIL", reason: "RELOAD_PERSISTENCE_MISMATCH", evidence: { ...metrics } };
  }
  if (metrics.started < minimumSample || metrics.reloadChecks === null || metrics.reloadVerified === null) {
    return { action, status: "UNKNOWN", reason: "INSUFFICIENT_SAMPLE_OR_RELOAD_COVERAGE", evidence: { ...metrics } };
  }
  if (metrics.explicitFailures !== null && metrics.explicitFailures > 0) {
    const previousStarted = finiteCount(previous?.started);
    const previousFailures = finiteCount(previous?.explicitFailures);
    if (previousStarted !== null && previousStarted >= minimumSample && previousFailures !== null) {
      const previousRate = percentage(previousFailures, previousStarted);
      const currentRate = percentage(metrics.explicitFailures, metrics.started);
      if (currentRate - previousRate >= 0.05) {
        return { action, status: "FAIL", reason: "FAILURE_RATE_INCREASED_AT_LEAST_5PP", evidence: { previousRate, currentRate, ...metrics } };
      }
    }
  }
  const serverRate = percentage(metrics.serverAck, metrics.started);
  if (serverRate < 0.95) return { action, status: "REVIEW", reason: "LOW_SERVER_ACK_COVERAGE", evidence: { rate: serverRate, ...metrics } };
  return { action, status: "OBSERVED_OK", reason: "NO_REGRESSION_DETECTED_IN_COVERED_SAMPLE", evidence: { ...metrics, note: "Not proof that every action works; compare real browser checks." } };
}
