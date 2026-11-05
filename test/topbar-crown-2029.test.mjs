// Contract: the 2029 top bar (crown at the centre, dark glass, rounded arc under the verse; ZURIEL 5.11.2026).
// Static: reads the frame component and its one stylesheet. The visual acceptance (crown centre = page centre within 1px, 2px line rows,
// 44px targets, no horizontal scroll, ESC returning focus to the menu button, theme choice surviving a reload) was measured in a real
// browser at 1440, 1024, 768, 390, 360 and 320 in dark, light and parchment, at the top and scrolled; this file pins what that
// measurement depends on, and the traps the design already hit, so a later edit cannot quietly undo them.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dir = new URL("../src/components/experience2029/", import.meta.url);
const frame = readFileSync(new URL("SystemFrame2029.jsx", dir), "utf8");
const css = readFileSync(new URL("systemFrame2029-topbar-crown.css", dir), "utf8");
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");   // the rules without the explanatory comments (the comments name the traps)

test("the draft machinery is gone: one final design, one stylesheet", () => {
  const leftovers = ["CROWN_DRAFT", "data-crown-draft", "data-crown-shape", "data-crown-line", "crownShape", "crownLine", "is-angular", "is-curve", "dip-fill"];
  for (const word of leftovers) {
    assert.equal(frame.includes(word), false, `${word} must not remain in the frame`);
    assert.equal(css.includes(word), false, `${word} must not remain in the stylesheet`);
  }
  assert.equal(existsSync(new URL("systemFrame2029-topbar-crown-drafts.css", dir)), false, "the drafts stylesheet is removed");
  assert.equal((frame.match(/import "\.\/systemFrame2029-topbar-crown[^"]*\.css";/g) || []).length, 1, "exactly one crown stylesheet is imported");
  assert.match(frame, /import "\.\/systemFrame2029-topbar-crown\.css";/);
});

test("the bar's structure: start zone, the crown link with its arc, end zone, two rails", () => {
  assert.match(frame, /className="sod29-header-crown"/);
  assert.match(frame, /<svg className="sod29-crown-dip" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">\s*<path className="dip-line" d="[^"]+" \/>\s*<\/svg>/, "one arc path, no fill path, no second shape");
  assert.equal((frame.match(/className="sod29-header-rail"/g) || []).length, 2, "one rail on each side");
  assert.match(frame, /className="sod29-header-end"/);
  assert.match(frame, /BRAND_LOCKUP_NAV_2029/, "the approved lockup asset, whole");
  assert.match(frame, /aria-label="SOD1820 · בית"/, "the crown link keeps a real accessible name");
});

test("reading progress and the settled crown: one passive capture-phase listener, one frame at a time", () => {
  assert.match(frame, /addEventListener\("scroll", onScroll, \{ passive: true, capture: true \}\)/, "capture phase hears a page that scrolls inside its own region");
  assert.match(frame, /if \(!frame\) frame = window\.requestAnimationFrame\(update\)/, "one rAF per frame");
  assert.match(frame, /const next = scrolled \? top > 10 : top > 48;/, "folds over 48px, unfolds under 10px (no flicker)");
  for (const name of ["data-crown-scrolled", "data-crown-read-mid", "--s29-read"]) assert.ok(frame.includes(name), `${name} is set on <html>`);
  assert.match(frame, /removeEventListener\("scroll", onScroll, \{ capture: true \}\)/, "the listener is removed on unmount");
});

test("the traps the design hit stay handled", () => {
  // 1) A backdrop-filter on the header would hide the page from its children: only the ::before / ::after layers blur.
  const rules = [...code.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
  const headerOnly = rules.filter((r) => /\.sod29-header\.closed-orientation$/.test(r.selector));
  assert.ok(headerOnly.length >= 2, "the header rules were found");
  for (const r of headerOnly) assert.ok(!/backdrop-filter:\s*blur/.test(r.body), `no blur on the header itself: ${r.selector}`);
  assert.ok(rules.some((r) => /\.sod29-header\.closed-orientation::before$/.test(r.selector) && /backdrop-filter:\s*blur\(18px\) saturate\(1\.3\)/.test(r.body)), "the bar's glass is its own layer");
  assert.ok(rules.some((r) => /\.sod29-header-crown::after$/.test(r.selector) && /backdrop-filter:\s*blur\(18px\) saturate\(1\.3\)/.test(r.body)), "the arc's glass is its own layer");
  // 2) RTL: centre with left: 50%, never inset-inline-start: 50%.
  assert.equal(/inset-inline-start:\s*50%/.test(code), false);
  assert.ok(/left: 50%/.test(code));
  // 3) The gap in the line animates only with the registered property, and it is a mask so the fill continues beneath the arc.
  assert.match(css, /@property --s29-gap \{ syntax: "<length>"; inherits: true; initial-value: 320px; \}/);
  assert.match(css, /transition: --s29-gap \.3s/);
  assert.match(css, /-webkit-mask: linear-gradient\(90deg, #000 0 calc\(50% - var\(--s29-gap\) \/ 2\)/);
  // 4) The collapsed rail column is 72px (systemFrame2029-human-gate.css): the bar runs over it so its centre is the page centre.
  assert.match(css, /margin-inline: -72px 0; padding-inline: 78px;/);
  assert.match(readFileSync(new URL("systemFrame2029-human-gate.css", dir), "utf8"), /72px/);
  // 5) Rules for the existing header outrank the per-theme glass rules that systemFrame2029-unified-bar.css still carries.
  assert.ok(rules.some((r) => r.selector.includes(".sod29-root.closed-shell.native-frame[data-frame-theme-preset] .sod29-header.closed-orientation") && /background:\s*transparent/.test(r.body)));
  // 6) The lockup is never recoloured: its filter is two dark drop-shadows and nothing else.
  assert.match(css, /filter: drop-shadow\(0 0 9px rgb\(0 0 0 \/ \.6\)\) drop-shadow\(0 3px 6px rgb\(0 0 0 \/ \.45\)\);/);
  assert.equal(/hue-rotate|invert\(|sepia|grayscale|brightness\(/.test(code), false, "no recolouring filter anywhere in the stylesheet");
  assert.match(css, /object-fit: contain/);
});

test("the approved numbers", () => {
  const must = [
    "--s29-bar-h: 64px", "--s29-line-w: 2px", "--s29-dip-w: 320px", "--s29-dip-h: 62px", "--s29-crown-w: 100px",
    "--s29-crown-w: 84px", "--s29-dip-w: 250px", "--s29-dip-h: 54px", "--s29-crown-w: 72px", "--s29-dip-w: 220px", "--s29-dip-h: 48px",
    "color-mix(in srgb, var(--s29-panel) 72%, transparent)", "rgb(16 11 28 / .90)", "--s29-line-prog: #7fe7ff",
    "--s29-panel: #17120e", "--s29-ink: #f5f5f0", "--s29-muted: #c6c6c1", "--s29-brand-gold: #f9ba3f", "--s29-accent-text: #a8c7ff", "--s29-focus-ring: #69ded7",
    "translateX(-50%) translateY(-2px) scale(.62)", "translateX(-50%) translateY(-1px) scale(.7)",
  ];
  for (const token of must) assert.ok(css.includes(token), `missing ${token}`);
  // the bar is 64px in every theme; the glass is dark on light and parchment
  assert.match(css, /\[data-frame-theme-preset="light"\],\s*\n\.sod29-root\.closed-shell\.native-frame\[data-frame-theme-preset="parchment"\] \{\s*\n\s*--s29-glass: rgb\(16 11 28 \/ \.90\)/);
});

test("the post and topic rail ends above the floating bottom bar from its natural resting position", () => {
  // Release Visual Gate (Bennett, desktop): a sticky rail that has not pinned yet rests at the bar + the reserve + the stage padding, and its
  // height must still end above the bottom bar from there (gate: 184 + 760 = 944 against a bar at 928). The bar and the reserve are this
  // file's numbers, so the rail's height budget follows them instead of a constant that assumed the previous 56px bar.
  const frameCss = readFileSync(new URL("systemFrame2029.css", dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(frameCss, /height:calc\(100dvh - var\(--s29-rail-natural-offset,150px\) - var\(--s29-island-clearance,92px\)\);/, "the rail's height leaves the natural offset plus the bar clearance");
  assert.equal(/height:calc\(100dvh - 150px - var\(--s29-island-clearance/.test(frameCss), false, "no constant that assumed the previous bar");
  const token = code.match(/--s29-rail-natural-offset:\s*calc\(var\(--s29-bar-h\) \+ var\(--s29-bar-reserve\) \+ (\d+)px\);/);
  assert.ok(token, "the crown stylesheet sets the token from the bar and the reserve");
  for (const decl of ["--s29-bar-h: 64px", "--s29-dip-h: 62px", "--s29-bar-reserve: calc(var(--s29-dip-h) + 6px)"]) assert.ok(code.includes(decl), `${decl} is what the token is computed from`);
  // Measured in the gate at 1024-1920px: natural offset 184 = 64 (bar) + 68 (reserve) + 52 (stage padding). Keep a margin of 20px or more above it.
  const offset = 64 + (62 + 6) + Number(token[1]);
  assert.ok(offset >= 184 + 20, `the budget (${offset}px) covers the natural offset (184px) plus a 20px margin`);
});

test("accessibility and fallbacks", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(css, /\[data-frame-reduced-motion="true"\]/);
  assert.match(css, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/);
  assert.match(css, /outline: 2px solid var\(--s29-focus-ring/, "a visible focus ring on the crown link");
  assert.match(css, /inline-size: 44px; min-inline-size: 44px; block-size: 44px; min-block-size: 44px;/, "the theme control keeps a 44px target");
  assert.match(css, /@media \(max-width: 340px\)[\s\S]*?\.sod29-header-leading \.sod29-orientation \{ display: none; \}/, "at 320px the where-am-I line gives its room to the crown");
});
