import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WorldZviApprovedFindings2029 from "../../src/components/research/WorldZviApprovedFindings2029.jsx";
import { resolve2029Palette } from "../../src/lib/palette.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import "../../src/components/experience2029/systemFrame2029.css";
import "../../src/pages/world2029-human.css";
import "../../src/pages/worldComposition2029.css";

const preset = localStorage.getItem("zvi-fixture-theme") || "light";
const palette = resolve2029Palette(preset);
const style = {
  "--s29-page": palette.pageBg, "--s29-panel": palette.card,
  "--s29-line": palette.border, "--s29-line-strong": palette.borderStrong,
  "--s29-ink": palette.ink, "--s29-muted": palette.inkSoft,
  "--s29-accent-text": palette.accentText,
  "--s29-brand-gold": palette.brandGold, "--s29-brand-sapphire": palette.brandSapphire,
  "--s29-focus-ring": palette.focusRing,
  "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body,
  "--s29-font-display": TYPEFACE.display,
  "--s29-type-micro": `${TYPE_SCALE_V2.micro.fontSize}px`,
  "--s29-type-ui": `${TYPE_SCALE_V2.ui.fontSize}px`,
  "--s29-type-small": `${TYPE_SCALE_V2.small.fontSize}px`,
  "--s29-type-body": `${TYPE_SCALE_V2.body.fontSize}px`,
  "--s29-type-title": `${TYPE_SCALE_V2.title.fontSize}px`,
};
createRoot(document.getElementById("root")).render(
  <BrowserRouter><main className="sod29-root surface-world" dir="rtl"
    data-frame-theme-preset={preset} style={style}><WorldZviApprovedFindings2029 /></main></BrowserRouter>
);
