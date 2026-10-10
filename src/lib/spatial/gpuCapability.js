// src/lib/spatial/gpuCapability.js
// Capability gate for the explicit S4 (GPU) depth. Pure feature detection — NO three/R3F import, so it is safe in
// the default 2029 bundle. Nothing here runs at module load or during SSR; callers invoke it only on explicit S4 intent.

export function isLowPowerContext(nav = typeof navigator !== "undefined" ? navigator : null) {
  if (!nav) return false;
  if (nav.connection?.saveData === true) return true;
  if (Number.isFinite(nav.deviceMemory) && nav.deviceMemory <= 2) return true;
  if (Number.isFinite(nav.hardwareConcurrency) && nav.hardwareConcurrency <= 2) return true;
  return false;
}

export function detectWebGLSupport(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return false;
  try {
    const canvas = doc.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension?.("WEBGL_lose_context")?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}

// -> { ok: true } | { ok: false, reason: "ssr" | "low_power" | "no_webgl" }
export function evaluateS4Capability({ nav, doc } = {}) {
  if (typeof document === "undefined" && !doc) return { ok: false, reason: "ssr" };
  if (isLowPowerContext(nav)) return { ok: false, reason: "low_power" };
  if (!detectWebGLSupport(doc)) return { ok: false, reason: "no_webgl" };
  return { ok: true };
}

export function prefersReducedMotion(win = typeof window !== "undefined" ? window : null) {
  try {
    return !!win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      || !!win?.document?.querySelector?.('[data-frame-reduced-motion="true"]');
  } catch { return false; }
}
