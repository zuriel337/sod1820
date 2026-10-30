import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { AHAVAT_LOCATED_DATASETS } from "../src/data/ahavatTorahSystem2029.js";
import { ahavatRequestedSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const root = fileURLToPath(new URL("..", import.meta.url));
const out = "/workspace/artifacts/ahavat-reader-release-20261030-iJCdam/browser-output/release";
const click = async locator => {
  await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await locator.page().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await locator.click();
};
test("all primary reading surfaces, seven accounts and preserved research details work in twelve reader contexts", { timeout: 480_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `${out}/vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const results = [];
  mkdirSync(out, { recursive: true });
  try {
    for (const width of [320, 360, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(theme => localStorage.setItem("sod-theme", theme), theme);
      // This is deliberately a copy/navigation matrix, NOT PDF-render proof.
      // Real source rendering is accepted separately against the original PDF.
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
      const heading = page.getByRole("heading", { name: "מן המניין אל עמוד המקור", exact: true });
      await heading.waitFor();
      assert.equal(await page.locator("html").getAttribute("data-theme-preset"), theme);
      const primaryText = await page.locator("main.ahavat29").innerText();
      assert.doesNotMatch(primaryText, /מצפה הנתונים של הספר|טבלאות שאפשר להיכנס לתוכן|גובה הוא מספר עמודי המקור|המערכת שאנחנו בונים|ARITHMETIC MISMATCH|מועמד למחקר|השלב הבא למאגר/);
      assert.doesNotMatch(primaryText, /\bDS-\d{2}\b/);
      assert.equal(await page.locator(".ahavat29-dataset-grid > button").count(), 11);
      for (const dataset of AHAVAT_LOCATED_DATASETS) {
        const card = page.locator(`.ahavat29-dataset-grid > button[data-dataset-id="${dataset.id}"]`);
        await click(card);
        assert.equal(new URL(page.url()).searchParams.get("dataset"), dataset.id);
        assert.match(await ahavatRequestedSourceHref(page.locator("#ahavat29-source")), new RegExp(`#page=${dataset.pages[0]}&view=FitH$`));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${dataset.id} source-header layout at ${width}/${theme}`);
      }
      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /חישובים/ }));
      const accounts = page.locator(".is-calculations > article");
      await accounts.first().waitFor();
      assert.equal(await accounts.count(), 7);
      const sourcePages = [6, 8, 18, 12, 12, 13, 8];
      for (let index = 0; index < 7; index++) {
        const card = accounts.nth(index), text = await card.innerText();
        assert.doesNotMatch(text, /ARITHMETIC|NOTE|as printed|calculation_id|truth_class|רישום המחקר הקודם/);
        await click(card.getByRole("button", { name: `פתח PDF ${sourcePages[index]}`, exact: true }));
        assert.match(await ahavatRequestedSourceHref(page.locator("#ahavat29-source")), new RegExp(`#page=${sourcePages[index]}&view=FitH$`));
      }
      assert.match(await accounts.nth(2).innerText(), /ר״ב.*ל״ז/s);
      await click(accounts.nth(2).getByText("פרטי המקור והבדיקה", { exact: true }));
      assert.match(await accounts.nth(2).innerText(), /ברישום הקודם.*212/s);
      await click(accounts.nth(2).getByText("פרטי המקור והבדיקה", { exact: true }));
      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /משפחות/ }));
      assert.equal(await page.locator(".is-families > article").count(), 9);
      assert.doesNotMatch(await page.locator(".is-families").innerText(), /נסוג!|truth_class|SOURCE CLAIM/);
      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /היסטוריית הקריאה/ }));
      assert.equal(await page.locator(".is-contradictions").isVisible(), false);
      await click(page.getByText("רישומי מחקר מוקדמים", { exact: true }));
      assert.equal(await page.locator(".is-contradictions > article").count(), 10);
      await click(page.getByText("רישומי מחקר מוקדמים", { exact: true }));
      assert.equal(await page.locator(".ahavat29-spatial-legend").isVisible(), false);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await heading.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/${width}-${theme}.png` });
      assert.deepEqual(errors, []);
      results.push({ width, theme, locatedTopics: 11, accounts: 7, families: 9, historyRetained: 10, pdfDelivery: "intentionally_aborted_not_render_proof", errors });
      await context.close();
    }
  } finally {
    writeFileSync(`${out}/observations.json`, JSON.stringify(results, null, 2));
    await browser.close(); await server.close();
  }
});
