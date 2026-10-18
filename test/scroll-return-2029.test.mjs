// The return to a Home-shaped page in a real browser: the person was reading in a gateway block, opened a Post and pressed Back. What they must see, when the
// page's reads come back late, fail, come back with fewer items, or with more, and when they scroll on purpose right after Back.
// The harness (test/fixtures/scroll-return-harness) uses the real useSettledBox hook and the real restorer, driven like RouteEffects2029 drives them; it runs
// against the current restorer and, as the negative control, against src/lib/scrollRestore2029.js exactly as at e3498434, which put the person back at a NUMBER:
// when content above the reading place shrank, grew or vanished after the held boxes had been laid out, the person was thrown away from the place they were reading.
// Failure injection and synthetic content prove behavior only: nothing here says anything about speed, images or the real corpus.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle, returnScenario, CURRENT_RESTORER, PREVIOUS_RESTORER, READING } from "./fixtures/scroll-return-harness/driver.mjs";
// the settled-box hook at 97363471: it starts an entry at the bound after two failed entries and never gives space back above the person (the negative control of the recovery gate)
const HOOK_97363471 = fileURLToPath(new URL("./fixtures/settled-box-harness/useSettledBox.97363471.js", import.meta.url));

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const skip = !chromium || !executablePath;

let browser = null, current = null, previous = null, hookBefore = null;
test.before(async () => {
  if (skip) return;
  [current, previous, hookBefore] = await Promise.all([bundle({ restorer: CURRENT_RESTORER }), bundle({ restorer: PREVIOUS_RESTORER }), bundle({ restorer: CURRENT_RESTORER, hook: HOOK_97363471 })]);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); });

const first = { updates: { ms: 80, outcome: "ok", n: 4 }, notable: { ms: 80, outcome: "ok", n: 4 }, gateways: { ms: 80, outcome: "ok", n: 3 }, hero: { ms: 80, outcome: "ok" } };
const ok = (ms, n) => ({ ms, outcome: "ok", n });
const bad = (ms) => ({ ms, outcome: "fail" });
const visits = (second) => ({ visits: [first, second] });
const run = (script, second, opts) => returnScenario(browser, script, visits(second), opts);
// keepOff: a list that comes back without rows collapses its held box (how every empty or failed read behaved before a message kept the box). A collapse is still
// reachable through other changes (fewer rows than were held, a spent hold), so the restorer is exercised on it too.
const runCollapsing = (script, second, opts) => returnScenario(browser, script, { ...visits(second), keepOff: true }, opts);
// where the person ends up relative to the block they were reading in: 0 = the same place; the block's own top is READING.above above the viewport
const displaced = (r) => Math.abs(r.finalTop - r.wantTop);

test("reads that come back late with the same content: the person stays where they were", { skip }, async () => {
  const late = { updates: ok(1500, 4), notable: ok(1500, 4), gateways: ok(1500, 3), hero: ok(1500) };
  const now = await run(current, late);
  assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
  assert.ok(now.cls <= 0.1, `CLS ${now.cls}`);
});

test("content above the reading place shrinks (fewer cards, a strip that comes back empty): the person is not thrown forward", { skip }, async () => {
  const shrink = { updates: ok(400, 2), notable: { ms: 400, outcome: "empty" }, gateways: ok(400, 3), hero: ok(400) };
  const now = await run(current, shrink);
  assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
  assert.ok(now.cls <= 0.1, `CLS ${now.cls}`);
  const before = await run(previous, shrink);
  assert.ok(displaced(before) > 300, `negative control: at e3498434 the person ended ${displaced(before)}px away from the place they were reading`);
});

test("content above the reading place grows beyond what was held: the person is not thrown back", { skip }, async () => {
  const grow = { updates: ok(900, 7), notable: ok(900, 4), gateways: ok(900, 3), hero: ok(900) };
  const now = await run(current, grow);
  assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
  assert.ok(now.cls <= 0.1, `CLS ${now.cls}`);
  const before = await run(previous, grow);
  assert.ok(displaced(before) > 300 && before.cls > 0.1, `negative control: displaced ${displaced(before)}px, CLS ${before.cls}`);
});

for (const ms of [300, 1500]) {
  test(`the reads above the reading place fail (${ms} ms): a message stands in each held box, nothing moves and the person stays at their place`, { skip }, async () => {
    const above = { updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: ok(ms, 3) };
    const now = await run(current, above);
    assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
    assert.ok(now.cls <= 0.01, `CLS ${now.cls}`);
    // one placement and nothing else: no box above the reading place changed size, so the restorer never had to correct. (At f60d0788 there was a second jump here: the hero's loading state is
    // taller than the box it remembered, and its message shrank the box by that much above the reading place, which the restorer then put back. A message now keeps the larger box.)
    assert.equal(now.programmaticJumps.length, 1, `one placement: nothing above moved, so the restorer never had to correct (${JSON.stringify(now.programmaticJumps)})`);
  });
  test(`the reads above the reading place fail (${ms} ms) and the held boxes collapse anyway: the person stays at their place`, { skip }, async () => {
    const above = { updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: ok(ms, 3) };
    const now = await runCollapsing(current, above);
    assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
    assert.ok(now.cls <= 0.1, `CLS ${now.cls}`);
    const before = await runCollapsing(previous, above);
    assert.ok(displaced(before) > 500, `negative control: displaced ${displaced(before)}px at e3498434`);
  });
}

for (const ms of [300, 1500]) {
  test(`every read fails (${ms} ms), the block being read gets its message in the box it held: the person stays exactly where they were and nothing moves`, { skip }, async () => {
    const all = { updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: bad(ms) };
    const now = await run(current, all);
    assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
    assert.ok(now.cls <= 0.01, `CLS ${now.cls}`);
  });
  test(`every read fails (${ms} ms) and the block being read collapses too: the person ends at that block, not 1300 px away`, { skip }, async () => {
    const all = { updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: bad(ms) };
    const now = await runCollapsing(current, all);
    // the block shrank to its message: the same place is its end, within one block height of the viewport top
    assert.ok(now.finalTop <= 0 && now.finalTop >= -200, `the reading block's top is ${now.finalTop}px from the viewport top`);
    const before = await runCollapsing(previous, all);
    assert.ok(before.finalTop < -1000, `negative control: at e3498434 the reading block ended ${before.finalTop}px above the viewport`);
  });
}

test("only the block being read fails: its message takes the place of its rows, so nothing in view moves", { skip }, async () => {
  const own = { updates: ok(500, 4), notable: ok(500, 4), hero: ok(500), gateways: bad(500) };
  const now = await run(current, own);
  assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
  assert.ok(now.cls <= 0.01, `CLS ${now.cls}`);
  assert.equal(now.programmaticJumps.length, 2, "one placement, one follow");
});
test("only the block being read fails and its box collapses anyway: that is a real change of what is in view, and the person stays at it", { skip }, async () => {
  const own = { updates: ok(500, 4), notable: ok(500, 4), hero: ok(500), gateways: bad(500) };
  const now = await runCollapsing(current, own);
  assert.ok(now.finalTop <= 0 && now.finalTop >= -200, `the reading block's top is ${now.finalTop}px from the viewport top`);
  assert.equal(now.programmaticJumps.length, 2, "one placement, one follow");
});

test("a deliberate scroll right after Back is never pulled back: the restorer stops at the first touch", { skip }, async () => {
  // reads arrive after the touch, so a restorer that kept following would move the page again
  const slow = { updates: bad(1500), notable: bad(1500), hero: bad(1500), gateways: ok(1500, 3) };
  for (const script of [current, previous]) {
    const r = await run(script, slow, { userSwipeAt: 150, horizon: 3000 });
    assert.ok(r.touchAtMs != null, "the touch reached the page");
    assert.equal(r.jumpsAfterTouch, 0, `no programmatic scroll after the touch (${JSON.stringify(r.programmaticJumps)})`);
    assert.notEqual(r.overflowAnchor, "none", "anchoring is back on after the input");
  }
});

test("a width change while the return is still settling does not lose the reading place", { skip }, async () => {
  const late = { updates: ok(1200, 4), notable: ok(1200, 4), gateways: ok(1200, 3), hero: ok(1200) };
  const now = await run(current, late, { resizeTo: 320, resizeAt: 300 });
  assert.ok(displaced(now) <= 12, `displaced ${displaced(now)}px`);
  assert.ok(READING.block, "the reading block is the one the harness scrolled to");
});

// A page that marks no blocks (Post, World, Topic, ...) is restored exactly as before: the same number, the same waits. The reading place only exists where blocks are marked.
test("an unmarked page behaves exactly as with the previous restorer, on every scenario (no regression for the other 2029 routes)", { skip }, async () => {
  const scenarios = {
    late: { updates: ok(1500, 4), notable: ok(1500, 4), gateways: ok(1500, 3), hero: ok(1500) },
    shrink: { updates: ok(400, 2), notable: { ms: 400, outcome: "empty" }, gateways: ok(400, 3), hero: ok(400) },
    grow: { updates: ok(900, 7), notable: ok(900, 4), gateways: ok(900, 3), hero: ok(900) },
    fail: { updates: bad(300), notable: bad(300), hero: bad(300), gateways: bad(300) },
  };
  for (const [name, second] of Object.entries(scenarios)) {
    const cfg = { unmarked: true, visits: [first, second] };
    const [now, before] = [await returnScenario(browser, current, cfg), await returnScenario(browser, previous, cfg)];
    assert.ok(Math.abs(now.finalTop - before.finalTop) <= 4, `${name}: final position ${now.finalTop} vs ${before.finalTop}`);
    assert.ok(Math.abs(now.cls - before.cls) <= 0.02, `${name}: CLS ${now.cls} vs ${before.cls}`);
    assert.deepEqual(now.programmaticJumps.map((j) => j.to), before.programmaticJumps.map((j) => j.to), `${name}: the same programmatic scrolls`);
  }
});

// ---- the recovery gate, with the real hook and the real restorer: every entry starts from the whole boxes; the space of failed areas above the person is given back inside the entry, once they are idle ----
// returns: N = the person opens the Post and comes back N times; every return after the first is a new mount of Home (the next visit of the config): result.again is the second return, result.third the third.
// horizon: how long each return is watched: the restorer holds the page for ~2.5 s after it placed the person, and the space is given back after that.
const entries = (...list) => ({ visits: [first, ...list] });
const comeBack = (script, cfg, returns, extra = {}) => returnScenario(browser, script, cfg, { returns, horizon: 8000, ...extra });
const above = (ms) => ({ updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: ok(ms, 3) });
const healthy = (ms) => ({ updates: ok(ms, 4), notable: ok(ms, 4), hero: ok(ms), gateways: ok(ms, 3) });
const gaveBack = (x) => x.startDocH - x.docH;

test("the areas above the reading place fail on the return: the whole boxes are kept while the person is placed, then given back one at a time once they are idle; the reading place does not move and the browser counts nothing", { skip }, async () => {
  const r = await comeBack(current, entries(above(300)), 1);
  assert.ok(gaveBack(r) >= 300, `the page gave back ${gaveBack(r)}px inside the entry (${r.startDocH}px -> ${r.docH}px)`);
  assert.ok(displaced(r) <= 12, `the reading place: displaced ${displaced(r)}px`);
  assert.ok(r.cls <= 0.01, `layout shifts: ${r.cls}`);
  assert.equal(r.programmaticJumps.length, 1, `one placement by the restorer, no correction after the give-back (${JSON.stringify(r.programmaticJumps)})`);
});
test("negative control: the hook of 97363471 keeps the whole blank above the person for the rest of the entry", { skip }, async () => {
  const r = await comeBack(hookBefore, entries(above(300)), 1);
  assert.ok(gaveBack(r) <= 12, `nothing given back (${r.startDocH}px -> ${r.docH}px)`);
});
test("three failing returns: every entry starts from the same whole boxes, whatever the earlier ones did, and gives back inside the entry; the reading place is exact in each", { skip }, async () => {
  const r = await comeBack(current, entries(above(300), above(300), above(300)), 3);
  for (const [name, x] of [["return 1", r], ["return 2", r.again], ["return 3", r.third]]) {
    assert.ok(gaveBack(x) >= 300, `${name}: gave back ${gaveBack(x)}px (${x.startDocH}px -> ${x.docH}px)`);
    assert.ok(displaced(x) <= 12 && x.cls <= 0.01, `${name}: displaced ${displaced(x)}px, CLS ${x.cls}`);
  }
  assert.ok(Math.abs(r.third.startDocH - r.again.startDocH) <= 12, `no history: the third entry starts where the second started (${r.again.startDocH}px, ${r.third.startDocH}px)`);
});
test("negative control, the recovery gate on the code of 97363471: after two failed returns the third entry starts smaller than the second did (a prediction that it fails again)", { skip }, async () => {
  const r = await comeBack(hookBefore, entries(above(300), above(300), above(300)), 3);
  assert.ok(r.again.startDocH - r.third.startDocH >= 300, `the third started ${r.again.startDocH - r.third.startDocH}px smaller (${r.again.startDocH}px -> ${r.third.startDocH}px)`);
});
test("two failed returns, then a healthy one: the healthy entry starts from the whole boxes (as the failing one before it did), becomes the page again, the reading place is exact and nothing is counted", { skip }, async () => {
  const r = await comeBack(current, entries(above(300), above(300), healthy(300)), 3);
  assert.ok(r.third.startDocH >= r.again.startDocH - 12, `it starts no smaller than the failing entry before it started (${r.again.startDocH}px, ${r.third.startDocH}px)`);
  assert.ok(Math.abs(r.third.docH - r.beforeDocH) <= 30, `and is the page again (${r.beforeDocH}px at the first visit, ${r.third.docH}px)`);
  assert.ok(displaced(r.third) <= 12 && r.third.cls <= 0.01, `displaced ${displaced(r.third)}px, CLS ${r.third.cls}`);
});
test("negative control, the same on the code of 97363471: the healthy entry starts hundreds of pixels smaller than the failing one before it, at the bound, and grows into the page", { skip }, async () => {
  const r = await comeBack(hookBefore, entries(above(300), above(300), healthy(300)), 3);
  assert.ok(r.again.startDocH - r.third.startDocH >= 300, `it started ${r.again.startDocH - r.third.startDocH}px smaller (${r.again.startDocH}px -> ${r.third.startDocH}px)`);
});
test("one failed return, then a healthy one: the page again, the reading place exact, nothing counted", { skip }, async () => {
  const r = await comeBack(current, entries(above(300), healthy(300)), 2);
  assert.ok(Math.abs(r.again.docH - r.beforeDocH) <= 30, `${r.beforeDocH}px -> ${r.again.docH}px`);
  assert.ok(displaced(r.again) <= 12 && r.again.cls <= 0.01, `displaced ${displaced(r.again)}px, CLS ${r.again.cls}`);
});
test("every read fails, the block being read among them: it stays whole in view, the areas above give back, the reading place is exact", { skip }, async () => {
  const all = (ms) => ({ updates: bad(ms), notable: bad(ms), hero: bad(ms), gateways: bad(ms) });
  const r = await comeBack(current, entries(all(300), all(300)), 2);
  for (const [name, x] of [["return 1", r], ["return 2", r.again]]) assert.ok(displaced(x) <= 12 && x.cls <= 0.01 && gaveBack(x) >= 300, `${name}: displaced ${displaced(x)}px, CLS ${x.cls}, gave back ${gaveBack(x)}px`);
});
test("the lists come back empty (a message, not a failure): the same as a failure", { skip }, async () => {
  const empty = (ms) => ({ updates: { ms, outcome: "empty" }, notable: { ms, outcome: "empty" }, hero: bad(ms), gateways: ok(ms, 3) });
  const r = await comeBack(current, entries(empty(300), empty(300)), 2);
  for (const [name, x] of [["return 1", r], ["return 2", r.again]]) assert.ok(displaced(x) <= 12 && x.cls <= 0.01, `${name}: displaced ${displaced(x)}px, CLS ${x.cls}`);
});
test("a person who scrolls while the space would be given back is never pulled back: the restorer stops at the touch and no scrollTo follows", { skip }, async () => {
  const r = await comeBack(current, entries(above(300)), 1, { userSwipeAt: 700 });
  assert.equal(r.jumpsAfterTouch, 0, `scrolls after the touch: ${r.jumpsAfterTouch}`);
  assert.ok(r.cls <= 0.01, `layout shifts: ${r.cls}`);
});
