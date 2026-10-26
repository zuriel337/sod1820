export const RAZIEL_COMPANION_VIEW_STORAGE_KEY = "sod-raziel-companion-view-v1";
export const RAZIEL_COMPANION_VIEW_DEFAULT = "quiet";
export const RAZIEL_COMPANION_VIEWS = Object.freeze(["quiet", "hints", "open"]);

export function normalizeRazielCompanionView(value) {
  return RAZIEL_COMPANION_VIEWS.includes(value) ? value : RAZIEL_COMPANION_VIEW_DEFAULT;
}

export function readRazielCompanionView(storage = globalThis?.localStorage) {
  try {
    return normalizeRazielCompanionView(storage?.getItem?.(RAZIEL_COMPANION_VIEW_STORAGE_KEY));
  } catch {
    return RAZIEL_COMPANION_VIEW_DEFAULT;
  }
}

export function writeRazielCompanionView(value, storage = globalThis?.localStorage) {
  const normalized = normalizeRazielCompanionView(value);
  try { storage?.setItem?.(RAZIEL_COMPANION_VIEW_STORAGE_KEY, normalized); } catch { /* local preference is optional */ }
  return normalized;
}
