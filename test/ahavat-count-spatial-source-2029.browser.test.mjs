import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { ahavatCountUnitId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, react;
try { playwright = require("playwright"); vite = await import(pathToFileURL(require.resolve("vite")).href); react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default; } catch { /* Optional in lightweight checkouts. */ }
const available = Boolean(playwright && vite && react && existsSync("/usr/bin/chromium"));
const sourcePath = "/tmp/books-wide-ahavat-source-20261028.pdf";

async function fixture() {
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-angle=swiftshader"] });
  return { origin, browser, server };
}

async function routes(context, origin, pdf) {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
      const response = await context.request.get(`${origin}/2029.html`);
      return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
    }
    if (url.pathname.endsWith(".pdf")) return pdf ? route.fulfill({ status: 200, contentType: "application/pdf", body: pdf, headers: { "content-disposition": "inline", "access-control-allow-origin": "*" } }) : route.abort();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
    if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
    return route.continue();
  });
}

test("count model retains exact source, search and selection across nine display combinations", { skip: !available, timeout: 480_000 }, async () => {
  const { origin, browser, server } = await fixture();
  const id = ahavatCountUnitId("letters", "bereshit", "תולדות");
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await routes(context, origin);
      const page = await context.newPage();
      await page.goto(`${origin}${ahavatReaderUnitHref(id, "/2029/control?countQuery=תולדות")}`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-counts"), source = page.locator("#ahavat29-source");
      const row = reader.locator(`[data-reader-unit="${id}"]`); await row.waitFor();
      const search = reader.getByRole("searchbox", { name: "חיפוש במנייני הפרשות" });
      assert.equal(await search.inputValue(), "תולדות");
      assert.equal(await reader.locator("tbody tr").count(), 1);
      assert.match(await source.locator("iframe").getAttribute("src"), /#page=42&view=FitH$/);
      assert.equal(await page.locator("canvas").count(), 0);
      await row.getByRole("button", { name: "PDF 42", exact: true }).click();
      await source.getByRole("button", { name: "לעמוד הקודם", exact: true }).click();
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      await page.waitForFunction(unit => document.activeElement?.closest("[data-reader-unit]")?.getAttribute("data-reader-unit") === unit, id);
      assert.match(await source.locator("iframe").getAttribute("src"), /#page=42&view=FitH$/);
      assert.equal(await search.inputValue(), "תולדות");
      await page.reload({ waitUntil: "domcontentloaded" }); await row.waitFor();
      assert.equal(await search.inputValue(), "תולדות");
      const toggle = reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true });
      await toggle.click(); await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
      assert.match(await reader.locator(".ahavat29-letter-scene").textContent(), /קנה המידה משתנה/);
      assert.equal(await reader.locator(".ahavat29-spatial-canvas").getAttribute("data-reduced-motion"), "true");
      await reader.locator("canvas").evaluate(canvas => { window.__countContext = canvas.getContext("webgl2") || canvas.getContext("webgl"); });
      const bar = reader.locator(".ahavat29-letter-bars").getByRole("button", { name: "תולדות 5,426", exact: true });
      assert.equal(await bar.getAttribute("aria-pressed"), "true");
      await bar.focus(); await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      await page.waitForFunction(unit => document.activeElement?.closest("[data-reader-unit]")?.getAttribute("data-reader-unit") === unit, id);
      const close = reader.getByRole("button", { name: "סגור מבנה המניינים בתלת־ממד", exact: true });
      await close.focus(); await page.keyboard.press("Enter"); await toggle.waitFor();
      assert.equal(await toggle.evaluate(element => document.activeElement === element), true);
      await page.waitForFunction(() => window.__countContext?.isContextLost(), null, { timeout: 10_000 });
      await search.fill("מקץ");
      const missing = reader.locator(`[data-reader-unit="${ahavatCountUnitId("letters", "bereshit", "מקץ")}"]`);
      assert.match(await missing.textContent(), /לא הוכרע/);
      assert.equal(await reader.locator(".ahavat29-letter-bars").getByRole("button", { name: /מקץ/ }).count(), 0);
      const missingSource = missing.getByRole("button", { name: "PDF 42", exact: true });
      await missingSource.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
      await missingSource.click();
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), ahavatCountUnitId("letters", "bereshit", "מקץ"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true);
      await context.close(); console.log(`count spatial ${width}/${theme}: passed`);
    }
  } finally { await browser.close(); await server.close(); }
});

test("no WebGL still permits count-row selection and source return", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); }; });
    await routes(context, origin);
    const page = await context.newPage(), id = ahavatCountUnitId("letters", "bereshit", "תולדות");
    await page.goto(`${origin}${ahavatReaderUnitHref(id)}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-counts"), source = page.locator("#ahavat29-source");
    await reader.locator(`[data-reader-unit="${id}"]`).waitFor();
    await reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true }).click();
    await reader.getByRole("status").filter({ hasText: "לא ניתן לפתוח את המבנה במכשיר הזה" }).waitFor();
    await reader.locator(`[data-reader-unit="${id}"]`).getByRole("button", { name: "PDF 42", exact: true }).click();
    await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});

test("word-count row retains its own dataset and source through reload and return", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await routes(context, origin);
    const page = await context.newPage(), id = ahavatCountUnitId("words", "shemot", "כי תשא");
    await page.goto(`${origin}${ahavatReaderUnitHref(id, "/2029/control?countQuery=כי תשא")}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-counts"), source = page.locator("#ahavat29-source");
    const row = reader.locator(`[data-reader-unit="${id}"]`); await row.waitFor();
    assert.equal(await reader.getByRole("button", { name: "תיבות התורה", exact: true }).getAttribute("aria-pressed"), "true");
    assert.match(await row.textContent(), /2,002/);
    await reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true }).click();
    await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
    assert.equal(await reader.locator(".ahavat29-letter-bars").getByRole("button", { name: "כי תשא 2,002", exact: true }).getAttribute("aria-pressed"), "true");
    await row.getByRole("button", { name: "PDF 41", exact: true }).click();
    await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
    await page.reload({ waitUntil: "domcontentloaded" }); await row.waitFor();
    assert.equal(await reader.getByRole("searchbox", { name: "חיפוש במנייני הפרשות" }).inputValue(), "כי תשא");
    assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-03");
    assert.match(await source.locator("iframe").getAttribute("src"), /#page=41&view=FitH$/);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});

test("switching models and losing the GPU context preserve the selected count source", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await routes(context, origin);
    const page = await context.newPage(), id = ahavatCountUnitId("letters", "bereshit", "תולדות");
    await page.goto(`${origin}${ahavatReaderUnitHref(id, "/2029/control?countQuery=תולדות")}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-counts"), source = page.locator("#ahavat29-source");
    await reader.locator(`[data-reader-unit="${id}"]`).waitFor();
    const toggle = reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true });
    await toggle.click(); await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
    const letterReader = page.locator("#ahavat29-letters");
    await letterReader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }).click();
    await letterReader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
    assert.equal(await reader.locator("canvas").count(), 0);
    assert.equal(await page.locator("canvas").count(), 1);
    await toggle.click(); await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
    assert.equal(await letterReader.locator("canvas").count(), 0);
    await reader.locator("canvas").evaluate(canvas => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
    await reader.getByRole("status").filter({ hasText: "לא ניתן לפתוח את המבנה במכשיר הזה" }).waitFor();
    assert.equal(await reader.locator("canvas").count(), 0);
    assert.equal(await reader.getByRole("searchbox", { name: "חיפוש במנייני הפרשות" }).inputValue(), "תולדות");
    assert.match(await source.locator("iframe").getAttribute("src"), /#page=42&view=FitH$/);
    await reader.locator(`[data-reader-unit="${id}"]`).getByRole("button", { name: "PDF 42", exact: true }).click();
    await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});

test("original 99-page PDF remains usable in fullscreen with the count model", { skip: !available || !existsSync(sourcePath), timeout: 90_000 }, async () => {
  const bytes = readFileSync(sourcePath);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await routes(context, origin, bytes);
    const page = await context.newPage(), id = ahavatCountUnitId("letters", "bereshit", "תולדות");
    await page.goto(`${origin}${ahavatReaderUnitHref(id)}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-counts"), source = page.locator("#ahavat29-source");
    await reader.locator(`[data-reader-unit="${id}"]`).waitFor();
    await reader.getByRole("button", { name: "פתח מבנה המניינים בתלת־ממד", exact: true }).click(); await reader.locator("canvas").waitFor();
    await source.getByRole("button", { name: "מסך מלא", exact: true }).click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    let total = null;
    for (let i = 0; i < 100 && total !== 99; i++) {
      for (const frame of page.frames()) { try { total = await frame.evaluate(() => document.querySelector("pdf-viewer")?.documentDimensions?.pageDimensions?.length || null) || total; } catch { /* Native cross-origin frame. */ } }
      if (total !== 99) await page.waitForTimeout(250);
    }
    assert.equal(total, 99);
    await source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.match(await source.locator("iframe").getAttribute("src"), /#page=42&view=FitH$/);
    await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});
