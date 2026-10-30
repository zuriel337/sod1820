import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { AHAVAT_PUBLIC_READING_EDITS } from "./fixtures/ahavat-public-reading-baseline-2029.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const root = fileURLToPath(new URL("..", import.meta.url));
const bundle = JSON.parse(readFileSync(new URL("../public/book-data/ahavat-torah.commentary.json", import.meta.url)));
const out = "/tmp/ahavat-public-reading-browser-20261030";
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function click(target) {
  await target.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await settle(target.page());
  await target.click();
}

test("public book entry and all edited lessons preserve source, details and return in nine reader contexts", { timeout: 480_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const results = [];
  mkdirSync(out, { recursive: true });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      // Copy/interaction matrix only. Native original-PDF acceptance is separate.
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
      const page = await context.newPage();
      const errors = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system`, { waitUntil: "domcontentloaded" });
      const entry = page.getByRole("navigation", { name: "מאיפה מתחילים ללמוד", exact: true });
      await entry.waitFor();
      assert.deepEqual(await page.locator(".ahavat29-metrics strong").allTextContents(), ["99", "98", "267", "98", "13"]);
      assert.equal(await page.locator(".ahavat29-pipeline").isVisible(), false);
      assert.doesNotMatch(await page.locator("main.ahavat29").innerText(), /מפת עבודה|המערכת שאנחנו בונים|השלב הבא למאגר הזה|arithmetic_verified|cross_validated/);
      assert.equal(await page.locator("canvas").count(), 0);
      assert.equal(await entry.locator("a").count(), 3);
      for (const [name, id] of [["להבין את מניין 1,820", "ahavat-migdal-p006-01"], ["אותיות ובניית בית", "ahavat-novellae-p046-02"], ["אסתר והאחריות לפעול", "ahavat-novellae-p093-03"]]) {
        assert.equal(await entry.getByRole("link", { name, exact: true }).getAttribute("href"), ahavatReaderUnitHref(id));
      }
      const starts = await entry.getByRole("link", { name: "אסתר והאחריות לפעול", exact: true }).boundingBox();
      assert.ok(starts.width >= 44 && starts.height >= 44);
      await click(entry.getByRole("link", { name: "אסתר והאחריות לפעול", exact: true }));
      const lesson = page.locator('[data-reader-unit="ahavat-novellae-p093-03"]');
      await lesson.waitFor();
      assert.equal(await lesson.evaluate(element => element.open), true);
      assert.match(await lesson.innerText(), /הקושיה:.*מה משיב מרדכי/s);
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=93&view=FitH$/);
      await page.reload({ waitUntil: "domcontentloaded" }); await lesson.waitFor();
      assert.equal(await lesson.evaluate(element => element.open), true);

      for (const edit of AHAVAT_PUBLIC_READING_EDITS) {
        await page.goto(`${origin}${ahavatReaderUnitHref(edit.id)}`, { waitUntil: "domcontentloaded" });
        const unit = page.locator(`[data-reader-unit="${edit.id}"]`);
        await unit.waitFor();
        assert.ok((await unit.innerText()).includes(edit.after), edit.id);
        assert.equal(await unit.evaluate(element => element.open), true);
        const expected = bundle.pages[edit.page - 1].companion_units.find(unit => unit.id === edit.id);
        assert.ok((await unit.innerText()).includes(expected.title));
        await click(unit.getByRole("button", { name: `פתח מקור היחידה · PDF ${edit.page}`, exact: true }));
        const source = page.locator("#ahavat29-source");
        assert.match(await source.locator("iframe").getAttribute("src"), new RegExp(`#page=${edit.page}&view=FitH$`));
        await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
        await page.waitForFunction(id => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === id, edit.id);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"), edit.id);
        assert.equal(await page.locator("canvas").count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&finding=divine-name-1820&page=6`, { waitUntil: "domcontentloaded" });
      const finding = page.locator("#ahavat29-finding-detail"); await finding.waitFor();
      assert.equal((await finding.innerText()).includes("arithmetic_verified"), false);
      await click(finding.getByText("פרטי המקור והבדיקה", { exact: true }));
      assert.ok((await finding.innerText()).includes("arithmetic_verified"), "technical provenance remains available explicitly");
      const pipeline = page.getByText("פרטי המקור ומצב המחקר", { exact: true });
      await click(pipeline); await page.locator(".ahavat29-pipeline").waitFor();
      assert.match(await page.locator(".ahavat29-pipeline").innerText(), /15 עמודי קריאת המקור/);
      assert.match(await page.locator(".ahavat29-pipeline").innerText(), /ממצאים ציבוריים/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []);
      if (theme === "parchment") {
        await page.goto(`${origin}/2029/control?surface=ahavat-torah-system`, { waitUntil: "domcontentloaded" });
        await page.locator(".ahavat29-intro").waitFor();
        await page.screenshot({ path: `${out}/entry-${width}-${theme}.png` });
      }
      results.push({ width, theme, status: "PASS", lessonEntry: true, editedLessons: 8, exactSourceReturn: true, noAutomaticGpu: true, noOverflow: true, servicesMocked: true, pdfAborted: true, physicalDevice: false });
      writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + "\n");
      console.log(`Public reading ${width}/${theme}: PASS`);
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});
