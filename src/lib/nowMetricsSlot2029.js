// Mount point for site metrics inside the "Now" window. Deliberately CONTRACT-AGNOSTIC (ZURIEL 8.11.2026):
// the public metrics shape is owned by the metrics session (traffic_intelligence_law v12 is still a draft; PR #1199 / #1259 define no
// display DTO yet), so this file fixes NO field names, computes NOTHING and holds NO sample data.
// The owner of the metrics contract supplies a React component through NowMetricsContext2029; without one nothing is rendered.

export const NOT_MEASURED_LABEL = "לא נמדד";

/**
 * Display text for ONE metric value. A missing value is never shown as zero:
 * only a real finite number (including a real 0) prints as a number; everything else is "לא נמדד".
 */
export function metricDisplay(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : NOT_MEASURED_LABEL;
}

/** A provider is usable only if it supplies a component to render. Anything else leaves the slot closed. */
export const metricsPanelOf = provider => (provider && typeof provider.Panel === "function") ? provider.Panel : null;
