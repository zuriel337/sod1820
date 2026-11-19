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

test("fullscreen is the same interface re-laid: the page's own tool strip carries the fullscreen controls; nothing is duplicated", () => {
  // ZURIEL 18.11.2026: no separate fullscreen toolbar with its own copies of the search and tool buttons.
  assert.doesNotMatch(native, /els29-fs-bar/);
  assert.doesNotMatch(css, /els29-fs-bar/);
  assert.equal((native.match(/className="els29-native-toolstrip"/g) || []).length, 1, "one tool strip, on the page and in fullscreen");
  const strip = native.slice(native.indexOf('<div className="els29-native-toolstrip"'), native.indexOf('<div ref={panelRef}'));
  assert.match(strip, /\{fullscreen \? <>\s*<button type="button" className="els29-fs-window" aria-pressed=\{fsQueryOpen\} aria-controls="els29-query"/);
  assert.match(strip, /data-tool-action="discovery"[\s\S]*aria-expanded=\{researchToolsOpen\} aria-controls="els29-discovery-panel"/);
  assert.match(strip, /researchToolsOpen \? setResearchToolsOpen\(false\) : openTool\("discovery", event\.currentTarget\)/);
  assert.match(strip, /\{fullscreen \? <button type="button" className="els29-fs-exit" onClick=\{exitFullscreen\}/);
  // The search window and discovery inspector reuse the page's own elements.
  assert.match(native, /className=\{`els29-native-query\$\{fsQueryOpen \? " is-fs-open" : ""\}`\}/);
  assert.match(native, /<ContextualInspector2029 hidden=\{!researchToolsOpen\} id="els29-discovery-panel"/);
  assert.match(native, /hidden=\{!researchWorkspace \|\| !researchToolsOpen\} className="els29-native-structure-entry els29-discovery-panel"/);
  assert.equal((native.match(/id="els29-discovery-panel"/g) || []).length, 1);
  assert.equal((native.match(/<ElsLexiconResearch2029 /g) || []).length, 1);
  assert.equal((native.match(/id="els29-query"/g) || []).length, 1);
  assert.match(css, /\.els29-native-query\.is-fs-open\{display:block;position:absolute;/);
  assert.match(css, /\.is-fullscreen \.els29-native-context-panel \.els29-discovery-panel:not\(\[hidden\]\)\{display:block!important;position:static;/);
  assert.match(css, /\.is-fullscreen \.els29-native-toolstrip,[^{]+\{grid-column:2;grid-row:1;display:grid;/);
  assert.doesNotMatch(css, /\.is-fullscreen \.els29-native-toolstrip\{display:none/);
  assert.match(css, /\.els29-native-panel-wrap,\.els29-native-classic\.is-fullscreen \.els29-native-layout\.is-panel-pinned \.els29-native-panel-wrap\{position:absolute;/);
  // A submitted search closes the search window; the camera's own fullscreen inside the section does not end this mode.
  assert.match(native, /markDraft\(false\);\s*setFsQueryOpen\(false\);/);
  assert.match(native, /if \(nativeFullscreenRef\.current && !\(element && sectionRef\.current\?\.contains\(element\)\)\)/);
  // Operation visibility and engine behaviour are untouched: fullscreen is layout only.
  const block = native.slice(native.indexOf("const enterFullscreen"), native.indexOf("const highlightVerse"));
  assert.doesNotMatch(block, /requestControl|requestLens|requestSearch|postMessage|fetch\(/);
});
