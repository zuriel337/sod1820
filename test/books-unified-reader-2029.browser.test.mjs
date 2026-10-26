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
