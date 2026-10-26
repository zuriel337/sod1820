import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { getAllBookReaderManifests } from "../src/data/bookReader2029.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser tooling is optional in lightweight checkouts. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

function bookRow(slug) {
  const manifest = getAllBookReaderManifests().find(item => item.slug === slug);
  return {
    id: `book-${slug}`,
    type: "book",
    label: manifest?.title || slug,
    description: manifest?.introduction || "",
    identity_key: `book:${slug}`,
    metadata: {
      slug,
      source_ref_prefixes: [],
      identity_tiers: {
        witness: { identity: "עדות המקור" },
        edition: { status: "מהדורת המקור" },
        locator: { kind: "pdf_page" },
      },
    },
    is_active: true,
    created_at: "2026-10-26T00:00:00.000Z",
  };
}

test("all seven unified readers remain source-first and fit 320/390/1440", { skip: !available, timeout: 120_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";

  const server = await vite.createServer({
    root: ROOT,
    configFile: false,
    plugins: [reactPlugin()],
    appType: "spa",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });

  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === base && request.isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) {
          return route.abort();
        }
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
          if (url.pathname === "/rest/v1/nodes") {
            const rawSlug = url.searchParams.get("metadata->>slug") || "eq.sefer-raziel-hamalach";
            const slug = rawSlug.replace(/^eq\./, "");
            const row = bookRow(slug);
            const wantsObject = String(request.headers().accept || "").includes("application/vnd.pgrst.object");
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "content-range": "0-0/1" },
              body: JSON.stringify(wantsObject ? row : [row]),
            });
          }
          if (url.pathname.startsWith("/auth/v1/")) {
            return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null, session: null }) });
          }
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });

      const page = await context.newPage();
      for (const manifest of getAllBookReaderManifests()) {
        const url = `${base}/2029/control?surface=books-unified-reader&book=${encodeURIComponent(manifest.slug)}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const reader = page.locator(".book-reader29");
        await reader.waitFor();
        assert.equal(await reader.getByText("דברי הספר · המקור פתוח תמיד", { exact: true }).count(), 1);
        assert.equal(await reader.getByText(/הסבר נלווה · PDF/).count() > 0, true);
        assert.equal(await reader.getByText("פרטי המקור", { exact: true }).count(), 1);
        assert.equal(await page.locator("#book-reader29-source iframe").count(), 1);
        assert.equal(await page.getByRole("button", { name: "מסך מלא", exact: true }).count(), 1);
        assert.equal(await page.evaluate(() => (
          document.documentElement.scrollWidth <= window.innerWidth + 1
          && document.body.scrollWidth <= window.innerWidth + 1
          && document.querySelector(".book-reader29").getBoundingClientRect().right <= window.innerWidth + 1
        )), true, `${manifest.slug} overflows at ${width}px`);

        if (manifest.slug === "sefer-raziel-hamalach") {
          const topPdfLink = page.getByRole("link", { name: /קרא את ה־PDF/ });
          assert.equal(await topPdfLink.count(), 1);
          await page.getByRole("button", { name: "הבא ←", exact: true }).click();
          assert.match(await page.locator("#book-reader29-source iframe").getAttribute("src"), /#page=2&view=FitH$/);
          assert.equal(new URL(page.url()).searchParams.get("page"), "2");
          if (width === 390) {
            await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("קולות");
            const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 20" });
            await result.waitFor();
            await result.click();
            assert.equal(new URL(page.url()).searchParams.get("page"), "20");
            await page.getByRole("heading", { name: "מדרגות החיים וקע״ד הקולות", exact: true }).waitFor();
          }
        }
        if (manifest.slug === "sefer-habahir" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("פירוש מודפס במהדורה", { exact: true }).waitFor();
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("דבר אל הקורא");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 44" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "44");
          await page.getByRole("heading", { name: "דבר אל הקורא ומלאכת המהדיר", exact: true }).waitFor();
        }
        if (manifest.slug === "sefer-hapliah" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("326/327 עמודים · שכבת איתור בלבד", { exact: true }).waitFor();
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("הנחש היה ערום");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 283" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "283");
          await page.getByRole("heading", { name: "״והנחש היה ערום״", exact: true }).waitFor();
        }
        if (manifest.slug === "ahavat-torah" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("98/99 עמודים · שכבת איתור בלבד", { exact: true }).waitFor();
          await page.getByText("45 · נקראים ישירות מן ה־PDF", { exact: true }).waitFor();
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("הערות שהעיר");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 99" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "99");
          await page.getByRole("heading", { name: "לוח ההשמטות והתיקונים", exact: true }).waitFor();
        }
        if (manifest.slug === "daat-tevunot" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("99/99 עמודים · שכבת איתור בלבד", { exact: true }).waitFor();
          assert.equal(await page.getByText("עמודים ללא טקסט לחיפוש", { exact: true }).count(), 0);
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("יום הדין הגדול");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 89" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "89");
          await page.getByRole("heading", { name: "הנהגת המשפט", exact: true }).waitFor();
        }
        if (manifest.slug === "sefer-yetzirah" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("207/220 עמודים · שכבת איתור בלבד", { exact: true }).waitFor();
          await page.getByText("1, 2, 3, 27, 33, 110, 114, 115, 202, 217, 218, 219, 220 · נקראים ישירות מן ה־PDF", { exact: true }).waitFor();
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("ספירות בלימה");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 61" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "61");
          await page.getByRole("heading", { name: "פרק ראשון · עשר ספירות", exact: true }).waitFor();
        }
        if (manifest.slug === "bentov-brief-tour-higher-consciousness" && width === 390) {
          await page.getByText("פרטי המקור", { exact: true }).click();
          await page.getByText("125/127 עמודים · שכבת איתור בלבד", { exact: true }).waitFor();
          await page.getByText("1, 2 · נקראים ישירות מן ה־PDF", { exact: true }).waitFor();
          await page.getByText("תרגום עברי · מועמד מכונה", { exact: true }).waitFor();
          await page.getByRole("searchbox", { name: "מילה או צירוף" }).fill("pure awareness");
          const result = page.locator(".book-reader29-search-results button").filter({ hasText: "PDF 99" });
          await result.waitFor();
          await result.click();
          assert.equal(new URL(page.url()).searchParams.get("page"), "99");
          await page.getByText("תרגום עברי · PDF 99", { exact: true }).waitFor();
          await page.getByRole("heading", { name: "חלק חמישי · העצמי הגבוה · עמוד 99", exact: true }).first().waitFor();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
    delete process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW;
    delete process.env.VITE_INTEGRATED_PREVIEW;
  }
});
