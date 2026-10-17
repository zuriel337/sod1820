// HomeV2 stability: the remembered-box rules, the honest readiness states and the wiring that the earlier experiment (36c96bcf)
// left open. Pure rules are tested directly; the DOM behavior (width change, late gate, skeleton vs content) is proved in a real
// browser by docs/perf-evidence-20261016/home-stability-v3 and test/home-readiness-predicate-2029.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ABOVE_MARGIN_PX, KEEP_RESERVE_PX, QUIET_MS, SETTLED_HEIGHT_VAR, GIVE_BACK_GAP_MS, currentViewportWidth, giveBackAbove, holdAttribute, keptHeight, layoutExtent, mayGiveBack, nextMemory, personIsIdle, readSettledBox, rememberSettledBox, rememberedHeight, resetSettledBoxes, shouldReleaseHold, viewportChangedSinceHold,
} from "../src/components/experience2029/useSettledBox2029.js";
import { gatewayContentState, primaryContentState } from "../src/lib/homeReadiness2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a remembered height is a candidate only at the viewport width it was remembered at (no layout read needed)", () => {
  assert.equal(rememberedHeight({ w: 390, vw: 390, h: 812, n: 4 }, 390), 812);
  assert.equal(rememberedHeight({ w: 390, vw: 390, h: 812, n: 4 }, 320), null);
  assert.equal(rememberedHeight(undefined, 390), null);
});

test("a held height is released when the visible width changes, never for a hidden or unchanged box", () => {
  assert.equal(shouldReleaseHold(null, 320), false);       // nothing was applied
  assert.equal(shouldReleaseHold(390, 390), false);        // same width: keep holding
  assert.equal(shouldReleaseHold(390, 320), true);         // rotation / resize / another breakpoint
  assert.equal(shouldReleaseHold(390, 1440), true);
  assert.equal(shouldReleaseHold(390, 0), false);          // display:none or detached is not a width change
});

test("a hold applied for one viewport width is stale as soon as the viewport has another one", () => {
  assert.equal(viewportChangedSinceHold(null, 320), false);     // nothing was applied
  assert.equal(viewportChangedSinceHold(390, 390), false);
  assert.equal(viewportChangedSinceHold(390, 320), true);
  assert.equal(viewportChangedSinceHold(390, 1920), true);
  assert.equal(viewportChangedSinceHold(390, 0), false);        // an unmeasured viewport is not a change
});

test("the settled box is the natural extent of the children at the current width", () => {
  assert.deepEqual(nextMemory({ width: 389.6, viewport: 390, top: 100, bottom: 912.4, count: 4 }), { w: 390, vw: 390, h: 812, n: 4 });
  assert.equal(nextMemory({ width: 0, viewport: 390, top: 0, bottom: 500, count: 1 }), null);
  assert.equal(nextMemory({ width: 390, viewport: 390, top: 500, bottom: 500, count: 1 }), null);
  assert.equal(nextMemory({ width: 390, viewport: 390, top: 500, bottom: 120, count: 1 }), null);
});

test("hold: while pending, or settled again with the same item count; a different count releases it", () => {
  const memory = { w: 390, vw: 390, h: 800, n: 4 };
  assert.equal(holdAttribute({ pending: true, settled: false, memory: undefined, count: 0 }), "");
  assert.equal(holdAttribute({ pending: false, settled: true, memory, count: 4 }), "");
  assert.equal(holdAttribute({ pending: false, settled: true, memory, count: 3 }), undefined);
  assert.equal(holdAttribute({ pending: false, settled: true, memory: undefined, count: 4 }), undefined);
  assert.equal(holdAttribute({ pending: false, settled: false, memory, count: 4 }), undefined);
  assert.equal(holdAttribute({ pending: false, settled: () => true, memory: { w: 390, vw: 390, h: 188, n: 0 }, count: 0 }), "");   // predicate form (story slot)
});

test("the store keeps one box per key and can be reset", () => {
  resetSettledBoxes();
  assert.equal(readSettledBox("home:updates"), undefined);
  rememberSettledBox("home:updates", { w: 390, vw: 390, h: 800, n: 4 });
  assert.deepEqual(readSettledBox("home:updates"), { w: 390, vw: 390, h: 800, n: 4 });
  rememberSettledBox("home:updates", { w: 320, vw: 320, h: 900, n: 4 });
  assert.deepEqual(readSettledBox("home:updates"), { w: 320, vw: 320, h: 900, n: 4 });
  resetSettledBoxes();
  assert.equal(readSettledBox("home:updates"), undefined);
  assert.equal(SETTLED_HEIGHT_VAR, "--h29-settled-h");
});

test("primary readiness: skeletons and a loading hero are never ready; a settled outcome without content is explicit", () => {
  for (const loading of [true, false]) for (const failed of [true, false]) {
    assert.notEqual(primaryContentState({ loading, failed, hasHero: false, postCount: 0 }), "ready", "no real hero and no real card: never ready");
  }
  assert.equal(primaryContentState({ loading: true }), "loading");
  assert.equal(primaryContentState({ loading: false }), "empty");
  assert.equal(primaryContentState({ loading: false, failed: true }), "error");
  assert.equal(primaryContentState({ loading: true, hasHero: true }), "ready");         // a real hero is usable content even while the strips load
  assert.equal(primaryContentState({ loading: false, postCount: 2 }), "ready");
  assert.equal(primaryContentState(), "empty");
});

test("gateway readiness follows populated rows, not slots", () => {
  assert.equal(gatewayContentState({ loading: true, itemCount: 0 }), "loading");
  assert.equal(gatewayContentState({ loading: true, itemCount: 3 }), "loading");        // items cannot exist before the reader settles
  assert.equal(gatewayContentState({ loading: false, itemCount: 3 }), "ready");
  assert.equal(gatewayContentState({ loading: false, itemCount: 0 }), "empty");
  assert.equal(gatewayContentState({ loading: false, failed: true, itemCount: 0 }), "error");
});

test("worldPending is the gate's own loading state, wired from the page, with no projection fallback", () => {
  const page = read("src/pages/Home2029Page.jsx");
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  assert.match(page, /const worldFeature = useFeatureState\("lock_world"\)/);
  assert.match(page, /<HomeComposition2029[\s\S]*?worldOpen=\{worldOpen\}\s+worldPending=\{worldFeature\.loading\}/);
  assert.doesNotMatch(home, /worldPending \?\? loading/);
  assert.match(home, /worldPending === true/);
  assert.match(home, /!worldOpen && worldPending === false\) shownBefore\.notable = 0/);
});

test("the settled-box hook lives in one module and releases on width change", () => {
  const hook = read("src/components/experience2029/useSettledBox2029.js");
  assert.match(hook, /shouldReleaseHold\(state\.appliedWidth, width\)/);
  assert.match(hook, /node\.style\.removeProperty\(SETTLED_HEIGHT_VAR\)/);
  // The mount-time ref callback must not read layout: a forced layout per instance at commit delayed the first read of Home.
  const refBody = hook.slice(hook.indexOf("const ref = useCallback((node) => {"), hook.indexOf("}, [key, observe, release]);"));
  assert.ok(refBody.length > 100, "ref callback found");
  assert.doesNotMatch(refBody, /getBoundingClientRect|offsetWidth|offsetHeight|clientWidth|clientHeight|getComputedStyle|innerWidth/);
  assert.match(hook, /window\.addEventListener\("resize"/, "the viewport width is cached and refreshed on resize");
  assert.equal(typeof currentViewportWidth(), "number");
  const users = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(jsx?|mjs)$/.test(name) && !/\.test\./.test(name)) { const text = readFileSync(path, "utf8"); if (/useSettledBox\b/.test(text) && !path.endsWith("useSettledBox2029.js")) users.push([path, text]); } } };
  walk(new URL("../src", import.meta.url).pathname);
  assert.deepEqual(users.map(([path]) => path.split("/").pop()).sort(), ["DiscoveryGateways2029.jsx", "HomeComposition2029.jsx"]);
  for (const [, text] of users) assert.match(text, /from "\.\/useSettledBox2029\.js"/);
  assert.doesNotMatch(read("src/components/experience2029/DiscoveryGateways2029.jsx"), /export function useSettledBox/);
});

test("loading slots stay presentational: hidden from assistive technology, never counted as content, readiness exposed as attributes", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  assert.match(home, /className="h29-card is-loading" aria-hidden="true"/);
  assert.match(home, /data-h29-primary=\{primary\}/);
  assert.match(home, /hasHero: Boolean\(nowHero\) \|\| Boolean\(lead\), postCount: visiblePosts\.length/);
  assert.match(gateways, /data-dg29-state=\{gatewayContentState\(/);
  assert.match(gateways, /failed: ALL_READS\.every\(\(name\) => reads\[name\]\.failed\)/);
  assert.match(gateways, /failed: results\[index\]\.status === "rejected"/);
});

test("loading slots are rendered only when no remembered box already reserves the space; the held box itself is the placeholder", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  const css = read("src/components/experience2029/homeComposition2029.css");
  assert.match(home, /data\.loading && !updatesBox\.held \? Array\.from/);
  assert.match(home, /notableWaiting && !notableBox\.held \? Array\.from/);
  assert.match(home, /data-h29-loading=\{data\.loading && updatesBox\.held \? "" : undefined\}/);
  assert.match(gateways, /slots\?\.feature && !box\.held \? <LanguageFeatureSlot \/>/);
  assert.match(gateways, /length: box\.held \? 0 : \(slots\?\.rows \|\| 0\)/);
  assert.match(gateways, /length: box\.held \? 0 : dimensionSlots/);
  assert.match(css, /\.h29 \[data-h29-loading\], \.h29 \[data-h29-notice\] \{ background: var\(--s29-panel-soft\)/);
  assert.match(read("src/components/experience2029/useSettledBox2029.js"), /held: !released && rememberedHeight\(memory, viewportWidth\) != null/);
});

test("a release draws the loading slots at the new width in the same frame; the hold is released by the viewport resize itself, not only by a later observation", () => {
  const hook = read("src/components/experience2029/useSettledBox2029.js");
  assert.match(hook, /if \(synchronous\) flushSync\(\(\) => setReleased\(true\)\); else setReleased\(true\);/, "from an effect flushSync is not allowed: batched");
  assert.match(hook, /viewportListeners\.add\(onViewport\)/);
  assert.match(hook, /for \(const notify of \[\.\.\.viewportListeners\]\) notify\(\)/);
  assert.match(hook, /unsubscribe/, "a listener never outlives its node");
  // the page's loading slots follow `held`, so a released box shows them
  assert.match(read("src/components/experience2029/HomeComposition2029.jsx"), /data\.loading && !updatesBox\.held \? Array\.from/);
});

test("a cold load reserves only what is in the first screen: the four update cards; the strips below it reserve nothing without evidence", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  // the updates strip is in the first screen on a wide page: it reserves the standard four cards on a cold load (a failure keeps that box); the strips below the first screen reserve nothing without evidence
  assert.match(home, /length: shownBefore\.updates \?\? HOME_UPDATE_SLOTS/);
  assert.match(home, /const notableSlots = shownBefore\.notable \|\| 0;/);
  assert.match(gateways, /slots=\{slots \? slots\.language : null\}/);
  assert.match(gateways, /slots=\{slots \? \{ rows: slots\.cinema \} : null\}/);
  assert.match(gateways, /slots=\{slots \? \{ rows: slots\.biblical, detail: true \} : null\}/);
  assert.match(gateways, /dimensionSlots=\{slots \? slots\.dimension : 0\}/);
  assert.doesNotMatch(gateways, /DIMENSION_SLOTS/);
  // the status line is visible text (as before HomeV2) whenever nothing else already reserves the row
  assert.match(gateways, /className=\{reserving \|\| box\.held \? "dg29-empty dg29-sr" : "dg29-empty"\}/);
  assert.match(gateways, /className=\{box\.held \|\| dimensionSlots > 0 \? "dg29-empty dg29-sr" : "dg29-empty"\}/);
});

test("the extent is measured from layout offsets (transform-free); painted rectangles only when a node has no offset box", () => {
  const parent = {};
  const painted = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) });
  const first = { offsetTop: 10, offsetHeight: 100, offsetParent: parent, ...painted(18, 118) };       // painted 8 px lower than laid out
  const last = { offsetTop: 330, offsetHeight: 104, offsetParent: parent, ...painted(341, 445) };      // painted 11 px lower
  assert.deepEqual(layoutExtent(first, last), { top: 10, bottom: 434 }, "offsets, not the painted rectangles (which would give 323..445)");
  const svg = { offsetTop: undefined, ...painted(20, 60) };
  assert.deepEqual(layoutExtent(svg, { offsetTop: undefined, ...painted(70, 120) }), { top: 20, bottom: 120 }, "no offset box: the rectangles");
  assert.deepEqual(layoutExtent({ ...first, offsetParent: null }, { ...last, offsetParent: null }), { top: 18, bottom: 445 }, "no offset parent (display: none, fixed): the rectangles");
  assert.deepEqual(layoutExtent(first, { ...last, offsetParent: {} }), { top: 18, bottom: 445 }, "different offset parents cannot be subtracted: the rectangles");
});

test("a message keeps all of what was reserved while its area is in view, and the bound once it is out of view; a smaller reservation is kept as it is", () => {
  assert.equal(KEEP_RESERVE_PX, 160);
  assert.equal(keptHeight(714, true), 714, "in view: nothing under the person's eyes moves");
  assert.equal(keptHeight(714, false), 160, "out of view: room for the message and its retry, not the whole strip");
  assert.equal(keptHeight(120, false), 120, "less than the bound: nothing to give back");
  assert.equal(keptHeight(0, true), 0, "nothing was reserved: nothing is kept");
  assert.equal(keptHeight(-5, false), 0);
});

test("a message keeps the held box: the hook takes `keep`, and Home, the gateways and the hero use it for an empty or failed read", () => {
  const hook = read("src/components/experience2029/useSettledBox2029.js");
  assert.match(hook, /export function useSettledBox\(key, \{ pending = false, settled = false, count = 0, keep = false \} = \{\}\)/);
  assert.match(hook, /hold: holdAttribute\(\{ pending: pending \|\| keep, settled, memory, count \}\)/);
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  assert.match(home, /const updatesEmpty = !data\.loading && !data\.posts\.length;/);
  assert.match(home, /useSettledBox\("home:updates", \{ pending: updatesPending && !updatesEmpty, settled: !updatesPending && visiblePosts\.length > 0, count: visiblePosts\.length, keep: updatesEmpty \}\)/);
  assert.match(home, /useSettledBox\("home:hero", \{ pending: data\.loading, settled: Boolean\(lead\), count: lead\?\.slug \|\| "", keep: !data\.loading && !lead \}\)/);
  assert.match(home, /useSettledBox\("home:notable", \{[^}]*keep: notableUnavailable \}\)/);
  assert.match(home, /const notableUnavailable = worldOpen && notableHeld && data\.notableDone && !data\.notable\.length;/);
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  assert.match(gateways, /useSettledBox\(`gateway:\$\{title\}`, \{ pending: loading, settled: !loading && count > 0, count, keep: unavailable \}\)/);
  assert.match(gateways, /useSettledBox\("dimension-five", \{ pending: loading, settled: !loading && items\.length > 0, count: items\.length, keep: unavailable \}\)/);
});

test("an empty or failed read has a message with a retry that repeats the same read; the retry is one control per block, not a banner", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  assert.match(home, /const retryPosts = useCallback\(\(\) => \{\s*setState\(\(current\) => \(\{ \.\.\.current, loading: true, failed: false, enriched: false \}\)\);/);
  assert.match(home, /\}, \[attempt\.posts\]\);/, "the posts read runs again for a new attempt");
  assert.match(home, /\}, \[includeWorld, attempt\.notable\]\);/, "and so does the strip's read");
  assert.match(home, /<HomeReadNotice2029 onRetry=\{data\.retryPosts\}>/);
  assert.match(home, /<HomeReadNotice2029 onRetry=\{data\.retryNotable\}>/);
  assert.match(home, /<button type="button" className="h29-btn" onClick=\{data\.retryPosts\}>נסו שוב<\/button>/);
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  // a retry repeats the reads of ONE area (a gateway, the dimension strip) and leaves every other area as it is
  assert.match(gateways, /const AREA_READS = \{ language: \["language"\], cinema: \["cinema"\], biblical: \["videos", "matrices"\], dimension: \["dimension"\] \};/);
  assert.match(gateways, /const retryArea = \(area\) => \(\) => load\(AREA_READS\[area\]\);/);
  assert.match(gateways, /onRetry=\{retryFor\("language"\)\}/);
  assert.match(gateways, /onRetry=\{retryFor\("cinema"\)\}/);
  assert.match(gateways, /onRetry=\{retryFor\("biblical", true\)\}/, "the biblical gateway reads through a reader that swallows its errors: an empty result may be a failed one");
  assert.match(gateways, /onRetry=\{retryFor\("dimension"\)\}/);
  assert.match(gateways, /if \(state\.latest\[name\] !== token\) return;/, "a newer attempt for a reader is the one that counts");
  const notice = read("src/components/experience2029/HomeReadNotice2029.jsx");
  assert.match(notice, /aria-live="polite"/);
  assert.doesNotMatch(notice, /role="status"/, "role=status marks 'still loading' for the evidence tooling: a message is never counted as a loading line");
});

test("the CSS: the message is the held box's own content and a held box does not stretch rows; the unavailable hero's footprint comes from the hook, not a permanent rule", () => {
  const css = read("src/components/experience2029/homeComposition2029.css");
  assert.match(css, /\.h29 \[data-h29-hold\] \{ align-content: start; \}/);
  assert.match(css, /\.h29 \[data-h29-loading\], \.h29 \[data-h29-notice\] \{ background: var\(--s29-panel-soft\)/);
  assert.match(css, /\.h29-notice \{ grid-column: 1 \/ -1;/);
  assert.match(css, /\.h29-hero\.is-loading \{ min-height: 247px; \}/, "a loading hero is as tall as the loaded one on a wide page");
  assert.match(css, /\.h29-hero\.is-loading, \.h29-hero2 \{ min-height: 418px;/);
  assert.doesNotMatch(css, /is-unavailable \{ min-height/, "an unavailable hero never keeps a permanent 418 px: the bounded, out-of-view release lives in the hook");
});

// ---- the space of a failed area is given back inside the entry, only where nothing the person sees can move ----
test("the person is idle when nothing scrolled or was pressed for QUIET_MS, the restorer is not holding the page and the tab is visible", () => {
  const doc = (overflowAnchor = "", visibilityState = "visible") => ({ documentElement: { style: { overflowAnchor } }, visibilityState });
  assert.equal(QUIET_MS, 400);
  assert.equal(personIsIdle(QUIET_MS + 1, doc()), true);
  assert.equal(personIsIdle(QUIET_MS - 1, doc()), false, "something moved or was pressed a moment ago");
  assert.equal(personIsIdle(10_000, doc("none")), false, "the restorer is holding the page (scroll anchoring paused)");
  assert.equal(personIsIdle(10_000, doc("", "hidden")), false);
  assert.equal(personIsIdle(10_000, null), false);
});

test("boxes are given back one at a time: a second give-back waits GIVE_BACK_GAP_MS (several in one frame would be counted as layout shifts)", () => {
  assert.equal(GIVE_BACK_GAP_MS, 150);
  const win = { scrollBy() {} };
  const node = { style: { setProperty() {} }, getBoundingClientRect: () => ({ bottom: -200 }) };
  const t0 = performance.now();
  giveBackAbove(node, 160, win);
  assert.equal(mayGiveBack(t0 + 10), false, "a box that comes due together with the one just given back waits");
  assert.equal(mayGiveBack(performance.now() + GIVE_BACK_GAP_MS + 1), true);
});

test("giveBackAbove: the page is put back by exactly the measured drift, or not at all when the browser already did", () => {
  const make = (shrinkBy, anchored) => {
    const state = { bottom: -200, scrolled: [] };
    const node = { style: { setProperty(name, value) { state.height = value; state.bottom -= anchored ? 0 : shrinkBy; } }, getBoundingClientRect: () => ({ bottom: state.bottom }) };
    return { node, state, win: { scrollBy: (options) => state.scrolled.push(options) } };
  };
  const plain = make(540, false);
  assert.equal(giveBackAbove(plain.node, 160, plain.win), -540);
  assert.deepEqual(plain.state.scrolled, [{ top: -540, left: 0, behavior: "instant" }]);
  assert.equal(plain.state.height, "160px");
  const anchored = make(540, true);   // scroll anchoring has already put the page back: the box's bottom edge did not move
  assert.equal(giveBackAbove(anchored.node, 160, anchored.win), 0);
  assert.deepEqual(anchored.state.scrolled, [], "nothing is added on top of the browser's own correction");
  const tiny = make(0.3, false);
  giveBackAbove(tiny.node, 160, tiny.win);
  assert.deepEqual(tiny.state.scrolled, [], "sub-pixel drift is not corrected");
});

test("the hook gives space back inside the entry, starts every entry from the remembered whole box, and keeps no history of failures", () => {
  const hook = read("src/components/experience2029/useSettledBox2029.js");
  assert.match(hook, /const full = Math\.max\(state\.appliedHeight \?\? 0, state\.lastHeight\);/);
  assert.match(hook, /if \(entry\.boundingClientRect\.top >= 0\) \{ node\.style\.setProperty\(SETTLED_HEIGHT_VAR, `\$\{bound\}px`\); stop\(\); return; \}/, "below the viewport: at once");
  assert.match(hook, /if \(personIsIdle\(\) && mayGiveBack\(\)\) \{\n        const box = node\.getBoundingClientRect\(\);\n        if \(box\.bottom < -ABOVE_MARGIN_PX\) \{ giveBackAbove\(node, bound\); stop\(\); return; \}/, "entirely above the viewport and idle: measured, put back");
  assert.match(hook, /const memory = readSettledBox\(key\);\n    const height = state\.released/, "the box a mount applies is the remembered one, untouched by earlier failures");
  for (const gone of ["entryMemory", "messageBox", "STRIKES_TO_BOUND", "readMessageBox", "strikes"]) assert.ok(!hook.includes(gone), `${gone} must not exist: a failure is not proof that the next read fails`);
});
