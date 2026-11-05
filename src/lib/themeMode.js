import { useSyncExternalStore } from "react";

export const THEME_PRESETS = Object.freeze(["light", "parchment", "dark"]);
const KEY = "sod-theme";

const validPreset = (value) => THEME_PRESETS.includes(value) ? value : null;
const read = () => {
  try { return validPreset(localStorage.getItem(KEY)) || "dark"; } catch { return "dark"; }
};

let preset = read();
let forced = null;
const subs = new Set();

const effectivePreset = () => forced ?? preset;
const legacyMode = (value = effectivePreset()) => value === "dark" ? "dark" : "light";

function emit() {
  try {
    document.documentElement.setAttribute("data-theme-preset", effectivePreset());
    document.documentElement.setAttribute("data-theme", legacyMode());
  } catch { /* ignore */ }
  subs.forEach((fn) => fn());
}

if (typeof document !== "undefined") emit();

export function setThemePreset(value) {
  preset = validPreset(value) || "dark";
  try { localStorage.setItem(KEY, preset); } catch { /* ignore */ }
  emit();
}

export function cycleThemePreset() {
  const current = effectivePreset();
  const index = Math.max(0, THEME_PRESETS.indexOf(current));
  setThemePreset(THEME_PRESETS[(index + 1) % THEME_PRESETS.length]);
}

// Legacy binary API stays stable for non-2029 surfaces.
export function setTheme(value) {
  setThemePreset(value === "dark" ? "dark" : "light");
}

export function toggleTheme() {
  if (forced) {
    setForcedMode(legacyMode(forced) === "dark" ? "light" : "dark");
    return;
  }
  setTheme(legacyMode(preset) === "dark" ? "light" : "dark");
}

export function setForcedThemePreset(value) {
  forced = validPreset(value);
  emit();
}

// Backward-compatible route/page override: only light/dark semantics.
export function setForcedMode(value) {
  forced = value === "light" || value === "dark" ? value : null;
  emit();
}

function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function useThemePreset() {
  return useSyncExternalStore(subscribe, effectivePreset, () => "dark");
}

export function useThemeMode() {
  return useSyncExternalStore(subscribe, () => legacyMode(), () => "dark");
}
