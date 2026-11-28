import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// /stats on a phone (28.11.2026): a reader scrolled to a row below the discoveries while the late discovery answer shrank the reserved slot (one item: about 380 px,
// empty or failed: 1,500 px) and the row they were pressing moved out from under the finger. keepReadingPlace (src/lib/keepReadingPlace2029.js) holds the row where it is.
// Real Chromium, a synthetic page with the same shape (a tall reserved block above a row). No network. The full-page measurement is
// docs/reviews/speed-jump-20261128/measure-stats-late-shrink.mjs (the real page, a held RPC answer, one/full/empty/fail).
const root = fileURLToPath(new URL("..", import.meta.url));
const chromePath = [process.env.CHROMIUM_PATH, chromium.executablePath(), "/usr/bin/chromium"].find(path => path && existsSync(path)) || "";
const code = readFileSync(new URL("../src/lib/keepReadingPlace2029.js", import.meta.url), "utf8").replace("export function", "function");
const page = enabled => `<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0">
<div id=top style="height:2000px"></div><div id=slot style="height:1500px;background:#eee"></div>
<div id=next style="height:20px"></div><a id=row href="#r" style="display:block;height:60px;margin-bottom:3000px">row</a>
<script>${code};window.__stop=${enabled} ? keepReadingPlace(document.getElementById("slot")) : null;<\/script>`;
const run = async (browser, enabled, newHeight) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } }); const p = await ctx.newPage();
  await p.setContent(page(enabled));
  await p.evaluate(() => document.getElementById("row").scrollIntoView({ block: "center" }));
  await p.waitForTimeout(100);
  const before = await p.evaluate(() => Math.round(document.getElementById("row").getBoundingClientRect().top));
  await p.evaluate(h => { document.getElementById("slot").style.height = h + "px"; }, newHeight);
  await p.waitForTimeout(200);
  const after = await p.evaluate(() => Math.round(document.getElementById("row").getBoundingClientRect().top));
  const hit = await p.evaluate(() => { const r = document.getElementById("row").getBoundingClientRect(); return document.elementFromPoint(r.left + 20, r.top + 20)?.id; });
  await ctx.close(); return { before, after, hit };
};

test("a block that shrinks above the reader (one item, empty, failed) leaves the row they are looking at in place", { timeout: 60000, skip: !chromePath && "needs Chromium" }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] });
  try {
    for (const h of [1123, 0, 1700]) {
      const kept = await run(browser, true, h);
      assert.equal(kept.after, kept.before, `slot 1500 -> ${h}: the row stays (${JSON.stringify(kept)})`);
      assert.equal(kept.hit, "row", "and it can still be pressed");
    }
  } finally { await browser.close(); }
});

test("a block that changes while it is on screen, or below the reader, is left alone", { timeout: 60000, skip: !chromePath && "needs Chromium" }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } }); const p = await ctx.newPage();
    await p.setContent(page(true)); await p.waitForTimeout(100);
    const y0 = await p.evaluate(() => scrollY);
    await p.evaluate(() => { document.getElementById("slot").style.height = "900px"; }); await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => scrollY), y0, "the slot is on screen: no scroll compensation");
    await ctx.close();
  } finally { await browser.close(); }
});

test("the statistics page mounts the slot with the keeper", () => {
  const stats = readFileSync(new URL("../src/pages/Stats2029Page.jsx", import.meta.url), "utf8");
  assert.match(stats, /keepReadingPlace\(node\)/);
  assert.match(stats, /className="stats29-dc-slot" data-dc-state=\{center\.status\} ref=\{slotRef\}/);
  assert.ok(root.length > 0);
});

test("a reader whose screen shows only the bottom of the block and the row under it keeps that row (the real /stats case)", { timeout: 60000, skip: !chromePath && "needs Chromium" }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } }); const p = await ctx.newPage();
    await p.setContent(page(true));
    await p.evaluate(() => scrollTo(0, 2000 + 1500 - 300)); await p.waitForTimeout(100); // the slot's bottom 300 px and the row below
    const before = await p.evaluate(() => Math.round(document.getElementById("row").getBoundingClientRect().top));
    await p.evaluate(() => { document.getElementById("slot").style.height = "1100px"; }); await p.waitForTimeout(200);
    const after = await p.evaluate(() => Math.round(document.getElementById("row").getBoundingClientRect().top));
    assert.equal(after, before);
    await ctx.close();
  } finally { await browser.close(); }
});
