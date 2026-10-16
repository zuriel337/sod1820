// Regression cases for the Home usable-content predicate (docs/perf-evidence-20261016/home-stability-v3/readiness.mjs), run in a real
// browser against static markup. They encode what the v2 runner got wrong: a loading hero and NBSP skeleton slots were counted as
// content (602 -> 315 ms "usable" was not accepted), and a settled empty/error outcome was indistinguishable from loading.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { READINESS_SRC } from "../docs/perf-evidence-20261016/home-stability-v3/readiness.mjs";

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const NBSP = " ";

const home = ({ primary = "loading", hero = "", updates = "", gateways = "", gatewayState = "loading" } = {}) => `<!doctype html><html><body>
<div class="h29" data-h29-primary="${primary}">${hero}<div class="h29-updates">${updates}</div>
<section class="dg29" data-dg29-state="${gatewayState}">${gateways}</section></div></body></html>`;
const loadingHero = `<section class="h29-hero is-loading" aria-busy="true"><div class="h29-hero-copy"><div class="h29-kicker">עכשיו</div><h1>טוען את מה שחי עכשיו…</h1></div></section>`;
const realHero = (title = "כותרת אמיתית של פוסט", href = "/post/real-one") => `<section class="h29-hero"><div class="h29-hero-copy"><h1>${title}</h1><a class="h29-btn is-primary" href="${href}">לקריאה ←</a></div></section>`;
const slot = `<article class="h29-card is-loading" aria-hidden="true"><div class="h29-card-main"><span class="h29-card-t">${NBSP}<br />${NBSP}</span></div><span class="h29-card-open">${NBSP}</span></article>`;
const card = (title = "פוסט אמיתי להצגה", href = "/post/real-card", attrs = "") => `<article class="h29-card" ${attrs}><div class="h29-card-main"><span class="h29-card-t">${title}</span></div><a class="h29-card-open" href="${href}">לקריאה ←</a></article>`;

const skip = !chromium || !executablePath;
let browser;
test.before(async () => { if (!skip) browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }); });
test.after(async () => { await browser?.close(); });

async function ready(html) {
  const page = await browser.newPage();
  try { await page.setContent(html); await page.evaluate(READINESS_SRC); return await page.evaluate(() => window.__ready()); } finally { await page.close(); }
}

test("skeleton slots and a loading hero are never usable content", { skip }, async () => {
  const r = await ready(home({ hero: loadingHero, updates: slot.repeat(4) }));
  assert.equal(r.heroReal, false);
  assert.equal(r.cardReal, 0);
  assert.equal(r.usable, false);
});

test("a loading hero alone, or slots alone, stay not-ready", { skip }, async () => {
  assert.equal((await ready(home({ hero: loadingHero }))).usable, false);
  assert.equal((await ready(home({ updates: slot.repeat(4) }))).usable, false);
});

test("a real hero or a real card with a /post/ destination is usable (a short populated title is enough)", { skip }, async () => {
  const hero = await ready(home({ hero: realHero(), updates: slot.repeat(4) }));
  assert.deepEqual([hero.heroReal, hero.cardReal, hero.usable, hero.both], [true, 0, true, false]);
  const cards = await ready(home({ hero: loadingHero, updates: card("קצר 4") + slot }));
  assert.deepEqual([cards.heroReal, cards.cardReal, cards.usable], [false, 1, true]);
  const both = await ready(home({ hero: realHero(), updates: card() }));
  assert.equal(both.both, true);
});

test("cards that only look populated are rejected: hidden, busy, non-post, NBSP or too-short titles", { skip }, async () => {
  const bad = [
    `<div aria-hidden="true">${card()}</div>`,
    `<div aria-busy="true">${card()}</div>`,
    `<div hidden>${card()}</div>`,
    `<div style="display:none">${card()}</div>`,
    `<div style="visibility:hidden">${card()}</div>`,
    card("כותרת אמיתית אך יעד אחר", "/world"),
    card(`${NBSP}${NBSP}`, "/post/x"),
    card("abc", "/post/x"),
    `<article class="h29-card is-loading">${card()}</article>`,
  ].join("");
  const r = await ready(home({ updates: bad }));
  assert.equal(r.cardReal, 0);
  assert.equal(r.usable, false);
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
  const hiddenLink = await ready(home({ gateways: '<span class="is-loading"><a class="dg29-source" href="/post/a"><span>x y z w</span></a></span>' }));
  assert.equal(hiddenLink.dgReady, false);
});

test("the product marker is read next to the structural result, and can disagree with it", { skip }, async () => {
  const lie = await ready(home({ primary: "ready", hero: loadingHero, updates: slot.repeat(2) }));
  assert.equal(lie.prMarker, "ready");
  assert.equal(lie.usable, false, "a marker alone never makes content usable");
  const settledEmpty = await ready(home({ primary: "empty" }));
  assert.deepEqual([settledEmpty.prMarker, settledEmpty.usable], ["empty", false]);
});

test("negative control: the v2 runner predicate calls the same skeleton-only Home usable", { skip }, async () => {
  // Verbatim logic of docs/perf-evidence-20261015/home-stability-v2/runner.mjs:57-61 (hero accepts any .h29-hero-copy h1; every .h29-card counts).
  const V2 = `window.__v2=()=>{const q=s=>document.querySelector(s);const hero=!!(q('.h29-hero:not(.is-loading) h1')||q('.h29 [class*=hero] a[href^="/post/"]')||q('.h29-hero-copy h1'));const cards=document.querySelectorAll('.h29-updates .h29-card').length;return {hero,cards,usable:hero&&cards>0}}`;
  const page = await browser.newPage();
  try {
    await page.setContent(home({ hero: loadingHero, updates: slot.repeat(4) }));
    await page.evaluate(READINESS_SRC); await page.evaluate(V2);
    assert.equal((await page.evaluate(() => window.__v2())).usable, true, "the old predicate accepts skeletons (the documented defect)");
    assert.equal((await page.evaluate(() => window.__ready())).usable, false, "the v3 predicate rejects them");
  } finally { await page.close(); }
});
