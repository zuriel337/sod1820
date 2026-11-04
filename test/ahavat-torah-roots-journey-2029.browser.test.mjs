import { ahavatRequestedSourceHref as ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { AHAVAT_ROOT_COLUMNS } from "../src/data/ahavatTorahRoots2029.js";

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

test("roots read continuously through all ten columns with exact source, focus, reload and return", { skip: !available, timeout: 180_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, cacheDir: `/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-torah-roots-journey-2029${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
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
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&readerUnit=roots%3A31%3Aright&rootsOpen=1&rootsPage=31&page=31`, { waitUntil: "domcontentloaded" });
      const source = page.locator("#ahavat29-source");
      const column = id => page.locator(`[data-reader-unit="${id}"]`);
      await column("roots:31:right").waitFor();
      assert.equal(await column("roots:31:right").getByRole("button", { name: "הטור הקודם", exact: true }).isDisabled(), true);
      await source.getByRole("button", { name: "תצוגת ספר", exact: true }).click();
      const search = page.getByRole("searchbox", { name: "חיפוש ברשימת השרשים", exact: true });
      await search.fill("על פני ההום");
      for (let index = 1; index < AHAVAT_ROOT_COLUMNS.length; index++) {
        const previous = AHAVAT_ROOT_COLUMNS[index - 1], next = AHAVAT_ROOT_COLUMNS[index];
        await column(previous.id).getByRole("button", { name: "המשך לטור הבא", exact: true }).click();
        await page.waitForFunction(id => document.activeElement?.getAttribute("data-reader-unit") === id, next.id);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), next.id);
        assert.equal(new URL(page.url()).searchParams.get("page"), String(next.page));
        assert.equal(await search.inputValue(), "", "explicit continuation leaves the search filter");
        assert.match(await ahavatSourceHref(source), new RegExp(`#page=${next.page}&view=FitH$`));
        assert.equal(await source.locator("[data-book-pdf-frame]").getAttribute("data-book-presentation"), "straight", "reading navigation retains the chosen source presentation");
      }
      const last = column("roots:35:left");
      assert.equal(await last.getByRole("button", { name: "המשך לטור הבא", exact: true }).isDisabled(), true);
      await last.getByRole("button", { name: "הטור הקודם", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute("data-reader-unit") === "roots:35:right");
      await page.reload({ waitUntil: "domcontentloaded" });
      await column("roots:35:right").waitFor();
      await column("roots:35:right").getByRole("button", { name: "מקור הרשימה · PDF 35", exact: true }).click();
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), "roots:35:right");
      assert.match(await source.getByRole("link", { name: /קרא את ה־PDF/ }).getAttribute("href"), /#page=35&view=FitH$/);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`continuous roots ${width}: passed`);
    }
  } finally { await browser.close(); await server.close(); }
});
