import { ahavatRequestedSourceHref as ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ahavatReaderUnitHref, ahavatLetterUnitId } from "../src/data/ahavatTorahReaderUnits2029.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const root = fileURLToPath(new URL("..", import.meta.url));
const out = "/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-centered-actions-2029";
const selectors = [
  ".ahavat29-intro .books29-entry-actions",
  ".ahavat29-ds01-controls",
  ".ahavat29-source-actions",
  ".ahavat29-reader>footer",
  ".ahavat29-finding-detail>footer",
  ".ahavat29-letter-comparison-actions",
  ".ahavat29-letter-comparison>footer",
  ".ahavat29-letter-journey",
];

async function click(locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await locator.click();
}

async function centeredActions(page, expectedSelectors) {
  const rows = await page.locator(selectors.join(",")).evaluateAll((elements, knownSelectors) => elements.filter(element => element.getBoundingClientRect().height && element.getBoundingClientRect().width).map(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    const center = (rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) + rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)) / 2;
    const children = [...element.children].filter(child => child.getBoundingClientRect().width && child.getBoundingClientRect().height);
    const lines = [];
    for (const child of children) {
      const box = child.getBoundingClientRect(), midY = (box.top + box.bottom) / 2;
      let line = lines.find(item => Math.abs(item.midY - midY) < 2);
      if (!line) { line = { midY, left: box.left, right: box.right }; lines.push(line); }
      line.left = Math.min(line.left, box.left); line.right = Math.max(line.right, box.right);
    }
    return {
      selector: element.className || element.tagName,
      matches: knownSelectors.filter(selector => element.matches(selector)),
      justify: style.justifyContent,
      lines: lines.map(line => Math.abs((line.left + line.right) / 2 - center)),
      controls: children.filter(child => child.matches("button,a")).map(child => {
        const box = child.getBoundingClientRect(), css = getComputedStyle(child);
        return { label: child.textContent.trim(), width: box.width, height: box.height, text: css.textAlign, wrap: css.whiteSpace, font: parseFloat(css.fontSize) };
      }),
    };
  }), selectors);
  for (const selector of expectedSelectors) assert.ok(rows.some(row => row.matches.includes(selector)), `missing action row ${selector}`);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(row.justify, "center", row.selector);
    for (const error of row.lines) assert.ok(error <= 1.5, `${row.selector}: flex line is ${error}px off center`);
    for (const control of row.controls) {
      assert.ok(control.width >= 44 && control.height >= 44, `${row.selector}: ${control.label} target ${control.width}×${control.height}`);
      assert.equal(control.text, "center", control.label);
      assert.equal(control.wrap, "normal", control.label);
      assert.ok(control.font >= 16, control.label);
    }
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "horizontal page overflow");
  assert.equal(await page.locator("main.ahavat29").evaluate(element => getComputedStyle(element).direction), "rtl");
  assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0, "centering does not open a renderer");
  return rows;
}

test("Ahavat action rows and labels center without centering source prose, breaking wrap or losing exact return", { timeout: 480_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-centered-actions-2029${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const results = [];
  mkdirSync(out, { recursive: true });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      // This geometry/interaction matrix mocks services/UI fonts and renders the exact original PDF.
      // Independent 99-page raster acceptance proves the physical source; an anchor alone is not acceptance.
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin && url.pathname === "/2029/control" && route.request().isNavigationRequest()) {
          const response = await context.request.get(`${origin}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system`, { waitUntil: "domcontentloaded" });
      const entry = page.getByRole("navigation", { name: "מאיפה מתחילים ללמוד", exact: true });
      await entry.waitFor();
      const entryRows = await centeredActions(page, [selectors[0], selectors[1], selectors[2], selectors[3]]);
      assert.notEqual(await page.locator(".ahavat29-intro>div>p").evaluate(element => getComputedStyle(element).textAlign), "center");
      await page.locator(".ahavat29-intro").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/entry-${width}-${theme}.png` });

      const id = "ahavat-novellae-p046-02";
      await click(entry.getByRole("link", { name: "אותיות ובניית בית", exact: true }));
      const lesson = page.locator(`[data-reader-unit="${id}"]`);
      await lesson.waitFor();
      assert.notEqual(await lesson.locator("p").first().evaluate(element => getComputedStyle(element).textAlign), "center");
      await centeredActions(page, [selectors[1], selectors[2]]);
      const openSource = lesson.getByRole("button", { name: "פתח מקור היחידה · PDF 46", exact: true });
      await click(openSource);
      assert.match(await ahavatSourceHref(page.locator("#ahavat29-source")), /#page=46&view=FitH$/);
      const returnLink = page.locator("#ahavat29-source").getByRole("link", { name: "חזור ליחידת הקריאה", exact: true });
      await centeredActions(page, [selectors[2]]);
      await returnLink.focus(); await page.keyboard.press("Enter");
      await page.waitForFunction(unit => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === unit, id);
      await page.reload({ waitUntil: "domcontentloaded" }); await lesson.waitFor();
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
      assert.equal(await lesson.evaluate(element => element.open), true);
      await centeredActions(page, [selectors[1], selectors[2]]);

      const letter = ahavatLetterUnitId("ד", "vayikra", "צו");
      await page.goto(`${origin}${ahavatReaderUnitHref(letter, "/2029/control?study=letters&letterComparison=open&letterComparisonFrom=צו&letterComparisonTo=בראשית")}`, { waitUntil: "domcontentloaded" });
      await page.locator(".ahavat29-letter-comparison-actions").waitFor();
      const letterRows = await centeredActions(page, [selectors[1], selectors[2], selectors[5], selectors[6], selectors[7]]);
      await page.locator(".ahavat29-letter-comparison").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/letters-${width}-${theme}.png` });

      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&finding=divine-name-1820&page=6`, { waitUntil: "domcontentloaded" });
      await page.locator("#ahavat29-finding-detail").waitFor();
      await centeredActions(page, [selectors[4]]);
      assert.deepEqual(errors, []);
      results.push({ width, theme, status: "PASS", entryRows: entryRows.length, letterRows: letterRows.length, exactSourceReturn: true, keyboardReturn: true, reload: true, servicesMocked: true, pdfAborted: false, uiFontsAborted: true, physicalDevice: false });
      writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + "\n");
      console.log(`Centered actions ${width}/${theme}: PASS`);
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});
