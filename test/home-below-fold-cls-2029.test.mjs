import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Layout stability below the first screen of Home (ZURIEL 18.11.2026 "קדימה תבדוק את זה").
// Field RUM (events.web_vital, 7 days): about one Home visit in ten crossed CLS 0.1, with footer.f29 and the lower Home sections as
// sources. Lab on the live Home: the sections that load when the visitor approaches grew after the footer was on screen (reality
// stream 16 -> 1,627-1,710 px, video row 4 -> 139 px, recent posts 68 -> 91-110 px per card, status line 39 <-> 66 px on a phone).
// Each one now reserves its loaded height. Local A/B on identical builds: phone gradual scroll median 0.077 -> 0.015, End key 0.024
// (up to 0.256) -> 0.001, desktop End key 0.037 -> 0.001; the final page height after loading is unchanged.
const css = readFileSync(new URL("../src/components/experience2029/homeComposition2029.css", import.meta.url), "utf8");
const composition = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/pages/Home2029Page.jsx", import.meta.url), "utf8");
const river = readFileSync(new URL("../src/components/research/realityRiver2029.css", import.meta.url), "utf8");

test("the reality stream reserves its loaded height before it is admitted and while its code loads", () => {
  assert.match(composition, /worldAdmitted \? arrivals : <p className="h29-note h29-stream-reserve" role="status">/);
  assert.match(home, /<Suspense fallback=\{<p className="h29-note h29-stream-pending" role="status">טוען את זרם המציאות…<\/p>\}>/);
  assert.match(css, /\.h29-stream-reserve \{ min-height: var\(--h29-stream-reserve\); box-sizing: border-box; margin: 0; \}/);
  assert.match(css, /\.h29-stream:has\(> \.h29-stream-pending\) \{ min-height: var\(--h29-stream-reserve\); box-sizing: border-box; \}/);
});

test("the stream reservation follows the river window it is built from", () => {
  // The reserve is the river window plus the fixed part of the stream; if the window changes, the reserve must change with it.
  assert.match(river, /--r29-window-height:clamp\(660px,86svh,920px\)/);
  assert.match(river, /\.r29-river\{--r29-window-height:clamp\(640px,88svh,860px\)/);
  assert.match(css, /\.h29 \{ --h29-stream-reserve: calc\(clamp\(660px, 86svh, 920px\) \+ 853px\); \}/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.h29 \{ --h29-stream-reserve: calc\(clamp\(640px, 88svh, 860px\) \+ 972px\); \} \}/);
});

test("the video row, the recent-post skeletons, the flight-story placeholder and the status line keep their loaded size", () => {
  assert.match(css, /\.h29-strip-row:empty \{ min-height: 139px; box-sizing: border-box; \}/);
  assert.match(composition, /<div className="h29-strip-row">\s*\{data\.videos\.map/);
  assert.match(css, /\.h29-recent-item\.h29-skel \{ min-height: 91px; border: 0; border-radius: 10px; \}/);
  assert.match(css, /@container h29 \(max-width: 620px\) \{ \.h29-recent-item\.h29-skel \{ min-height: 104px; \} \}/);
  assert.match(css, /\.h29 \.sod29-flight-story\.is-loading > p \{ margin: 0; \}/);
  assert.match(css, /@container h29 \(max-width: 620px\) \{ \.h29-quiet \{ min-height: 66px; box-sizing: border-box; align-content: center; \} \}/);
});
