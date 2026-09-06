import { track } from "./tracking.js";

// Product Intelligence = metadata contract over the EXISTING visitor_events/events dual-write.
// It is intentionally NOT a new analytics store/engine. Traffic truth remains owned by
// traffic_intelligence_law / fn_ti_* and Clean Traffic classification.

export const PRODUCT_EXPERIMENTS = Object.freeze({
  CORE_TOOL_REACHABILITY_RESTORE_20260906: Object.freeze({
    id: "core-tool-reachability-restore-20260906",
    version: 1,
    phase: "post_restore",
    change_ref: "main:822f71fc",
    access_state: "open",
  }),
});

const ISO_WEEKDAY = Object.freeze({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 });

// Calendar context is deliberately factual/minimal. We DO NOT infer halachic Shabbat from a
// calendar day: entry/exit depend on authoritative sunset times. Analysis may enrich this later.
export function jerusalemExperimentContext(now = new Date()) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .filter(p => p.type !== "literal")
        .map(p => [p.type, p.value]),
    );
    return {
      timezone: "Asia/Jerusalem",
      local_date: parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : null,
      iso_weekday: ISO_WEEKDAY[parts.weekday] ?? null,
      local_hour: parts.hour != null && Number.isFinite(Number(parts.hour)) ? Number(parts.hour) : null,
      shabbat_status: "not_computed",
    };
  } catch {
    return {
      timezone: "Asia/Jerusalem",
      local_date: null,
      iso_weekday: null,
      local_hour: null,
      shabbat_status: "not_computed",
    };
  }
}

export function experimentMeta(experiment, extra = null) {
  const cfg = typeof experiment === "string" ? { id: experiment } : (experiment || {});
  if (!cfg.id) return null;
  const {
    experiment_phase = cfg.phase ?? null,
    change_ref = cfg.change_ref ?? null,
    access_state = cfg.access_state ?? null,
    calendar_context = null,
    ...rest
  } = extra || {};
  return {
    experiment_id: cfg.id,
    experiment_version: cfg.version ?? 1,
    experiment_phase,
    change_ref,
    access_state,
    metric_semantics: "product_intelligence_experiment_v1",
    calendar_context: calendar_context || jerusalemExperimentContext(),
    ...rest,
  };
}

// eventType vocabulary is intentionally generic: view/exposure/select/use/blocked/etc.
// surface + slug keep legacy visitor_events useful while the same metadata also lands in events.props.
export function trackExperiment(experiment, eventType = "view", {
  surface = "product-experiment",
  slug = null,
  ...extra
} = {}) {
  const meta = experimentMeta(experiment, extra);
  if (!meta) return;
  return track(surface, slug || meta.experiment_id, eventType, meta);
}
