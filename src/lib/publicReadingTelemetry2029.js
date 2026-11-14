// A privacy projection for the existing Traffic/Web Vitals pipeline, not a
// second route owner. Measurement labels never navigate or publish a page.
// Query strings, fragments, search expressions and account paths stay local.
export function readingTelemetryPath(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return null;
  let path;
  try { path = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/\/+$/, "") || "/"; } catch { return null; }
  if (path.startsWith("//") || /[\\\u0000-\u001f\u007f?#]/.test(path)) return null;
  if (/^\/(?:api|auth|admin|login|me|profile|traffic|reports|editor|edit|unsubscribe|updates|credits|buy)(?:\/|$)/i.test(path)
    || /^\/2029\/(?:me|control|preview)(?:\/|$)/i.test(path)
    || /^\/community\/(?:researcher\/me|whatsapp)(?:\/|$)/i.test(path)) return null;
  if (path === "/2029") return "/";
  if (/^\/(?:2029\/)?(?:calculator|gematria)(?:\/viral)?$/.test(path)) return "/gematria";
  if (/^\/(?:2029\/)?posts?$/.test(path)) return "/post";
  // Legacy WordPress article permalinks used a top-level slug.
  if (/^\/old-wordpress-post(?:-[a-z0-9-]+)?$/i.test(path)) return "/post/:item";
  const number = /^\/(?:2029\/)?number(?:\/([^/]+))?$/.exec(path);
  if (number) return number[1] ? "/number/:value" : "/number";
  if (["/", "/world", "/gallery", "/map", "/privacy", "/books", "/community", "/community/chat", "/community/calculator", "/or-geula", "/contact"].includes(path)) return path;
  for (const family of ["post", "tag", "category", "topic", "book", "video", "researcher", "number"])
    if (path.startsWith("/" + family + "/") && path.split("/").length === 3) return "/" + family + (family === "number" ? "/:value" : "/:item");
  // Broad site coverage: retain safe static route names; collapse dynamic
  // trailing segments so names, IDs, search terms, and private slugs never leave the browser.
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  const safeSegment = /^[a-z0-9][a-z0-9-]{0,63}$/i;
  if (segments.some(segment => !safeSegment.test(segment))) return "/" + segments[0].toLowerCase() + (segments.length > 1 ? "/:item" : "");
  if (segments.length === 1) return "/" + segments[0].toLowerCase();
  return "/" + segments[0].toLowerCase() + "/:item";
}

// First-party visit counter (track_visit → site_visits). Only the normalized route label,
// a browser-local random visitor counter, the external referrer host and a device class.
export function readingVisitBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).sort().join(",") !== "p_device,p_is_bot,p_path,p_referrer,p_visitor"
    || typeof body.p_path !== "string" || readingTelemetryPath(body.p_path) !== body.p_path
    || typeof body.p_is_bot !== "boolean"
    || ![null, "mobile", "desktop"].includes(body.p_device)
    || body.p_visitor !== null && (typeof body.p_visitor !== "string" || !/^[0-9a-z-]{8,64}$/i.test(body.p_visitor))
    || body.p_referrer !== null && (typeof body.p_referrer !== "string" || !/^[a-z0-9.-]{1,253}(?::[0-9]{1,5})?$/i.test(body.p_referrer))) return false;
  return true;
}

// Page engagement (ingest_event, surface=page, event_type=engagement). Anonymous like RUM:
// no visitor/session identity, normalized route label and bounded timing counters only.
export function readingEngagementBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).sort().join(",") !== "p_app_context,p_event_type,p_is_bot,p_path,p_props,p_session_id,p_sod_id,p_surface"
    || body.p_sod_id !== null || body.p_session_id !== null || body.p_is_bot !== false
    || body.p_surface !== "page" || body.p_event_type !== "engagement"
    || typeof body.p_path !== "string" || readingTelemetryPath(body.p_path) !== body.p_path
    || !["facebook", "instagram", "whatsapp", "telegram", "line", "chrome-ios", "edge", "opera", "firefox", "android-webview", "chrome", "safari", "other"].includes(body.p_app_context)) return false;
  const p = body.p_props;
  if (!p || typeof p !== "object" || Array.isArray(p)
    || Object.keys(p).sort().join(",") !== "engaged_ms,engagement_version,flush_reason,idle_threshold_ms,max_scroll_pct,visible_ms"
    || p.engagement_version !== 1 || !["route_change", "pagehide"].includes(p.flush_reason)) return false;
  const bounded = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
  return bounded(p.visible_ms, 86400000) && bounded(p.engaged_ms, 86400000) && p.engaged_ms <= p.visible_ms
    && bounded(p.max_scroll_pct, 100) && Number.isSafeInteger(p.idle_threshold_ms) && p.idle_threshold_ms >= 1000 && p.idle_threshold_ms <= 600000;
}

export function readingWebVitalBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).sort().join(",") !== "p_app_context,p_event_type,p_is_bot,p_path,p_props,p_session_id,p_sod_id,p_surface"
    || body.p_sod_id !== null || body.p_session_id !== null || body.p_is_bot !== false
    || body.p_surface !== "performance" || body.p_event_type !== "web_vital"
    || readingTelemetryPath(body.p_path) !== body.p_path
    || !["facebook", "instagram", "whatsapp", "telegram", "line", "chrome-ios", "edge", "opera", "firefox", "android-webview", "chrome", "safari", "other"].includes(body.p_app_context)) return false;
  const p = body.p_props;
  const fields = ["vitals_version", "cls", "lcp_ms", "inp_ms", "fcp_ms", "ttfb_ms", "interaction_count", "cls_shift_sources", "ratings", "sample_id", "phase", "flush_reason", "initial_path", "current_path", "collector", "measurement_scope", "nav_type", "visibility_at_flush"];
  if (!p || typeof p !== "object" || Array.isArray(p) || Object.keys(p).length !== fields.length || Object.keys(p).some(k => !fields.includes(k))
    || p.vitals_version !== 1 || p.initial_path !== body.p_path || p.current_path !== body.p_path
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.sample_id || "")
    || !["checkpoint", "final"].includes(p.phase) || !["15s_checkpoint", "visibility_hidden", "pagehide"].includes(p.flush_reason)
    || p.phase === "checkpoint" && p.flush_reason !== "15s_checkpoint"
    || p.phase === "final" && p.flush_reason === "15s_checkpoint"
    || p.collector !== "performance_observer" || p.measurement_scope !== "document_navigation_hard_load_only"
    || ![null, "navigate", "reload", "back_forward", "prerender"].includes(p.nav_type)
    || !["visible", "hidden", "prerender"].includes(p.visibility_at_flush)) return false;
  for (const key of ["cls", "lcp_ms", "inp_ms", "fcp_ms", "ttfb_ms"])
    if (p[key] !== null && (typeof p[key] !== "number" || !Number.isFinite(p[key]) || p[key] < 0 || p[key] > 86400000)) return false;
  if (!Number.isSafeInteger(p.interaction_count) || p.interaction_count < 0 || p.interaction_count > 1000000
    || !Array.isArray(p.cls_shift_sources) || p.cls_shift_sources.length > 8
    || p.cls_shift_sources.some(x => typeof x !== "string" || x.length > 180 || !/^[a-z][a-z0-9-]*(?:\.[A-Za-z0-9_-]{1,60}){0,3}$/.test(x))) return false;
  return p.ratings && !Array.isArray(p.ratings) && Object.keys(p.ratings).sort().join(",") === "cls,fcp,inp,lcp,ttfb"
    && Object.values(p.ratings).every(v => v === null || ["good", "needs_improvement", "poor"].includes(v));
}

// Product actions and public content views (ingest_event, the existing events pipeline) - ZURIEL 12.11.2026 "fix measurement".
// Same doctrine as visits/engagement/RUM: no visitor/session identity, the normalized route label only, and per family a fixed
// event list and a fixed set of bounded fields (tokens, booleans, small integers). Free text the visitor typed (expressions,
// phrases, queries, values, share ids) never leaves the browser: unknown fields are dropped by the projection and refused by
// the validator. Self-contained (serialized into the public request worker together with readingTelemetryPath).
export function readingActionSpec() {
  const T = "token", B = "bool", I = "int";
  return {
    calculator_2029: { events: ["calculator_view", "result_selected", "first_compute", "new_compute_from_share", "raziel_opened", "method_opened",
      "share_created", "classic_tile_opened", "words_bar_pick", "equals_preview_phrase_opened", "shared_result_opened", "ai_analysis_requested"],
      fields: { surface: T, method: T, entry: T, kind: T, channel: T, reason: T, from_share: B, has_discovery: B, count: I, expression_length: I } },
    entry_2029: { events: "token", fields: { entry_surface: T, arrival: T, concept_key: T, layer: T, action_id: T, target_surface: T, availability: T,
      mode: T, guided_id: T, ms_bucket: T, manifest_version: I, step_index: I } },
    journey_2029: { events: "token", fields: { journey_kind: T, journey_mode: T, source_surface: T, root_type: T, has_path: B } },
    share: { events: ["share"], fields: { platform: T } },
    join: { events: ["click"], fields: { surface: T } },
    arrival: { events: ["source"], fields: { source: T, tag: T, tagged: B } },
    content: { events: ["view"], fields: { kind: T, item_id: I } },
  };
}

// Client-side projection of an existing emit() call onto the public family. Returns null when the action is not measured.
export function readingActionProps(surface, eventType, props) {
  const spec = readingActionSpec()[surface];
  if (!spec || typeof eventType !== "string") return null;
  if (Array.isArray(spec.events) ? !spec.events.includes(eventType) : !/^[a-z][a-z0-9_]{0,47}$/.test(eventType)) return null;
  const out = { action_version: 1 };
  const source = props && typeof props === "object" && !Array.isArray(props) ? props : {};
  for (const [key, kind] of Object.entries(spec.fields)) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (kind === "token" && typeof value === "string" && /^[a-z0-9][a-z0-9_:.-]{0,47}$/i.test(value)) out[key] = value.toLowerCase();
    else if (kind === "bool" && typeof value === "boolean") out[key] = value;
    else if (kind === "int" && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000000000 && String(value).trim() !== "") out[key] = Number(value);
  }
  return out;
}

export function readingActionBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).sort().join(",") !== "p_app_context,p_event_type,p_is_bot,p_path,p_props,p_session_id,p_sod_id,p_surface"
    || body.p_sod_id !== null || body.p_session_id !== null || body.p_is_bot !== false
    || typeof body.p_path !== "string" || readingTelemetryPath(body.p_path) !== body.p_path
    || !["facebook", "instagram", "whatsapp", "telegram", "line", "chrome-ios", "edge", "opera", "firefox", "android-webview", "chrome", "safari", "other"].includes(body.p_app_context)) return false;
  const spec = readingActionSpec()[body.p_surface];
  if (!spec || typeof body.p_event_type !== "string"
    || (Array.isArray(spec.events) ? !spec.events.includes(body.p_event_type) : !/^[a-z][a-z0-9_]{0,47}$/.test(body.p_event_type))) return false;
  const p = body.p_props;
  if (!p || typeof p !== "object" || Array.isArray(p) || p.action_version !== 1 || JSON.stringify(p).length > 800) return false;
  for (const [key, value] of Object.entries(p)) {
    if (key === "action_version") continue;
    const kind = spec.fields[key];
    if (kind === "token" ? !(typeof value === "string" && /^[a-z0-9][a-z0-9_:.-]{0,47}$/.test(value))
      : kind === "bool" ? typeof value !== "boolean"
      : kind === "int" ? !(Number.isSafeInteger(value) && value >= 0 && value <= 1000000000000) : true) return false;
  }
  return true;
}
