import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import Page from "../../src/pages/BeitMidrash2029Page.jsx";

const palettes = {
  day: { page: "#f6f1e6", panel: "#ffffff", soft: "#faf7ef", ink: "#171713", muted: "#655f52", line: "#ded6c5", strong: "#b9ad94", accent: "#8b6814", accentText: "#72520d", discovery: "#236b61", gold: "#9a751b", sapphire: "#2d4f78", onAccent: "#ffffff" },
  card: { page: "#e9e0d0", panel: "#f9f1e3", soft: "#f1e6d4", ink: "#241d16", muted: "#6e6254", line: "#d1c2ad", strong: "#aa967b", accent: "#855f18", accentText: "#68470d", discovery: "#2b695f", gold: "#8a6417", sapphire: "#355a80", onAccent: "#ffffff" },
  night: { page: "#07111a", panel: "#101d27", soft: "#15242f", ink: "#edf3f5", muted: "#a8b4bc", line: "#2a3b47", strong: "#48606d", accent: "#d1a63c", accentText: "#f0c75e", discovery: "#67cbbd", gold: "#d1a63c", sapphire: "#1b3850", onAccent: "#12100a" },
};

function Fixture() {
  const [theme, setTheme] = React.useState("day");
  window.__setTheme = setTheme;
  const palette = palettes[theme];
  const style = {
    minHeight: "100vh",
    background: palette.page,
    color: palette.ink,
    "--s29-page": palette.page,
    "--s29-panel": palette.panel,
    "--s29-panel-soft": palette.soft,
    "--s29-ink": palette.ink,
    "--s29-muted": palette.muted,
    "--s29-line": palette.line,
    "--s29-line-strong": palette.strong,
    "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accentText,
    "--s29-discovery": palette.discovery,
    "--s29-brand-gold": palette.gold,
    "--s29-brand-sapphire": palette.sapphire,
    "--s29-on-accent": palette.onAccent,
    "--s29-focus-ring": palette.discovery,
    "--s29-font-ui": TYPEFACE.ui,
    "--s29-font-body": TYPEFACE.body,
    "--s29-font-display": TYPEFACE.display,
    "--s29-font-numeric": TYPEFACE.numeric,
    ...Object.fromEntries(Object.entries(TYPE_SCALE_V2).map(([name, scale]) => [`--s29-type-${name}`, `${scale.fontSize}px`])),
    fontFamily: TYPEFACE.body,
  };
  return <div data-fixture-theme={theme} data-frame-theme-preset={{ day: "light", card: "parchment", night: "dark" }[theme]} style={style}>
    <BrowserRouter><Routes>
      <Route path="/beit-midrash" element={<Page />} />
      <Route path="/beit-midrash/:method" element={<Page />} />
    </Routes></BrowserRouter>
  </div>;
}

createRoot(document.getElementById("root")).render(<Fixture />);
