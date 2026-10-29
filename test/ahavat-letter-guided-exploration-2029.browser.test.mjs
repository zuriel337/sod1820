import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { ahavatNativePdfPageAtStart } from "./fixtures/ahavat-native-pdf-page-2029.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const pdf = readFileSync("/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
const out = "/workspace/artifacts/ahavat-letters-guided-20261029";
mkdirSync(out, { recursive: true });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function native(page, physical) {
  for (let attempt = 0; attempt < 120; attempt++) {
    for (const frame of page.frames()) try {
      const snapshot = await frame.evaluate(n => { const viewer = document.querySelector("pdf-viewer"), viewport = viewer?.viewport_; if (!viewport || !viewer.documentDimensions) return null; return { loadState: viewer.loadState_, documentPages: viewer.documentDimensions.pageDimensions.length, pageIndex: n - 1, viewportHeight: viewport.size.height, requestedRect: viewport.getPageScreenRect(n - 1), previousRect: n > 1 ? viewport.getPageScreenRect(n - 2) : null }; }, physical);
      if (ahavatNativePdfPageAtStart(snapshot, physical)) return;
    } catch { /* Native viewer is navigating. */ }
    await page.waitForTimeout(150);
  }
  assert.fail(`Physical PDF ${physical} did not reach its native page anchor`);
}
test("guided letters preserve exact parasha/source, keyboard camera, step boundaries and focus in nine contexts", { timeout: 480_000 }, async () => {
  assert.equal(createHash("sha256").update(pdf).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") { const response = await context.request.get(`${origin}/2029.html`); return route.fulfill({ contentType: "text/html", body: await response.body() }); }
        if (url.pathname.endsWith(".pdf")) return route.fulfill({ contentType: "application/pdf", body: pdf, headers: { "content-disposition": "inline" } });
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage(), errors = [], modelRequests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => { if (request.url().includes("AhavatTorahSpatialScene2029")) modelRequests.push(request.url()); });
      const id = ahavatLetterUnitId("ד", "vayikra", "צו");
      await page.goto(`${origin}${ahavatReaderUnitHref(id, "/2029/control?study=letters")}`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source"), detail = reader.locator(".ahavat29-letter-parasha");
      await detail.waitFor(); await native(page, 36);
      assert.equal(await reader.locator(`[data-reader-unit="${id}"]`).count(), 1);
      assert.equal(await detail.getAttribute("data-reader-unit"), id);
      assert.equal(await detail.getByRole("combobox", { name: "בחר פרשה ללימוד" }).inputValue(), "צו");
      assert.match(await detail.textContent(), /תיבות|פרשה אחר פרשה/);
      assert.equal(await page.locator("canvas").count(), 0); assert.equal(modelRequests.length, 0);
      await detail.getByRole("button", { name: "הפרשה הבאה", exact: true }).click();
      assert.equal(await detail.getByRole("combobox").inputValue(), "שמיני");
      await detail.getByRole("button", { name: "הפרשה הקודמת", exact: true }).click();
      await detail.getByRole("button", { name: "פתח מקור הפרשה · PDF 36", exact: true }).click(); await native(page, 36);
      await source.getByRole("button", { name: "לעמוד הבא", exact: true }).click(); await native(page, 37);
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click(); await native(page, 36); await settle(page);
      await page.waitForFunction(unit => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === unit, id);
      assert.equal(await detail.getByRole("combobox").inputValue(), "צו");
      await page.reload({ waitUntil: "domcontentloaded" }); await detail.waitFor(); await native(page, 36);
      assert.equal(await detail.getAttribute("data-reader-unit"), id);
      const toggle = reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true });
      await toggle.click(); const canvas = reader.locator('canvas[data-ahavat-context-guard="ready"]'); await canvas.waitFor();
      await canvas.evaluate(element => { window.__guidedCanvas = element; window.__guidedContext = element.getContext("webgl2") || element.getContext("webgl"); });
      const camera = reader.getByRole("navigation", { name: "מבט במודל האות" });
      async function command(label, action) { const button = camera.getByRole("button", { name: label, exact: true }); await button.focus(); await page.keyboard.press("Enter"); await page.waitForFunction(value => document.querySelector("#ahavat29-letters canvas")?.dataset.ahavatCameraCommand === value, action); return Number(await canvas.getAttribute("data-ahavat-camera-distance")); }
      const front = await command("מבט קדמי", "front");
      assert.ok(Math.abs(JSON.parse(await canvas.getAttribute("data-ahavat-camera-position"))[0]) < .001);
      const closer = await command("התקרב", "closer"); assert.ok(closer < front);
      const farther = await command("התרחק", "farther"); assert.ok(farther > closer && farther <= 14.001);
      await command("מבט אלכסוני", "oblique"); await command("אפס מבט", "reset");
      assert.ok(JSON.parse(await canvas.getAttribute("data-ahavat-camera-position"))[0] > 0);
      await detail.getByRole("combobox").selectOption("ויקרא");
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), ahavatLetterUnitId("ד", "vayikra", "ויקרא"));
      assert.equal(await canvas.evaluate(element => element === window.__guidedCanvas), true);
      await detail.getByRole("button", { name: "פתח מקור הפרשה · PDF 35", exact: true }).click(); await native(page, 35);
      await source.getByRole("button", { name: "מסך מלא", exact: true }).click(); await page.waitForFunction(() => !!document.fullscreenElement); await native(page, 35);
      await source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }).click(); await page.waitForFunction(() => !document.fullscreenElement); await settle(page);
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click(); await settle(page);
      assert.equal(await detail.getByRole("combobox").inputValue(), "ויקרא");
      assert.equal(await canvas.evaluate(element => element === window.__guidedCanvas), true);
      await reader.locator(".ahavat29-letter-scene").scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/guided-model-${width}-${theme}.png` });
      await reader.getByRole("button", { name: "סגור מבנה האות בתלת־ממד", exact: true }).click();
      assert.equal(await toggle.evaluate(element => document.activeElement === element), true);
      await page.waitForFunction(() => window.__guidedContext?.isContextLost());
      if (width === 390 && theme === "parchment") {
        const alphabet = reader.locator(".ahavat29-letter-alphabet"), step = reader.getByRole("navigation", { name: "מעבר בין צורות האותיות" });
        for (const [form, expected] of [["כ", "ך"], ["שׁ", "שׂ"]]) { await alphabet.getByRole("button", { name: AHAVAT_LETTER_FORMS.find(item => item.form === form).name, exact: true }).click(); await step.getByRole("button", { name: "האות הבאה", exact: true }).click(); assert.equal(new URL(page.url()).searchParams.get("letter"), expected); }
        await alphabet.getByRole("button", { name: "אלף", exact: true }).click(); assert.equal(await step.getByRole("button", { name: "האות הקודמת", exact: true }).isDisabled(), true);
        await alphabet.getByRole("button", { name: "תו", exact: true }).click(); assert.equal(await step.getByRole("button", { name: "האות הבאה", exact: true }).isDisabled(), true);
      }
      if (width === 390 && theme === "dark") {
        const form = AHAVAT_LETTER_FORMS.find(item => AHAVAT_LETTER_READINGS[item.form].some(book => book.rows.some(row => row.count === null)));
        const book = AHAVAT_LETTER_READINGS[form.form].find(item => item.rows.some(row => row.count === null));
        const row = book.rows.find(item => item.count === null);
        await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId(form.form, book.id, row.parasha), "/2029/control?study=letters")}`, { waitUntil: "domcontentloaded" });
        await detail.waitFor(); assert.equal(await detail.locator(".ahavat29-letter-row-number").count(), 0); assert.match(await detail.textContent(), /לא נקרא/);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []); await context.close(); console.log(`guided source/camera/return ${width}/${theme}: PASS`);
    }
  } finally { await browser.close(); await server.close(); }
});
