// Regression cases for the Home content predicates (docs/perf-evidence-20261016/home-stability-v3/readiness.mjs), run in a real browser against
// static markup (viewport 390x844). They encode what the earlier runners got wrong:
//   v2: a loading hero and NBSP skeleton slots counted as content;
//   v3 (e23dee27, kept as readiness.v3-e23dee27.mjs): skeletons were rejected, but a card with opacity:0, or placed far below the screen, was still "usable".
// "composed" (the DOM holds real content) and "usable" (a person can see and use it now) are separate results; each negative case below first shows that the
// previous predicate accepts it, then that the current one does not.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { READINESS_SRC } from "../docs/perf-evidence-20261016/home-stability-v3/readiness.mjs";
import { READINESS_SRC as READINESS_V3_SRC } from "../docs/perf-evidence-20261016/home-stability-v3/readiness.v3-e23dee27.mjs";

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const NBSP = " ";
const PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const home = ({ primary = "loading", hero = "", updates = "", gateways = "", gatewayState = "loading", before = "", after = "" } = {}) => `<!doctype html><html><head><style>body{margin:0}</style></head><body>${before}
<div class="h29" data-h29-primary="${primary}">${hero}<div class="h29-updates">${updates}</div>
<section class="dg29" data-dg29-state="${gatewayState}">${gateways}</section></div>${after}</body></html>`;
const loadingHero = `<section class="h29-hero is-loading" aria-busy="true"><div class="h29-hero-copy"><div class="h29-kicker">עכשיו</div><h1>טוען את מה שחי עכשיו…</h1></div></section>`;
const realHero = (title = "כותרת אמיתית של פוסט", href = "/post/real-one") => `<section class="h29-hero"><div class="h29-hero-copy"><h1>${title}</h1><a class="h29-btn is-primary" href="${href}">לקריאה ←</a></div></section>`;
const slot = `<article class="h29-card is-loading" aria-hidden="true"><div class="h29-card-main"><span class="h29-card-t">${NBSP}<br />${NBSP}</span></div><span class="h29-card-open">${NBSP}</span></article>`;
const card = (title = "פוסט אמיתי להצגה", href = "/post/real-card", attrs = "") => `<article class="h29-card" ${attrs}><div class="h29-card-main"><span class="h29-card-t" style="display:block;height:60px">${title}</span></div><a class="h29-card-open" href="${href}" style="display:block;height:40px">לקריאה ←</a></article>`;
const spacer = (height) => `<div style="height:${height}px"></div>`;

const skip = !chromium || !executablePath;
let browser;
test.before(async () => { if (!skip) browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }); });
test.after(async () => { await browser?.close(); });

async function evaluate(html, { src = READINESS_SRC, target = null, size = { width: 390, height: 844 } } = {}) {
  const page = await browser.newPage({ viewport: size });
  try {
    await page.setContent(html); await page.evaluate(src);
    if (target != null) await page.evaluate((text) => { window.__target = text; }, target);
    return await page.evaluate(() => window.__ready());
  } finally { await page.close(); }
}
const ready = (html, options) => evaluate(html, options);
const readyV3 = (html) => evaluate(html, { src: READINESS_V3_SRC });

test("skeleton slots and a loading hero are never content: not composed, not usable", { skip }, async () => {
  const r = await ready(home({ hero: loadingHero, updates: slot.repeat(4) }));
  assert.deepEqual([r.heroReal, r.cardReal, r.composed, r.usable], [false, 0, false, false]);
  assert.equal((await ready(home({ hero: loadingHero }))).usable, false);
  assert.equal((await ready(home({ updates: slot.repeat(4) }))).usable, false);
});

test("a real hero or a real card that is on screen is composed and usable (a short populated title is enough)", { skip }, async () => {
  const hero = await ready(home({ hero: realHero(), updates: slot.repeat(4) }));
  assert.deepEqual([hero.heroReal, hero.cardReal, hero.composed, hero.heroVisible, hero.usable, hero.both], [true, 0, true, true, true, false]);
  const cards = await ready(home({ hero: loadingHero, updates: card("קצר 4") + slot }));
  assert.deepEqual([cards.heroReal, cards.cardReal, cards.cardVisible, cards.usable], [false, 1, 1, true]);
  assert.equal((await ready(home({ hero: realHero(), updates: card() }))).both, true);
});

test("cards that only look populated are rejected: hidden, busy, non-post, NBSP or too-short titles", { skip }, async () => {
  const bad = [
    `<div aria-hidden="true">${card()}</div>`, `<div aria-busy="true">${card()}</div>`, `<div hidden>${card()}</div>`,
    `<div style="display:none">${card()}</div>`, `<div style="visibility:hidden">${card()}</div>`,
    card("כותרת אמיתית אך יעד אחר", "/world"), card(`${NBSP}${NBSP}`, "/post/x"), card("abc", "/post/x"),
    `<article class="h29-card is-loading">${card()}</article>`,
  ].join("");
  const r = await ready(home({ updates: bad }));
  assert.equal(r.cardReal, 0);
  assert.equal(r.usable, false);
});

// [name, markup, why the current predicate refuses it]. Every one is composed (real content in the DOM) and every one was accepted by v3.
const NOT_VISIBLE = [
  ["transparent card (opacity 0)", { updates: card("פוסט אמיתי להצגה", "/post/a", 'style="opacity:0"') }, "opacity"],
  ["transparent ancestor (opacity 0)", { updates: `<div style="opacity:0">${card()}</div>` }, "opacity"],
  ["half-faded ancestor still revealing (opacity 0.5)", { updates: `<div style="opacity:.5">${card()}</div>` }, "opacity"],
  ["card entirely below the screen (top 2000px)", { before: spacer(2000), updates: card() }, "offscreen"],
  ["card entirely below the screen (inside the hero position)", { updates: `<div style="position:absolute;top:2000px;left:0;width:300px">${card()}</div>` }, "offscreen"],
  ["card only 20% on screen", { before: spacer(844 - 20), updates: card() }, "mostly-offscreen"],
  ["card pushed off to the side", { updates: `<div style="position:absolute;left:-1000px;top:100px;width:300px">${card()}</div>` }, "offscreen"],
  ["card covered by an overlay", { updates: card(), after: '<div style="position:fixed;inset:0;background:#000"></div>' }, "covered"],
  ["inert ancestor (an old Home kept under a route change)", { updates: `<div inert>${card()}</div>` }, "inert"],
  ["content-visibility hidden ancestor", { updates: `<div style="content-visibility:hidden;contain-intrinsic-size:100px 200px">${card()}</div>` }, "content-visibility"],
];
for (const [name, markup, why] of NOT_VISIBLE) {
  test(`negative control: ${name} was usable to v3, is composed but not usable now (${why})`, { skip }, async () => {
    const html = home(markup);
    const before = await readyV3(html), now = await ready(html);
    assert.equal(before.usable, true, "the previous predicate accepted it (the documented defect)");
    assert.equal(now.composed, true, "the DOM composition is still reported, separately");
    assert.equal(now.usable, false);
    assert.equal(now.why, why);
  });
}

test("a half-visible card, and a card at the end of its reveal (opacity 0.95), are usable", { skip }, async () => {
  assert.equal((await ready(home({ before: spacer(844 - 100), updates: card() }))).usable, true);
  const settled = await ready(home({ updates: `<div style="opacity:.95">${card()}</div>` }));
  assert.deepEqual([settled.composed, settled.usable], [true, true]);
});

test("on a return the usable thing is the departure control itself: elsewhere-visible content, old content and hidden copies do not count", { skip }, async () => {
  const departure = "מקור שממנו יצאנו אל הפוסט";
  const control = (text, style = "") => `<a class="dg29-source" href="/post/a" style="display:block;height:50px;${style}"><span>${text}</span></a>`;
  const gateways = (inner) => `<div style="height:40px">שערים</div>${inner}`;
  const visible = await ready(home({ hero: realHero(), gateways: control(departure), gatewayState: "ready" }), { target: departure });
  assert.deepEqual([visible.anchorUsable, visible.usable], [true, true]);
  // the hero is on screen and composed, but the control being returned to is far below: the page is not usable yet
  const far = await ready(home({ hero: realHero(), gateways: gateways(spacer(3000) + control(departure)), gatewayState: "ready" }), { target: departure });
  assert.deepEqual([far.heroVisible, far.composed, far.anchorUsable, far.usable, far.why], [true, true, false, false, "offscreen"]);
  const absent = await ready(home({ hero: realHero(), gateways: control("טקסט אחר לגמרי") }), { target: departure });
  assert.deepEqual([absent.usable, absent.why], [false, "absent"]);
  const oldCopy = await ready(home({ hero: realHero(), gateways: `<div aria-hidden="true">${control(departure)}</div>` }), { target: departure });
  assert.deepEqual([oldCopy.usable, oldCopy.why], [false, "aria-hidden"]);
  const faded = await ready(home({ hero: realHero(), gateways: control(departure, "opacity:0") }), { target: departure });
  assert.deepEqual([faded.usable, faded.why], [false, "opacity"]);
  const loadingCopy = await ready(home({ hero: realHero(), gateways: `<span class="is-loading">${control(departure)}</span>` }), { target: departure });
  assert.equal(loadingCopy.usable, false);
});

test("discovery readiness follows populated links; settled empty/error is explicit, skeleton rows are not content", { skip }, async () => {
  const rowSlot = `<span class="dg29-source is-loading" aria-hidden="true"><span>${NBSP}</span></span>`;
  const loading = await ready(home({ gateways: rowSlot.repeat(3) + '<p class="dg29-empty dg29-sr" role="status">טוען מקורות ציבוריים…</p>' }));
  assert.deepEqual([loading.dgItems, loading.dgReady, loading.dgSettled], [0, false, false]);
  const populated = await ready(home({ gatewayState: "ready", gateways: '<a class="dg29-source" href="/post/a"><span>מקור ציבורי</span></a>' }));
  assert.deepEqual([populated.dgItems, populated.dgReady, populated.dgSettled, populated.dgMarker], [1, true, true, "ready"]);
  const empty = await ready(home({ gatewayState: "empty", gateways: '<p class="dg29-empty">אין כרגע פוסטים ציבוריים בקטגוריה זו</p>' }));
  assert.deepEqual([empty.dgReady, empty.dgSettled, empty.dgMarker], [false, true, "empty"]);
  const error = await ready(home({ gatewayState: "error" }));
  assert.deepEqual([error.dgReady, error.dgSettled, error.dgMarker], [false, true, "error"]);
  assert.equal((await ready(home({ gateways: '<span class="is-loading"><a class="dg29-source" href="/post/a"><span>x y z w</span></a></span>' }))).dgReady, false);
});

test("the product marker is read next to the structural result, and can disagree with it", { skip }, async () => {
  const lie = await ready(home({ primary: "ready", hero: loadingHero, updates: slot.repeat(2) }));
  assert.equal(lie.prMarker, "ready");
  assert.equal(lie.usable, false, "a marker alone never makes content usable");
  const settledEmpty = await ready(home({ primary: "empty" }));
  assert.deepEqual([settledEmpty.prMarker, settledEmpty.usable], ["empty", false]);
});

test("images that the page asked for and could not decode are reported", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent(`<img id="ok" src="${PX}"><img id="bad" src="data:image/png;base64,${Buffer.from("not a png ï¿½").toString("base64")}">`);
    await page.evaluate(READINESS_SRC);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    const broken = await page.evaluate(() => window.__brokenImages());
    assert.equal(broken.length, 1, "only the undecodable one");
  } finally { await page.close(); }
});

test("negative control: the v2 runner predicate calls the same skeleton-only Home usable", { skip }, async () => {
  // Verbatim logic of docs/perf-evidence-20261015/home-stability-v2/runner.mjs:57-61 (hero accepts any .h29-hero-copy h1; every .h29-card counts).
  const V2 = `window.__v2=()=>{const q=s=>document.querySelector(s);const hero=!!(q('.h29-hero:not(.is-loading) h1')||q('.h29 [class*=hero] a[href^="/post/"]')||q('.h29-hero-copy h1'));const cards=document.querySelectorAll('.h29-updates .h29-card').length;return {hero,cards,usable:hero&&cards>0}}`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent(home({ hero: loadingHero, updates: slot.repeat(4) }));
    await page.evaluate(READINESS_SRC); await page.evaluate(V2);
    assert.equal((await page.evaluate(() => window.__v2())).usable, true, "the old predicate accepts skeletons (the documented defect)");
    assert.equal((await page.evaluate(() => window.__ready())).usable, false, "the current predicate rejects them");
  } finally { await page.close(); }
});
