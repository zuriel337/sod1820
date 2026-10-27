import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser dependencies are optional in lightweight checkouts. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

test("catalog and optional spatial scene keep source actions at mobile and desktop widths", { skip: !available, timeout: 240_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, plugins: [reactPlugin()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      let catalogRequests = 0;
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === base && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname === "/book-data/sefer-yetzirah.structures.json") catalogRequests++;
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/v1/") ? JSON.stringify({ user: null, session: null }) : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/2029/control?surface=sefer-yetzirah-world&page=155`, { waitUntil: "domcontentloaded" });
      const pdf = page.locator("#yetzirah29-source iframe");
      await page.getByRole("button", { name: "פתח את המבנה התלת־ממדי" }).waitFor();
      assert.equal(await page.locator("canvas").count(), 0);
      assert.equal(catalogRequests, 0);
      await page.getByRole("button", { name: "פתח את קטלוג המבנים" }).click();
      const catalog = page.getByRole("region", { name: "קטלוג המבנים" });
      await catalog.getByRole("button", { name: /עשרה עומקים בנוסח הגוף המשולב/ }).click();
      assert.equal(catalogRequests, 1);
      assert.match(await pdf.getAttribute("src"), /#page=53&view=FitH$/);
      await catalog.getByRole("button", { name: "עומק ראשית · PDF 53" }).click();
      assert.match(await pdf.getAttribute("src"), /#page=53&view=FitH$/);
      await page.getByRole("button", { name: "פתח את המבנה התלת־ממדי" }).click();
      await page.locator("canvas").waitFor();
      await page.getByRole("button", { name: /עומק אחרית/ }).first().click();
      assert.match(await pdf.getAttribute("src"), /#page=53&view=FitH$/);
      await page.getByRole("button", { name: "סגור את המבנה התלת־ממדי" }).click();
      assert.equal(await page.locator("canvas").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow at ${width}`);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});
