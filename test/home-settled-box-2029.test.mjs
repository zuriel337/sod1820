// HomeV2 stability: the remembered-box rules, the honest readiness states and the wiring that the earlier experiment (36c96bcf)
// left open. Pure rules are tested directly; the DOM behavior (width change, late gate, skeleton vs content) is proved in a real
// browser by docs/perf-evidence-20261016/home-stability-v3 and test/home-readiness-predicate-2029.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  SETTLED_HEIGHT_VAR, currentViewportWidth, holdAttribute, nextMemory, readSettledBox, rememberSettledBox, rememberedHeight, resetSettledBoxes, shouldReleaseHold, viewportChangedSinceHold,
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
  assert.match(gateways, /failed: \[language, cinema, videos, dimension, matrices\]\.every\(result => result\.status === "rejected"\)/);
  assert.match(gateways, /\.catch\(\(\) => \{ if \(active\) setState\(current => \(\{ \.\.\.current, loading: false, failed: true \}\)\); \}\)/);
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
  assert.match(css, /\.h29 \[data-h29-loading\] \{ background: var\(--s29-panel-soft\)/);
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

test("a cold load reserves nothing without evidence: loading slots only come from what this session showed before", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  const gateways = read("src/components/experience2029/DiscoveryGateways2029.jsx");
  assert.match(home, /length: shownBefore\.updates \?\? 0/);
  assert.doesNotMatch(home, /shownBefore\.updates \?\? HOME_UPDATE_SLOTS/);
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
