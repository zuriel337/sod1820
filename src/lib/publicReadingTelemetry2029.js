// A privacy projection for the existing Traffic/Web Vitals pipeline, not a
// second route owner. Measurement labels never navigate or publish a page.
// Query strings, fragments, search expressions and account paths stay local.
export function readingTelemetryPath(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return null;
  let path;
  try { path = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/\/+$/, "") || "/"; } catch { return null; }
  if (/[\\\u0000-\u001f\u007f?#]/.test(path)) return null;
  if (/^\/(?:api|auth|admin|login|me|profile|traffic|reports|editor|edit|unsubscribe|updates|credits|buy)(?:\/|$)/i.test(path)
    || /^\/2029\/(?:me|control|preview)(?:\/|$)/i.test(path)
    || /^\/community\/(?:researcher\/me|whatsapp)(?:\/|$)/i.test(path)) return null;
  if (path === "/2029") return "/";
  if (/^\/(?:2029\/)?(?:calculator|gematria)(?:\/viral)?$/.test(path)) return "/gematria";
  if (/^\/(?:2029\/)?posts?$/.test(path)) return "/post";
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
