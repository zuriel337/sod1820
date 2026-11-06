import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("side rail is research-only: the classic and Guided matrices keep their current layout", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /const sideRail = researchProfile && !guidedProfile;/);
  assert.match(native, /\{sideRail \? <div className="els29-native-matrix-with-rail"/);
  // Exactly one rail is mounted; the non-research branch renders the matrix without it.
  assert.equal((native.match(/<MatrixSideRail /g) || []).length, 1);
  assert.equal((native.match(/<MatrixSnapshot /g) || []).length, 2);
});

test("zoom uses the engine's own control and row spacing is presentation only", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  // "zoom-set" leaves the fit-to-screen layout (the engine clears fit), so the side buttons visibly enlarge/shrink the matrix; the
  // older "zoom-in"/"zoom-out" kept fit on, where the percentage changed but the matrix did not.
  assert.match(native, /onZoom=\{direction => requestControl\("zoom-set", clamp\(Math\.round\(\(\(Number\(engineState\?\.ui\?\.zoom\) \|\| 1\) \+ direction \* 0\.2\) \* 10\) \/ 10, 0\.5, 2\.8\)\)\}/);
  assert.match(native, /const ROW_GAP_PX = \[2, 8, 16, 28\];/);
  assert.match(native, /"--els29-row-gap": `\$\{ROW_GAP_PX\[rowGapStep\]\}px`/);
  // The spacing never reaches the engine: no request or state transfer carries it.
  const rail = native.slice(native.indexOf("function MatrixSideRail"), native.indexOf("function LineExplorer"));
  assert.doesNotMatch(rail, /requestControl|requestLens|postMessage|fetch\(/);
  const css = await read("src/components/experience2029/elsNativeClassic2029.css");
  assert.match(css, /row-gap:var\(--els29-row-gap,2px\)/);
  assert.match(css, /\.els29-native-side-rail\{position:sticky;/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.els29-native-matrix\{transition:none\}/);
});

test("rail buttons are labelled distinctly from the existing zoom bar and meet the touch-target size", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /aria-label="הגדל מטריצה · פקדי צד"/);
  assert.match(native, /aria-label="הקטן מטריצה · פקדי צד"/);
  assert.match(native, /aria-label="הגדל רווח בין השורות"/);
  const css = await read("src/components/experience2029/elsNativeClassic2029.css");
  assert.match(css, /\.els29-native-side-rail button\{width:44px;height:44px/);
});
