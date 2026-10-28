import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

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

test("both book experiences preserve the source while widening desktop reading", { skip: !available, timeout: 360_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  const out = "/tmp/books-wide-dual-experience-20261028";
  mkdirSync(out, { recursive: true });
  try {
    for (const book of [{ surface: "ahavat-torah-system", source: "#ahavat29-source", layout: ".ahavat29-layout", page: 6 }, { surface: "sefer-yetzirah-world", source: "#yetzirah29-source", layout: ".yetzirah29-layout", page: 53 }]) {
      for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
        await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
        await context.route("**/*", async route => {
          const url = new URL(route.request().url());
          if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
            const response = await context.request.get(`${origin}/2029.html`);
            return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
          }
          if (url.pathname.endsWith(".pdf")) return route.abort();
          if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
          if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(`${origin}/2029/control?surface=${book.surface}&page=${book.page}`, { waitUntil: "domcontentloaded" });
        const source = page.locator(book.source);
        await source.waitFor();
        await page.waitForFunction(value => document.documentElement.getAttribute("data-theme-preset") === value, theme);
        assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${book.page}&`));
        assert.equal(await page.locator("canvas").count(), 0, "3D remains opt-in");
        if (book.surface === "ahavat-torah-system") {
          const frame = source.locator("[data-book-pdf-frame]");
          const toggle = source.getByRole("button", { name: "תצוגת ספר", exact: true });
          assert.equal(await frame.getAttribute("data-book-presentation"), "book");
          await frame.locator("iframe").evaluate(element => { window.bookPresentationSource = element; });
          await toggle.focus(); await page.keyboard.press("Enter");
          assert.equal(await toggle.getAttribute("aria-pressed"), "false");
          assert.equal(await frame.getAttribute("data-book-presentation"), "straight");
          assert.equal(await frame.locator("iframe").evaluate(element => element === window.bookPresentationSource), true, "presentation does not reload or replace the source");
          await toggle.click();
          assert.equal(await toggle.getAttribute("aria-pressed"), "true");
          assert.equal(await frame.locator(".ahavat29-book-page-edges").getAttribute("aria-hidden"), "true");
          assert.equal(await frame.locator("iframe").evaluate(element => getComputedStyle(element).transform), "none", "source text is never perspective-distorted");
          const sourceBox = await frame.boundingBox(), pdfBox = await frame.locator("iframe").boundingBox();
          assert.ok(pdfBox.x > sourceBox.x && pdfBox.width > sourceBox.width * .85, "book depth is visible but leaves at least 85% of source width readable");
          assert.match(await frame.locator("iframe").getAttribute("src"), new RegExp(`#page=${book.page}&`));
          await source.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${out}/ahavat-book-${width}-${theme}.png` });
        }
        if (width === 1440) {
          const nav = page.getByRole("navigation", { name: "רוחב הקריאה במחשב" });
          const balancedWidth = (await source.boundingBox()).width;
          const story = page.locator(`${book.layout} > div`).first();
          assert.ok((await source.boundingBox()).x > (await story.boundingBox()).x, "source is on the right in RTL");
          if (book.surface === "ahavat-torah-system") {
            const map = page.locator(".ahavat29-map");
            for (const card of await map.locator(".ahavat29-orbit > button").all()) {
              const box = await card.boundingBox(), parent = await map.boundingBox();
              assert.ok(box.x >= parent.x && box.x + box.width <= parent.x + parent.width, "book map cards remain inside the reading column");
            }
          }
          assert.ok(balancedWidth > 420, `${book.surface}/${theme} PDF should exceed the former 420px cap: ${balancedWidth}`);
          const button = nav.getByRole("button", { name: "מקור רחב" });
          await button.focus(); await page.keyboard.press("Enter");
          assert.equal(await button.getAttribute("aria-pressed"), "true");
          assert.ok((await source.boundingBox()).width > balancedWidth, "source-wide mode increases source width");
          assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${book.page}&`));
          await nav.getByRole("button", { name: "מקור והסבר" }).click();
          await source.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${out}/${book.surface}-${theme}-1440.png` });
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true, `${book.surface}/${width}/${theme} overflow`);
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`${book.surface} ${width}/${theme}: passed`);
      }
    }
  } finally { await browser.close(); await server.close(); }
});

const nativeSources = [
  { surface: "ahavat-torah-system", path: "/tmp/books-wide-ahavat-source-20261028.pdf", source: "#ahavat29-source", pages: 99, hash: "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b" },
  { surface: "sefer-yetzirah-world", path: "/tmp/books-wide-yetzirah-source-20261028.pdf", source: "#yetzirah29-source", pages: 220, hash: "2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a" },
];

test("native PDFs remain readable in the wider desktop layout", { skip: !available || nativeSources.some(item => !existsSync(item.path)), timeout: 120_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
  try {
    for (const book of nativeSources) {
      const bytes = readFileSync(book.path);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), book.hash);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${origin}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) return route.fulfill({ status: 200, contentType: "application/pdf", body: bytes, headers: { "content-disposition": "inline", "access-control-allow-origin": "*" } });
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(`${origin}/2029/control?surface=${book.surface}&page=6`, { waitUntil: "domcontentloaded" });
      const source = page.locator(book.source);
      await source.waitFor();
      await source.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `/tmp/books-wide-dual-experience-20261028/${book.surface}-native-before-fullscreen-1440.png` });
      await source.getByRole("button", { name: "מסך מלא", exact: true }).click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      if (book.surface === "ahavat-torah-system") {
        assert.equal(await source.locator(".ahavat29-book-page-edges").isVisible(), false);
        assert.equal(await source.locator("[data-book-pdf-frame]").evaluate(element => getComputedStyle(element).padding), "0px");
      }
      let nativePages = null;
      for (let attempt = 0; attempt < 100 && nativePages !== book.pages; attempt++) {
        for (const frame of page.frames()) {
          try { nativePages = await frame.evaluate(() => document.querySelector("pdf-viewer")?.documentDimensions?.pageDimensions?.length || null) || nativePages; } catch { /* cross-origin frame */ }
        }
        if (nativePages !== book.pages) await page.waitForTimeout(250);
      }
      assert.equal(nativePages, book.pages, "actual Chromium PDF viewer exposes all source pages");
      await source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }).click();
      if (book.surface === "ahavat-torah-system") {
        await page.waitForFunction(() => !document.fullscreenElement);
        assert.equal(await source.locator(".ahavat29-book-page-edges").isVisible(), true);
      }
      assert.match(await source.locator("iframe").getAttribute("src"), /#page=6&/);
      await source.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `/tmp/books-wide-dual-experience-20261028/${book.surface}-native-pdf-1440.png` });
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});
