// A privacy projection for the existing Traffic/Web Vitals pipeline, not a
// second route owner. Measurement labels never navigate or publish a page.
// Query strings, fragments, search expressions and account paths stay local.
export function readingTelemetryPath(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return null;
  let path;
  try { path = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/\/+$/, "") || "/"; } catch { return null; }
  if (/[\\\u0000-\u001f\u007f?#]/.test(path)) return null;
  if (/^\/(?:api|auth|admin|login|me|profile|traffic|reports|editor|edit|unsubscribe|updates|credits|buy|journey|raziel|research|code|els|heichal|היכל)(?:\/|$)/i.test(path)
    || /^\/2029\/(?:me|control|journey|raziel|research|code|els|preview)(?:\/|$)/i.test(path)
    || /^\/community\/(?:researcher\/me|whatsapp)(?:\/|$)/i.test(path)) return null;
  if (path === "/2029") return "/";
  if (/^\/(?:2029\/)?(?:calculator|gematria)(?:\/viral)?$/.test(path)) return "/gematria";
  if (/^\/(?:2029\/)?posts?$/.test(path)) return "/post";
  const number = /^\/(?:2029\/)?number(?:\/([^/]+))?$/.exec(path);
  if (number) return number[1] ? "/number/:value" : "/number";
  if (["/", "/world", "/gallery", "/map", "/privacy", "/books", "/community", "/community/chat", "/community/calculator", "/or-geula", "/contact"].includes(path)) return path;
  for (const family of ["post", "tag", "category", "topic", "book", "video", "researcher"])
    if (path.startsWith("/" + family + "/") && path.split("/").length === 3) return "/" + family + "/:item";
  // Old public posts keep their original URL in navigation/SEO. The measured
  // label groups them without shipping arbitrary historical slug text.
  if (/^\/[^/]+$/.test(path)) return "/post/:item";
  return null;
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

// Research-activity beacon (gematria compute), measurement family 2 of the public-reading telemetry.
// A closed, content-free schema: it carries no expression, term, value, method, query, hash, route detail,
// sod_id or persistent identifier. The two UUIDs are random and per-tab/per-event: `activity_session`
// is never stored beyond the tab session; `activity_event_id` only makes a replay idempotent.
// This function is serialized into the worker text, so it must stay self-contained.
export function readingActivityBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).sort().join(",") !== "p_app_context,p_event_type,p_is_bot,p_path,p_props,p_session_id,p_sod_id,p_surface"
    || body.p_sod_id !== null || body.p_session_id !== null || body.p_is_bot !== false
    || body.p_surface !== "gematria"
    || !["first_compute", "repeat_compute", "recompute"].includes(body.p_event_type)
    || !["/gematria", "/community/calculator"].includes(body.p_path)
    || !["facebook", "instagram", "whatsapp", "telegram", "line", "chrome-ios", "edge", "opera", "firefox", "android-webview", "chrome", "safari", "other"].includes(body.p_app_context)) return false;
  const p = body.p_props;
  if (!p || typeof p !== "object" || Array.isArray(p)
    || Object.keys(p).sort().join(",") !== "activity_event_id,activity_session,entry,length_bucket,schema,surface_kind"
    || p.schema !== 1
    || !["direct", "share", "handoff"].includes(p.entry)
    || !["2-3", "4-8", "9-20", "21+"].includes(p.length_bucket)
    || !["community", "calculator", "professional"].includes(p.surface_kind)) return false;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(p.activity_event_id || "") && uuid.test(p.activity_session || "");
}
