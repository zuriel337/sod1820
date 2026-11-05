import React, { createContext, useContext } from "react";
import { useThemePreset } from "./themePreset2029.js";
import { resolve2029Palette } from "./paletteTokens2029.js";

// 2029 palette hook/provider over the 2029-owned theme store (themePreset2029.js) and its OWN context.
// Legacy PaletteProvider cannot reach it and this module imports no Legacy theme store, route table or palette.
export * from "./paletteTokens2029.js";

const Palette2029Ctx = createContext(null);
// Optional sub-tree override (e.g. an embedded research-lab surface).
export function Palette2029Provider({ value, children }) {
  return React.createElement(Palette2029Ctx.Provider, { value }, children);
}

export function use2029Palette(environmentRole = null) {
  const override = useContext(Palette2029Ctx);
  const preset = useThemePreset();
  const resolved = resolve2029Palette(preset, environmentRole);
  return override ? { ...resolved, ...override, preset: resolved.preset } : resolved;
}
