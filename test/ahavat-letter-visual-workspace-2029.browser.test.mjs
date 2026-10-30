import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatNativePdfPageAtStart } from "./fixtures/ahavat-native-pdf-page-2029.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
const pdf = readFileSync("/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
const artifacts = "/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-letter-visual-workspace-2029";
mkdirSync(artifacts, { recursive: true });

async function nativePage(page, physical) {
  return assertAhavatSourcePage(page, physical);
}

test("focused letters workspace: real source, selection, reflow, source return and model in all nine presets/widths", { timeout: 480_000 }, async () => {
  assert.equal(createHash("sha256").update(pdf).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-letter-visual-workspace-2029${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        const url = new URL(route.request().url());
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${origin}/2029.html`);
          return route.fulfill({ contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) return route.fulfill({ contentType: "application/pdf", body: pdf, headers: { "content-disposition": "inline" } });
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&study=letters&page=35`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source");
      await reader.locator(".ahavat29-letter-study").waitFor();
      await nativePage(page, 35);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await reader.locator(".ahavat29-letter-alphabet button").count(), 28);
      for (const form of AHAVAT_LETTER_FORMS) assert.equal(await reader.locator(".ahavat29-letter-alphabet").getByRole("button", { name: form.name, exact: true }).count(), 1);
      assert.equal(await reader.locator(".ahavat29-letter-pillars button").count(), 5);
      await page.screenshot({ path: `${artifacts}/letters-${width}-${theme}.png` });
      if (width === 390 && theme === "parchment") {
        const unresolvedForm = AHAVAT_LETTER_FORMS.find(item => AHAVAT_LETTER_READINGS[item.form].some(book => book.count === null));
        assert.ok(unresolvedForm);
        await reader.locator(".ahavat29-letter-alphabet").getByRole("button", { name: unresolvedForm.name, exact: true }).click();
        const missing = reader.locator('.ahavat29-letter-pillars i[data-missing="true"]');
        assert.ok(await missing.count() > 0);
        assert.equal(await missing.evaluateAll(elements => elements.every(element => getComputedStyle(element).display === "none")), true, "an unavailable measurement must not look like a numeric column");
        assert.match(await reader.locator(".ahavat29-letter-pillars").textContent(), /לא נקרא/);
      }
      await reader.locator(".ahavat29-letter-alphabet").getByRole("button", { name: "דלת", exact: true }).click();
      const bookButton = reader.locator(".ahavat29-letter-pillars").getByRole("button").filter({ hasText: "ויקרא" });
      await bookButton.scrollIntoViewIfNeeded();
      const selectionScroll = await page.evaluate(() => scrollY);
      await bookButton.click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.ok(Math.abs((await page.evaluate(() => scrollY)) - selectionScroll) <= 2, "exploring a book must not scroll away to the PDF; its explicit source action does");
      assert.equal(await reader.locator(".ahavat29-letter-path").textContent(), "אות ד←ויקרא←10 פרשות");
      // Resolve through the existing source-native identity, never a local guessed DOM ID.
      const exactRow = reader.locator("tbody tr").filter({ hasText: "צו" }).filter({ hasText: "109" });
      await exactRow.getByRole("button", { name: "PDF 36", exact: true }).click();
      await nativePage(page, 36);
      await source.getByRole("button", { name: "לעמוד הבא", exact: true }).click();
      await nativePage(page, 37);
      await source.getByRole("button", { name: "לעמוד הקודם", exact: true }).click();
      await nativePage(page, 36);
      await source.getByRole("button", { name: "מסך מלא", exact: true }).click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await nativePage(page, 36);
      await source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get("study"), "letters");
      await page.reload({ waitUntil: "domcontentloaded" });
      await reader.locator(".ahavat29-letter-study").waitFor();
      assert.match(await reader.locator(".ahavat29-letter-path").textContent(), /ויקרא/);
      await nativePage(page, 36);
      const metrics = await reader.evaluate(element => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, glyphWeight: Number(getComputedStyle(element.querySelector(".ahavat29-letter-glyph")).fontWeight), smallestLetterName: Math.min(...Array.from(element.querySelectorAll(".ahavat29-letter-alphabet small"), el => parseFloat(getComputedStyle(el).fontSize))), targets: Array.from(element.querySelectorAll("button"), el => el.getBoundingClientRect()).filter(rect => rect.width && rect.height).every(rect => rect.width >= 43 && rect.height >= 43) }));
      assert.equal(metrics.overflow, false);
      assert.ok(metrics.glyphWeight <= 600);
      assert.ok(metrics.smallestLetterName >= 14);
      assert.equal(metrics.targets, true);
      const toggle = reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true });
      await toggle.click();
      await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
      await page.waitForFunction(() => document.querySelector("#ahavat29-letters canvas")?.getBoundingClientRect().height >= 290);
      await reader.locator(".ahavat29-letter-scene").scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${artifacts}/model-${width}-${theme}.png` });
      if (width === 1440 && theme === "dark") {
        await page.setViewportSize({ width: 390, height: 1000 });
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.ok((await reader.locator("canvas:not([data-book-pdf-canvas])").boundingBox()).width < 390);
        assert.match(await reader.locator(".ahavat29-letter-path").textContent(), /ויקרא/);
        await page.setViewportSize({ width, height: 1000 });
      }
      if (width === 390 && theme === "dark") {
        await reader.locator("canvas:not([data-book-pdf-canvas])").evaluate(canvas => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
        await reader.getByRole("status").filter({ hasText: "לא ניתן לפתוח את המבנה במכשיר הזה" }).waitFor();
        assert.equal(await reader.locator("tbody tr").count(), 10);
        assert.match(await reader.locator(".ahavat29-letter-path").textContent(), /ויקרא/);
      }
      await reader.getByRole("button", { name: "סגור מבנה האות בתלת־ממד", exact: true }).click();
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
      await page.getByRole("button", { name: "כל הספר", exact: true }).click();
      assert.equal(await page.locator("#ahavat29-counts").isVisible(), true);
      await page.getByRole("button", { name: "לימוד אותיות", exact: true }).click();
      assert.equal(await reader.isVisible(), true);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`letters visual + native PDF: ${width}/${theme} PASS`);
    }
  } finally { await browser.close(); await server.close(); }
});
