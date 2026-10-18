// Loopback-only request-count comparison for the exact built 2029 assets.
// All external requests are fulfilled from synthetic fixtures or aborted.
// Usage:
// BEFORE_DIST=/path/to/before AFTER_DIST=/path/to/after \
// PLAYWRIGHT=/path/to/playwright/index.mjs CHROMIUM=/usr/bin/chromium \
// OUT=/tmp/site-flags-measurement.json node tools/measure.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const beforeDist = path.resolve(process.env.BEFORE_DIST || "");
const afterDist = path.resolve(process.env.AFTER_DIST || "");
if (!fs.existsSync(path.join(beforeDist, "2029.html")) || !fs.existsSync(path.join(afterDist, "2029.html"))) {
  throw new Error("BEFORE_DIST and AFTER_DIST must contain built 2029.html files");
}

const builds = [["before", beforeDist, 4931], ["after", afterDist, 4932]];
const routes = ["/", "/world", "/number/718", "/post/flydubai-fz1073-363-14000-remzei-geula"];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const flags = [
  ...["world", "number", "heichal", "raziel_site", "life_journey", "books", "els"]
    .map((name) => ({ key: `lock_${name}`, enabled: false, message: null, mode: "all" })),
  ...["analytics", "now_feed", "tier_signals", "number_dossier", "number_journey", "home_videos", "home_gateways", "home_pulse", "home_temporal", "home_world_preview", "home_convergences", "world_discovery", "els_gallery", "world_relation_identity", "number_lookup_page"]
    .map((name) => ({ key: `fx_${name}`, enabled: false, message: null, mode: "all" })),
];

function serve(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://loopback").pathname);
      let file = path.join(dir, pathname);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, "2029.html");
      response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(response);
    }).listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function installBoundary(page, port, counter) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === `http://127.0.0.1:${port}`) return route.continue();
    if (url.pathname === "/rest/v1/site_flags") {
      if (request.method() === "GET") counter.reads += 1;
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(flags) });
    }
    if (url.hostname.endsWith("supabase.co")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*", "content-range": "0-0/0" },
        body: url.pathname.includes("/rpc/") ? "null" : "[]",
      });
    }
    return route.abort();
  });
}

const servers = await Promise.all(builds.map(([, dir, port]) => serve(dir, port)));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--no-sandbox"] });
const direct = [];
const navigation = [];
try {
  for (const [build, , port] of builds) {
    for (const routePath of routes) {
      for (let sample = 1; sample <= 3; sample += 1) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const counter = { reads: 0 };
        await installBoundary(page, port, counter);
        await page.goto(`http://127.0.0.1:${port}${routePath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(3_500);
        direct.push({ build, route: routePath, sample, site_flags_gets: counter.reads });
        await context.close();
      }
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const counter = { reads: 0 };
    await installBoundary(page, port, counter);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3_000);
    const homeReads = counter.reads;
    await page.locator('a[href="/world"]').first().evaluate((element) => element.click());
    await page.waitForURL("**/world");
    await page.waitForTimeout(3_000);
    navigation.push({ build, home_site_flags_gets: homeReads, world_navigation_site_flags_gets: counter.reads - homeReads, total: counter.reads });
    await context.close();
  }
} finally {
  await browser.close();
  servers.forEach((server) => server.close());
}

const report = { schema: "site-flags-navigation-scope-2029.v1", synthetic: true, loopbackOnly: true, direct, navigation };
fs.writeFileSync(process.env.OUT || "/tmp/site-flags-measurement.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
