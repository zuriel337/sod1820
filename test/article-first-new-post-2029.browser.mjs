// "The article first" for a Post written on the site after the proof list was made (NEW_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), in a real
// Chromium with the BUILT public-reading artifact, its real service worker and the build's real new-Post guard; the document is produced by the
// REAL server function (withArticleFirst2029 + jsdom), with the Post NOT on the proven list. Proves:
//  1. the title and body are in the first document at the Post's own /post/ address, readable before the application runs;
//  2. the page adopts the document's own nodes (one article, nothing left behind), and the paragraph the reader is on does not move;
//  3. nothing on the page shifts while the application takes over (layout shifts, scrolling excluded, stay at zero);
//  4. a Post that names something a left-out first-paint rule depends on keeps today's document (the page renders it as before).
// Run `node scripts/build-public-reading-production.mjs` first.   node --test --test-concurrency=1 test/article-first-new-post-2029.browser.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startFixture } from "./helpers/authBrowserFixture.mjs";
import { withArticleFirst2029, loadArticleFirstRenderer } from "../public-reading-deploy/api/article-first.js";

const require = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = require(name); break; } catch { /* optional tooling */ } }
assert.ok(pw, "the new-Post article-first acceptance requires the pinned browser; never skip.");
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const SLUG = "new-post-article-first-fixture";
const PATH = "/post/" + SLUG;
const PARAGRAPH = n => `<p>פסקה ${n}: מה קורה כשמספר אחד חוזר בכל מקום, בתאריך, בשם ובפסוק, והקורא מגלה שהמציאות מדברת בשפת המספרים, צעד אחר צעד, עד התמונה המלאה.</p>`;
const ROW = { id: 905139, wp_id: null, slug: SLUG, source: "ai", link: null, title: "מה קורה כשמספר חוזר בכל מקום", excerpt: "פוסט חדש של האתר.",
  author: "SOD1820", date: "2026-11-16T20:00:00+00:00", modified: "2026-11-16T20:05:00+00:00", tags: ["מה קורה"], categories: ["רמזים"],
  image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/new-post-reading.png",
  content: [...[1, 2, 3, 4, 5].map(PARAGRAPH), "<h2>הצעד הבא</h2>", ...[6, 7, 8, 9, 10, 11, 12].map(PARAGRAPH)].join("\n") };
const PROFILES = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, desktop: { viewport: { width: 1280, height: 900 } } };
const sleep = ms => new Promise(done => setTimeout(done, ms));

await loadArticleFirstRenderer();
async function withPage(profile, { row = ROW, expect = "served-new" } = {}, run) {
  const fixture = await startFixture({
    documentFor: ({ path, template }) => {
      if (decodeURIComponent(path) !== PATH) return null;
      // not on the proven list: the build's own guard decides
      const out = withArticleFirst2029(template, { path, search: "", status: 200, post: row, proven: {} });
      assert.equal(out.state, expect, "the real server function");
      return out.html;
    },
    supabase: async ({ url }) => {
      if (!(url.pathname === "/rest/v1/posts" && /slug|wp_id|id=/.test(url.search) && !/order=|limit=(?:[2-9]|\d\d)/.test(url.search))) return null;
      return { body: [row] };
    },
  });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ...PROFILES[profile], ignoreHTTPSErrors: true, locale: "he-IL", serviceWorkers: "allow" });
    await context.addInitScript(() => {
      window.__shift = 0;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(String(error.message)));
    await run({ page, errors });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
}
const adopted = page => page.waitForFunction(() => window.__sodArticleFirst?.result, null, { timeout: 60000 }).then(() => page.evaluate(() => window.__sodArticleFirst));
const counts = page => page.evaluate(() => ({ articles: document.querySelectorAll("article.sod29-reading-post").length, h1: document.querySelectorAll("article h1").length,
  documentArticle: !!document.getElementById("sod29-ssr-article"), sources: document.querySelectorAll(".sod29-reading-source[data-public-post-id]").length }));

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] a new Post not on the list: its article is in the first document at /post/, the page adopts it, nothing shifts`, { timeout: 180000 }, async () => {
    await withPage(profile, {}, async ({ page, errors }) => {
      await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "commit" });
      await page.waitForSelector("#sod29-ssr-article h1", { timeout: 20000 });
      const early = await page.evaluate(() => ({ title: document.querySelector("#sod29-ssr-article h1").textContent, appReady: !!document.querySelector(".sod29-reading-source[data-public-post-id]") }));
      assert.match(early.title, /מה קורה כשמספר חוזר בכל מקום/);
      assert.equal(early.appReady, false, "readable before the page exists");
      const before = await page.evaluate(() => {
        window.__bodyNodes = [...document.querySelector('#sod29-ssr-article [data-ssr-body="true"]').children];
        const target = window.__bodyNodes.find(node => /^פסקה 4:/.test(node.textContent.trim()));
        window.__reading = target; window.scrollBy({ top: target.getBoundingClientRect().top - 160, left: 0, behavior: "instant" });
        return Math.round(target.getBoundingClientRect().top);
      });
      const result = await adopted(page);
      assert.equal(result.result, "adopted", JSON.stringify(result));
      const after = await page.evaluate(() => ({ top: Math.round(window.__reading.getBoundingClientRect().top),
        sameNodes: window.__bodyNodes.every(node => node.isConnected && node.closest(".sod29-reading-source[data-public-post-id]")) }));
      assert.equal(after.sameNodes, true, "the page shows the document's own nodes");
      assert.ok(Math.abs(after.top - before) <= 2, `the paragraph being read stayed (${before} -> ${after.top})`);
      await sleep(1500);
      assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 });
      const shift = await page.evaluate(() => window.__shift);
      assert.ok(shift < 0.01, `no layout shift while the page takes over (${shift})`);
      assert.deepEqual(errors, []);
    });
  });
}

test("[phone] a new Post that names something a left-out first-paint rule depends on keeps today's document and still opens", { timeout: 180000 }, async () => {
  // <del> is styled only by rules the first-paint stylesheet leaves out (the build's guard names it)
  const row = { ...ROW, content: ROW.content + "\n<p>הכתובת הישנה: <del>1819</del> והחדשה 1820.</p>" };
  await withPage("phone", { row, expect: "new-guarded" }, async ({ page, errors }) => {
    await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "commit" });
    await page.waitForSelector(".sod29-reading-source[data-public-post-id]", { timeout: 60000 });
    assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 });
    assert.deepEqual(errors, []);
  });
});
