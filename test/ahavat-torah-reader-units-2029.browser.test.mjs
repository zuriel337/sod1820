import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Same lightweight-checkout convention as the full reader suite. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && reactPlugin && existsSync(executablePath));

test("Books entry and exact source-unit return survive search/reload in 320/390/1440 × all three presets", { skip: !available, timeout: 180_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root: ROOT, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [reactPlugin()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    // Presets use isolated contexts and never activate WebGL. Run three at a
    // time within each viewport; retain every assertion and the original budget.
    for (const width of [320, 390, 1440]) await Promise.all(["light", "parchment", "dark"].map(async preset => {
      console.log(`Reader units ${width}/${preset}: start`);
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => {
        if (location.protocol !== "http:" || location.hostname !== "127.0.0.1") return;
        localStorage.setItem("sod-theme", value);
        // Observe the effect boundary without delaying, replacing or retrying a
        // request. A cancelled fetch may never reach Playwright's route layer.
        window.__ahavatRootFetchAttempts = [];
        const original = window.fetch;
        window.fetch = function(input, init) {
          const href = typeof input === 'string' ? input : input?.url || input?.href;
          if (href && new URL(href, location.href).pathname === '/book-data/ahavat-torah.roots.json') {
            const signal = init?.signal || input?.signal, attempt = {aborted: Boolean(signal?.aborted), fulfilled: false, responseOk: false};
            window.__ahavatRootFetchAttempts.push(attempt);
            signal?.addEventListener('abort', () => { attempt.aborted = true; }, {once: true});
            return Reflect.apply(original, this, arguments).then(response => {
              attempt.fulfilled = true; attempt.responseOk = response.ok;
              return response;
            });
          }
          return Reflect.apply(original, this, arguments);
        };
      }, preset);
      let rootRequests = 0;
      await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        const url = new URL(route.request().url());
        if (url.origin === base && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname === "/book-data/ahavat-torah.roots.json") rootRequests++;
        // Navigation fixture tests UI state and exact iframe/external URL, not
        // Chrome's native PDF renderer or a new hosted Preview.
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/v1/") ? JSON.stringify({ user: null, session: null }) : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const click = async target => { await target.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" })); await target.click(); };
      const assertFit = async () => {
        assert.equal(await page.locator("html").getAttribute("data-theme-preset"), preset);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true, `${width}/${preset}: overflow`);
        assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0, "3D is never enabled by refresh/deep links");
      };
      const assertUnitEntry = async (id, sourcePage) => {
        const unit = page.locator(`[data-reader-unit="${id}"]`);
        await unit.waitFor();
        await page.waitForFunction(unitId => {
          const target = [...document.querySelectorAll("[data-reader-unit]")].find(element => element.dataset.readerUnit === unitId);
          const top = target?.getBoundingClientRect().top;
          return top >= 70 && top <= 110;
        }, id);
        assert.match(await ahavatSourceHref(page.locator("#ahavat29-source")), new RegExp(`#page=${sourcePage}&view=FitH$`));
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
        await assertFit();
        return unit;
      };

      // This Preview route mounts Books2029Page and its existing unified reader;
      // enter the adopted book experience through that reader, not a new hub.
      await page.goto(`${base}/2029/control?surface=books-unified-reader&book=ahavat-torah`, { waitUntil: "domcontentloaded" });
      await page.locator(".book-reader29").waitFor();
      const unifiedPdf = page.getByRole("link", { name: /קרא את ה־PDF/ });
      assert.equal(await unifiedPdf.count(), 1);
      assert.ok((await unifiedPdf.boundingBox()).height >= 44);
      await click(page.getByRole("link", { name: /פתח את מערכת אהבת תורה/ }));
      const people = page.locator("#ahavat29-people");
      await people.locator("tbody tr").first().waitFor();
      assert.equal(rootRequests, 0, "roots stay lazy through ordinary Books entry");
      await assertFit();
      const peopleSearch = people.getByRole("searchbox", { name: "חיפוש באנשים ובייחוסים" });
      await peopleSearch.fill("יעקב");
      await click(people.getByRole("button", { name: "פעמים", exact: true }));
      const jacob = people.locator('[data-reader-unit="people:bereshit:37"]');
      await click(jacob.getByRole("button", { name: "PDF 27", exact: true }));
      const source = page.locator("#ahavat29-source");
      const returnLink = source.getByRole("link", { name: /חזור ליחידת הקריאה/ });
      assert.equal(new URL(page.url()).searchParams.get("peopleQuery"), "יעקב");
      assert.equal(new URL(page.url()).searchParams.get("peopleMetric"), "times");
      await click(source.getByRole("button", { name: "לעמוד הבא", exact: true }));
      assert.match(await ahavatSourceHref(source), /#page=28&view=FitH$/);
      assert.equal(new URL(await returnLink.getAttribute("href"), base).searchParams.get("page"), "27");
      await click(returnLink);
      await assertUnitEntry("people:bereshit:37", 27);
      assert.equal(await peopleSearch.inputValue(), "יעקב");
      assert.equal(await people.getByRole("button", { name: "פעמים", exact: true }).getAttribute("aria-pressed"), "true");
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertUnitEntry("people:bereshit:37", 27);
      assert.equal(await peopleSearch.inputValue(), "יעקב");
      assert.equal(rootRequests, 0);

      // The link itself explicitly opens the lazy columns; a normal page load
      // does not. The correct left-column target must wait for the asset.
      await page.goto(`${base}${ahavatReaderUnitHref("roots:35:left")}`, { waitUntil: "domcontentloaded" });
      const column = await assertUnitEntry("roots:35:left", 35);
      const attempts = await page.evaluate(() => window.__ahavatRootFetchAttempts);
      assert.equal(attempts.length, 2, "development StrictMode starts the exact two expanded-reader fetch attempts");
      assert.equal(attempts[0].aborted, true, "StrictMode cleanup cancels the first effect");
      assert.equal(attempts[0].fulfilled, false, "the cancelled first attempt never provided source data");
      assert.equal(attempts[1].fulfilled, true, "the second fetch resolved before ready-state effect cleanup");
      assert.equal(attempts[1].responseOk, true, "the successful source response is followed by the validated column rendered above");
      assert.ok(rootRequests >= 1 && rootRequests <= 2, "only the cancelled request may be absent at the transport boundary");
      assert.match(await column.locator(".ahavat29-ds01-guide").textContent(), /הסבר נלווה:.*ברכת משה/);
      const rootsSearch = page.getByRole("searchbox", { name: "חיפוש ברשימת השרשים" });
      await rootsSearch.fill("שחקים");
      await click(column.getByRole("button", { name: "מקור הרשימה · PDF 35", exact: true }));
      await page.reload({ waitUntil: "domcontentloaded" });
      await column.waitFor();
      assert.equal(await rootsSearch.inputValue(), "שחקים");
      assert.equal(await page.locator("#ahavat29-roots article").count(), 1);
      await click(source.getByRole("link", { name: /חזור ליחידת הקריאה/ }));
      await assertUnitEntry("roots:35:left", 35);
      assert.equal(await rootsSearch.inputValue(), "שחקים");
      if (width === 390 && preset === "light") {
        const conflicting = new URL(ahavatReaderUnitHref("roots:35:left"), base);
        conflicting.searchParams.set("rootsQuery", "לאנמצאבספראיזהטקסט");
        await page.goto(conflicting.href, { waitUntil: "domcontentloaded" });
        await assertUnitEntry("roots:35:left", 35);
        assert.equal(await rootsSearch.inputValue(), "", "a conflicting restored query cannot hide an exact column link");
      }

      await page.goto(`${base}${ahavatReaderUnitHref("scrolls:esther:ף")}`, { waitUntil: "domcontentloaded" });
      const finalPe = await assertUnitEntry("scrolls:esther:ף", 43);
      const scrollSearch = page.getByRole("searchbox", { name: "חיפוש בטבלת המגילות" });
      await scrollSearch.fill("ף");
      await click(finalPe.getByRole("button", { name: "PDF 43", exact: true }));
      await page.reload({ waitUntil: "domcontentloaded" });
      await finalPe.waitFor();
      assert.equal(await scrollSearch.inputValue(), "ף");
      await click(source.getByRole("link", { name: /חזור ליחידת הקריאה/ }));
      await assertUnitEntry("scrolls:esther:ף", 43);
      assert.equal(await scrollSearch.inputValue(), "ף");
      const readPdf = source.getByRole("link", { name: /קרא את ה־PDF · עמוד 43/ });
      await readPdf.scrollIntoViewIfNeeded();
      assert.ok((await readPdf.boundingBox()).height >= 44);
      assert.match(await readPdf.getAttribute("href"), /#page=43&view=FitH$/);
      await assertFit();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`Reader units ${width}/${preset}: passed`);
    }));
  } finally { await browser.close(); await server.close(); }
});
