// TEMPORARY bridge, compiled ONLY into the 2029 build (see vite.config.js legacyBridge2029).
// Components still shared with Legacy (ShareActions, WatchButton, ReactionBar, ...) import the Legacy palette surface.
// In the 2029 build those imports resolve here, so the 2029 bundle never contains the Legacy route-aware palette,
// the Legacy theme store or the route table (lightRoutes.js). A shared component leaves this path when it is split
// into a 2029-owned UI (step 4); when none remain, this file and the vite plugin are deleted.
import { DESIGN_V2_PALETTES, Palette2029Provider, resolve2029Palette, use2029Palette } from "./palette2029.js";

export * from "./palette2029.js"; // same names Legacy palette.js exposes for 2029 symbols
export const PALETTES = Object.freeze({
  light: DESIGN_V2_PALETTES.light,
  parchment: DESIGN_V2_PALETTES.parchment,
  dark: DESIGN_V2_PALETTES.dark,
  labLight: resolve2029Palette("light", "research_lab"),
  labDark: resolve2029Palette("dark", "research_lab"),
  lab: resolve2029Palette("dark", "research_lab"),
});
export const PaletteProvider = Palette2029Provider;
export function usePalette() { return use2029Palette(); }
