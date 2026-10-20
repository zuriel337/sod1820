// Acceptance run on the production card: builds the harness, drives real clicks, asserts and screenshots.
// Usage: node scripts/context-depth-acceptance.mjs <outDir>   (exits non-zero on a failed assertion)
import { build } from "vite";
import react from "@vitejs/plugin-react";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const { chromium } = createRequire(`file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`)("playwright");
const dist = mkdtempSync(join(tmpdir(), "ctxdepth-acc-"));
const harness = join(root, "test/fixtures/context-map-harness");
await build({ root: harness, logLevel: "error", plugins: [react()], build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: join(harness, "depth.html") } } });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => { const path = req.url.split("?")[0]; const f = join(dist, path === "/" ? "depth.html" : path); if (!existsSync(f)) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" }).end(readFileSync(f)); }).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const shots = [], results = [];
const ok = (name) => results.push(name);

async function open(page, query, viewport, theme) {
  await page.setViewportSize(viewport);
  await page.goto(`${base}?theme=${theme}${query}`); await page.waitForSelector(".sod29-post-index-card"); await page.waitForTimeout(250);
}
const shot = async (page, name, fullPage = true) => { const file = join(out, `acc-${name}.png`); await page.screenshot({ path: file, fullPage }); shots.push(file); };
const click = async (page, sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(250); };
const number = (n) => `button[aria-pressed]:has(b:text-is('${n}'))`;

const page = await browser.newPage({ deviceScaleFactor: 2 });
const D = { width: 1280, height: 900 }, M = { width: 390, height: 900 };
for (const [device, vp] of [["desktop", D], ["mobile", M]]) for (const theme of ["light", "parchment", "dark"]) {
  const tag = `${device}-${theme}`;
  // 1. cards: the mapped post carries the meter; the documentation post without data says "not mapped", with no strips
  await open(page, "&view=compare", vp, theme);
  assert.equal(await page.locator("[data-context-depth-compact]").count(), 1);
  assert.equal(await page.locator("[data-context-depth-unmapped]").count(), 2, "the plain 5112 card and 5113 have no data yet");
  assert.equal(await page.locator("[data-context-depth-unmapped]").first().evaluate((n) => n.closest(".sod29-post-index-card").querySelectorAll(".sod29-depth-pips i").length), 0);
  assert.equal(await page.locator("[data-context-depth-compact] .sod29-depth-pips i").count(), 6);
  assert.equal(await page.locator(".sod29-year-hint").count(), 0, "public: no year badge");
  if (device === "desktop" || theme === "dark") await shot(page, `${tag}-1-cards`);
  ok(`${tag}: cards (strips for mapped, "not mapped" without strips, no year badge)`);

  // 2. 787 public: three layers, withheld rows, value vs year separation
  await open(page, "", vp, theme); await click(page, "[data-context-depth-compact]"); await click(page, number(787));
  assert.equal(await page.locator("[data-number='787'] .sod29-depth-expr").count(), 3);
  assert.equal(await page.locator("[data-number='787'] [data-layer='source']").count(), 3);
  const publicText = await page.locator("[data-number='787']").innerText();
  assert.ok(!/לא מפורסמת|מאומתת · לא|רשומת מאגר: לא/.test(publicText.replace(/רשומת מאגר: מאומתת · מפורסמת/g, "")), "no unpublished-row flag for the public");
  assert.equal(await page.locator("[data-number='787'] [data-layer='calculation']:has-text('רשומת מאגר')").count(), 1, "only the published row shows a calculation");
  if (device === "desktop" || theme === "dark") await shot(page, `${tag}-2-787-public`);
  ok(`${tag}: 787 public (3 expressions × 3 layers; only the published row shows its calculation)`);
}

for (const [device, vp] of [["desktop", D], ["mobile", M]]) {
  const tag = `${device}-dark`;
  // 3. admin: the REAL approval row is a broad synthesis (container level only), so the unit stays a candidate; a SIMULATED unit-level row shows approved-unpublished
  await open(page, "&audience=admin", vp, "dark"); await click(page, "[data-context-depth-compact]");
  assert.equal(await page.locator("[data-year-hint][data-state='approved_unpublished']").count() >= 1, true, "the unit decision in the witness spec shows in the admin preview");
  assert.match(await page.locator("[data-year-hint]").first().innerText(), /רמז השנה · תשפ״ז · מאושר עריכתית, טרם פורסם/);
  await click(page, number(787));
  const facts = await page.locator("[data-number='787'] [data-year-hint-facts]").first().innerText();
  assert.match(facts, /posts:5112#block:plane-787-year-joy/); assert.match(facts, /787/); assert.match(facts, /5787/); assert.match(facts, /סטטוס פרסום: חסום/);
  for (const k of ["source", "calculation", "interpretation", "publication"]) assert.equal(await page.locator(`[data-number='787'] [data-fact='${k}']`).count() >= 1, true, k);
  assert.equal(await page.locator("[data-number='787'] [data-layer='calculation']:has-text('לא מפורסמת')").count(), 2);
  assert.equal(await page.locator("[data-number='787'] .sod29-year-hint-layers i").count(), 3, "year, holiday joy and gratitude in one branch");
  assert.match(await page.locator("[data-number='787']").innerText(), /ייחוס הרשומה \(נפרד מהפרסום\): contribution:אבני רונן/);
  assert.equal(await page.locator(".sod29-depth-path li[data-pending]").count(), 1);
  await shot(page, `${tag}-3-787-admin-witness-spec-decision`);
  await open(page, "&audience=admin&approval=unit", vp, "dark");
  assert.equal(await page.locator("[data-year-hint][data-state='approved_unpublished']").count() >= 1, true);
  assert.match(await page.locator("[data-year-hint]").first().innerText(), /מאושר עריכתית, טרם פורסם/);
  await shot(page, `${tag}-3b-787-admin-unit-approved-simulated`);
  await open(page, "&audience=admin&approval=none", vp, "dark");
  assert.equal(await page.locator("[data-year-hint][data-state='candidate']").count() >= 1, true, "no approval row: candidate only");
  ok(`${tag}: admin (witness-spec decision = approved-unpublished with the broad row adding nothing, simulated unit row = approved-unpublished, no row = candidate; 3 layers, attribution apart from publication, pending station)`);

  for (const theme of ["light", "parchment"]) {
    await open(page, "&audience=admin", vp, theme); await click(page, "[data-context-depth-compact]"); await click(page, number(787));
    assert.equal(await page.locator("[data-year-hint][data-state='approved_unpublished']").count() >= 1, true, `${theme}: admin year hint`);
    assert.match(await page.locator("[data-number='787'] [data-fact='publication']").first().innerText(), /חסום/);
    await shot(page, `${device}-${theme}-3-787-admin-witness-spec-decision`);
  }

  // 4. the public never sees the unpublished approval; a (simulated) published approval shows the live marker and archives after the rollover
  await open(page, "", vp, "dark"); await click(page, "[data-context-depth-compact]");
  assert.equal(await page.locator(".sod29-year-hint").count(), 0, "real state: nothing for the public");
  assert.equal(await page.locator(".sod29-depth-path li").count(), 4);
  assert.equal(await page.locator(".sod29-depth-path li[data-pending]").count(), 0);
  await shot(page, `${tag}-4-route-public`);
  await open(page, "&approval=unit", vp, "dark"); await click(page, "[data-context-depth-compact]");
  assert.equal(await page.locator(".sod29-year-hint").count(), 0, "even a unit-level unpublished approval shows nothing to the public");
  await open(page, "&approval=published", vp, "dark");
  assert.match(await page.locator("[data-context-depth-compact]").first().evaluate((n) => n.parentElement.innerText), /רמז השנה · תשפ״ז/);
  assert.equal(await page.locator("[data-context-depth-compact] .sod29-depth-pips i").count(), 6, "the marker is separate from the six strips");
  await click(page, "[data-context-depth-compact]"); await click(page, number(787));
  assert.match(await page.locator("[data-number='787'] .sod29-year-hint").first().innerText(), /ערך גימטרי 787/);
  assert.match(await page.locator("[data-number='787'] .sod29-year-hint").first().innerText(), /5787/);
  await shot(page, `${tag}-5-year-hint-published-simulated`);
  await open(page, "&approval=published&date=2027-10-05T12:00:00%2B03:00", vp, "dark");
  assert.equal(await page.locator("[data-context-depth-compact]").first().evaluate((n) => n.parentElement.querySelectorAll(".sod29-year-hint").length), 0, "after the rollover the card shows no year hint");
  await click(page, "[data-context-depth-compact]"); await click(page, number(787));
  assert.equal(await page.locator("[data-number='787'] [data-layer='source']").count(), 3, "sources survive the rollover");
  assert.match(await page.locator("[data-number='787'] .sod29-year-hint").first().innerText(), /קבוצת שנה · תשפ״ז/);
  await shot(page, `${tag}-6-after-rollover`);
  ok(`${tag}: public sees no marker (real or unit-level unpublished); a SIMULATED public projection shows the live marker, then the year group after the rollover with sources intact`);
}

// 5. open the exact 787 block, then return to the same card with the same number open
for (const [device, vp] of [["desktop", D], ["mobile", M]]) {
  const tag = `${device}-light`;
  await open(page, "", vp, "light"); await click(page, "[data-context-depth-compact]"); await click(page, number(787));
  await click(page, "[data-number='787'] [data-open-locator='plane-787-year-joy']");
  await page.waitForSelector("[data-post-screen='5112']"); await page.waitForTimeout(400);
  const landed = await page.evaluate(() => ({ active: document.querySelectorAll(".sod29-source-locator-active").length, landed: window.__landed,
    rect: document.querySelector(".sod29-source-locator-active")?.getBoundingClientRect().toJSON(), vh: innerHeight,
    text: [...document.querySelectorAll(".sod29-source-locator-active")].map((n) => n.textContent.trim()).join(" | ") }));
  assert.equal(landed.active, 6); assert.equal(landed.landed, 6);
  assert.ok(landed.rect.top >= 0 && landed.rect.top < landed.vh, "the block is inside the viewport");
  for (const q of ["תשפ״ז", "ושמחת בחגך", "מי שגמלך כל טוב הוא יגמלך כל טוב סלה"]) assert.ok(landed.text.includes(q), q);
  assert.ok(!landed.text.includes("רמזים נוספים מן הסרטון"), "only the 787 block is emphasised");
  assert.equal(await page.evaluate(() => document.querySelector(".sod29-reading-source").innerHTML.replace(/ class="sod29-source-locator-active"| tabindex="-1"| sod29-source-locator-active/g, "") === window.__before), true, "source HTML is untouched apart from display-only emphasis");
  await shot(page, `${tag}-7-open-787-block`, false); // what the reader sees on landing
  await click(page, "[data-return-to-card]");
  await page.waitForSelector("[data-number='787']"); await page.waitForTimeout(300);
  assert.equal(await page.locator("[data-number='787']").count(), 1, "same number open on return");
  assert.equal(await page.locator("button[aria-pressed='true']:has(b:text-is('787'))").count(), 1);
  await shot(page, `${tag}-8-return-to-card`);
  ok(`${tag}: opens the exact 787 block (6 paragraphs, nothing else emphasised) and returns to the same card with 787 open`);

  // 6. image 30691 beside the "1202 מסתתר" text, then return
  await open(page, "", vp, "light"); await click(page, "[data-context-depth-compact]"); await click(page, number(1718));
  await click(page, "[data-number='1718'] [data-open-locator='kotel-233-date-image']");
  await page.waitForSelector("[data-post-screen='233']"); await page.waitForTimeout(500);
  const img = await page.evaluate(() => { const n = document.querySelector(".sod29-source-locator-active"); const i = n?.querySelector("img"); const r = i?.getBoundingClientRect();
    return { active: document.querySelectorAll(".sod29-source-locator-active").length, src: i?.getAttribute("src"), attachment: i?.getAttribute("data-attachment-id"), top: r?.top, vh: innerHeight,
      prev: n?.previousElementSibling?.previousElementSibling?.textContent.trim() }; });
  assert.equal(img.active, 1); assert.equal(img.attachment, "30691"); assert.ok(img.src.endsWith("/uploads/2023/10/90ccb82734b67b81.jpg"));
  assert.ok(img.top >= 0 && img.top < img.vh, "the image is inside the viewport");
  assert.equal(await page.evaluate(() => document.querySelector(".sod29-reading-source").innerHTML.replace(/ class="sod29-source-locator-active"| tabindex="-1"| sod29-source-locator-active/g, "") === window.__before), true, "source HTML is untouched");
  assert.match(img.prev, /1202 מסתתר/, "the 1202 text sits two blocks before the image");
  await shot(page, `${tag}-9-open-image-30691`, false);
  await click(page, "[data-return-to-card]");
  assert.equal(await page.locator("button[aria-pressed='true']:has(b:text-is('1718'))").count(), 1, "1718 open on return");
  ok(`${tag}: opens image 30691 next to the 1202 text and returns to the card with 1718 open`);
}
await browser.close(); server.close();
console.log(results.join("\n")); console.log(shots.length, "screenshots");
