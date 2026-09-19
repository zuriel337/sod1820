// SOD1820 2029 Web Vitals core — pure metric state, no browser or transport imports.
// Owner: Experience release acceptance + Traffic Intelligence measurement truth.
// This module intentionally keeps the Google-compatible thresholds explicit and versioned.

export const WEB_VITALS_VERSION = 1;

export const WEB_VITAL_THRESHOLDS = Object.freeze({
  cls: Object.freeze({ good: 0.1, poor: 0.25 }),
  lcp_ms: Object.freeze({ good: 2500, poor: 4000 }),
  inp_ms: Object.freeze({ good: 200, poor: 500 }),
  fcp_ms: Object.freeze({ good: 1800, poor: 3000 }),
  ttfb_ms: Object.freeze({ good: 800, poor: 1800 }),
});

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function round(value, digits = 1) {
  const n = finiteNumber(value);
  if (n == null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

export function rateWebVital(metric, value) {
  const threshold = WEB_VITAL_THRESHOLDS[metric];
  const n = finiteNumber(value);
  if (!threshold || n == null) return null;
  if (n <= threshold.good) return "good";
  if (n <= threshold.poor) return "needs_improvement";
  return "poor";
}

// CLS follows the session-window definition used by Core Web Vitals:
// group shifts while consecutive gaps are <1s and the window is <5s;
// the metric is the largest such window. User-input shifts never count.
export function createClsState() {
  let windowStart = null;
  let lastShiftAt = null;
  let windowValue = 0;
  let windowSources = [];
  let maxValue = 0;
  let maxSources = [];

  return {
    add(entry = {}) {
      const value = finiteNumber(entry.value);
      const startTime = finiteNumber(entry.startTime);
      if (value == null || startTime == null || entry.hadRecentInput) return;

      const startsNewWindow =
        windowStart == null ||
        lastShiftAt == null ||
        startTime - lastShiftAt >= 1000 ||
        startTime - windowStart >= 5000;

      if (startsNewWindow) {
        windowStart = startTime;
        windowValue = 0;
        windowSources = [];
      }

      windowValue += value;
      lastShiftAt = startTime;

      for (const source of Array.isArray(entry.sources) ? entry.sources : []) {
        const label = String(source || "").trim();
        if (label && !windowSources.includes(label)) windowSources.push(label);
        if (windowSources.length >= 8) break;
      }

      if (windowValue > maxValue) {
        maxValue = windowValue;
        maxSources = windowSources.slice(0, 8);
      }
    },
    snapshot() {
      return {
        cls: round(maxValue, 4) ?? 0,
        cls_shift_sources: maxSources.slice(),
      };
    },
  };
}

// INP is derived from unique Event Timing interactionId values.
// For 50+ interactions, one high outlier is discarded per 50 interactions,
// matching the 98th-percentile interaction selection used by INP.
export function createInpState() {
  const interactions = new Map();

  return {
    add(entry = {}) {
      const id = Number(entry.interactionId);
      const duration = finiteNumber(entry.duration);
      if (!Number.isFinite(id) || id <= 0 || duration == null) return;
      const prior = interactions.get(id) || 0;
      if (duration > prior) interactions.set(id, duration);
    },
    snapshot() {
      const values = [...interactions.values()].sort((a, b) => b - a);
      if (!values.length) return { inp_ms: null, interaction_count: 0 };
      const index = Math.min(values.length - 1, Math.floor(values.length / 50));
      return {
        inp_ms: round(values[index], 1),
        interaction_count: values.length,
      };
    },
  };
}

export function buildWebVitalsSnapshot({
  clsState,
  inpState,
  lcpMs = null,
  fcpMs = null,
  ttfbMs = null,
} = {}) {
  const cls = clsState?.snapshot?.() || { cls: 0, cls_shift_sources: [] };
  const inp = inpState?.snapshot?.() || { inp_ms: null, interaction_count: 0 };
  const snapshot = {
    vitals_version: WEB_VITALS_VERSION,
    cls: round(cls.cls, 4) ?? 0,
    lcp_ms: round(lcpMs, 1),
    inp_ms: round(inp.inp_ms, 1),
    fcp_ms: round(fcpMs, 1),
    ttfb_ms: round(ttfbMs, 1),
    interaction_count: inp.interaction_count || 0,
    cls_shift_sources: Array.isArray(cls.cls_shift_sources) ? cls.cls_shift_sources.slice(0, 8) : [],
  };
  snapshot.ratings = {
    cls: rateWebVital("cls", snapshot.cls),
    lcp: rateWebVital("lcp_ms", snapshot.lcp_ms),
    inp: rateWebVital("inp_ms", snapshot.inp_ms),
    fcp: rateWebVital("fcp_ms", snapshot.fcp_ms),
    ttfb: rateWebVital("ttfb_ms", snapshot.ttfb_ms),
  };
  return snapshot;
}
