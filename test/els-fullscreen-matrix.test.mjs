import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const native = await readFile(new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/components/experience2029/elsNativeClassic2029.css", import.meta.url), "utf8");

test("fullscreen is offered from the research-mode side rail only, and uses the browser's fullscreen when it exists", () => {
  assert.equal((native.match(/<MatrixSideRail /g) || []).length, 1);
  assert.match(native, /const sideRail = researchProfile && !guidedProfile;/);
  assert.match(native, /fullscreen=\{fullscreen\} onFullscreen=\{toggleFullscreen\}/);
  assert.match(native, /if \(node\?\.requestFullscreen\) \{ await node\.requestFullscreen\(\); nativeFullscreenRef\.current = true; \}/);
  // Phones without element fullscreen (iOS Safari) still get the layout, as a fixed full-viewport surface.
  assert.match(native, /setFullscreen\(true\);\s*\};/);
  assert.match(css, /\.els29-native-classic\.is-fullscreen\{position:fixed;inset:0;z-index:2147483000;/);
});

test("fullscreen leaves cleanly: browser exit, Escape without native fullscreen, a mode change, and the page scroll lock is restored", () => {
  assert.match(native, /document\.addEventListener\("fullscreenchange", onChange\)/);
  assert.match(native, /event\.key === "Escape" && !nativeFullscreenRef\.current/);
  assert.match(native, /document\.documentElement\.style\.overflow = previousOverflow/);
  assert.match(native, /if \(!active \|\| !researchProfile \|\| guidedProfile\) \{ if \(fullscreen\) exitFullscreen\(\); \}/);
});

test("windows float over the matrix: a toolbar opens the search window, the advanced search and the tool panels independently", () => {
  assert.match(native, /<div className="els29-fs-bar" role="toolbar" aria-label="חלונות במסך מלא">/);
  assert.match(native, /className=\{`els29-native-query\$\{fsQueryOpen \? " is-fs-open" : ""\}`\}/);
  for (const label of ["חיפוש", "מתקדם", "סריקה", "תוצאות", "שמירה", "✕ יציאה"]) assert.ok(native.includes(label), label);
  assert.match(css, /\.els29-native-query\.is-fs-open\{display:block;position:absolute;/);
  assert.match(css, /\.els29-native-panel-wrap,\.els29-native-classic\.is-fullscreen \.els29-native-layout\.is-panel-pinned \.els29-native-panel-wrap\{position:absolute;/);
  // Operation visibility and engine behaviour are untouched: fullscreen is layout only.
  const block = native.slice(native.indexOf("const enterFullscreen"), native.indexOf("const highlightVerse"));
  assert.doesNotMatch(block, /requestControl|requestLens|requestSearch|postMessage|fetch\(/);
});
