// The authored colours of imported Posts, readable in every theme (ZURIEL 16.11.2026: "צהוב ולבן מהאתר הישן: לשמור את משמעות ההדגשות, ולהתאים
// את הגוון לרקע בהיר וכהה — כולל קטעים שיש להם רקע שחור משלהם"). PRESENTATION ONLY: no word, link, attribution, source HTML or medium changes;
// the stored source keeps every colour, and this module only adds data attributes to the displayed copy (the same in every DOM, no CSSOM).
//
// Rules (measured, not guessed):
//   - Every element with its own text colour is marked data-legacy-color="authored".
//   - A block with its own opaque background (an authored panel or highlight: style background / background-color, bgcolor) keeps the colours
//     authored inside it; it is marked data-legacy-panel="dark" | "light" by which reading ink has more contrast on it, so text without its own
//     colour reads on the panel in every theme (the page's light ink on a black panel stays light even in the light theme).
//   - Any other authored text colour (style color, font[color]) is measured against the reading surface of each theme (the frame's own palette:
//     the panel over the page, paletteTokens2029.js). Where it falls below 4.5:1 it is marked data-legacy-low="<themes>"; data-legacy-tone names
//     its family (yellow, white, red, ...). The stylesheet (pages/post2029-reading.css) then gives it its family's tone for that theme: a colour
//     of the same family with measured contrast; yellow keeps its highlighter meaning (a yellow marker under a darker amber); white becomes the
//     strongest ink; black becomes the light ink of the dark theme. Where the authored colour already reads, it stays exactly as authored.
import { resolve2029Palette } from "../paletteTokens2029.js";
import { styleDeclarations } from "./postInlineStyle2029.js";

export const LEGACY_THEMES = Object.freeze(["dark", "light", "parchment"]);
export const LEGACY_MIN_CONTRAST = 4.5;

const NAMED = Object.freeze({ black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", lime: "#00ff00", blue: "#0000ff", yellow: "#ffff00",
  orange: "#ffa500", gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000", purple: "#800080", fuchsia: "#ff00ff", magenta: "#ff00ff",
  olive: "#808000", navy: "#000080", teal: "#008080", aqua: "#00ffff", cyan: "#00ffff", gold: "#ffd700", darkred: "#8b0000", darkblue: "#00008b",
  darkgreen: "#006400", brown: "#a52a2a", pink: "#ffc0cb", violet: "#ee82ee", indigo: "#4b0082", crimson: "#dc143c" });

// { r, g, b, a } (0–255, alpha 0–1) or null for anything that is not one plain colour (gradients, url(), var(), currentColor, inherit ...).
export function parseCssColor(value) {
  let text = String(value || "").trim().toLowerCase().replace(/\s*!important\s*$/, "");
  if (NAMED[text]) text = NAMED[text];
  if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  let match = /^#([0-9a-f]{3,8})$/.exec(text);
  if (match) {
    const hex = match[1];
    if (hex.length === 3 || hex.length === 4) { const [r, g, b, a = "f"] = hex.split(""); return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16), a: parseInt(a + a, 16) / 255 }; }
    if (hex.length === 6 || hex.length === 8) return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
    return null;
  }
  match = /^rgba?\(([^)]*)\)$/.exec(text);
  if (match) {
    const parts = match[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = part => part.endsWith("%") ? Math.round(parseFloat(part) * 2.55) : parseFloat(part);
    const [r, g, b] = parts.slice(0, 3).map(channel);
    const a = parts[3] == null ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    return [r, g, b, a].every(Number.isFinite) ? { r: Math.min(255, Math.max(0, r)), g: Math.min(255, Math.max(0, g)), b: Math.min(255, Math.max(0, b)), a: Math.min(1, Math.max(0, a)) } : null;
  }
  return null;
}

// The first plain colour inside a background shorthand ("#000 url(x.png) no-repeat"), or null.
export function backgroundColorOf(value) {
  const text = String(value || "").trim();
  if (/gradient\(/i.test(text)) return null;
  const direct = parseCssColor(text); if (direct) return direct;
  for (const token of text.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b[a-z]+\b/gi) || []) { const color = parseCssColor(token); if (color && token.toLowerCase() !== "none") return color; }
  return null;
}

const channel = value => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const relativeLuminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export function contrastRatio(a, b) { const x = relativeLuminance(a), y = relativeLuminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export const mixColors = (top, bottom, alpha) => ({ r: top.r * alpha + bottom.r * (1 - alpha), g: top.g * alpha + bottom.g * (1 - alpha), b: top.b * alpha + bottom.b * (1 - alpha), a: 1 });

// The reading surface of each theme, as the stylesheet draws it: the frame's panel at 94% over the frame's page (post2029-reading.css).
export function legacyReadingSurface(theme) {
  const palette = resolve2029Palette(theme, "dark_observatory");
  return mixColors(parseCssColor(palette.card), parseCssColor(palette.pageBg), 0.94);
}
const SURFACES = Object.freeze(Object.fromEntries(LEGACY_THEMES.map(theme => [theme, legacyReadingSurface(theme)])));
const INKS = Object.freeze({ light: parseCssColor("#F5F5F0"), dark: parseCssColor("#172B46") });   // the frame's ink of the dark and the light theme

// The family of a colour: white, black, grey, or its hue.
export function legacyToneOf({ r, g, b }) {
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, lightness = (max + min) / 2, chroma = max - min;
  if (chroma < 0.12 || (lightness > 0.9 && chroma < 0.25)) return lightness >= 0.82 ? "white" : lightness <= 0.3 ? "black" : "grey";
  let hue;
  const R = r / 255, G = g / 255, B = b / 255;
  if (max === R) hue = 60 * (((G - B) / chroma) % 6); else if (max === G) hue = 60 * ((B - R) / chroma + 2); else hue = 60 * ((R - G) / chroma + 4);
  if (hue < 0) hue += 360;
  if (hue < 15 || hue >= 335) return "red";
  if (hue < 42) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 165) return "green";
  if (hue < 200) return "cyan";
  if (hue < 255) return "blue";
  if (hue < 290) return "purple";
  return "magenta";
}

// The themes in which an authored text colour reads below 4.5:1 on the reading surface.
export function legacyLowThemes(color) {
  return LEGACY_THEMES.filter(theme => contrastRatio({ ...color, ...(color.a < 1 ? mixColors(color, SURFACES[theme], color.a) : {}) }, SURFACES[theme]) < LEGACY_MIN_CONTRAST);
}

// Which reading ink a panel needs: the one with more contrast on it.
export const legacyPanelKind = color => contrastRatio(INKS.light, color) >= contrastRatio(INKS.dark, color) ? "dark" : "light";

const OPAQUE = 0.6;
function authoredColors(element) {
  const declarations = styleDeclarations(element.getAttribute("style"));
  const last = name => { for (let index = declarations.length - 1; index >= 0; index -= 1) if (declarations[index].name === name) return declarations[index].value; return null; };
  const text = parseCssColor(last("color") ?? (element.tagName === "FONT" ? element.getAttribute("color") : null));
  const backgroundValue = last("background-color") ?? last("background") ?? element.getAttribute("bgcolor");
  const background = backgroundValue == null ? null : backgroundColorOf(backgroundValue);
  return { text, background: background && background.a >= OPAQUE ? background : null };
}

// Marks the displayed copy (a DOM root: a template's content). Elements are visited in document order, so a panel is known before its contents.
export function annotateLegacyColors2029(root) {
  for (const element of root.querySelectorAll("[style],font[color],[bgcolor]")) {
    const { text, background } = authoredColors(element);
    if (background) element.setAttribute("data-legacy-panel", legacyPanelKind(background));
    if (!text || text.a < OPAQUE) continue;
    element.setAttribute("data-legacy-color", "authored");   // its own colour: never replaced by a panel's ink
    if (background || element.parentElement?.closest("[data-legacy-panel]")) continue;   // authored together with its own panel: kept as authored
    const low = legacyLowThemes(text);
    if (!low.length) continue;
    element.setAttribute("data-legacy-tone", legacyToneOf(text));
    element.setAttribute("data-legacy-low", low.join(" "));
  }
  return root;
}

// The same for the colour of an authored stylesheet rule (scoped by postArticleCore2029.js): extra rules that give the family's tone in the themes
// where the authored colour would not read. A rule that sets its own opaque background keeps its colours.
const THEME_SCOPE = Object.freeze({ dark: 'html:not([data-theme-2029="light"]):not([data-theme-2029="parchment"])', light: 'html[data-theme-2029="light"]', parchment: 'html[data-theme-2029="parchment"]' });
export function legacyColorRules2029(selectors, declarationsText) {
  const declarations = styleDeclarations(declarationsText);
  const value = name => { for (let index = declarations.length - 1; index >= 0; index -= 1) if (declarations[index].name === name) return declarations[index].value; return null; };
  const text = parseCssColor(value("color"));
  const backgroundValue = value("background-color") ?? value("background");
  const background = backgroundValue == null ? null : backgroundColorOf(backgroundValue);
  if (!text || text.a < OPAQUE || (background && background.a >= OPAQUE)) return [];
  const tone = legacyToneOf(text);
  return legacyLowThemes(text).map(theme => `${selectors.map(selector => `${THEME_SCOPE[theme]} ${selector}`).join(",")} {color: var(--sod-legacy-${tone}) !important}`);
}
