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
const UNKNOWN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800" viewBox="0 0 400 800"><rect width="400" height="800" fill="#446"/></svg>';
const TRANSPARENT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABeqhXUAAAAABJRU5ErkJggg==", "base64");
const svg = (width, height, fill = "#8a6a22") => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${fill ? `<rect width="${width}" height="${height}" fill="${fill}"/>` : ""}</svg>`;

test("contract: only the 2029 Post body gets the inert-media boundary", () => {
  assert.match(pageSource, /postReadingBodyHtml2029\(state\.projection\?\.post\)/);
  assert.match(pageSource, /preparePostBodyMedia2029\(hardenPassiveMediaHtml\(post\.content \|\| ""\)\)/);
  assert.match(pageSource, /return observePostBodyMedia2029\(sourceRef\.current\)/);
  assert.match(pageSource, /dangerouslySetInnerHTML=\{\{ __html: preparedPostBody \}\}/);
  assert.doesNotMatch(legacySource, /postBodyMedia2029|preparePostBodyMedia2029|observePostBodyMedia2029/);
  assert.match(helperSource, /reserveImageSpace\(image, authoredSource\)/);
  assert.match(helperSource, /rootMargin = "600px 0px"/);
  assert.match(helperSource, /observePending\("0px"\)/);
  assert.match(helperSource, /APPROACH_INTENT_DISTANCE_PX = 24/);
  assert.match(helperSource, /intentDistance >= APPROACH_INTENT_DISTANCE_PX && scrollDistance\(\) >= APPROACH_INTENT_DISTANCE_PX/);
  assert.match(helperSource, /\["wheel", onWheel/);
  assert.match(helperSource, /\["touchstart", onTouchStart/);
  assert.doesNotMatch(helperSource, /\["pointer(?:down|move|up|cancel)"/);
  assert.doesNotMatch(helperSource, /\["keydown"/);
  assert.doesNotMatch(helperSource, /beginIntent\("(?:pointer|keyboard)"\)/);
  assert.match(cssSource, /data-sod-post-media-state="pending"/);
  assert.doesNotMatch(cssSource, /data-sod-post-media-state="loaded"/);
  assert.doesNotMatch(cssSource, /data-sod-post-media-intrinsic="941x1672"/);
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
    if (url.pathname === "/post.css") {
      response.writeHead(200, { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" });
      return response.end(cssSource);
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
    response.end("<!doctype html><html><head><meta charset='utf-8'></head><body><div id='root' class='sod29-reading-source'></div></body></html>");
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

async function harnessPage({ width = 390, height = 844, theme = "dark", hasTouch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block", hasTouch });
  const page = await context.newPage();
  await page.goto(origin);
  await page.addStyleTag({ url: `${origin}/post.css` });
  await page.evaluate((selectedTheme) => {
    document.documentElement.dataset.themePreset = selectedTheme;
    document.body.style.margin = "0";
    document.body.insertAdjacentHTML("afterbegin", `<style>
      :root{--s29-panel-soft:rgb(74 72 68);--s29-ink:rgb(18 18 18);--s29-muted:rgb(82 82 82);--s29-line:rgb(120 120 120);--s29-line-strong:rgb(80 80 80);--s29-panel:rgb(248 248 248);--s29-accent-text:rgb(80 50 10)}
      #root{max-width:900px;margin:auto}.spacer{height:2200px}
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

const authoredHtml = (src = KNOWN, dimensions = src === KNOWN ? "" : ' width="941" height="1672"') => `<article><p data-copy="true">גוף המקור נשמר</p><div class="spacer"></div><figure data-figure="true"><a href="/original" data-original-link="true"><picture><source media="(min-width: 1px)" type="image/png" srcset="${src}"><img class="authored" src="${src}" srcset="${src} 1x"${dimensions} alt="עדות מן המקור"></picture></a><figcaption>כיתוב מקורי</figcaption></figure></article>`;

async function mount(page, html, observerOptions = null) {
  await page.evaluate(({ source, options }) => {
    window.__cleanup?.();
    const root = document.getElementById("root");
    root.innerHTML = window.__prepare(source);
    window.__cleanup = options === "none"
      ? () => {}
      : options === "fallback"
        ? window.__observe(root, { IntersectionObserverRef: null })
        : window.__observe(root);
  }, { source: html, options: observerOptions });
}

async function geometry(page, selector) {
  return page.locator(selector).evaluate((image) => {
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    const marker = image.parentElement?.querySelector("[data-after]");
    const markerRect = marker?.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      display: style.display,
      verticalAlign: style.verticalAlign,
      background: style.backgroundColor,
      markerLeft: markerRect?.left ?? null,
      markerTop: markerRect?.top ?? null,
      state: image.dataset.sodPostMediaState || null,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  });
}

function assertGeometryEqual(actual, expected, label) {
  for (const key of ["width", "height", "left", "top", "markerLeft", "markerTop"]) {
    if (actual[key] === null || expected[key] === null) {
      assert.equal(actual[key], expected[key], `${label} ${key}`);
    } else {
      assert.ok(Math.abs(actual[key] - expected[key]) <= 0.51, `${label} ${key}: ${actual[key]} vs ${expected[key]}`);
    }
  }
  assert.equal(actual.display, expected.display, `${label} display`);
  assert.equal(actual.verticalAlign, expected.verticalAlign, `${label} vertical-align`);
}

for (const width of [320, 390, 1440]) {
  for (const theme of ["light", "parchment", "dark"]) {
    test(`browser ${width}px ${theme}: inert until viewport, one chosen request, stable known ratio`, { skip, timeout: 30000 }, async () => {
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
        assert.match(before.src, /^data:image\/svg\+xml,/);
        assert.deepEqual({ ...before, src: "[local intrinsic placeholder]" }, {
          src: "[local intrinsic placeholder]", srcset: null, deferredSrc: KNOWN, deferredSrcset: `${KNOWN} 1x`, state: "pending",
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

for (const width of [390, 400, 1440]) {
  test(`browser ${width}px: real Post CSS keeps verified and authored reservations identical while pending/loading/loaded`, { skip, timeout: 30000 }, async () => {
    const baselineHarness = await harnessPage({ width, height: 900 });
    const candidateHarness = await harnessPage({ width, height: 900 });
    const authoredUrl = `${origin}/authored-${width}.svg`;
    const cases = [
      { key: "plane", url: KNOWN, width: 941, height: 1672, body: svg(941, 1672), attrs: "", style: "display:block;width:100%;height:auto;border-radius:16px" },
      { key: "assaf", url: ASSAF, width: 576, height: 1024, body: svg(576, 1024), attrs: "", style: "display:block;width:100%;height:auto;border-radius:14px" },
      { key: "smit", url: SMIT, width: 691, height: 1536, body: svg(691, 1536), attrs: "", style: "display:block;width:100%;height:auto;border-radius:14px" },
      { key: "authored", url: authoredUrl, width: 400, height: 800, body: svg(400, 800), attrs: ' width="400" height="800"', style: "" },
    ];
    const raw = cases.map((entry) => entry.key === "authored"
      ? `<p style="margin:0">לפני <img class="reserve-${entry.key}" src="${entry.url}"${entry.attrs} alt="authored"> <span data-after>אחרי</span></p>`
      : `<figure style="margin:0"><img class="reserve-${entry.key}" src="${entry.url}" alt="${entry.key}" style="${entry.style}"><figcaption data-after>${entry.key}</figcaption></figure>`).join("");
    const releases = [];
    let candidateRequests = 0;
    try {
      for (const entry of cases) {
        await baselineHarness.context.route(entry.url, (route) => route.fulfill({
          status: 200,
          headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
          body: entry.body,
        }));
        await candidateHarness.context.route(entry.url, async (route) => {
          candidateRequests += 1;
          await new Promise((resolve) => releases.push(resolve));
          await route.fulfill({
            status: 200,
            headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
            body: entry.body,
          });
        });
      }

      await baselineHarness.page.evaluate((html) => { document.getElementById("root").innerHTML = html; }, raw);
      await baselineHarness.page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.complete && image.naturalWidth > 0));
      const baseline = {};
      for (const entry of cases) baseline[entry.key] = await geometry(baselineHarness.page, `.reserve-${entry.key}`);

      await mount(candidateHarness.page, raw, "none");
      const placeholderSources = await candidateHarness.page.locator("#root img").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
      for (const source of placeholderSources) assert.match(source, /^data:image\/svg\+xml,/, "every deferred reservation is a local replaced-image placeholder");
      await candidateHarness.page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.complete && image.naturalWidth > 0));
      await candidateHarness.page.waitForTimeout(50);
      assert.equal(candidateRequests, 0, "transparent intrinsic placeholders make no network request");
      for (const entry of cases) {
        const pending = await geometry(candidateHarness.page, `.reserve-${entry.key}`);
        assert.equal(pending.state, "pending");
        assertGeometryEqual(pending, baseline[entry.key], `${entry.key} pending at ${width}px`);
      }

      await candidateHarness.page.evaluate(() => {
        window.__layoutShifts = [];
        const root = document.getElementById("root");
        window.__cleanup = window.__observe(root, { IntersectionObserverRef: null });
      });
      await candidateHarness.page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.dataset.sodPostMediaState === "loading"));
      for (let attempt = 0; attempt < 50 && candidateRequests < cases.length; attempt += 1) await candidateHarness.page.waitForTimeout(20);
      assert.equal(candidateRequests, cases.length, "every eligible image starts exactly once at activation");
      for (const entry of cases) {
        const loading = await geometry(candidateHarness.page, `.reserve-${entry.key}`);
        assertGeometryEqual(loading, baseline[entry.key], `${entry.key} loading at ${width}px`);
      }

      for (const release of releases.splice(0)) release();
      await candidateHarness.page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.dataset.sodPostMediaState === "loaded"));
      await candidateHarness.page.waitForTimeout(100);
      for (const entry of cases) {
        const loaded = await geometry(candidateHarness.page, `.reserve-${entry.key}`);
        assertGeometryEqual(loaded, baseline[entry.key], `${entry.key} loaded at ${width}px`);
        assert.equal(loaded.background, baseline[entry.key].background, `${entry.key} loaded background returns to baseline`);
      }
      const cls = await candidateHarness.page.evaluate(() => window.__layoutShifts.reduce((sum, value) => sum + value, 0));
      assert.ok(cls <= 0.001, `activation CLS ${cls} at ${width}px`);
    } finally {
      for (const release of releases.splice(0)) release();
      await Promise.all([baselineHarness.context.close(), candidateHarness.context.close()]);
    }
  });
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
    assert.equal(await page.locator("img.authored").getAttribute("data-sod-post-media-state"), "failed");
    assert.match(await page.locator("img.authored").getAttribute("src"), /^data:image\/svg\+xml,/);
    assert.notEqual((await geometry(page, "img.authored")).background, "rgba(0, 0, 0, 0)");
    assert.equal(await page.locator('[data-sod-post-media-source="true"]').getAttribute("href"), failedUrl);
    assert.equal(await page.locator('[data-sod-post-media-retry="true"]').textContent(), "נסו שוב");
    await page.locator('[data-sod-post-media-retry="true"]').click();
    await page.waitForFunction(() => document.querySelector("img.authored")?.dataset.sodPostMediaState === "loaded");
    await page.waitForTimeout(150);
    assert.equal(attempts, 2);
    assert.equal((await geometry(page, "img.authored")).background, "rgba(0, 0, 0, 0)");
    assert.equal(await page.locator('[data-sod-post-media-failure="true"]').count(), 0);
    assert.equal(await page.locator("figcaption").textContent(), "כיתוב מקורי");
  } finally {
    await context.close();
  }
});

for (const height of [1080, 1200]) {
  for (const theme of ["light", "parchment", "dark"]) {
    test(`browser 1440x${height} ${theme}: first frame and tiny input stay inert; meaningful scroll enables approach`, { skip, timeout: 30000 }, async () => {
      const { context, page } = await harnessPage({ width: 1440, height, theme });
      let requests = 0;
      await context.route(KNOWN, async (route) => {
        requests += 1;
        await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
      });
      try {
        const body = `<article><div style="height:1650px"></div><img class="near" src="${KNOWN}" alt="near"></article>`;
        await mount(page, body);
        await page.waitForTimeout(200);
        assert.equal(requests, 0, "an off-viewport image inside the 600px zone stays inert on the first frame");
        assert.equal(await page.locator("img.near").getAttribute("data-sod-post-media-state"), "pending");
        assert.match(await page.locator("img.near").getAttribute("src"), /^data:image\/svg\+xml,/);

        await page.evaluate(() => dispatchEvent(new WheelEvent("wheel", { deltaY: 1 })));
        await page.waitForTimeout(50);
        assert.equal(await page.locator("img.near").getAttribute("data-sod-post-media-state"), "pending", "synthetic input is not scroll intent");

        await page.mouse.wheel(0, 1);
        await page.waitForTimeout(100);
        assert.equal(await page.locator("img.near").getAttribute("data-sod-post-media-state"), "pending", "one trusted wheel pixel is below the intent threshold");
        assert.equal(requests, 0);

        await page.mouse.wheel(0, 40);
        await page.waitForFunction(() => document.querySelector("img.near")?.dataset.sodPostMediaState !== "pending");
        assert.equal(await page.locator("img.near").getAttribute("src"), KNOWN, "proven input plus real scroll enables the approach observer");
        await page.locator("img.near").scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector("img.near")?.dataset.sodPostMediaState === "loaded");
        assert.equal(requests, 1);
      } finally {
        await context.close();
      }
    });
  }
}

test("browser: click, programmatic scroll, hash navigation and history restoration do not authorize approach", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200 });
  const mediaUrl = `${origin}/history-intent.svg`;
  let requests = 0;
  await context.route(mediaUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  try {
    const body = `<button id="noop" type="button">tap</button> <a id="jump-link" href="#jump">jump</a><div style="height:200px"></div><div id="jump"></div><div style="height:1400px"></div><img class="history-intent" src="${mediaUrl}" width="400" height="800" alt="history intent">`;
    await mount(page, body);
    await page.waitForTimeout(100);
    await page.locator("#noop").click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.history-intent").getAttribute("data-sod-post-media-state"), "pending", "pointer down/up and click without movement are not scroll intent");

    await page.locator("#jump-link").click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => location.hash), "#jump");
    assert.equal(await page.locator("img.history-intent").getAttribute("data-sod-post-media-state"), "pending", "hash scrolling is not input authorization");
    await page.goBack();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => location.hash), "");
    assert.equal(await page.locator("img.history-intent").getAttribute("data-sod-post-media-state"), "pending", "back restoration is not input authorization");
    await page.goForward();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => location.hash), "#jump");
    assert.equal(await page.locator("img.history-intent").getAttribute("data-sod-post-media-state"), "pending", "forward restoration is not input authorization");

    await page.evaluate(() => scrollBy(0, 50));
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.history-intent").getAttribute("data-sod-post-media-state"), "pending", "programmatic scrolling cannot authorize prefetch");
    assert.equal(requests, 0);

    await page.mouse.wheel(0, 80);
    await page.waitForFunction(() => document.querySelector("img.history-intent")?.dataset.sodPostMediaState === "loaded");
    assert.equal(requests, 1, "meaningful trusted input plus actual movement enables the 600px approach zone once");
  } finally {
    await context.close();
  }
});

test("browser: a pointer drag cannot leave stale intent for programmatic scroll", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200 });
  const mediaUrl = `${origin}/pointer-intent.svg`;
  let requests = 0;
  await context.route(mediaUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  try {
    await mount(page, `<div style="height:1650px"></div><img class="pointer-intent" src="${mediaUrl}" width="400" height="800" alt="pointer intent">`);
    await page.mouse.move(300, 500);
    await page.mouse.down();
    await page.mouse.move(300, 580, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.equal(await page.locator("img.pointer-intent").getAttribute("data-sod-post-media-state"), "pending", "an 80px pointer drag is not approach authorization");

    await page.evaluate(() => scrollBy(0, 80));
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.pointer-intent").getAttribute("data-sod-post-media-state"), "pending", "programmatic movement cannot complete rejected pointer input");
    assert.equal(requests, 0);

    await page.mouse.wheel(0, 80);
    await page.waitForFunction(() => document.querySelector("img.pointer-intent")?.dataset.sodPostMediaState === "loaded");
    assert.equal(requests, 1, "a later trusted wheel with real movement can authorize approach");
  } finally {
    await context.close();
  }
});

test("browser: a prevented scroll key cannot leave stale intent; keyboard loads only at the 0px viewport", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200 });
  const mediaUrl = `${origin}/keyboard-intent.svg`;
  let requests = 0;
  await context.route(mediaUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  try {
    await mount(page, `<div style="height:1650px"></div><img class="keyboard-intent" src="${mediaUrl}" width="400" height="800" alt="keyboard intent">`);
    await page.evaluate(() => {
      window.__preventArrowDown = (event) => {
        if (event.key === "ArrowDown") event.preventDefault();
      };
      addEventListener("keydown", window.__preventArrowDown, true);
    });
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => scrollY), 0, "the key was prevented and produced no movement");
    await page.evaluate(() => scrollBy(0, 80));
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.keyboard-intent").getAttribute("data-sod-post-media-state"), "pending", "programmatic movement cannot complete rejected keyboard input");
    assert.equal(requests, 0);

    await page.evaluate(() => removeEventListener("keydown", window.__preventArrowDown, true));
    await page.keyboard.press("End");
    await page.waitForFunction(() => document.querySelector("img.keyboard-intent")?.dataset.sodPostMediaState === "loaded");
    assert.ok(await page.locator("img.keyboard-intent").evaluate((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    }), "keyboard navigation still loads media once the 0px observer sees it in the viewport");
    assert.equal(requests, 1, "viewport entry makes one request without enabling the 600px approach gate");
  } finally {
    await context.close();
  }
});

test("browser: tap and tiny touch stay inert; a meaningful touch scroll enables approach", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200, hasTouch: true });
  const mediaUrl = `${origin}/touch-intent.svg`;
  let requests = 0;
  await context.route(mediaUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  const cdp = await context.newCDPSession(page);
  const touch = (type, y) => cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ x: 300, y }],
  });
  try {
    await mount(page, `<div style="height:1650px"></div><img class="touch-intent" src="${mediaUrl}" width="400" height="800" alt="touch intent">`);
    await touch("touchStart", 700);
    await touch("touchEnd", 700);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.touch-intent").getAttribute("data-sod-post-media-state"), "pending", "tap is inert");

    await touch("touchStart", 700);
    await touch("touchMove", 695);
    await touch("touchEnd", 695);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.touch-intent").getAttribute("data-sod-post-media-state"), "pending", "tiny touch stays below threshold");
    assert.equal(requests, 0);

    await touch("touchStart", 700);
    for (const y of [675, 650, 625, 600]) {
      await touch("touchMove", y);
      await page.waitForTimeout(20);
    }
    await touch("touchEnd", 600);
    await page.waitForFunction(() => document.querySelector("img.touch-intent")?.dataset.sodPostMediaState === "loaded");
    assert.ok(await page.evaluate(() => scrollY) >= 24, "the touch gesture produced real scrolling");
    assert.equal(requests, 1);
  } finally {
    await context.close();
  }
});

test("browser: a truly in-viewport verified image activates without interaction", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200 });
  let requests = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await context.route(KNOWN, async (route) => {
    requests += 1;
    await gate;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    await mount(page, `<img class="visible" src="${KNOWN}" alt="visible">`);
    await page.waitForFunction(() => document.querySelector("img.visible")?.dataset.sodPostMediaState === "loading");
    await page.waitForTimeout(100);
    assert.equal(await page.locator("img.visible").getAttribute("data-sod-post-media-state"), "loading", "the placeholder load event cannot complete the held real request");
    assert.equal(requests, 1);
    release();
    await page.waitForFunction(() => document.querySelector("img.visible")?.dataset.sodPostMediaState === "loaded");
    assert.equal(requests, 1);
  } finally {
    release();
    await context.close();
  }
});

test("browser negative: unknown 400x800 no-dimension image is byte- and behavior-equivalent", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 400, height: 800 });
  const unknownUrl = `${origin}/unknown.svg`;
  const body = `<figure><img class="unknown" src="${unknownUrl}" alt="unknown"><figcaption>unknown caption</figcaption></figure>`;
  let requests = 0;
  await context.route(unknownUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  try {
    assert.equal(await page.evaluate((html) => window.__prepare(html), body), body, "ineligible markup is returned byte-for-byte");
    await mount(page, body);
    await page.waitForFunction(() => document.querySelector("img.unknown")?.complete);
    assert.equal(requests, 1, "the unchanged eager request still starts exactly once");
    assert.deepEqual(await page.locator("img.unknown").evaluate((image) => ({
      src: image.getAttribute("src"), width: image.getAttribute("width"), height: image.getAttribute("height"),
      state: image.getAttribute("data-sod-post-media-state"), deferred: image.getAttribute("data-sod-post-media-src"),
      loading: image.getAttribute("loading"), alt: image.alt,
    })), { src: unknownUrl, width: null, height: null, state: null, deferred: null, loading: null, alt: "unknown" });
  } finally {
    await context.close();
  }
});

test("browser negative: an unknown no-dimension image stays eager beside a managed image", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 400, height: 800 });
  const unknownUrl = `${origin}/unknown-mixed.svg`;
  let unknownRequests = 0;
  let knownRequests = 0;
  await context.route(unknownUrl, async (route) => {
    unknownRequests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: UNKNOWN_SVG });
  });
  await context.route(KNOWN, async (route) => {
    knownRequests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    const body = `<div class="spacer"></div><img class="known-mixed" src="${KNOWN}" alt="known"><img class="unknown-mixed" src="${unknownUrl}" alt="unknown">`;
    await mount(page, body);
    await page.waitForFunction(() => document.querySelector("img.unknown-mixed")?.complete);
    assert.deepEqual({ unknownRequests, knownRequests }, { unknownRequests: 1, knownRequests: 0 });
    assert.deepEqual(await page.locator("img.unknown-mixed").evaluate((image) => ({
      src: image.getAttribute("src"), width: image.getAttribute("width"), height: image.getAttribute("height"),
      state: image.getAttribute("data-sod-post-media-state"), deferred: image.getAttribute("data-sod-post-media-src"),
    })), { src: unknownUrl, width: null, height: null, state: null, deferred: null });
    assert.match(await page.locator("img.known-mixed").getAttribute("src"), /^data:image\/svg\+xml,/);
    assert.equal(await page.locator("img.known-mixed").getAttribute("data-sod-post-media-state"), "pending");
  } finally {
    await context.close();
  }
});

test("browser negative: source-only picture is preserved and loads normally", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const sourceUrl = `${origin}/source-only.svg`;
  const body = `<picture><source type="image/svg+xml" srcset="${sourceUrl}"><img class="source-only" alt="source only"></picture>`;
  let requests = 0;
  await context.route(sourceUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    assert.equal(await page.evaluate((html) => window.__prepare(html), body), body);
    await mount(page, body);
    await page.waitForFunction(() => document.querySelector("img.source-only")?.complete);
    assert.equal(requests, 1);
    assert.equal(await page.locator("picture source").getAttribute("srcset"), sourceUrl);
    assert.equal(await page.locator("picture source").getAttribute("data-sod-post-media-srcset"), null);
    assert.equal(await page.locator("img.source-only").getAttribute("data-sod-post-media-state"), null);
  } finally {
    await context.close();
  }
});

test("browser: a managed picture selects one candidate request", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const selectedUrl = `${origin}/selected.svg`;
  const fallbackUrl = `${origin}/fallback.svg`;
  let selectedRequests = 0;
  let fallbackRequests = 0;
  let releaseSelected;
  const selectedGate = new Promise((resolve) => { releaseSelected = resolve; });
  await context.route(selectedUrl, async (route) => {
    selectedRequests += 1;
    await selectedGate;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  await context.route(fallbackUrl, async (route) => {
    fallbackRequests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    const body = `<div class="spacer"></div><picture><source media="(min-width:1px)" type="image/svg+xml" srcset="${selectedUrl}"><img class="selected" src="${fallbackUrl}" width="941" height="1672" alt="selected"></picture>`;
    await mount(page, body);
    await page.waitForTimeout(100);
    assert.equal(selectedRequests + fallbackRequests, 0);
    const pending = await geometry(page, "img.selected");
    assert.equal(pending.state, "pending");
    await page.locator("img.selected").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("img.selected")?.dataset.sodPostMediaState === "loading");
    const loading = await geometry(page, "img.selected");
    assert.ok(Math.abs(loading.width - pending.width) <= 0.51);
    assert.ok(Math.abs(loading.height - pending.height) <= 0.51);
    assert.equal(loading.display, pending.display);
    await page.evaluate(() => { window.__layoutShifts = []; });
    releaseSelected();
    await page.waitForFunction(() => document.querySelector("img.selected")?.dataset.sodPostMediaState === "loaded");
    const loaded = await geometry(page, "img.selected");
    assertGeometryEqual(loaded, loading, "picture loading to loaded");
    assert.equal(loaded.background, "rgba(0, 0, 0, 0)");
    assert.ok(await page.evaluate(() => window.__layoutShifts.reduce((sum, value) => sum + value, 0)) <= 0.001);
    assert.deepEqual({ selectedRequests, fallbackRequests }, { selectedRequests: 1, fallbackRequests: 0 });
    assert.equal(await page.locator("img.selected").evaluate((image) => image.currentSrc), selectedUrl);
  } finally {
    releaseSelected();
    await context.close();
  }
});

test("browser: real transparent SVG and PNG lose the placeholder background after load", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 400, height: 800 });
  const transparentSvgUrl = `${origin}/transparent.svg`;
  const transparentPngUrl = `${origin}/transparent.png`;
  let requests = 0;
  await context.route(transparentSvgUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: svg(40, 80, "") });
  });
  await context.route(transparentPngUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/png" }, body: TRANSPARENT_PNG });
  });
  try {
    const body = `<img class="transparent-svg" src="${transparentSvgUrl}" width="40" height="80" alt="transparent svg"><img class="transparent-png" src="${transparentPngUrl}" width="1" height="1" alt="transparent png">`;
    await mount(page, body, "none");
    await page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.complete));
    assert.equal(requests, 0);
    for (const selector of ["img.transparent-svg", "img.transparent-png"]) {
      const pending = await geometry(page, selector);
      assert.equal(pending.state, "pending");
      assert.notEqual(pending.background, "rgba(0, 0, 0, 0)", "pending media retains a neutral placeholder background");
    }

    await page.evaluate(() => {
      const root = document.getElementById("root");
      window.__cleanup = window.__observe(root, { IntersectionObserverRef: null });
    });
    await page.waitForFunction(() => [...document.querySelectorAll("#root img")].every((image) => image.dataset.sodPostMediaState === "loaded"));
    assert.equal(requests, 2);
    const result = await page.locator("#root img").evaluateAll((images) => images.map((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context2d = canvas.getContext("2d", { willReadFrequently: true });
      context2d.drawImage(image, 0, 0, 1, 1);
      return {
        background: getComputedStyle(image).backgroundColor,
        alpha: context2d.getImageData(0, 0, 1, 1).data[3],
        placeholder: image.getAttribute("data-sod-post-media-placeholder"),
      };
    }));
    assert.deepEqual(result, [
      { background: "rgba(0, 0, 0, 0)", alpha: 0, placeholder: null },
      { background: "rgba(0, 0, 0, 0)", alpha: 0, placeholder: null },
    ]);
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

test("browser: pending cleanup and StrictMode replay leave one live observer and one request", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage({ width: 1440, height: 1200 });
  const mediaUrl = `${origin}/strict-replay.svg`;
  let requests = 0;
  await context.route(mediaUrl, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
  });
  try {
    const body = `<div style="height:1650px"></div><img class="strict" src="${mediaUrl}" width="941" height="1672" alt="strict">`;
    await mount(page, body);
    await page.evaluate(() => window.__cleanup());
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(100);
    assert.equal(requests, 0);
    assert.equal(await page.locator("img.strict").getAttribute("data-sod-post-media-state"), "pending");

    await page.evaluate(() => {
      const root = document.getElementById("root");
      window.__cleanup = window.__observe(root);
      window.__cleanup();
      window.__cleanup = window.__observe(root);
    });
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(200);
    const approach = await page.locator("img.strict").evaluate((image) => ({
      state: image.dataset.sodPostMediaState,
      top: image.getBoundingClientRect().top,
      scrollY: scrollY,
    }));
    assert.notEqual(approach.state, "pending", `meaningful replay intent must activate: ${JSON.stringify(approach)}`);
    await page.locator("img.strict").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("img.strict")?.dataset.sodPostMediaState === "loaded");
    assert.equal(requests, 1);
  } finally {
    await context.close();
  }
});

test("browser negative: both video posters and video sources remain untouched", { skip, timeout: 30000 }, async () => {
  const { context, page } = await harnessPage();
  const posterOne = `${origin}/poster-one.svg`;
  const posterTwo = `${origin}/poster-two.svg`;
  let posterRequests = 0;
  for (const poster of [posterOne, posterTwo]) {
    await context.route(poster, async (route) => {
      posterRequests += 1;
      await route.fulfill({ status: 200, headers: { "content-type": "image/svg+xml" }, body: SVG });
    });
  }
  try {
    const body = `<video controls preload="none" poster="${posterOne}"><source src="/movie-one.mp4" type="video/mp4"></video><video controls preload="none" poster="${posterTwo}"><source src="/movie-two.mp4" type="video/mp4"></video>`;
    assert.equal(await page.evaluate((html) => window.__prepare(html), body), body);
    await mount(page, body);
    for (let attempt = 0; attempt < 40 && posterRequests < 2; attempt += 1) await page.waitForTimeout(25);
    assert.equal(posterRequests, 2, "the image-only scope intentionally leaves both poster requests eager");
    assert.deepEqual(await page.locator("video").evaluateAll((videos) => videos.map((video) => ({
      poster: video.getAttribute("poster"), source: video.querySelector("source")?.getAttribute("src"),
      deferred: video.querySelector("source")?.getAttribute("data-sod-post-media-srcset"),
    }))), [
      { poster: posterOne, source: "/movie-one.mp4", deferred: null },
      { poster: posterTwo, source: "/movie-two.mp4", deferred: null },
    ]);
  } finally {
    await context.close();
  }
});
