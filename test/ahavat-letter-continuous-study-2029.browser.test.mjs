import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { AHAVAT_LETTER_READINGS } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { ahavatRetainedLetterRow } from "../src/components/books2029/ahavatLetterJourney2029.js";
import { ahavatNativePdfPageAtStart } from "./fixtures/ahavat-native-pdf-page-2029.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const pdf = readFileSync("/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
const out = "/workspace/artifacts/ahavat-letters-continuous-20261029";
mkdirSync(out, { recursive: true });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function native(page, physical) {
  return assertAhavatSourcePage(page, physical);
}
async function click(locator) {
  await locator.focus();
  await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await locator.click();
}
test("continuous source journey crosses four book boundaries, retains parasha across letters and restores exact focus in nine contexts", { timeout: 480_000 }, async () => {
  assert.equal(createHash("sha256").update(pdf).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
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
      await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId("ד", "vayikra", "צו"), "/2029/control?study=letters")}`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source"), detail = reader.locator(".ahavat29-letter-parasha"), chooser = detail.getByRole("combobox", { name: "בחר פרשה ללימוד" });
      await detail.waitFor(); await native(page, 36);
      async function checkRow(form, parasha) {
        const expected = ahavatRetainedLetterRow(AHAVAT_LETTER_READINGS, form, parasha);
        const unit = ahavatLetterUnitId(form, expected.bookId, parasha);
        assert.equal(await chooser.inputValue(), parasha);
        assert.equal(await detail.getAttribute("data-reader-unit"), unit);
        assert.equal(await reader.locator(`[data-reader-unit="${unit}"]`).count(), 1);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), unit);
        assert.equal(new URL(page.url()).searchParams.get("letterBook"), expected.bookId);
        assert.equal(new URL(page.url()).searchParams.get("page"), String(expected.row.page));
        assert.match(await detail.textContent(), new RegExp(expected.row.printed === "?" ? "לא נקרא" : expected.row.printed));
        await native(page, expected.row.page);
      }
      async function select(parasha) { await chooser.focus(); await chooser.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" })); await chooser.selectOption(parasha); }
      assert.equal(await chooser.locator("option").count(), 55);
      for (const [before, after] of [["ויחי", "שמות"], ["פקודי", "ויקרא"], ["בחוקותי", "במדבר"], ["מסעי", "דברים"]]) {
        await select(before); await checkRow("ד", before);
        await click(detail.getByRole("button", { name: "הפרשה הבאה", exact: true })); await checkRow("ד", after);
        await click(detail.getByRole("button", { name: "הפרשה הקודמת", exact: true })); await checkRow("ד", before);
      }
      await select("צו"); await checkRow("ד", "צו");
      await click(detail.getByRole("button", { name: "החומש הנבחר", exact: true }));
      assert.equal(await chooser.locator("option").count(), AHAVAT_LETTER_READINGS["ד"].find(book => book.id === "vayikra").rows.length + 1);
      await page.reload({ waitUntil: "domcontentloaded" }); await detail.waitFor(); await checkRow("ד", "צו");
      assert.equal(await detail.getByRole("button", { name: "החומש הנבחר", exact: true }).getAttribute("aria-pressed"), "true");
      await select("בחוקותי"); assert.equal(await detail.getByRole("button", { name: "הפרשה הבאה", exact: true }).isDisabled(), true);
      await click(detail.getByRole("button", { name: "כל פרשות התורה", exact: true }));
      assert.equal(await chooser.locator("option").count(), 55);
      await click(detail.getByRole("button", { name: "הפרשה הבאה", exact: true })); await checkRow("ד", "במדבר");
      await select("בראשית"); assert.equal(await detail.getByRole("button", { name: "הפרשה הקודמת", exact: true }).isDisabled(), true);
      await select("וזאת הברכה"); assert.equal(await detail.getByRole("button", { name: "הפרשה הבאה", exact: true }).isDisabled(), true);
      await select("צו");
      await click(detail.getByRole("link", { name: "החלף אות ושמור את הפרשה", exact: true })); await settle(page);
      assert.equal(new URL(page.url()).hash, "#ahavat29-letter-overview");
      await page.waitForFunction(() => !!document.activeElement?.closest("#ahavat29-letter-overview"));
      await page.reload({ waitUntil: "domcontentloaded" }); await detail.waitFor();
      await page.waitForFunction(() => !!document.activeElement?.closest("#ahavat29-letter-overview"));
      const step = reader.getByRole("navigation", { name: "מעבר בין צורות האותיות" });
      await click(step.getByRole("button", { name: "האות הבאה", exact: true })); await checkRow("ה", "צו");
      await click(step.getByRole("button", { name: "האות הקודמת", exact: true })); await checkRow("ד", "צו");
      await click(reader.getByRole("link", { name: "חזור לפרשה הנבחרת", exact: true })); await settle(page);
      await page.waitForFunction(() => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === "letter-row:ד:vayikra:צו");
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0); assert.equal(modelRequests.length, 0);
      const toggle = reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true });
      await click(toggle); const canvas = reader.locator('canvas[data-ahavat-context-guard="ready"]'); await canvas.waitFor();
      await canvas.evaluate(element => { window.__continuousCanvas = element; window.__continuousContext = element.getContext("webgl2") || element.getContext("webgl"); });
      await select("פקודי"); await click(detail.getByRole("button", { name: "הפרשה הבאה", exact: true })); await checkRow("ד", "ויקרא");
      assert.equal(await canvas.evaluate(element => element === window.__continuousCanvas), true);
      await click(detail.getByRole("button", { name: "פתח מקור הפרשה · PDF 35", exact: true })); await native(page, 35);
      await click(source.getByRole("button", { name: "לעמוד הבא", exact: true })); await native(page, 36);
      await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true })); await checkRow("ד", "ויקרא");
      assert.equal(new URL(page.url()).searchParams.get("letterJourney"), "torah");
      assert.equal(await canvas.evaluate(element => element === window.__continuousCanvas), true);
      await reader.locator(".ahavat29-letter-scene").scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/continuous-${width}-${theme}.png` });
      await click(reader.getByRole("button", { name: "סגור מבנה האות בתלת־ממד", exact: true }));
      assert.equal(await toggle.evaluate(element => document.activeElement === element), true);
      await page.waitForFunction(() => window.__continuousContext?.isContextLost());
      if (width === 390 && theme === "dark") {
        const [form, books] = Object.entries(AHAVAT_LETTER_READINGS).find(([, books]) => books.some(book => book.rows.some(row => row.count === null)));
        const book = books.find(book => book.rows.some(row => row.count === null)), row = book.rows.find(row => row.count === null);
        await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId(form, book.id, row.parasha), "/2029/control?study=letters")}`, { waitUntil: "domcontentloaded" });
        await detail.waitFor(); await checkRow(form, row.parasha); assert.equal(await detail.locator(".ahavat29-letter-row-number").count(), 0);
        const alphabet = reader.locator(".ahavat29-letter-alphabet");
        await click(alphabet.getByRole("button", { name: "אלף", exact: true })); await checkRow("א", row.parasha);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []); await context.close(); console.log(`continuous parasha/source/focus ${width}/${theme}: PASS`);
    }
  } finally { await browser.close(); await server.close(); }
});
