import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getAllBookReaderManifests } from "../src/data/bookReader2029.js";
import { AHAVAT_PDF_URL, AHAVAT_PDF_BYTES, assertAhavatSourcePage } from "./fixtures/ahavat-controlled-source-2029.mjs";
const require = createRequire(import.meta.url), root = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = require("playwright"), { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const out = process.env.BOOKS_PREPARATION_OUT || `/tmp/books-preparation-${process.pid}`;

test("public library opens Ahavat independently of completion and keeps other unfinished books closed", { timeout: 300_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], cacheDir: `/tmp/books-preparation-${process.pid}`, logLevel: "error", appType: "mpa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const books = [...getAllBookReaderManifests().map(b => ({ id: `book-${b.slug}`, type: "book", label: b.title, description: b.introduction, metadata: { slug: b.slug }, is_active: true })), { id: "unknown-book", type: "book", label: "ספר שטרם הוכן", metadata: { slug: "unknown-book" }, is_active: true }];
  mkdirSync(out, { recursive: true });
  try {
    for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      await context.addInitScript(t => localStorage.setItem("sod-theme", t), theme);
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") { const r = await context.request.get(`${origin}/2029.html`); return route.fulfill({ contentType: "text/html", body: await r.body() }); }
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.endsWith("/rest/v1/nodes") && url.searchParams.get("type") === "eq.book" ? JSON.stringify(books) : url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage(), errors = []; page.on("pageerror", e => errors.push(e.message));
      try {
        await page.goto(`${origin}/2029/control?surface=books-unified-reader`);
        await page.locator(".books29-preparation").first().waitFor();
        assert.equal(await page.locator(".books29-preparation").count(), 9);
        assert.equal(await page.locator('[data-book-ready="true"]').count(), 0);
        assert.equal(await page.getByRole("link", { name: "פתח את הספר", exact: true }).count(), 1);
        assert.equal(await page.getByRole("button", { name: "סגור — בהכנה", exact: true }).count(), 8);
        assert.equal(await page.getByRole("button", { name: "סגור — בהכנה", exact: true }).evaluateAll(nodes => nodes.every(n => n.disabled)), true);
        const ahavat = page.locator('[data-book-card="ahavat-torah-prototype"]');
        assert.match(await ahavat.innerText(), /59%/);
        assert.match(await ahavat.innerText(), /פתוח לקריאה · בהכנה/);
        assert.equal(await ahavat.locator('[data-book-ready="false"]').count(), 1);
        assert.doesNotMatch(await page.locator("body").innerText(), /CORPUS PROJECTION|Library Group|Foundation|PERSONAL SOURCE INTAKE|runtime pending|Private Source/);
        assert.equal(await page.getByRole("heading", { name: "ספרי התנ״ך", exact: true }).count(), 1);
        assert.equal(await page.getByRole("button", { name: /העלאת ספר פרטי/ }).count(), 0);
        assert.match(await page.locator('[data-book-slug="unknown-book"]').innerText(), /טרם נמדד/);
        await ahavat.locator("summary").focus(); await page.keyboard.press("Enter");
        assert.equal(await ahavat.locator("details").evaluate(el => el.open), true);
        assert.match(await ahavat.locator("details").innerText(), /99\/99/);
        await ahavat.locator("summary").click();
        for (const width of [320, 390, 1024, 1440]) {
          await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
          await ahavat.evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
          assert.ok((await ahavat.locator("h3").boundingBox()).width >= 130);
          await page.screenshot({ path: `${out}/library-${theme}-${width}.png` });
        }
        await context.route("**/book-data/books.preparation.json", route => route.fulfill({ status: 503, body: "unavailable" }));
        await page.reload(); await page.locator(".books29-preparation").first().waitFor();
        assert.equal(await page.locator(".books29-preparation progress").count(), 0);
        assert.equal(await page.getByRole("link", { name: "פתח את הספר", exact: true }).count(), 1, "explicit Ahavat Preview access is not inferred from preparation data");
        await page.getByRole("link", { name: "פתח את הספר", exact: true }).click();
        await page.locator("#ahavat29-toc").waitFor();
        const source = page.locator("#ahavat29-source");
        const physical = Number(await source.locator('[data-book-pdf-renderer="controlled"]').getAttribute("data-book-requested-page"));
        await assertAhavatSourcePage(source, physical);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await server.close(); }
});
