import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../src/components/experience2029/myWorkspace2029.css", import.meta.url), "utf8");
const desktop = css.slice(css.indexOf("@media (min-width: 981px) {\n  .sod29-root.native-frame .sod29-frame-panel[data-panel-kind=\"workspace\"]"));

test("desktop personal area: layout-only rules, scoped to wide screens and the workspace panel", () => {
  assert.ok(desktop.length > 200, "the desktop block exists");
  assert.match(desktop, /^@media \(min-width: 981px\)/);
  // The panel uses the available height instead of a short fixed one.
  assert.match(desktop, /\[data-panel-kind="workspace"\] \{\s*height: min\(calc\(100dvh - var\(--s29-island-clearance, 90px\) - 24px\), 880px\);/);
  // The sign-in entry is not framed twice and its methods sit side by side.
  assert.match(desktop, /\.sod29-workspace-account:has\(> \.sod29-account-entry\) \{ padding: 0; border: 0; background: transparent; \}/);
  assert.match(desktop, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(desktop, /\.sod29-auth-alternatives \{\s*grid-column: 2;/);
  // Nothing in this block touches behaviour, providers or copy.
  assert.doesNotMatch(desktop, /display:\s*none|visibility:\s*hidden|pointer-events/);
});
