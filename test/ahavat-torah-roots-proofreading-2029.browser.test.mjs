import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { ahavatReviewedRootFragments } from "../src/data/ahavatTorahRootsCorrections2029.js";
import { ahavatNativePdfPageAtStart } from "./fixtures/ahavat-native-pdf-page-2029.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = createRequire(import.meta.url)("playwright");
const fragments = ahavatReviewedRootFragments(JSON.parse(readFileSync(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url))));
const sourcePath = process.env.AHAVAT_SOURCE_PDF || "/tmp/books-wide-ahavat-source-20261028.pdf";
const sourceBytes = existsSync(sourcePath) ? readFileSync(sourcePath) : null;
const screenshotDir = "/tmp/ahavat-roots-proofreading-20261029";
mkdirSync(screenshotDir, { recursive: true });
const click = async target => {
  await target.focus();
  await target.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await target.click();
};
const entry = (fragment, extra = "") => `/2029/control?surface=ahavat-torah-system&rootsOpen=1&rootsPage=${fragment.pdf_page}&page=${fragment.pdf_page}&readerUnit=${encodeURIComponent(fragment.id)}${extra}`;

async function setup(width, theme, pdf = false) {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
      const response = await context.request.get(`${origin}/2029.html`);
      return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
    }
    if (url.pathname.endsWith("Hebrewbooks_org_5635.pdf") && pdf) return route.fulfill({ status: 200, contentType: "application/pdf", body: sourceBytes, headers: { "content-disposition": "inline", "access-control-allow-origin": "*" } });
    if (url.pathname.endsWith(".pdf") || url.pathname.startsWith("/functions/") || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  return { page, origin, errors, close: async () => { await context.close(); await browser.close(); await server.close(); } };
}

for (const width of [320, 390, 1440]) test(`all ten source proofreading columns preserve evidence/search/return in three themes at ${width}`, { timeout: 240_000 }, async () => {
  for (const theme of ["light", "parchment", "dark"]) {
    const fixture = await setup(width, theme);
    const { page, origin, errors } = fixture;
    try {
      for (const fragment of fragments) {
        await page.goto(`${origin}${entry(fragment)}`, { waitUntil: "domcontentloaded" });
        const unit = page.locator(`[data-reader-unit="${fragment.id}"]`);
        const source = page.locator("#ahavat29-source");
        const search = page.getByRole("searchbox", { name: "חיפוש ברשימת השרשים", exact: true });
        await unit.locator("pre").waitFor();
        assert.equal(await unit.locator("pre").textContent(), fragment.text);
        assert.equal(await unit.locator("[data-root-reading]").count(), 0, "comparison records are not mounted eagerly");
        const reading = fragment.readingDetails.at(-1);
        for (const query of [reading.before, reading.after]) {
          await search.fill(query);
          await unit.waitFor();
          assert.equal(new URL(page.url()).searchParams.get("rootsQuery"), query);
        }
        await click(unit.getByText("תעתיק המכונה המקורי ופרטי ההגהה", { exact: true }));
        assert.ok((await unit.textContent()).includes(fragment.originalOcr));
        await click(unit.getByText(`השוואת תיקוני הקריאה למקור · ${fragment.readingDetails.length}`, { exact: true }));
        await unit.locator("[data-root-reading]").last().waitFor();
        const actual = await unit.locator("[data-root-reading]").evaluateAll(rows => rows.map(row => ({ id: row.dataset.rootReading, state: row.dataset.rootReadingState, before: row.querySelector("del").textContent, after: row.querySelector("ins").textContent, button: row.querySelector("button").textContent })));
        assert.deepEqual(actual, fragment.readingDetails.map(detail => ({ id: detail.id, state: detail.supersededBy ? "withdrawn" : detail.restoresReadingId ? "restoration" : "current", before: detail.before, after: detail.after, button: `מקור התיקון · PDF ${detail.pdfPage}` })));
        for (const detail of [fragment.readingDetails[0], fragment.readingDetails.at(-1)]) {
          await click(unit.locator(`[data-root-reading="${detail.id}"]`).getByRole("button"));
          assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${fragment.pdf_page}&view=FitH$`));
          assert.equal(new URL(page.url()).searchParams.get("readerUnit"), fragment.id);
          await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
          await page.waitForFunction(id => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === id, fragment.id);
        }
        await click(unit.getByText("מוקדים שנותרו להגהה", { exact: true }));
        for (const open of fragment.openReadings) assert.ok((await unit.textContent()).includes(open.reading ?? open.originalOcr));
        await click(unit.getByText(`קריאה חוזרת במוקדים שנבדקו · ${fragment.windowReviews.length}`, { exact: true }));
        await unit.locator("[data-root-window-review]").last().waitFor();
        assert.deepEqual(await unit.locator("[data-root-window-review]").evaluateAll(rows => rows.map(row => row.dataset.rootWindowReview)), fragment.windowReviews.map(review => review.id));
        for (const review of fragment.windowReviews) {
          const row = unit.locator(`[data-root-window-review="${review.id}"]`);
          assert.ok((await row.textContent()).includes(review.displayStatus));
          assert.ok((await row.textContent()).includes(review.explanation));
          await click(row.getByRole("button", { name: `מקור הקריאה החוזרת · PDF ${review.pdfPage}`, exact: true }));
          assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${review.pdfPage}&view=FitH$`));
          await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
          await page.waitForFunction(id => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === id, fragment.id);
        }
        assert.equal(await page.locator("html").getAttribute("data-theme-preset"), theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true, `${width}/${theme}/${fragment.id}: expanded overflow`);
        if (fragment.id === "roots:31:right" && theme === "parchment") await unit.screenshot({ path: `${screenshotDir}/review-${width}.png` });
        await page.reload({ waitUntil: "domcontentloaded" });
        await unit.locator("pre").waitFor();
        assert.equal(await search.inputValue(), reading.after);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), fragment.id);
        assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${fragment.pdf_page}&view=FitH$`));
        assert.equal(await page.locator("canvas").count(), 0);
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, theme, columns: 10, comparedReadings: 280, windowReviews: 12, sourceReturns: 32, reloads: 10, pdf: "fixture_aborted", status: "pass" }));
    } finally { await fixture.close(); }
  }
});

async function nativePage(page, physical) {
  let lastSnapshot = null;
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const frame of page.frames()) try {
      const snapshot = await frame.evaluate(expected => {
        const viewer = document.querySelector("pdf-viewer");
        const viewport = viewer?.viewport_;
        if (!viewer || !viewport?.getPageScreenRect || !viewer.documentDimensions) return null;
        return { loadState: viewer.loadState_, documentPages: viewer.documentDimensions.pageDimensions?.length, pageIndex: expected - 1, viewportHeight: viewport.size.height, requestedRect: viewport.getPageScreenRect(expected - 1), previousRect: expected > 1 ? viewport.getPageScreenRect(expected - 2) : null };
      }, physical);
      if (snapshot) lastSnapshot = snapshot;
      if (ahavatNativePdfPageAtStart(snapshot, physical)) return;
    } catch { /* The PDF's frame can be replaced during a page transition. */ }
    await page.waitForTimeout(100);
  }
  console.log(JSON.stringify({ nativeFailure: true, physical, lastSnapshot }));
  await page.screenshot({ path: `${screenshotDir}/native-failure.png` });
  assert.fail(`actual native PDF did not select physical page ${physical}`);
}

// No native acceptance is claimed in a lightweight environment without the
// hash-matched PDF witness. Full checkpoint acceptance requires zero skips.
test("actual 99-page PDF opens all five roots pages and returns from fullscreen in nine display contexts", { skip: !sourceBytes, timeout: 300_000 }, async () => {
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
    const fixture = await setup(width, theme, true);
    const { page, origin, errors } = fixture;
    try {
      for (const fragment of fragments.filter(item => item.column === "right")) {
        await page.goto(`${origin}${entry(fragment)}`, { waitUntil: "domcontentloaded" });
        const unit = page.locator(`[data-reader-unit="${fragment.id}"]`), source = page.locator("#ahavat29-source");
        await unit.locator("pre").waitFor();
        await click(unit.getByRole("button", { name: `מקור הרשימה · PDF ${fragment.pdf_page}`, exact: true }));
        await nativePage(page, fragment.pdf_page);
      }
      const last = fragments.find(item => item.id === "roots:35:right"), source = page.locator("#ahavat29-source");
      await click(source.getByRole("button", { name: "מסך מלא", exact: true }));
      await nativePage(page, 35);
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
      await click(source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }));
      await page.waitForFunction(() => !document.fullscreenElement);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
      await page.waitForFunction(id => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === id, last.id);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit), last.id);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.equal(await page.locator("canvas").count(), 0);
      assert.deepEqual(errors, []);
      if (theme === "parchment") await source.screenshot({ path: `${screenshotDir}/native-pdf-35-${width}.png` });
      console.log(JSON.stringify({ width, theme, nativePages: [31,32,33,34,35], nativePageCount: 99, fullscreen: true, stableReturn: true, status: "pass" }));
    } finally { await fixture.close(); }
  }
});
