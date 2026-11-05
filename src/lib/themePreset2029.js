import { useSyncExternalStore } from "react";

// 2029-owned theme preset store. Independent of Legacy src/lib/themeMode.js:
//  - own storage key (never reads or writes Legacy "sod-theme" except the one-time seed below)
//  - own document attribute data-theme-2029 (never sets Legacy data-theme / data-theme-preset)
//  - no route table (no lightRoutes) and no Navbar toggle
// Public names intentionally match themeMode.js so a not-yet-split shared component keeps working in the 2029 build.

export const THEME_PRESETS = Object.freeze(["light", "parchment", "dark"]);
export const THEME_STORAGE_KEY_2029 = "sod2029:theme-preset";
export const THEME_SEEDED_KEY_2029 = "sod2029:theme-preset-seeded";
export const THEME_ATTRIBUTE_2029 = "data-theme-2029";
const LEGACY_SEED_SOURCE_KEY = "sod-theme"; // read at most once, see seedOnce()

const validPreset = (value) => (THEME_PRESETS.includes(value) ? value : null);
const storage = () => { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } };

// One-time copy of an existing preference. Rules:
//  - runs only if this browser never attempted the seed (marker absent) AND no 2029 preference exists;
//  - an existing 2029 preference is never overwritten and the Legacy value is never written to or followed;
//  - the marker is set after the first attempt even when there was nothing to copy, so it cannot repeat.
export function seedOnce(store = storage()) {
  if (!store) return;
  try {
    if (store.getItem(THEME_SEEDED_KEY_2029) != null) return;
    if (validPreset(store.getItem(THEME_STORAGE_KEY_2029)) == null) {
      const legacy = validPreset(store.getItem(LEGACY_SEED_SOURCE_KEY));
      if (legacy) store.setItem(THEME_STORAGE_KEY_2029, legacy);
    }
    store.setItem(THEME_SEEDED_KEY_2029, "1");
  } catch { /* storage unavailable: default preset applies */ }
}

const read = () => {
  try { return validPreset(storage()?.getItem(THEME_STORAGE_KEY_2029)) || "dark"; } catch { return "dark"; }
};

let preset = null;
let forced = null;
const subs = new Set();

const effectivePreset = () => forced ?? preset;
const binaryMode = (value = effectivePreset()) => (value === "dark" ? "dark" : "light");

function emit() {
  try { document.documentElement.setAttribute(THEME_ATTRIBUTE_2029, effectivePreset()); } catch { /* no document */ }
  subs.forEach((fn) => fn());
}

if (typeof document !== "undefined") {
  seedOnce();
  preset = read();
  emit();
} else {
  preset = "dark";
}

export function setThemePreset(value) {
  preset = validPreset(value) || "dark";
  try { storage()?.setItem(THEME_STORAGE_KEY_2029, preset); } catch { /* ignore */ }
  emit();
}

export function cycleThemePreset() {
  const index = Math.max(0, THEME_PRESETS.indexOf(effectivePreset()));
  setThemePreset(THEME_PRESETS[(index + 1) % THEME_PRESETS.length]);
}

export function setTheme(value) { setThemePreset(value === "dark" ? "dark" : "light"); }

export function toggleTheme() {
  if (forced) { setForcedMode(binaryMode(forced) === "dark" ? "light" : "dark"); return; }
  setTheme(binaryMode(preset) === "dark" ? "light" : "dark");
}

export function setForcedThemePreset(value) { forced = validPreset(value); emit(); }

// Page-scoped override (e.g. a surface that must render light while mounted); never persisted.
export function setForcedMode(value) { forced = value === "light" || value === "dark" ? value : null; emit(); }

function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useThemePreset() { return useSyncExternalStore(subscribe, effectivePreset, () => "dark"); }
export function useThemeMode() { return useSyncExternalStore(subscribe, () => binaryMode(), () => "dark"); }

// Same contract as themeMode.js: does 2029 itself have a stored preference? (Never answers from the Legacy key.)
export function hasStoredThemePreference() {
  try { return validPreset(storage()?.getItem(THEME_STORAGE_KEY_2029)) != null; } catch { return true; }
}
