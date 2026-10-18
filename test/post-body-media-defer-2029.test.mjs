import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const helperSource = read("src/lib/postBodyMedia2029.js");
const pageSource = read("src/pages/Post2029Page.jsx");
const legacySource = read("src/legacy/legacy.jsx");
const cssSource = read("src/pages/post2029-reading.css");

const KNOWN = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/plane-363-hamashiach-card-20261001.png";
const ASSAF = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/assaf-rajuan-evidence-frame-20261001.jpg";
const SMIT = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="941" height="1672" viewBox="0 0 941 1672"><rect width="941" height="1672" fill="#8a6a22"/></svg>';

test("contract: only the 2029 Post body gets the inert-media boundary", () => {
  assert.match(pageSource, /postReadingBodyHtml2029\(state\.projection\?\.post\)/);
  assert.match(pageSource, /preparePostBodyMedia2029\(hardenPassiveMediaHtml\(post\.content \|\| ""\)\)/);
  assert.match(pageSource, /return observePostBodyMedia2029\(sourceRef\.current\)/);
  assert.match(pageSource, /dangerouslySetInnerHTML=\{\{ __html: preparedPostBody \}\}/);
  assert.doesNotMatch(legacySource, /postBodyMedia2029|preparePostBodyMedia2029|observePostBodyMedia2029/);
  assert.match(helperSource, /querySelectorAll\("picture"\)/);
  assert.match(helperSource, /rootMargin = "600px 0px"/);
  assert.match(cssSource, /data-sod-post-media-intrinsic="941x1672"/);
});

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try next */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(fs.existsSync);
const skip = !chromium || !executablePath ? "Chromium is not available" : false;

let server = null;
let origin = null;
let cachedHits = 0;
let browser = null;

test.before(async () => {
  if (skip) return;
  server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/helper.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
      return response.end(helperSource);
    }
    if (url.pathname === "/cached.svg") {
      cachedHits += 1;
      response.writeHead(200, {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": Buffer.byteLength(SVG),
      });
      return response.end(SVG);
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end("<!doctype html><html><head><meta charset='utf-8'></head><body><div id='root'></div></body></html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
  });
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function harnessPage({ width = 390, height = 844, theme = "dark" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate((selectedTheme) => {
    document.documentElement.dataset.themePreset = selectedTheme;
    document.body.style.margin = "0";
    document.body.insertAdjacentHTML("afterbegin", `<style>
      #root{max-width:900px;margin:auto}.spacer{height:2200px}
      img[data-sod-post-media-state]{display:block;max-width:100%;height:auto}
      img[data-sod-post-media-intrinsic="941x1672"]{width:min(100%,941px);aspect-ratio:941/1672;object-fit:contain}
    </style>`);
    window.__layoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__layoutShifts.push(entry.value);
    }).observe({ type: "layout-shift", buffered: true });
  }, theme);
  await page.addScriptTag({
    type: "module",
    content: `import {preparePostBodyMedia2029,observePostBodyMedia2029} from ${JSON.stringify(`${origin}/helper.js`)};
      window.__prepare=preparePostBodyMedia2029;
      window.__observe=observePostBodyMedia2029;`,
  });
  await page.waitForFunction(() => typeof window.__prepare === "function");
  return { context, page };
}

const authoredHtml = (src = KNOWN) => `<article><p data-copy="true">גוף המקור נשמר</p><div class="spacer"></div><figure data-figure="true"><a href="/original" data-original-link="true"><picture><source media="(min-width: 1px)" type="image/png" srcset="${src}"><img class="authored" src="${src}" srcset="${src} 1x" alt="עדות מן המקור"></picture></a><figcaption>כיתוב מקורי</figcaption></figure></article>`;

async function mount(page, html, observerOptions = null) {
  await page.evaluate(({ source, options }) => {
    window.__cleanup?.();
    const root = document.getElementById("root");
    root.innerHTML = window.__prepare(source);
    window.__cleanup = options === "fallback"
      ? window.__observe(root, { IntersectionObserverRef: null })
      : window.__observe(root);
  }, { source: html, options: observerOptions });
}

for (const width of [320, 390, 1440]) {
  for (const theme of ["light", "parchment", "dark"]) {
    test(`browser ${width}px ${theme}: inert until approach, one chosen request, stable known ratio`, { skip, timeout: 30000 }, async () => {
      const { context, page } = await harnessPage({ width, height: width === 1440 ? 900 : 844, theme });
      let requests = 0;
      await context.route(KNOWN, async (route) => {
        requests += 1;
        await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml", "cache-control": "public,max-age=31536000,immutable" }, body: SVG });
      });
      try {
        await mount(page, authoredHtml());
        await page.waitForTimeout(150);
        assert.equal(requests, 0, "template parsing and initial Post render schedule no body-media request");
        const before = await page.locator("img.authored").evaluate((image) => ({
          src: image.getAttribute("src"), srcset: image.getAttribute("srcset"),
          deferredSrc: image.dataset.sodPostMediaSrc, deferredSrcset: image.dataset.sodPostMediaSrcset,
          state: image.dataset.sodPostMediaState, width: image.getAttribute("width"), height: image.getAttribute("height"),
          alt: image.alt, caption: image.closest("figure").querySelector("figcaption").textContent,
          copy: image.closest("article").querySelector("[data-copy]").textContent,
          href: image.closest("a").getAttribute("href"),
        }));
        assert.deepEqual(before, {
          src: null, srcset: null, deferredSrc: KNOWN, deferredSrcset: `${KNOWN} 1x`, state: "pending",
          width: "941", height: "1672", alt: "עדות מן המקור", caption: "כיתוב מקורי", copy: "גוף המקור נשמר", href: "/original",
        });
        assert.equal(await page.locator("picture source").getAttribute("srcset"), null);
        assert.equal(await page.locator("picture source").getAttribute("data-sod-post-media-srcset"), KNOWN);

        await page.locator("img.authored").scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
        assert.equal(requests, 1, "the browser selects one picture candidate after approach");
        assert.equal(await page.locator("img.authored").getAttribute("src"), KNOWN);

        // React StrictMode effect replay and returning to an already-mounted
        // article do not observe or request an image that is already loaded.
        await page.evaluate(() => { window.__cleanup(); window.__cleanup = window.__observe(document.getElementById("root")); });
        await page.waitForTimeout(100);
        assert.equal(requests, 1);
        const cls = await page.evaluate(() => window.__layoutShifts.reduce((sum, value) => sum + value, 0));
        assert.ok(cls <= 0.1, `isolated CLS ${cls} must stay within the acceptance target`);
      } finally {
        await context.close();
      }
    });
  }
}

test("browser: a failed body image is bounded and retries the exact source", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const failedUrl = `${origin}/fail.png`;
  let attempts = 0;
  await context.route(failedUrl, async (route) => {
    attempts += 1;
    if (attempts === 1) return route.abort("failed");
    return route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    await mount(page, authoredHtml(failedUrl));
    await page.locator("img.authored").scrollIntoViewIfNeeded();
    await page.locator('[data-sod-post-media-failure="true"]').waitFor();
    assert.equal(await page.locator('[data-sod-post-media-source="true"]').getAttribute("href"), failedUrl);
    assert.equal(await page.locator('[data-sod-post-media-retry="true"]').textContent(), "נסו שוב");
    await page.locator('[data-sod-post-media-retry="true"]').click();
    await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
    assert.equal(attempts, 2);
    assert.equal(await page.locator('[data-sod-post-media-failure="true"]').count(), 0);
    assert.equal(await page.locator("figcaption").textContent(), "כיתוב מקורי");
  } finally {
    await context.close();
  }
});

test("browser negative control: all three eager FZ body images start at insertion; prepared markup starts none", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const assets = [KNOWN, ASSAF, SMIT];
  let requests = 0;
  for (const url of assets) {
    await context.route(url, async (route) => {
      requests += 1;
      await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
    });
  }
  const body = `<div class="spacer"></div>${assets.map((url) => `<img src="${url}" alt="מקור">`).join("")}`;
  try {
    await mount(page, body);
    await page.waitForTimeout(150);
    assert.equal(requests, 0, "the prepared 2029 body is inert while far outside the approach zone");
    assert.deepEqual(await page.locator("img").evaluateAll((images) => images.map((image) => [image.getAttribute("width"), image.getAttribute("height")])), [
      ["941", "1672"], ["576", "1024"], ["691", "1536"],
    ]);

    await page.evaluate((raw) => {
      window.__cleanup();
      document.getElementById("root").innerHTML = raw;
    }, body);
    for (let attempt = 0; attempt < 40 && requests < 3; attempt += 1) await page.waitForTimeout(25);
    assert.equal(requests, 3, "negative control: the unchanged authored src attributes start every body image immediately");
  } finally {
    await context.close();
  }
});

test("browser: no-IntersectionObserver fallback restores capability without changing the URL", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const fallbackUrl = `${origin}/cached.svg`;
  try {
    await mount(page, authoredHtml(fallbackUrl), "fallback");
    await page.waitForFunction((url) => document.querySelector("img.authored")?.getAttribute("src") === url, fallbackUrl);
    await page.locator("img.authored").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
    assert.equal(await page.locator("img.authored").getAttribute("src"), fallbackUrl);
  } finally {
    await context.close();
  }
});

test("browser: same-document back/remount is served from the immutable browser cache", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const cachedUrl = `${origin}/cached.svg`;
  cachedHits = 0;
  try {
    await mount(page, authoredHtml(cachedUrl));
    await page.locator("img.authored").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
    assert.equal(cachedHits, 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await mount(page, authoredHtml(cachedUrl));
    await page.locator("img.authored").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
    assert.equal(cachedHits, 1, "returning to the Post reuses the immutable resource without another server hit");
  } finally {
    await context.close();
  }
});

test("browser: source tags outside picture remain untouched", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  try {
    await page.evaluate(() => {
      const html = '<video controls><source src="/movie.mp4" type="video/mp4"></video>';
      document.getElementById("root").innerHTML = window.__prepare(html);
    });
    assert.equal(await page.locator("video source").getAttribute("src"), "/movie.mp4");
    assert.equal(await page.locator("video source").getAttribute("data-sod-post-media-srcset"), null);
  } finally {
    await context.close();
  }
});
