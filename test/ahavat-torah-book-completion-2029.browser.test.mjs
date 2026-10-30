import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, react;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional only in a lightweight checkout. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && react && existsSync(executablePath));
const companion = JSON.parse(readFileSync(new URL("../public/book-data/ahavat-torah.commentary.json", import.meta.url), "utf8"));

async function routeContext(context, origin, override) {
  await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
    const url = new URL(route.request().url());
    if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
      const response = await context.request.get(`${origin}/2029.html`);
      return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
    }
    if (override && url.pathname === "/book-data/ahavat-torah.commentary.json") return route.fulfill(override);
    if (url.pathname.endsWith(".pdf")) return route.abort();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
    if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
    return route.continue();
  });
}

async function fixture() {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
  return { origin, browser, server };
}

for (const width of [320, 390, 1440]) test(`all 78 completion companion units retain source, reading and return at ${width} in three display combinations`, { skip: !available, timeout: 300_000 }, async () => {
  const { origin, browser, server } = await fixture();
  const out = "/tmp/ahavat-book-completion-browser-20261029";
  mkdirSync(out, { recursive: true });
  try {
    await Promise.all(["light", "parchment", "dark"].map(async theme => {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await routeContext(context, origin);
      const page = await context.newPage();
      const errors = []; page.on("pageerror", error => errors.push(error.message));
      const initialId = "ahavat-front-p001-01";
      const initial = page.locator(`[data-reader-unit="${initialId}"]`);
      const source = page.locator("#ahavat29-source");
      const assertExactEntry = () => page.waitForFunction(id => {
        const top = document.querySelector(`[data-reader-unit="${id}"]`)?.getBoundingClientRect().top;
        return top >= 70 && top <= 110;
      }, initialId);
      await page.goto(`${origin}${ahavatReaderUnitHref(initialId)}`, { waitUntil: "domcontentloaded" });
      await initial.waitFor();
      await page.waitForFunction(value => document.documentElement.getAttribute("data-theme-preset") === value, theme);
      assert.equal(await initial.evaluate(element => element.open), true);
      assert.match(await ahavatSourceHref(source), /#page=1&view=FitH$/);
      const click = async target => { await target.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" })); await target.click(); };
      await click(initial.getByRole("button", { name: "פתח מקור היחידה · PDF 1", exact: true }));
      await initial.evaluate(element => { element.open = false; });
      await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
      await page.waitForFunction(id => document.querySelector(`[data-reader-unit="${id}"]`)?.open === true, initialId);
      await assertExactEntry();
      assert.equal(await page.evaluate(() => document.activeElement?.closest("[data-reader-unit]")?.getAttribute("data-reader-unit")), initialId);
      await page.reload({ waitUntil: "domcontentloaded" });
      await initial.waitFor();
      assert.equal(await initial.evaluate(element => element.open), true);
      await assertExactEntry();
      const nav = page.getByRole("navigation", { name: "עמודים עם הסבר מורחב", exact: true });
      const selection = nav.getByRole("combobox", { name: "בחר עמוד ללימוד מורחב", exact: true });
      assert.equal(await selection.locator("option:not([disabled])").count(), companion.pages.filter(item => item.companion_units).length);
      for (const record of companion.pages.filter(item => item.pdf_page <= 15 || item.pdf_page >= 25 && item.pdf_page <= 44)) {
        await selection.selectOption(String(record.pdf_page));
        const units = page.getByRole("region", { name: `הסבר מורחב לעמוד ${record.pdf_page}`, exact: true });
        await units.waitFor();
        assert.equal(await units.locator("details").count(), record.companion_units.length);
        for (const unit of record.companion_units) {
          const detail = page.locator(`[data-reader-unit="${unit.id}"]`);
          if (!await detail.evaluate(element => element.open)) await click(detail.locator("summary"));
          await page.waitForFunction(id => new URLSearchParams(location.search).get("readerUnit") === id, unit.id);
          const rendered = await detail.evaluate(element => {
            const summary = element.querySelector("summary");
            const body = element.querySelector("p");
            const link = element.querySelector("a");
            return { text: element.textContent, bodySize: parseFloat(getComputedStyle(body).fontSize), summarySize: parseFloat(getComputedStyle(summary).fontSize), summaryHeight: summary.getBoundingClientRect().height, linkText: link.textContent.trim(), href: link.getAttribute("href") };
          });
          assert.match(rendered.text, new RegExp(unit.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
          assert.match(rendered.text, /מהלך הקריאה:/);
          assert.doesNotMatch(rendered.text, /מהלך המחבר:/);
          assert.match(await ahavatSourceHref(source), new RegExp(`#page=${unit.pdf_page}&view=FitH$`));
          assert.equal(new URL(page.url()).searchParams.get("dataset"), null);
          assert.ok(rendered.bodySize >= 18);
          assert.ok(rendered.summarySize >= 16);
          assert.ok(rendered.summaryHeight >= 44);
          assert.equal(rendered.linkText, `דברי הספר · עמוד ${unit.pdf_page} ↗`);
          assert.equal(await detail.getByRole("link", { name: `דברי הספר · עמוד ${unit.pdf_page} ↗`, exact: true }).count(), 1);
          assert.match(rendered.href, new RegExp(`#page=${unit.pdf_page}&view=FitH$`));
        }
      }
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/companion-${width}-${theme}.png` });
      await context.close();
      console.log(`78 completion companion units ${width}/${theme}: passed`);
    }));
  } finally { await browser.close(); await server.close(); }
});

test("unavailable or mismatched companion data never hides the exact PDF or invents an expanded explanation", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  const foreign = { ...companion, source_identity: "foreign" };
  const broken = structuredClone(companion); broken.pages[0].companion_units[0].source_anchor = "#page=56&view=FitH";
  try {
    for (const override of [{ status: 503, body: "unavailable" }, ...[foreign, broken].map(data => ({ status: 200, contentType: "application/json", body: JSON.stringify(data) }))]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 1000 } });
      await routeContext(context, origin, override);
      const page = await context.newPage();
      const response = page.waitForResponse(response => response.url().endsWith("/book-data/ahavat-torah.commentary.json"));
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&page=1`, { waitUntil: "domcontentloaded" });
      const source = page.locator("#ahavat29-source"); await source.waitFor();
      await response;
      await page.waitForFunction(() => !document.getElementById("ahavat29-full-reader")?.textContent.includes("טוען את ההסבר לעמוד"));
      assert.equal(await page.locator(".ahavat29-companion-unit").count(), 0);
      assert.match(await ahavatSourceHref(source), /#page=1&view=FitH$/);
      assert.equal(await source.getByRole("link", { name: /קרא את ה־PDF/ }).isVisible(), true);
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("front, Migdal, table and transition deep links survive PDF return and refresh", { skip: !available, timeout: 180_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    for (const width of [320, 390, 1440]) for (const [id, physical] of [["ahavat-front-p001-01",1],["ahavat-front-p003-01",3],["ahavat-front-p005-03",5],["ahavat-migdal-p006-01",6],["ahavat-migdal-p015-03",15],["ahavat-tables-p025-01",25],["ahavat-tables-p031-02",31],["ahavat-tables-p042-01",42],["ahavat-tables-p043-02",43],["ahavat-transition-p044-01",44]]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await routeContext(context, origin);
      const page = await context.newPage();
      await page.goto(`${origin}${ahavatReaderUnitHref(id)}`, { waitUntil: "domcontentloaded" });
      const unit = page.locator(`[data-reader-unit="${id}"]`);
      await unit.waitFor();
      assert.equal(await unit.evaluate(element => element.open), true);
      const source = page.locator("#ahavat29-source");
      assert.match(await ahavatSourceHref(source), new RegExp(`#page=${physical}&view=FitH$`));
      const open=unit.getByRole("button", { name: `פתח מקור היחידה · PDF ${physical}`, exact: true });
      await open.focus();await open.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await open.click();
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
      await page.reload({ waitUntil: "domcontentloaded" });
      await unit.waitFor();
      assert.equal(await unit.evaluate(element => element.open), true);
      assert.match(await ahavatSourceHref(source), new RegExp(`#page=${physical}&view=FitH$`));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});
