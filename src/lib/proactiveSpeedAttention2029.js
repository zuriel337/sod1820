// Control Plane read-only proactive speed summary over the EXISTING admin_2029_analytics reader.
// A missing action receipt is UNKNOWN, never "no failures". Route rollups do not have
// metric-specific counts or route+device crossover, so they cannot prove mobile regressions.
const TARGET = Object.freeze({ lcp: 2500, inp: 200, cls: 0.1 });
const MIN = Object.freeze({ lcp: 50, inp: 30, cls: 50 });
const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const dimensions = Object.freeze([
  { metric: "lcp", field: "lcp_p75_ms", samples: "lcp_samples", label: "LCP", unit: "ms" },
  { metric: "inp", field: "inp_p75_ms", samples: "inp_samples", label: "INP", unit: "ms" },
  { metric: "cls", field: "cls_p75", samples: "cls_samples", label: "CLS", unit: "" },
]);
const candidate = (row, scope, name, metric, byDevice) => {
  const measured = number(row?.[metric.field]);
  const n = number(row?.[metric.samples]);
  const total = number(row?.samples);
  if (measured === null || measured < 0) return null;
  const above = measured > TARGET[metric.metric];
  if (!above) return null;
  // routes_by_samples has no per-metric count: do not use its all-events count as if
  // it established adequate interaction coverage. An unknown n is provisional.
  const confirmed = n !== null && Number.isSafeInteger(n) && n >= MIN[metric.metric];
  return {
    key: `${scope}:${name}:${metric.metric}`,
    scope, name, metric: metric.label, p75: measured, unit: metric.unit,
    target: TARGET[metric.metric], samples: n, totalSamples: total,
    status: confirmed ? "MEASURED_ABOVE_TARGET" : "PROVISIONAL",
    reason: confirmed ? "ENOUGH_SAMPLES_IN_THIS_METRIC" : byDevice ? "INSUFFICIENT_METRIC_SAMPLES" : "ROUTE_METRIC_SAMPLE_COUNT_UNAVAILABLE",
  };
};

export function proactiveSpeedAttention2029(webVitals, { actionEvidence = null } = {}) {
  const result = [];
  const byDevice = Array.isArray(webVitals?.by_device) ? webVitals.by_device : [];
  const routes = Array.isArray(webVitals?.routes_by_samples) ? webVitals.routes_by_samples : [];
  for (const row of byDevice) {
    const name = row?.device || "unknown";
    for (const metric of dimensions) {
      const issue = candidate(row, "device", name, metric, true);
      if (issue) result.push(issue);
    }
  }
  for (const row of routes) {
    const name = row?.path || "unknown";
    for (const metric of dimensions) {
      const issue = candidate(row, "route", name, metric, false);
      if (issue) result.push(issue);
    }
  }
  result.sort((a,b)=> (a.status === "MEASURED_ABOVE_TARGET" ? 0 : 1) - (b.status === "MEASURED_ABOVE_TARGET" ? 0 : 1) || a.key.localeCompare(b.key));
  const receiptAvailable = actionEvidence?.kind === "server_receipt_and_reload" && actionEvidence?.verified === true;
  return Object.freeze({
    schema:"sod1820.proactive-speed-attention.v1",
    issues: result.slice(0, 16),
    totalIssues: result.length,
    speedCoverage: !webVitals ? "UNKNOWN" : byDevice.length || routes.length ? "PARTIAL_READ" : "NO_DATA",
    personalSave: receiptAvailable ? "OBSERVED_WITH_SERVER_AND_RELOAD_EVIDENCE" : "UNKNOWN_NO_SERVER_RECEIPT_AND_RELOAD_EVIDENCE",
    limitation: "Existing aggregate RUM reflects hard navigations only. Route and device groups are separate; route+device and action completion must be measured independently.",
  });
}
