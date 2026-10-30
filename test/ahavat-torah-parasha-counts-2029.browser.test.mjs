import { ahavatRequestedSourceHref as ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional browser tooling in lightweight checkouts. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

test("DS-03/04 source counts, PDF boundaries, CSV, 3D and reload work at 320/390/1440", { skip: !available, timeout: 180_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  const server = await vite.createServer({ root: ROOT, configFile: false, cacheDir: `/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O/browser-output/ahavat-torah-parasha-counts-2029${process.pid}`, plugins: [reactPlugin()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === base && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/v1/") ? JSON.stringify({ user: null, session: null }) : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const click = async locator => {
        await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
        await locator.click();
      };
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/2029/control?surface=ahavat-torah-system&dataset=DS-03&countKind=words&countBook=all&page=41`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-counts");
      const pdf = page.locator('#ahavat29-source :is(iframe,[data-book-pdf-renderer="controlled"])');
      await reader.locator("tbody tr").first().waitFor();
      assert.equal(await reader.locator("tbody tr").count(), 54);
      assert.match(await reader.locator(".ahavat29-ds01-guide").last().textContent(), /79,976/);
      const chooseBook = title => reader.getByRole("navigation", { name: /בחירת חומש במניין/ }).getByRole("button", { name: title, exact: true });
      await click(chooseBook("שמות"));
      assert.equal(await reader.locator("tbody tr").count(), 11);
      assert.match(await ahavatSourceHref(pdf), /#page=41&view=FitH$/);
      const search = reader.getByRole("searchbox", { name: "חיפוש במנייני הפרשות" });
      await search.fill("כי תשא");
      assert.equal(await reader.locator("tbody tr").count(), 1);
      assert.equal(await reader.locator("tbody td:nth-child(4)").textContent(), "2,002");
      await search.fill("");
      await click(reader.getByRole("button", { name: "אותיות התורה", exact: true }));
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-04");
      assert.equal(new URL(page.url()).searchParams.get("countKind"), "letters");
      assert.match(await reader.locator(".ahavat29-ds01-guide").last().textContent(), /304,812/);
      assert.match(await ahavatSourceHref(pdf), /#page=42&view=FitH$/);
      await click(chooseBook("בראשית"));
      assert.equal(await reader.locator("tbody tr").count(), 12);
      for (const [parasha, pdfPage] of [["חיי שרה", 41], ["תולדות", 42]]) {
        await click(reader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: parasha, exact: true }) }).getByRole("button", { name: `PDF ${pdfPage}`, exact: true }));
        assert.match(await ahavatSourceHref(pdf), new RegExp(`#page=${pdfPage}&view=FitH$`));
      }
      assert.equal(await reader.locator(".ahavat29-letter-bars button").count(), 11);
      await search.fill("מקץ");
      assert.equal(await reader.locator("tbody td:nth-child(4)").textContent(), "—");
      const downloading = page.waitForEvent("download");
      await click(reader.getByRole("button", { name: "הורד טבלה למחקר · 1 שורות", exact: true }));
      const download = await downloading;
      assert.equal(download.suggestedFilename(), "ahavat-torah-letters-bereshit.csv");
      const chunks = [];
      for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      const csv = Buffer.concat(chunks).toString("utf8");
      assert.match(csv, /"אותיות התורה","מקץ","בראשית","\?","","42"/);
      assert.doesNotMatch(csv, /null|undefined|NaN/);
      await search.fill("");
      if (width === 1440) {
        await click(reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true }));
        await reader.locator("canvas:not([data-book-pdf-canvas])").waitFor();
        assert.match(await reader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /מניין אותיות התורה/);
        assert.doesNotMatch(await reader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /מניין האות אותיות/);
        await click(reader.locator(".ahavat29-letter-bars").getByRole("button", { name: "בראשית 7,235", exact: true }));
        assert.match(await ahavatSourceHref(pdf), /#page=41&view=FitH$/);
        await page.reload({ waitUntil: "domcontentloaded" });
        await reader.locator("tbody tr").first().waitFor();
        assert.equal(await reader.getByRole("button", { name: "אותיות התורה", exact: true }).getAttribute("aria-pressed"), "true");
        assert.equal(await reader.locator("tbody tr").count(), 12);
      }
      // An external dataset selection must switch this same reader, not create a stale second projection.
      const externalDataset = page.locator(".ahavat29-spatial-legend button").filter({ hasText: "DS-03" });
      await externalDataset.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
      await click(externalDataset);
      await reader.getByRole("button", { name: "תיבות התורה", exact: true, pressed: true }).waitFor();
      assert.match(await ahavatSourceHref(pdf), /#page=41&view=FitH$/);
      assert.equal(new URL(page.url()).searchParams.get("countKind"), "words");
      assert.equal(await page.locator("#ahavat29-letters .ahavat29-letter-alphabet button").count(), 28);
      assert.equal(await page.locator("#ahavat29-letters tbody tr").count(), 54);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow at ${width}px`);
      assert.doesNotMatch(await reader.textContent(), /null|NaN|undefined/);
      assert.deepEqual(errors, []);
      console.info(`DS-03/04 browser: completed ${width}px`);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
    delete process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW;
  }
});
