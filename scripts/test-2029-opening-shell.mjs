#!/usr/bin/env node
// Royal opening shell contract: the static twin in 2029.html and the React fallback (Opening2029.jsx) are the same markup, share one stylesheet,
// copy the real System Frame's closed-bar dimensions, and carry no temporary navigation bar / skeleton / spinner.
// Run:  node --test scripts/test-2029-opening-shell.mjs   (needs `esbuild` and `react-dom` from node_modules; no browser, no network)
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => readFileSync(join(ROOT, rel), "utf8");
const html = read("2029.html");
const css = read("src/components/experience2029/opening2029.css");
const frameCss = read("src/components/experience2029/systemFrame2029-topbar-crown.css");

// --- React twin, rendered to static markup ----------------------------------------------------------------------------------
async function renderReactTwin() {
  const dir = join(ROOT, "node_modules", ".cache", "opening-shell-test");
  mkdirSync(dir, { recursive: true });
  const outfile = join(dir, `opening-${process.pid}.mjs`);
  await build({
    stdin: { contents: `import React from "react"; import { renderToStaticMarkup } from "react-dom/server"; import Opening2029 from "./src/components/experience2029/Opening2029.jsx"; export default () => renderToStaticMarkup(React.createElement(Opening2029));`, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "esm", platform: "node", outfile, loader: { ".css": "empty", ".jsx": "jsx" }, jsx: "transform", packages: "external", logLevel: "silent",
  });
  try { return (await import(pathToFileURL(outfile).href + "?t=" + Date.now())).default(); } finally { rmSync(outfile, { force: true }); }
}
// react-dom/server (19) prepends a `<link rel="preload" as="image">` hint for an <img>; the browser-side render emits none, so it is not part of the twin.
const normalize = markup => markup.replace(/<link rel="preload"[^>]*>/g, "").replace(/<!--.*?-->/g, "").replace(/\s*\/>/g, ">").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
function staticTwin() {
  const start = html.indexOf('<div id="root">');
  const end = html.indexOf('<script type="module" src="/src/main2029.jsx">');
  assert.ok(start > 0 && end > start, "2029.html keeps its #root + entry script");
  const block = html.slice(start + '<div id="root">'.length, end).trim().replace(/<\/div>$/, "").trim(); // drop the #root closing tag
  return block;
}
const closeEmpty = markup => markup.replace(/<(path|img)([^>]*)><\/\1>/g, "<$1$2>"); // `<path ...></path>` and `<img ...>` compare equal

test("static HTML twin and React fallback render the same markup", async () => {
  const react = normalize(closeEmpty(await renderReactTwin()));
  const stat = normalize(closeEmpty(staticTwin()));
  assert.equal(stat, react);
});

test("contract: class, aria-busy, status, crown link, hidden links", () => {
  const stat = normalize(staticTwin());
  assert.match(stat, /^<div class="sod29-opening" dir="rtl" aria-busy="true">/);
  assert.match(stat, /<span class="sod29-opening-status" role="status">פותח את העמוד<\/span>/);
  assert.match(stat, /<a href="\/2029" class="sod29-opening-crown" aria-label="SOD1820 · בית">/);
  assert.match(stat, /<nav class="sod29-opening-nav" aria-label="ניווט בזמן פתיחת העמוד"><a href="\/2029">בית<\/a><a href="\/world">העולם<\/a><a href="\/2029\/posts">פוסטים<\/a><\/nav>/);
  assert.equal((stat.match(/<img /g) || []).length, 1, "the crown is the only image");
  assert.match(stat, /<img src="\/brand\/2029\/canonical-lockup-128\.webp" width="128" height="128" alt="">/);
});

test("no temporary navigation bar, skeleton or spinner in the markup or the stylesheet", () => {
  const stat = staticTwin();
  for (const retired of ["sod29-opening-header", "sod29-opening-identity", "sod29-opening-content", "sod29-opening-card", "sod29-opening-row", "סוד 1820"]) assert.equal(stat.includes(retired), false, retired);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /@keyframes|animation\s*:|transition\s*:|spinner|skeleton/i);
  // the links exist for keyboard / screen readers only: hidden until focus, never a visible bar
  assert.match(css, /\.sod29-opening-nav\{[^}]*clip-path:inset\(50%\)/);
  assert.match(css, /\.sod29-opening-nav:focus-within\{[^}]*clip-path:none/);
});

test("React fallback keeps no theme hook or inline style: one stylesheet decides, so HTML and React cannot drift", () => {
  const jsx = read("src/components/experience2029/Opening2029.jsx");
  assert.doesNotMatch(jsx, /use2029Palette|style=\{/);
  assert.match(jsx, /import "\.\/opening2029\.css"/);
  assert.match(html, /<link rel="stylesheet" href="\/src\/components\/experience2029\/opening2029\.css" \/>/);
});

// --- dimensions are the System Frame's closed bar, per breakpoint -----------------------------------------------------------
const NAMES = [["bar", "bar-h", "bar"], ["crown", "crown-w", "crown"], ["top", "crown-top", "top"], ["slot", "crown-slot", "slot"], ["dipW", "dip-w", "dip-w"], ["dipH", "dip-h", "dip-h"]];
const readTokens = (block, prefix, short) => { const out = {}; for (const [key, frameName, openName] of NAMES) { const m = new RegExp(`${prefix}${short ? openName : frameName}:\\s*(\\d+)px`).exec(block); if (m) out[key] = Number(m[1]); } return out; };
const frameTokens = block => readTokens(block, "--s29-", false);
const openTokens = block => { const t = readTokens(block, "--o-", true); const r = /--o-reserve:\s*(\d+)px/.exec(block); if (r) t.reserve = Number(r[1]); return t; };
const grab = (source, re, what) => { const m = re.exec(source); assert.ok(m, what + " block found"); return m[1]; };
test("dimensions equal the real frame's tokens at desktop, <=980px and <=340px", () => {
  const frameSel = String.raw`\.sod29-root\.closed-shell\.native-frame\[data-frame-theme-preset\] \{([^}]*)\}`;
  const fD = frameTokens(grab(frameCss, new RegExp(frameSel), "frame desktop"));
  const f980 = frameTokens(grab(frameCss, new RegExp(String.raw`@media \(max-width: 980px\) \{\s*` + frameSel), "frame <=980"));
  const f340 = frameTokens(grab(frameCss, new RegExp(String.raw`@media \(max-width: 340px\) \{\s*` + frameSel), "frame <=340"));
  const oD = openTokens(grab(css, /\.sod29-opening\{([^}]*)\}/, "opening desktop"));
  const o980 = openTokens(grab(css, /@media\(max-width:980px\)\{\.sod29-opening\{([^}]*)\}\}/, "opening <=980"));
  const o340 = openTokens(grab(css, /@media\(max-width:340px\)\{\.sod29-opening\{([^}]*)\}\}/, "opening <=340"));
  const { reserve: reserveD, ...oDims } = oD;
  assert.deepEqual(oDims, fD, "desktop tokens");
  assert.equal(reserveD, fD.dipH + 6, "desktop: bar reserve = arc depth + 6");
  // narrower blocks override only what the frame overrides; everything else is inherited from the desktop block, exactly as in the frame
  const fm980 = { ...fD, ...f980 }, fm340 = { ...fm980, ...f340 };
  const strip = ({ reserve, ...dims }) => dims;
  assert.deepEqual(strip({ ...oDims, ...strip(o980) }), fm980, "<=980px tokens");
  assert.equal(o980.reserve, fm980.dipH + 4, "<=980px: bar reserve = arc depth + 4");
  assert.deepEqual(strip({ ...oDims, ...strip(o980), ...strip(o340) }), fm340, "<=340px tokens");
  assert.equal(o340.reserve, fm340.dipH + 4, "<=340px: bar reserve = arc depth + 4");
});

test("colours are the frame's: page, glass, gold, same arc and line geometry", () => {
  assert.match(css, /background-color:#0B0907/);                                   // --s29-page (dark)
  assert.match(css, /--o-glass:rgb\(23 18 14 \/ \.72\)/);                          // --s29-panel #17120E at 72%
  assert.match(css, /--o-gold:#F9BA3F/);                                           // --s29-brand-gold
  assert.match(frameCss, /--s29-glass: color-mix\(in srgb, var\(--s29-panel\) 72%, transparent\)/);
  assert.ok(read("src/components/experience2029/SystemFrame2029.jsx").includes('d="M0 0C44 0 70 62 160 62S276 0 320 0"'), "the frame's line path");
  assert.ok(frameCss.includes("M0%200H320C276%200%20250%2062%20160%2062S44%200%200%200Z"), "the frame's arc glass mask path");
  assert.ok(html.includes('d="M0 0C44 0 70 62 160 62S276 0 320 0"'), "the opening draws the same line path");
  assert.ok(html.includes('d="M0 0H320C276 0 250 62 160 62S44 0 0 0Z"'), "the opening fills the same arc shape as the frame's glass mask");
});
