// LEGACY-HOST PALETTE ADAPTER — compiled ONLY into the Legacy build (see themeHostAdapter2029.js for the full contract).
// Hosted 2029 pages import palette2029.js; inside the Legacy runtime that resolves here, so they keep the host's
// palette context and theme exactly as before. The 2029 palette hook/provider and 2029 theme store are not bundled in Legacy.
// REMOVAL: delete together with themeHostAdapter2029.js and the legacyHostThemeAdapter plugin.
import { PaletteProvider, use2029Palette } from "./palette.js";

export * from "./paletteTokens2029.js";
export { use2029Palette };
export const Palette2029Provider = PaletteProvider;
