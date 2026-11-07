// Built Home request-admission and Post passive-media acceptance. All APIs are
// synthetic and blocked from the network. The unified performance lab measures timing.
// BEFORE_DIST=<4cf3079 build> AFTER_DIST=<candidate> OUT=/tmp/... node ...
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BEFORE = resolve(process.env.BEFORE_DIST || "/tmp/sod1820-home-before-dist");
const AFTER = resolve(process.env.AFTER_DIST || "preview-deploy/dist");
const OUT = process.env.OUT || "/tmp/home-loading-acceptance-20261031";
const TITLE = "מקור ציבורי לדוגמת מדידת פתיחה";
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2rL0AAAAASUVORK5CYII=", "base64");
const post = { id: 1, slug: "performance-public-fixture", title: TITLE, content: "<p>תוכן ציבורי מדומה למדידת המעבר בלבד.</p>", excerpt: "דוגמת בדיקה", tags: [], categories: [], source: "site", date: "2026-10-31T00:00:00Z", modified: "2026-10-31T00:00:00Z", image_url: "https://public-fixture.invalid/post.png", thumb_url: "https://public-fixture.invalid/post.png" };
const flags = ["lock_world", "lock_number", "lock_books", "lock_els", "lock_life_journey", "lock_heichal", "lock_raziel_site", "lock_forum", "lock_galleries"].map(key => ({ key, enabled: false, mode: "all", message: "" }));
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ttf": "font/ttf" };
await mkdir(OUT, { recursive: true });

async function serve(dist) {
  const cache = new Map();
  const entry = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json")))["2029.html"].file;
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://local.invalid").pathname;
    let file = resolve(dist, "." + decodeURIComponent(path));
    if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "2029.html");
    const type = types[extname(file)] || "application/octet-stream";
    if (!cache.has(file)) {
      let raw = readFileSync(file);
      // In-process lab harness only: both artifacts use their exact built entry,
      // while every API is intercepted above. The hosted SW guard is unchanged
      // and verified separately; its bootstrap latency is NOT measured here.
      if (file.endsWith(".html")) raw = Buffer.from(raw.toString().replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/, `<script type="module" src="/${entry}"></script>`));
      const compress = /javascript|text\/|json|svg/.test(type);
      cache.set(file, { data: compress ? gzipSync(raw) : raw, compress });
    }
    const { data, compress } = cache.get(file);
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", "Content-Length": data.length, ...(compress ? { "Content-Encoding": "gzip" } : {}) });
    res.end(data);
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}

async function install(context, origin, theme, { failChunk = null, noObserver = false, primaryDelay = 0, fixture = {} } = {}) {
  const state = { flagReads: 0, requests: [], modelCalls: [], blockedWrites: [], pageErrors: [], failChunk };
  await context.addInitScript(({ theme, title, noObserver }) => {
    if (noObserver) delete window.IntersectionObserver;
    localStorage.setItem("sod-theme", theme);
    window.__perf = { primary_ms: null, lcp: null, cls: 0, longTasks: 0, longTaskMs: 0 };
    const observe = (type, fn) => { try { new PerformanceObserver(list => list.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch {} };
    observe("largest-contentful-paint", e => { window.__perf.lcp = e.startTime; });
    observe("layout-shift", e => { if (!e.hadRecentInput) window.__perf.cls += e.value; });
    observe("longtask", e => { window.__perf.longTasks++; window.__perf.longTaskMs += e.duration; });
    const observer = new MutationObserver(() => {
      if (window.__perf.primary_ms === null && document.querySelector(".h29-hero")?.textContent.includes(title)) window.__perf.primary_ms = performance.now();
    });
    observer.observe(document, { subtree: true, childList: true });
  }, { theme, title: TITLE, noObserver });
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    state.requests.push({ path: url.pathname, query: url.search, method: req.method() });
    if (url.origin === origin) {
      if (url.pathname.startsWith("/api/")) return reply({ state: "login_required" }, 401);
      if (state.failChunk && url.pathname.endsWith(state.failChunk)) return route.abort();
      return route.continue();
    }
    if (url.hostname === "public-fixture.invalid" || /\.(png|jpg|webp)(\?|$)/.test(url.pathname)) return route.fulfill({ contentType: "image/png", body: image });
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    const name = url.pathname.split("/").at(-1);
    if (url.pathname.includes("/functions/")) { state.modelCalls.push(url.pathname); return reply({}, 403); }
    if (url.pathname === "/auth/v1/settings") return reply({ external: { email: true } });
    if (name === "site_flags") { state.flagReads++; await new Promise(done => setTimeout(done, 250)); return reply(flags); }
    if (name === "home_videos") return reply(fixture.failVideos ? { message: "synthetic video failure" } : [{ yt: "fixture-video", slug: "fixture-video", title: "סרטון בדיקה ציבורי", poster_url: "https://public-fixture.invalid/video.png" }], fixture.failVideos ? 503 : 200);
    if (name === "posts" && primaryDelay && url.searchParams.get("limit") === "9") await new Promise(done => setTimeout(done, primaryDelay));
    if (name === "posts") return reply(url.searchParams.get("select")?.includes("content") && req.headers().accept?.includes("object") ? post : [post], 200, { "content-range": "0-0/1" });
    if (name === "channel_updates") return reply([{ id: "11111111-1111-4111-8111-111111111111", text: "מקור ציבורי מדומה לסטורי", image_url: "https://public-fixture.invalid/story.png", created_at: "2026-10-31T00:00:00Z", priority: 50, credit: "דוגמת בדיקה" }]);
    if (["link_identity", "track_visit", "ingest_event"].includes(name)) return route.abort();
    if (req.method() === "GET" || req.method() === "HEAD") return reply([], 200, { "content-range": "*/0" });
    const reads = new Set(["world_group_source_arrivals_v2", "rd_is_admin", "fn_list_family", "fn_method_value", "get_reality_videos", "community_feed_page", "writer_public_contributions_page_v1", "fn_number_lookup", "fn_number_dossier", "fn_number_journey"]);
    if (reads.has(name)) return reply(name === "fn_method_value" ? null : []);
    state.blockedWrites.push(url.pathname); return reply({}, 403);
  });
  return state;
}

const servers = { before: await serve(BEFORE), after: await serve(AFTER) };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const evidence = { scope: "built_local_synthetic_API_not_hosted_or_field", base: "4cf3079342e82e73633d18a3ab37cda5479dce72", cases: [] };
function record(result) { evidence.cases.push(result); console.log(JSON.stringify({ kind: result.kind, width: result.width, label: result.label, pass: true })); }
const videos = page => page.locator('.h29-strip').filter({ has: page.getByRole('heading', { name: 'הסרטים האחרונים', exact: true }) });
const world = page => page.locator('.h29-stream');
const homeDimensionRead = request => {
  const query = new URLSearchParams(request.query);
  return request.path.endsWith('/posts') && query.get('select') === '*'
    && query.get('tags') === 'cs.{מימד חמש}' && query.get('limit') === '1' && query.get('offset') === '0';
};
// Attribute the exact Home reader. The destination Posts page has its own
// compact, author-filtered Dimension Five read; that is not late Home work.
const deferredReads = state => state.requests.filter(r => /\/(home_videos|contributors|gallery_images)$/.test(r.path) || homeDimensionRead(r));
const count = (state, name) => state.requests.filter(r => r.path.endsWith('/' + name)).length;
async function open(width, theme = 'parchment', options = {}, label = 'after', path = '/2029') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: options.reduce ? 'reduce' : 'no-preference' });
  const state = await install(context, servers[label].origin, theme, options);
  const page = await context.newPage(); page.on('pageerror', e => state.pageErrors.push(e.message));
  await page.goto(servers[label].origin + path);
  return { context, page, state };
}
async function ready(page) {
  await page.waitForFunction(() => window.__perf.primary_ms !== null);
  await page.waitForTimeout(1000);
}
function clean(state) { assert.equal(state.modelCalls.length, 0); assert.deepEqual(state.pageErrors, []); }
try {
  // Identical fixtures, both exact artifacts. Compare settled no-scroll request
  // demand and geometry separately from cold timing (the paired lab owns that).
  for (const width of [390, 1440]) for (const label of ['before', 'after']) {
    const { context, page, state } = await open(width, 'parchment', {}, label);
    await ready(page);
    const geometry = await page.locator('.h29 > *, .h29-strip').evaluateAll(es => es.map(e => ({
      label: e.getAttribute('aria-label'), className: e.className,
      top: Math.round(e.getBoundingClientRect().top), height: Math.round(e.getBoundingClientRect().height),
    })));
    const reads = state.requests.filter(r => r.path.includes('/rest/'));
    if (label === 'before') assert.ok(deferredReads(state).length >= 4);
    else assert.deepEqual(deferredReads(state), [], 'below-fold readers stay idle without approach');
    assert.ok(count(state, 'gematria_words') > 0, 'adopted corpus pulse is retained');
    assert.ok(count(state, 'fn_method_value') > 0, 'adopted temporal verification is retained');
    clean(state);
    record({ label, width, kind: 'no_scroll', apiReads: reads.length, deferredReads: deferredReads(state).length, geometry, reads });
    await context.close();
  }
  for (const width of [320, 360, 390, 1440]) for (const theme of ['light', 'parchment', 'dark']) {
    const { context, page, state } = await open(width, theme);
    await ready(page);
    assert.deepEqual(deferredReads(state), []);
    await videos(page).scrollIntoViewIfNeeded();
    await videos(page).getByText('סרטון בדיקה ציבורי', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(count(state, 'home_videos'), 1);
    await world(page).scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('[data-reality-river] [role="status"]')?.textContent.includes('פותחים'));
    await page.waitForTimeout(500);
    assert.equal(count(state, 'gallery_images'), 1);
    assert.ok(count(state, 'contributors') > 0);
    await page.getByRole('region', { name: 'מוקדי זהות', exact: true }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    assert.ok(state.requests.some(homeDimensionRead));
    await page.evaluate(() => scrollTo(0, 0));
    await videos(page).scrollIntoViewIfNeeded(); await world(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.equal(count(state, 'home_videos'), 1, 'returning to an admitted section does not reread');
    assert.equal(count(state, 'gallery_images'), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.locator('[data-experience-capability="home-els-entry"]').count(), 1);
    const animation = await page.locator('.els-hm__rig').evaluate(e => getComputedStyle(e).animationDuration);
    assert.equal(animation, '20s');
    await page.screenshot({ path: resolve(OUT, `admission-${width}-${theme}.png`), fullPage: true });
    clean(state);
    record({ kind: 'approach_return', width, theme, videoReads: 1, riverReads: 1, pageErrors: 0, animation });
    await context.close();
  }
  {
    // Focus without scrolling is explicit keyboard intent, even outside IO's margin.
    const { context, page, state } = await open(390);
    await ready(page); assert.equal(count(state, 'home_videos'), 0);
    await Promise.all([page.waitForResponse(r => r.url().includes('/home_videos')),
      videos(page).locator('a').first().evaluate(e => e.focus({ preventScroll: true }))]);
    assert.equal(count(state, 'home_videos'), 1); clean(state);
    record({ kind: 'keyboard_intent', pass: true }); await context.close();
  }
  {
    const { context, page, state } = await open(390, 'dark', { noObserver: true, reduce: true });
    await ready(page);
    assert.equal(count(state, 'home_videos'), 1); assert.equal(count(state, 'gallery_images'), 1);
    clean(state); record({ kind: 'no_observer_reduced_motion_fallback', pass: true }); await context.close();
  }
  {
    const fixture = { failVideos: true };
    const { context, page, state } = await open(390, 'parchment', { fixture });
    await ready(page); await videos(page).scrollIntoViewIfNeeded();
    await videos(page).getByText('אין סרטים להצגה כרגע.', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(count(state, 'home_videos'), 4, "one admitted read retains the installed SDK's three HTTP 503 retries");
    fixture.failVideos = false;
    await page.reload(); await ready(page); await videos(page).scrollIntoViewIfNeeded();
    await videos(page).getByText('סרטון בדיקה ציבורי', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(count(state, 'home_videos'), 5); clean(state);
    record({ kind: 'failed_reader_reload_recovery', pass: true }); await context.close();
  }
  {
    const { context, page, state } = await open(390, 'parchment', { primaryDelay: 2500 });
    await page.locator('.h29-hero.is-loading').waitFor();
    await page.waitForTimeout(800); assert.deepEqual(deferredReads(state), []);
    await ready(page); assert.deepEqual(deferredReads(state), []);
    clean(state); record({ kind: 'slow_primary_no_skeleton_admission', pass: true }); await context.close();
  }
  {
    const { context, page, state } = await open(390, 'parchment', { primaryDelay: 2500 });
    await page.locator('.h29-hero.is-loading').waitFor();
    await page.locator('a[href="/2029/posts"]').first().evaluate(e => e.click());
    await page.waitForFunction(() => !document.querySelector('.h29'));
    await page.waitForTimeout(2600);
    assert.ok(state.requests.some(request => {
      const query = new URLSearchParams(request.query);
      return request.path.endsWith('/posts') && query.get('author') === 'eq.בדרך לנצח'
        && query.get('select') === 'id,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified,home_hidden';
    }), 'the destination Posts reader must actually run; it is not counted as Home admission');
    assert.deepEqual(deferredReads(state), [], 'a late primary response cannot admit readers after leaving Home');
    clean(state); record({ kind: 'unmount_before_primary_settlement', pass: true }); await context.close();
  }
  {
    const { context, page, state } = await open(390, 'parchment', {}, 'after', '/2029#reality-stream');
    await ready(page);
    await page.waitForTimeout(800); assert.equal(count(state, 'gallery_images'), 1, 'an exact fragment is explicit intent, even before native scroll restoration');
    assert.equal(await page.evaluate(() => location.hash), '#reality-stream');
    clean(state); record({ kind: 'direct_stream_fragment_intent', pass: true }); await context.close();
  }
  {
    // The actual built Post path must harden authored media after containment.
    const original = post.content;
    post.content = '<p>מקור מדיה לבדיקת קבלה</p><video controls autoplay preload="auto"><source src="https://media-fixture.invalid/passive.mp4" type="video/mp4"></video><audio controls autoplay preload="auto" src="https://media-fixture.invalid/passive.mp3"></audio>';
    const { context, page, state } = await open(390, 'parchment', {}, 'after', '/post/' + post.slug);
    const source = page.locator('.sod29-reading-source');
    await source.getByText('מקור מדיה לבדיקת קבלה', { exact: true }).waitFor();
    const media = await source.locator('video,audio').evaluateAll(es => es.map(e => ({ autoplay: e.autoplay, preload: e.preload, controls: e.controls, guard: e.dataset.sodEgressGuard })));
    assert.equal(media.length, 2);
    for (const m of media) assert.deepEqual(m, { autoplay: false, preload: 'none', controls: true, guard: 'passive' });
    await page.waitForTimeout(500);
    assert.equal(state.requests.filter(r => /passive\.mp[34]$/.test(r.path)).length, 0);
    assert.equal(await source.locator('video source').getAttribute('src'), 'https://media-fixture.invalid/passive.mp4');
    await source.locator('video').evaluate(e => { e.play().catch(() => {}); });
    await page.waitForTimeout(500);
    assert.ok(state.requests.some(r => /passive\.mp4$/.test(r.path)), 'explicit play retains the original media request');
    clean(state); record({ kind: 'actual_post_passive_media_and_explicit_play', pass: true });
    await context.close(); post.content = original;
  }
} finally {
  await writeFile(resolve(OUT, 'results.json'), JSON.stringify(evidence, null, 2));
  await browser.close(); await Promise.all(Object.values(servers).map(s => new Promise(done => s.server.close(done))));
}
console.log(JSON.stringify({ pass: true, cases: evidence.cases.length, out: OUT }));

