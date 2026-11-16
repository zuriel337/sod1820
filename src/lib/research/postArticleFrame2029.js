// The frame around the first-document article (OLD_POST_ARTICLE_FIRST; ZURIEL 16.11.2026: "no paragraph jumps", Codex review: "keep dimensions,
// font metrics and theme identity stable across adoption"). The page's article lives inside the System Frame:
//   .sod29-root (theme tokens as an inline style) > .sod29-main > .sod29-main-stage.has-context-rail > main.sod29-content > article
// The first-document article gets the same containers with the same classes and attributes, so the page's own stylesheets give it the same
// column, width, fonts and colours as the page's article; and the same theme tokens, from the same token sources the frame reads
// (paletteTokens2029.js, designTokens.js). The frame's controls (sidebar, command island, rail) are not drawn: they are interactive and arrive
// with the application; the opening bar above (2029.html) already shows the top bar.
// test/article-first-browser-2029.browser.mjs compares the page's real root (tokens, attributes) and the article's computed geometry before and
// after adoption, so this copy cannot drift silently from SystemFrame2029.jsx.
import { resolve2029Palette } from "../paletteTokens2029.js";
import { LAYOUT, MOTION, RADIUS, RAZIEL_PRESENCE, TYPEFACE, TYPE_SCALE_V2 } from "../designTokens.js";

export const POST_ARTICLE_FRAME_PRESETS = Object.freeze(["dark", "light", "parchment"]);
const ENVIRONMENT = "dark_observatory";   // the Post surface's environment role (data-frame-experience-environment)

// The frame's root attributes on a Post (SystemFrame2029 for surface "post"), except the theme pair, which follows the reader's preset.
export const POST_ARTICLE_FRAME_ATTRIBUTES = Object.freeze({
  class: "sod29-root closed-shell native-frame surface-post sidebar-collapsed",
  dir: "rtl",
  "data-experience-context": "experience-context-2029-v1",
  "data-frame-experience-surface": "post",
  "data-frame-experience-question": "מה הסיפור ומה המקור?",
  "data-frame-experience-environment": ENVIRONMENT,
  "data-frame-experience-spatial": "S0_static",
  "data-frame-experience-locale": "he",
  "data-frame-reduced-motion": "false",
});

// The palette part of the frame's token style for a preset (SystemFrame2029 shellStyle, same names, same order).
export function postArticleFramePaletteStyle2029(preset) {
  const palette = resolve2029Palette(preset, ENVIRONMENT);
  return [
    ["--s29-page", palette.pageBg], ["--s29-panel", palette.card], ["--s29-panel-soft", palette.cardSoft], ["--s29-panel-grad", palette.cardGrad],
    ["--s29-line", palette.border], ["--s29-line-strong", palette.borderStrong], ["--s29-accent", palette.accent], ["--s29-accent-text", palette.accentText],
    ["--s29-accent-secondary", palette.accentSecondary], ["--s29-discovery", palette.accentDiscovery], ["--s29-focus-ring", palette.focusRing],
    ["--s29-warm-accent", palette.warmAccent], ["--s29-brand-sapphire", palette.brandSapphire], ["--s29-brand-gold", palette.brandGold],
    ["--s29-brand-glow", palette.brandGlow], ["--s29-hero", palette.heroNum], ["--s29-ink", palette.ink], ["--s29-muted", palette.inkSoft],
    ["--s29-glow", palette.glow], ["--s29-on-accent", palette.onAccent], ["--s29-accent-btn", palette.accentBtn],
  ].map(([name, value]) => `${name}: ${value};`).join(" ");
}

// The rest of the token style: the same for every preset (motion follows the reader's reduced-motion preference).
export function postArticleFrameConstantStyle2029({ reducedMotion = false } = {}) {
  const duration = reducedMotion ? MOTION.reduced.duration : MOTION.duration.normal;
  return [
    ["--s29-radius", `${RADIUS.xl}px`], ["--s29-control-min", `${LAYOUT.controlMinHeight}px`], ["--s29-header-height", `${LAYOUT.headerHeight}px`],
    ["--s29-surface-map-gap", `${LAYOUT.surfaceMapGap}px`], ["--s29-surface-map-top", `${LAYOUT.headerHeight + LAYOUT.surfaceMapGap}px`],
    ["--s29-surface-map-clearance", `${LAYOUT.headerHeight + LAYOUT.surfaceMapGap + LAYOUT.surfaceMapEstimatedHeight + 12}px`],
    ["--s29-font-ui", TYPEFACE.ui], ["--s29-font-body", TYPEFACE.body], ["--s29-font-display", TYPEFACE.display], ["--s29-font-numeric", TYPEFACE.numeric],
    ["--s29-type-micro", `${TYPE_SCALE_V2.micro.fontSize}px`], ["--s29-type-ui", `${TYPE_SCALE_V2.ui.fontSize}px`], ["--s29-type-small", `${TYPE_SCALE_V2.small.fontSize}px`],
    ["--s29-type-body", `${TYPE_SCALE_V2.body.fontSize}px`], ["--s29-type-lead", `${TYPE_SCALE_V2.lead.fontSize}px`], ["--s29-type-title", `${TYPE_SCALE_V2.title.fontSize}px`],
    ["--s29-type-display", `${TYPE_SCALE_V2.display.fontSize}px`], ["--s29-motion", `${duration}ms`],
    ["--s29-raziel-blue", RAZIEL_PRESENCE.blue], ["--s29-raziel-indigo", RAZIEL_PRESENCE.indigo], ["--s29-raziel-violet", RAZIEL_PRESENCE.violet],
    ["--s29-raziel-glow", RAZIEL_PRESENCE.glow], ["--s29-raziel-cycle", `${RAZIEL_PRESENCE.cycleMs}ms`], ["font-family", TYPEFACE.body],
  ].map(([name, value]) => `${name}: ${value};`).join(" ");
}

const escapeAttribute = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Set before the first paint, in the document head: the reader's preset on <html> (themePreset2029.js read() and its one-time seed, read only;
// the store itself still runs and writes as before). Without scripts the document stays on the default preset, as the CSS defines it.
export const POST_ARTICLE_THEME_SCRIPT = "<script data-sod-article-first-theme>(function(){var d=document.documentElement,ok=/^(light|parchment|dark)$/,v=null;"
  + "try{var s=localStorage;v=s.getItem(\"sod2029:theme-preset\");if(!ok.test(v||\"\")&&s.getItem(\"sod2029:theme-preset-seeded\")==null)v=s.getItem(\"sod-theme\")}catch(e){}"
  + "d.setAttribute(\"data-theme-2029\",ok.test(v||\"\")?v:\"dark\")})()</script>";

// The frame's opening tag and its token style for the preset on <html> (a small script inside the frame; without scripts: the default preset).
export function postArticleFrameOpen2029(extraAttributes = {}) {
  const constant = postArticleFrameConstantStyle2029();
  const palettes = Object.fromEntries(POST_ARTICLE_FRAME_PRESETS.map(preset => [preset, postArticleFramePaletteStyle2029(preset)]));
  const attributes = { ...POST_ARTICLE_FRAME_ATTRIBUTES, "data-frame-theme-mode": "dark", "data-frame-theme-preset": "dark", ...extraAttributes, style: `${palettes.dark} ${constant}` };
  const open = `<div ${Object.entries(attributes).map(([name, value]) => `${name}="${escapeAttribute(value)}"`).join(" ")}>`;
  const sync = "<script data-sod-article-first-frame>(function(f){var t=document.documentElement.getAttribute(\"data-theme-2029\")||\"dark\",p="
    + JSON.stringify(palettes).replace(/</g, "\\u003c") + ";if(!p[t])t=\"dark\";var r=false;try{r=matchMedia(\"(prefers-reduced-motion: reduce)\").matches}catch(e){}"
    + "f.setAttribute(\"data-frame-theme-preset\",t);f.setAttribute(\"data-frame-theme-mode\",t===\"dark\"?\"dark\":\"light\");f.setAttribute(\"data-frame-reduced-motion\",String(r));"
    + `f.setAttribute("style",p[t]+" "+(r?${JSON.stringify(postArticleFrameConstantStyle2029({ reducedMotion: true }))}:${JSON.stringify(constant)}))})(document.currentScript.parentNode)</script>`;
  return `${open}${sync}<div class="sod29-main"><div class="sod29-main-stage has-context-rail"><main class="sod29-content">`;
}
export const POST_ARTICLE_FRAME_CLOSE = "</main></div></div></div>";
