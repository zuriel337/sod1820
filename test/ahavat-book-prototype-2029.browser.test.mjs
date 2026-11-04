import { AHAVAT_PDF_URL, AHAVAT_PDF_BYTES, assertAhavatSourcePage } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, react;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional only in a lightweight checkout. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && react && existsSync(executablePath));
const out = process.env.AHAVAT_PROTOTYPE_OUT || join(tmpdir(), "ahavat-book-prototype-2029");
const BOOK = { id: "11111111-1111-4111-8111-111111111111", label: "אהבת תורה", description: null, identity_key: "book:ahavat-torah", metadata: { slug: "ahavat-torah", coverage_2029: { structural: "99/99 COMPLETE" } }, is_active: true };

async function start() {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, cacheDir: join(tmpdir(), `ahavat-book-prototype-vite-${process.pid}`), plugins: [react()], logLevel: "error", server: { host: "127.0.0.1", port: 0 }, appType: "mpa" });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  mkdirSync(out, { recursive: true });
  const open = async ({ width, height = 900, theme, path }) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
      if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
        const response = await context.request.get(`${origin}/2029.html`);
        return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
      }
      if (url.pathname.endsWith(".pdf")) return route.abort();
      if (url.hostname === "linswmnnkjxvweumprav.supabase.co" && url.pathname.endsWith("/rest/v1/nodes") && url.searchParams.get("type") === "eq.book") {
        const single = /vnd\.pgrst\.object/.test(route.request().headers().accept || "");
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(single ? BOOK : [BOOK]) });
      }
      if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
      if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(value => document.documentElement.getAttribute("data-theme-preset") === value, theme);
    return { page, context, errors };
  };
  return { open, close: async () => { await browser.close(); await server.close(); } };
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const headerBottom = page => page.evaluate(() => Math.max(0, ...[...document.querySelectorAll("header,[role=banner]")].filter(element => getComputedStyle(element).position === "fixed" || getComputedStyle(element).position === "sticky").map(element => element.getBoundingClientRect().bottom)));
const settled = async (page, id, clearance = 8) => {
  // Layout is settled when the target stays put across two quiet seconds.
  let last = null, stable = 0;
  for (let index = 0; index < 40 && stable < 4; index += 1) {
    await page.waitForTimeout(500);
    const top = await page.evaluate(target => Math.round(document.getElementById(target).getBoundingClientRect().top), id);
    stable = top === last ? stable + 1 : 0; last = top;
  }
  assert.ok(stable >= 4, `${id} never settled`);
  const header = await headerBottom(page);
  assert.ok(last >= header - 1 && last <= header + 140, `${id} top ${last} must sit just under the fixed header (${header})`);
  return last;
};

test("card, entry and 1,820 route work on phones and desktop in all three display sets", { skip: !available, timeout: 900_000 }, async () => {
  const app = await start();
  try {
    for (const theme of ["light", "parchment", "dark"]) for (const width of [320, 360, 390, 1440]) {
      const height = width === 1440 ? 900 : 800;
      const { page, context, errors } = await app.open({ width, height, theme, path: "/2029/control?surface=books-unified-reader" });
      const card = page.locator('[data-book-card="ahavat-torah-prototype"]');
      await card.waitFor();
      assert.equal(await card.getByRole("heading", { name: "אהבת תורה", level: 3 }).count(), 1);
      assert.ok(await card.getByText("ר׳ פנחס זלמן הלוי סג״ל איש הורוויץ").isVisible());
      assert.equal(await card.locator(".books29-card-topics li").count(), 4);
      const image = card.locator("img.books29-card-cover");
      await image.evaluate(element => element.decode());
      assert.ok(await image.evaluate(element => element.naturalWidth >= 500), "real source page image");
      const [imageBox, bodyBox] = await Promise.all([image.boundingBox(), card.locator(".books29-card-body").boundingBox()]);
      assert.ok(Math.abs(imageBox.y - bodyBox.y) < 8, "image stays beside the content, not stacked above it");
      assert.ok(imageBox.width <= (width === 1440 ? 160 : 140));
      assert.ok(await noOverflow(page), `card overflow at ${width}`);
      await page.screenshot({ path: join(out, `card-${theme}-${width}.png`) });
      // ZURIEL: this book stays open in Preview without claiming completion.
      assert.equal(await card.locator('[data-book-ready="false"]').count(), 1);
      assert.match(await card.innerText(), /פתוח לקריאה · בהכנה/);
      await card.getByRole("link", { name: "פתח את הספר", exact: true }).click();

      await page.locator("#ahavat29-toc").waitFor();
      assert.equal(await page.getByRole("heading", { name: "קטעים מומלצים להתחלה", level: 2 }).isVisible(), true);
      assert.equal(await page.getByRole("navigation", { name: "מאיפה מתחילים ללמוד", exact: true }).locator("a").count(), 3);
      assert.equal(await page.locator(".ahavat29-toc-list>li").count(), 7);
      assert.equal(await page.locator(".ahavat29-metrics").isVisible(), false, "coverage metrics are inside the closed source disclosure");
      assert.deepEqual(await page.locator(".ahavat29-metrics strong").allTextContents(), ["99", "98", "267", "98", "11"]);
      assert.ok(await noOverflow(page), `entry overflow at ${width}`);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0, "3D stays opt-in");
      await page.screenshot({ path: join(out, `entry-${theme}-${width}.png`) });

      await page.getByRole("searchbox", { name: "חיפוש נושא בספר" }).fill("1820");
      await page.locator('.ahavat29-toc-results [data-toc-kind="topic"]').first().click();
      const selection = page.locator("#ahavat29-selection");
      await selection.getByRole("heading", { name: "מופעי שם ה׳ בתורה" }).waitFor();
      const source = page.locator("#ahavat29-source");
      await assertAhavatSourcePage(source, 6);
      await selection.getByRole("button", { name: /שמות/ }).click();
      await selection.getByRole("button", { name: /וארא/ }).click();
      await selection.getByText("פרשת וארא: 73 מופעים").waitFor();
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-01");
      assert.equal(new URL(page.url()).searchParams.get("page"), "6");
      const [selectionBox, sourceBox] = await Promise.all([selection.boundingBox(), source.boundingBox()]);
      if (width >= 1024) assert.ok(Math.abs(selectionBox.y - sourceBox.y) < 120 || (selectionBox.y < sourceBox.y + sourceBox.height && selectionBox.y + selectionBox.height > sourceBox.y), "desktop: explanation and PDF side by side");
      await selection.getByRole("link", { name: /המקור · PDF 6/ }).waitFor();
      assert.match(await selection.getByRole("link", { name: "בקורא האחיד" }).getAttribute("href"), /surface=books-unified-reader&book=ahavat-torah&page=6/);
      assert.match(await selection.getByRole("link", { name: /המספר 1,820/ }).getAttribute("href"), /\/2029\/number\/1820$/);
      assert.equal(await selection.getByRole("button", { name: "הוסף למחקר" }).count(), 1, "research action appears only with a live book identity");
      assert.ok(await selection.getByText("החיבור לעץ, להיכל ולעולם עדיין אינו קיים עבור בחירה בתוך ספר", { exact: false }).count() >= 1);
      assert.ok(await noOverflow(page), `route overflow at ${width}`);
      await page.screenshot({ path: join(out, `route-${theme}-${width}.png`) });

      // Refresh keeps the exact source page and topic.
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("#ahavat29-source").waitFor();
      await assertAhavatSourcePage(page.locator("#ahavat29-source"), 6);
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-01");
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await app.close(); }
});

test("למד עם ההסברים lands on the explanation and stays there once lazy tables settle (1440×900 and 390 phone)", { skip: !available, timeout: 600_000 }, async () => {
  const app = await start();
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) for (const theme of ["light", "parchment", "dark"]) {
      const { page, context, errors } = await app.open({ width, height, theme, path: "/2029/control?surface=ahavat-torah-system&page=6" });
      await page.locator("#ahavat29-source").waitFor();
      await page.waitForTimeout(1200);
      await page.getByRole("link", { name: "למד עם ההסברים", exact: true }).click();
      assert.equal(new URL(page.url()).hash, "#ahavat29-full-reader");
      await settled(page, "ahavat29-full-reader");
      assert.equal(await page.locator("#ahavat29-full-reader").getByRole("heading", { level: 2 }).first().isVisible(), true);
      assert.equal(await page.evaluate(() => { const box = document.getElementById("ahavat29-letters")?.getBoundingClientRect(); return !box || box.bottom < 0 || box.top > innerHeight; }), true, "the letter table is not what the reader landed on");
      assert.ok(await noOverflow(page), `overflow at ${width}`);
      // Same stability for the other in-page entries, with the target title not hidden by the fixed header.
      for (const [name, id] of [["גלה את המבנים", "ahavat29-spatial-title"], ["קרא את הספר", "ahavat29-source"]]) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByRole("link", { name, exact: true }).click();
        await settled(page, id);
      }
      await page.goBack();
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await app.close(); }
});

test("opening from research keeps its context and keyboard reaches every contents control", { skip: !available, timeout: 300_000 }, async () => {
  const app = await start();
  try {
    const { page, context, errors } = await app.open({ width: 1440, height: 900, theme: "light", path: "/2029/control?surface=ahavat-torah-system&page=6" });
    await page.locator("#ahavat29-toc").waitFor();
    await page.getByRole("searchbox", { name: "חיפוש נושא בספר" }).focus();
    await page.keyboard.type("שם ה");
    await page.locator('.ahavat29-toc-results [data-toc-kind="topic"]').first().focus();
    await page.keyboard.press("Enter");
    await page.locator("#ahavat29-selection").getByRole("heading", { name: "מופעי שם ה׳ בתורה" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-01");
    // Exact return: the chosen source page survives a unified-reader round trip.
    await page.goto(page.url().replace("ahavat-torah-system", "books-unified-reader&book=ahavat-torah"), { waitUntil: "domcontentloaded" });
    await page.locator("#book-reader29-source").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("page"), "6");
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await app.close(); }
});

test("compact entry: contents search is on the first screen at 390×844 and reachable at 320; phone switches between PDF and explanation", { skip: !available, timeout: 600_000 }, async () => {
  const app = await start();
  try {
    for (const theme of ["light", "parchment", "dark"]) {
      for (const [width, height] of [[320, 700], [360, 760], [390, 844], [1440, 900]]) {
        const { page, context, errors } = await app.open({ width, height, theme, path: "/2029/control?surface=ahavat-torah-system" });
        await page.locator("#ahavat29-toc").waitFor();
        await page.waitForTimeout(800);
        const search = page.getByRole("searchbox", { name: "חיפוש נושא בספר" });
        const box = await search.boundingBox();
        if (width === 390 || width === 1440) assert.ok(box.y >= 0 && box.y + box.height <= height - 60, `search inside first screen at ${width}: ${box.y + box.height}`);
        // A contents entry is always in the first screen of the opening, at every width.
        const link = page.getByRole("link", { name: "תוכן עניינים", exact: true });
        const linkBox = await link.boundingBox();
        assert.ok(linkBox.y + linkBox.height <= height - 60, `contents link on first screen at ${width}`);
        assert.ok(linkBox.width >= 44 && linkBox.height >= 44);
        assert.equal(await page.locator(".ahavat29-intro").getByRole("heading", { level: 2, name: "קטעים מומלצים להתחלה" }).isVisible(), true);
        assert.ok(await noOverflow(page), `overflow at ${width}`);
        await page.screenshot({ path: join(out, `compact-first-${theme}-${width}.png`) });
        if (width === 320) {
          await link.click();
          await settled(page, "ahavat29-toc");
          await page.getByRole("searchbox", { name: "חיפוש נושא בספר" }).fill("1820");
          await page.locator('.ahavat29-toc-results [data-toc-kind="topic"]').first().click();
          await page.locator("#ahavat29-selection").getByRole("heading", { name: "מופעי שם ה׳ בתורה" }).waitFor();
          await assertAhavatSourcePage(page.locator("#ahavat29-source"), 6);
          // Phone: short hop from the source to the explanation and back, selection kept.
          await page.locator("#ahavat29-source").getByRole("link", { name: "להסבר", exact: true }).click();
          await settled(page, "ahavat29-selection");
          assert.equal(await page.locator("#ahavat29-selection").getByRole("heading", { name: "מופעי שם ה׳ בתורה" }).isVisible(), true);
          await page.locator("#ahavat29-selection").getByRole("button", { name: /שמות/ }).click();
          await page.locator("#ahavat29-selection").getByRole("button", { name: /וארא/ }).click();
          await page.locator("#ahavat29-selection").getByRole("link", { name: /המקור · PDF 6/ }).click();
          await settled(page, "ahavat29-source");
          await assertAhavatSourcePage(page.locator("#ahavat29-source"), 6);
          await page.locator("#ahavat29-source").getByRole("link", { name: "להסבר", exact: true }).click();
          await settled(page, "ahavat29-selection");
          assert.equal(await page.locator("#ahavat29-selection").getByText("פרשת וארא: 73 מופעים").isVisible(), true, "selection survives the round trip");
        }
        assert.deepEqual(errors, []);
        await context.close();
      }
    }
  } finally { await app.close(); }
});
