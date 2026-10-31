import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import test from "node:test";
import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage } from "./fixtures/ahavat-controlled-source-2029.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const out = process.env.AHAVAT_RESPONSIVE_OUT || `/tmp/ahavat-responsive-${process.pid}`;

test("both study modes preserve readable title/cover geometry and narrow desktop section headings", { timeout: 600_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, plugins: [react()], cacheDir: `/tmp/ahavat-responsive-vite-${process.pid}`, logLevel: "error", appType: "mpa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  mkdirSync(out, { recursive: true });
  try {
    for (const theme of ["parchment", "light", "dark"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      await context.addInitScript(value => localStorage.setItem("sod-theme", value), theme);
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${origin}/2029.html`);
          return route.fulfill({ contentType: "text/html", body: await response.body() });
        }
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", e => errors.push(e.message));
      try {
        for (const mode of ["letters", "book"]) {
          await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&study=${mode}&page=36`);
          await page.locator(".ahavat29-cover img").evaluate(img => img.decode());
          await page.evaluate(() => document.fonts.ready);
          for (const width of [390, 320, 360, 650, 900, 901, 1023, 1024, 1100, 1440]) {
            await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
            await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
            const geometry = await page.locator(".ahavat29-intro").evaluate(el => {
              const t = el.querySelector("h1").getBoundingClientRect(), c = el.querySelector("figure").getBoundingClientRect();
              return { titleWidth: t.width, titleHeight: t.height, coverWidth: c.width, intersection: Math.min(t.right, c.right) - Math.max(t.left, c.left), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
            });
            assert.ok(geometry.titleWidth >= 140, `${theme}/${mode}/${width}: collapsed title ${JSON.stringify(geometry)}`);
            assert.ok(geometry.titleHeight < 230, `${theme}/${mode}/${width}: excessive title wrapping`);
            assert.ok(geometry.intersection <= 1, "cover must not consume the title column");
            assert.equal(geometry.overflow, false);
            assert.equal(await page.locator(".ahavat29-recommended").isVisible(), mode === "book");
            if ([390, 1024, 1440].includes(width)) await page.screenshot({ path: `${out}/entry-${mode}-${theme}-${width}.png` });
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole("navigation", { name: "מיקוד הלימוד" }).getByRole("button", { name: "לימוד אותיות", exact: true }).click();
        assert.ok((await page.locator("#ahavat29-title").boundingBox()).width >= 140);
        await page.getByRole("navigation", { name: "מיקוד הלימוד" }).getByRole("button", { name: "כל הספר", exact: true }).click();
        for (const width of [1024, 1100, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const layout of ["מקור והסבר", "מקור רחב"]) {
            await page.getByRole("navigation", { name: "רוחב הקריאה במחשב" }).getByRole("button", { name: layout, exact: true }).click();
            for (const id of ["map", "findings", "datasets", "spatial", "depth", "extraction"]) {
              const heading = page.locator(`#ahavat29-${id}-title`);
              await heading.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
              const g = await heading.evaluate(el => { const r = el.getBoundingClientRect(); return { width: r.width, lines: r.height / parseFloat(getComputedStyle(el).lineHeight) }; });
              assert.ok(g.width >= 140 && g.lines <= 6, `${theme}/${width}/${layout}/${id}: unreadable section ${JSON.stringify(g)}`);
              if (width === 1024 && layout === "מקור והסבר" && id === "spatial") await page.screenshot({ path: `${out}/sections-${theme}-${width}.png` });
            }
          }
        }
        await assertAhavatSourcePage(page.locator("#ahavat29-source"), 36);
        assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
        // Simulate a late layout shift after the previous 700ms quiet window.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.getByRole("link", { name: "למד עם ההסברים", exact: true }).click();
        await page.evaluate(() => {
          document.documentElement.style.overflowAnchor = "none";
          setTimeout(() => { const el = document.querySelector(".ahavat29-intro"); el.style.paddingBlockEnd = "900px"; }, 1200);
        });
        await page.waitForTimeout(2000);
        assert.ok(Math.abs(await page.locator("#ahavat29-full-reader").evaluate(el => el.getBoundingClientRect().top) - 92) <= 2, "late layout must preserve the chosen reading target");
        await page.evaluate(() => document.querySelector(".ahavat29-intro").style.removeProperty("padding-block-end"));
        // Real reader input wins over the temporary anchor tracking.
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(200);
        assert.ok(Math.abs(await page.locator("#ahavat29-full-reader").evaluate(el => el.getBoundingClientRect().top) - 92) > 100);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await server.close(); }
});
