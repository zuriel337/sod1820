import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage } from "./fixtures/ahavat-controlled-source-2029.mjs";
import { ahavatLetterUnitId, ahavatReaderUnitDomId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;

async function fixture() {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], cacheDir: `/tmp/ahavat-compact-return-${process.pid}`, logLevel: "error", appType: "mpa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const open = async (path, theme = "parchment") => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await context.addInitScript(theme => localStorage.setItem("sod-theme", theme), theme);
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
      if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
        const response = await context.request.get(`${origin}/2029.html`);
        return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
      }
      if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
      if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
      return route.continue();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    return { context, page, errors };
  };
  return { open, close: async () => { await browser.close(); await server.close(); } };
}

test("the compact source action returns to the same letter unit, source and filter in all themes", { timeout: 180_000 }, async () => {
  const app = await fixture();
  const id = ahavatLetterUnitId("ד", "vayikra", "צו");
  try {
    for (const theme of ["light", "parchment", "dark"]) {
      const { context, page, errors } = await app.open(ahavatReaderUnitHref(id, "/2029/control?study=letters&letterQuery=109"), theme);
      try {
        const source = page.locator("#ahavat29-source"), reader = page.locator("#ahavat29-letters");
        await assertAhavatSourcePage(source, 36);
        assert.equal(await page.locator("#ahavat29-selection").count(), 0, "letter mode has no general selection panel");
        const action = source.getByRole("link", { name: "להסבר", exact: true });
        assert.equal(new URL(await action.getAttribute("href"), page.url()).hash, `#${ahavatReaderUnitDomId(id)}`);
        await source.getByRole("button", { name: "לעמוד הבא", exact: true }).click();
        await assertAhavatSourcePage(source, 37);
        await action.focus(); await page.keyboard.press("Enter");
        await assertAhavatSourcePage(source, 36);
        await page.waitForFunction(id => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === id, id);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
        assert.equal(new URL(page.url()).searchParams.get("study"), "letters");
        assert.equal(await reader.getByRole("searchbox", { name: "חיפוש בפרשות האות" }).inputValue(), "109");
        assert.equal(await reader.locator("tbody tr").count(), 1);
        assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally { await app.close(); }
});

test("letter mode without a selected unit uses the existing letter reader; book mode keeps its selection action", { timeout: 120_000 }, async () => {
  const app = await fixture();
  try {
    const { context, page, errors } = await app.open("/2029/control?surface=ahavat-torah-system&study=letters&page=36");
    try {
      const source = page.locator("#ahavat29-source");
      await assertAhavatSourcePage(source, 36);
      const action = source.getByRole("link", { name: "להסבר", exact: true });
      assert.equal(await action.getAttribute("href"), "#ahavat29-letters");
      await action.click();
      assert.equal(new URL(page.url()).hash, "#ahavat29-letters");
      assert.equal(await page.locator("#ahavat29-letters").isVisible(), true);
      await page.getByRole("navigation", { name: "מיקוד הלימוד" }).getByRole("button", { name: "כל הספר", exact: true }).click();
      await page.locator("#ahavat29-selection").waitFor();
      assert.equal(await action.getAttribute("href"), "#ahavat29-selection");
      await action.click();
      await page.waitForFunction(() => { const box = document.getElementById("ahavat29-selection").getBoundingClientRect(); return box.top >= 60 && box.top < 200; });
      await assertAhavatSourcePage(source, 36);
      assert.equal(new URL(page.url()).searchParams.get("page"), "36");
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  } finally { await app.close(); }
});
