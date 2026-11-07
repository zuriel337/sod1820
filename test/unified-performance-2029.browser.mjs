// Same-profile, interleaved LOCAL lab evidence. All APIs are synthetic and
// blocked from the network; these are not hosted timings, field p75 or real AI.
// BEFORE_DIST=<d2dd build> AFTER_DIST=<candidate> RUNS=3 OUT=/tmp/... node ...
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BEFORE = resolve(process.env.BEFORE_DIST || "/tmp/unified-perf-before-d2dd-preview-dist");
const AFTER = resolve(process.env.AFTER_DIST || "preview-deploy/dist");
const OUT = process.env.OUT || "/tmp/unified-performance-20261031";
const RUNS = Number(process.env.RUNS || 3);
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

async function install(context, origin, theme, { failChunk = null } = {}) {
  const state = { flagReads: 0, requests: [], modelCalls: [], blockedWrites: [], pageErrors: [], failChunk };
  await context.addInitScript(({ theme, title }) => {
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
  }, { theme, title: TITLE });
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    state.requests.push({ path: url.pathname, method: req.method() });
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
const evidence = { scope: "local_lab_synthetic_API_not_field_p75", base: "d2dd882f960a329394f4a23d7b6e4a7d4c4c6fd5", runs: [], acceptance: [] };
try {
  for (const profile of [{ width: 390, cpu: 4, net: true }, { width: 1440, cpu: 1, net: false }]) {
    for (let i = 0; i < RUNS; i++) for (const label of i % 2 ? ["after", "before"] : ["before", "after"]) {
      const server = servers[label];
      const context = await browser.newContext({ viewport: { width: profile.width, height: 900 }, locale: "he-IL", serviceWorkers: "block" });
      const state = await install(context, server.origin, "parchment");
      const page = await context.newPage(); page.on("pageerror", error => state.pageErrors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
      await cdp.send("Network.enable");
      if (profile.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      await page.goto(server.origin + "/2029", { waitUntil: "load", timeout: 60000 });
      await page.waitForFunction(() => window.__perf.primary_ms !== null, null, { timeout: 45000 });
      await page.waitForTimeout(2000);
      const metrics = await page.evaluate(() => ({ ...window.__perf, resources: performance.getEntriesByType("resource").filter(e => e.name.includes("/assets/")).map(e => ({ name: new URL(e.name).pathname, encoded: e.encodedBodySize, decoded: e.decodedBodySize })) }));
      assert.equal(state.modelCalls.length, 0); assert.deepEqual(state.pageErrors, []);
      evidence.runs.push({ label, run: i, profile, ...metrics, flagReads: state.flagReads, requestCount: state.requests.length, modelCalls: 0, blockedWriteAttempts: state.blockedWrites });
      console.log(JSON.stringify({ label, width: profile.width, run: i, primary_ms: Math.round(metrics.primary_ms), flags: state.flagReads }));
      await context.close();
    }
  }
  const manifest = JSON.parse(readFileSync(resolve(AFTER, ".vite/manifest.json")));
  const gatewayFile = manifest["src/components/ContactGateway.jsx"].file;
  for (const theme of ["light", "parchment", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: "block" });
    const state = await install(context, servers.after.origin, theme);
    const page = await context.newPage(); page.on("pageerror", error => state.pageErrors.push(error.message));
    await page.goto(servers.after.origin + "/2029");
    await page.waitForFunction(() => window.__perf.primary_ms !== null);
    assert.ok(!state.requests.some(r => r.path.endsWith(gatewayFile)));
    await page.getByRole("button", { name: "דווח על בעיה", exact: true }).filter({ visible: true }).first().click();
    await page.locator('[data-contact-gateway="true"]').waitFor();
    assert.ok(state.requests.some(r => r.path.endsWith(gatewayFile)));
    assert.equal(state.modelCalls.length, 0); assert.deepEqual(state.pageErrors, []);
    await page.screenshot({ path: resolve(OUT, `gateway-${theme}.png`) });
    evidence.acceptance.push({ theme, canonicalGatewayOpened: true, zeroPreopenChunks: true, zeroModelCalls: true });
    await context.close();
  }
  const gatewayContext = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: "block" });
  const gatewayState = await install(gatewayContext, servers.after.origin, "light", { failChunk: gatewayFile });
  const gatewayPage = await gatewayContext.newPage();
  await gatewayPage.goto(servers.after.origin + "/2029");
  const openGateway = () => gatewayPage.getByRole("button", { name: "דווח על בעיה", exact: true }).filter({ visible: true }).first().click();
  await openGateway();
  await gatewayPage.getByRole("alert").filter({ hasText: "טופס הפנייה לא נטען" }).waitFor();
  await gatewayPage.keyboard.press("Escape");
  await gatewayPage.locator(".sod29-frame-panel").waitFor({ state: "detached" });
  gatewayState.failChunk = null; await gatewayPage.reload(); await openGateway();
  await gatewayPage.locator('[data-contact-gateway="true"]').waitFor();
  assert.equal(gatewayState.modelCalls.length, 0);
  evidence.acceptance.push({ failedContactChunkVisible: true, existingPanelEscapeCloses: true, contactReloadRecovers: true });
  await gatewayContext.close();
} finally {
  await writeFile(resolve(OUT, "results.json"), JSON.stringify(evidence, null, 2));
  await browser.close(); await Promise.all(Object.values(servers).map(s => new Promise(done => s.server.close(done))));
}
console.log(JSON.stringify({ pass: true, runs: evidence.runs.length, acceptance: evidence.acceptance.length, out: OUT }));
