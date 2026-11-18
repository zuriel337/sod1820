import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Both side panels are one design under the top bar (ZURIEL 18.11.2026: "תבנה"): the navigation rail opens on hover over the page, as in
// Google Analytics, with the pin keeping it open; it has the left panel's width and top, and the top bar and logo do not move between states.
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const bar = readFileSync(new URL("../src/components/experience2029/systemFrame2029-unified-bar.css", import.meta.url), "utf8");
const crown = readFileSync(new URL("../src/components/experience2029/systemFrame2029-topbar-crown.css", import.meta.url), "utf8");

test("hover opens the slim rail over the page with a delay, focus opens it, Escape closes it, the pin keeps it open", () => {
  assert.match(frame, /onMouseEnter=\{\(\) => peekRail\(true, 180\)\} onMouseLeave=\{\(\) => peekRail\(false, 260\)\} onFocus=\{\(\) => peekRail\(true, 0\)\}/);
  assert.match(frame, /event\.key === "Escape"\) peekRail\(false, 0\)/);
  assert.match(frame, /\(hover: hover\) and \(min-width: 981px\)/);
  assert.match(frame, /\$\{sidebarCollapsed && !railPeek \? " sidebar-collapsed" : ""\}\$\{railPeek \? " rail-peek" : ""\}/);
  assert.match(frame, /<b>\{sidebarCollapsed \? "נעץ" : "צמצם"\}<\/b>/);
  // a peek keeps the slim page column, so the content does not move
  assert.match(bar, /\.sod29-root\.closed-shell\.native-frame\.rail-peek \{ grid-template-columns: 72px minmax\(0, 1fr\); \}/);
});

test("the open rail has the left panel's width and the shared capsule top; it never jumps beside the top bar", () => {
  assert.match(bar, /--s29-rail-open: var\(--s29-context-rail-width, 286px\)/);
  assert.doesNotMatch(bar, /padding-block-start: 76px/);
  assert.match(bar, /\.sod29-sidebar :is\(\.sod29-nav, \.sod29-nav-group\) \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("the top bar and the logo keep one form in every rail state", () => {
  assert.match(crown, /\.sod29-header\.closed-orientation \{ margin-inline: calc\(-1 \* var\(--s29-rail-col, 72px\)\) 0; padding-inline: 78px; \}/);
  assert.doesNotMatch(crown, /sidebar-collapsed \.sod29-(header|logo-toggle)/);
});

test("royal rail (ZURIEL 18.11.2026 \"תעשה רויאל\"): gold kickers, diamond separators, gold icons, gold current tile and a seal row foot", () => {
  assert.match(bar, /\.sod29-sidebar \{ --g: var\(--s29-brand-gold\);/);
  assert.match(bar, /\.sod29-nav-group \+ \.sod29-nav-group::before \{ content: ""; [^}]*rotate\(45deg\)/);
  assert.match(bar, /\.sod29-sidebar \.sod29-nav-link\.active \{ background: color-mix\(in srgb, var\(--g\) 11%, transparent\);/);
  assert.match(bar, /\.sod29-rail-foot :is\(\.sod29-rail-utilities button, \.sod29-rail-toggle\) \{\s*inline-size: 44px;[^}]*border-radius: 50%;/);
  assert.doesNotMatch(bar.slice(bar.indexOf("ROYAL RAIL")), /#[0-9a-f]{3,8}\b/i, "colour only from palette tokens");
});
