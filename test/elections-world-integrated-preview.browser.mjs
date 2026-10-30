// Actual static 2029 build + actual anonymous public data, without product writes.
// Local: build-integrated-preview first, then node this file.
// Hosted: PREVIEW_ORIGIN=https://exact-deployment.vercel.app; optional protected
// access URL arrives via stdin, is used only in memory, never printed or saved.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.PREVIEW_EVIDENCE_DIR || "/tmp/elections-world-preview-20261030";
await mkdir(output, { recursive: true });
const report = { widths: [], reads: {}, blocked: [], errors: [], modelRequests: [] };
const publicHost = "linswmnnkjxvweumprav.supabase.co";
const readRpc = new Set(["fn_method_profile", "convergence_meter", "gematria_api", "world_group_source_arrivals_v2", "rd_is_admin", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "posts_by_number_strict", "fn_all_methods", "lang_links_list", "number_neighbors", "fn_verses_by_gematria", "gematria_method_trace"]);
let server;
let origin = process.env.PREVIEW_ORIGIN;
if (!origin) {
  const dist = resolve(root, "preview-deploy/dist");
  assert.ok(existsSync(resolve(dist, "preview-identity.json")), "build the isolated mock-only Preview first");
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
    let file = resolve(dist, "." + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) { response.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "index.html");
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(response);
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${server.address().port}`;
}
origin = new URL(origin).origin;
let accessUrl;
if (process.env.PREVIEW_ACCESS_STDIN === "true") {
  console.log("Waiting for protected access URL on stdin (not logged).");
  const input = createInterface({ input: process.stdin });
  for await (const line of input) { accessUrl = line.trim(); input.close(); break; }
  assert.equal(new URL(accessUrl).origin, origin, "protected access must match the exact deployment");
}
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"], ...(proxy ? { proxy } : {}) });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "he-IL", reducedMotion: "reduce" });
    await context.addInitScript(() => { localStorage.setItem("sod-theme", "dark"); });
    await context.route("**/*", route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.origin === origin) return route.continue();
      if (/\/functions\/v1\/(ai-analyze|research-run|ask-raziel)/.test(url.pathname)) report.modelRequests.push(url.pathname);
      if (url.hostname === publicHost) {
        const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
        if ((rpc && readRpc.has(rpc)) || (!rpc && !url.pathname.startsWith("/functions/") && ["GET", "HEAD", "OPTIONS"].includes(method))) {
          report.reads[url.pathname] = (report.reads[url.pathname] || 0) + 1;
          return route.continue();
        }
      } else if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname) && method === "GET") return route.continue();
      report.blocked.push(`${method} ${url.pathname}`);
      return route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"preview_read_only"}' });
    });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push(error.message));
    page.setDefaultTimeout(60000);
    if (accessUrl) {
      // Establish the existing protected cookie on a static JSON resource first.
      // Starting App2029 at / can race its known root reload and worker bootstrap
      // against the subsequent Topic navigation. This changes no site auth rule.
      const authenticationUrl = new URL(accessUrl);
      authenticationUrl.pathname = "/preview-identity.json";
      try { await page.goto(authenticationUrl.href); }
      catch { throw new Error("Protected Preview access failed; access URL withheld."); }
    }
    await page.goto(origin + "/topic/1237");
    try { await page.locator(".rv [data-rv-hero]").waitFor(); }
    catch {
      const current = new URL(page.url());
      console.log(JSON.stringify({ boundary: "1237 gate render", width, host: current.host, path: current.pathname,
        errors: report.errors, modelRequests: report.modelRequests,
        text: current.origin === origin ? (await page.locator("body").innerText()).slice(0, 2000) : "outside deployment origin" }));
      throw new Error("The hosted 1237 gate did not render; see the bounded boundary report.");
    }
    await page.locator('.rv-method[data-status="confirmed"]').nth(1).waitFor();
    await page.locator(".rv-gallery .rv-source").first().waitFor();
    assert.equal(await page.locator(".sod29-topic-hero").count(), 0);
    assert.equal(await page.locator("h1").count(), 1);
    const missingMapTargets = await page.evaluate(() => [...document.querySelectorAll('.rv-nav a[href^="#"]')]
      .map(anchor => anchor.getAttribute("href").slice(1)).filter(id => !document.getElementById(id)));
    assert.deepEqual(missingMapTargets, [], "every gate chapter resolves to a real section");
    if (width === 1440) {
      await page.locator('[data-context-map-item="rv-center"]').first().waitFor();
      assert.deepEqual(await page.locator('[data-context-map-item]').evaluateAll(nodes => nodes
        .map(node => node.getAttribute("data-context-map-item")).filter(id => !document.getElementById(id))), [],
      "the actual shared Frame map uses existing gate anchors rather than generic Topic anchors");
    }
    assert.match(await page.locator("#rv-elections").innerText(), /סף צירי הוועידה, לא אלקטורים/);
    assert.equal(await page.locator('.rv-conn[data-status="tree"]').count(), 0);
    await page.getByRole("button", { name: "פתיחת קשרי העץ של הציר", exact: true }).click();
    await page.locator('[data-relation-status]:not([data-relation-status="loading"])').waitFor();
    const graphStatus = await page.locator('[data-relation-status]').getAttribute("data-relation-status");
    const graphRefs = await page.locator(".rv-edges code").allInnerTexts();
    assert.ok(["ok", "partial", "unavailable"].includes(graphStatus), "live graph read succeeds or explicitly reports an unavailable anchor");
    assert.ok(graphRefs.every(ref => /^edge:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)));
    assert.equal(new Set(graphRefs).size, graphRefs.length);
    report.liveGraph = { status: graphStatus, edgeCount: graphRefs.length };
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `1237 overflow at ${width}: ${overflow}`);
    await page.screenshot({ path: resolve(output, `1237-${width}.png`) });
    await page.goto(origin + "/topic/gapfill-1118#topic-number-research-1118");
    const through = page.getByRole("region", { name: "ממצאים דרך המספר", exact: true });
    await through.waitFor();
    assert.match(await through.innerText(), /ולא קשר ישיר מתועד/);
    const lens = page.locator("#topic-number-research-1118");
    await lens.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).click();
    const finding = lens.locator('a[href^="/world?finding="]').first();
    await finding.waitFor();
    const findingHref = await finding.getAttribute("href");
    await finding.click();
    await page.waitForURL(origin + findingHref);
    assert.equal(await page.evaluate(() => history.state.usr?.returnTo), "/topic/gapfill-1118#topic-number-research-1118");
    await page.getByRole("region", { name: "ממצא ציבורי בעולם", exact: true }).waitFor();
    await page.goBack();
    await lens.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `topic-1118-${width}.png`) });
    await page.goto(origin + "/world?view=sources&source=tzvi-opoc");
    await page.getByRole("region", { name: "ממצאים הקשורים למקורות צבי", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `world-zvi-${width}.png`) });
    report.widths.push(width);
    await context.close();
  }
  assert.deepEqual(report.errors, [], "no page errors");
  assert.deepEqual(report.modelRequests, [], "no model request on navigation");
  console.log(JSON.stringify({ ...report, blocked: [...new Set(report.blocked)], origin, productWrites: false, data: "live public anonymous", coverage: "1237, Topic 1118 to exact World finding and Back, World Zvi entry" }, null, 2));
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
}
