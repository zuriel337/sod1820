// Browser acceptance for the Legacy <-> 2029 theme boundary. Needs a built dist/ (npm run build) and Chromium.
//   node test/theme-separation-2029.browser.mjs            -> assertions against ./dist (served here)
//   node test/theme-separation-2029.browser.mjs --snapshot <baseUrl>  -> prints the Legacy snapshot JSON for any served build
// Network is blocked except localhost, so only the theme boundary is exercised (no Supabase/data).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = process.cwd();
const LEGACY_ROUTES = ["/", "/post", "/number/1820", "/code", "/community/chat", "/world", "/heichal", "/2029"];
const HOSTED_ROUTES = new Set(["/2029"]); // hosted 2029 page that mounts without a site-flag fetch (network is blocked here)
const THEMES = [null, "light", "parchment", "dark"];
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" };

function serve(dist) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
    res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

async function newPage(browser, base, { theme2029Doc = false, init = {}, spyKeys = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = []; const consoleBad = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== "127.0.0.1") return route.abort();
    // Emulate the production rewrite: public document routes are served by the 2029 document.
    if (theme2029Doc && route.request().resourceType() === "document" && u.pathname.startsWith("/2029")) {
      return route.fulfill({ status: 200, contentType: "text/html", body: fs.readFileSync(path.join(root, "dist/2029.html")) });
    }
    return route.continue();
  });
  await context.addInitScript(({ init, spyKeys }) => {
    if (!sessionStorage.getItem("__init_done")) {
      for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
      sessionStorage.setItem("__init_done", "1");
    }
    window.__attrLog = [];
    const log = () => window.__attrLog.push(document.documentElement.getAttribute("data-theme-2029"));
    const attach = () => { if (!document.documentElement) return false; new MutationObserver(log).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-2029"] }); return true; };
    if (!attach()) { const wait = new MutationObserver(() => { if (attach()) wait.disconnect(); }); wait.observe(document, { childList: true }); }
    if (spyKeys) {
      window.__reads = [];
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { window.__reads.push(String(k)); return orig.call(this, k); };
    }
  }, { init, spyKeys });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) consoleBad.push(m.text()); });
  return { page, context, errors, consoleBad };
}

const attrs = (page) => page.evaluate(() => {
  const h = document.documentElement;
  return {
    theme: h.getAttribute("data-theme"), preset: h.getAttribute("data-theme-preset"), t2029: h.getAttribute("data-theme-2029"),
    htmlBg: getComputedStyle(h).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor,
    keys: Object.keys(localStorage).sort(), sodTheme: localStorage.getItem("sod-theme"),
  };
});

export async function legacySnapshot(browser, base) {
  const out = {};
  for (const route of LEGACY_ROUTES) for (const theme of THEMES) {
    const { page, context } = await newPage(browser, base, { init: theme ? { "sod-theme": theme } : {} });
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const a = await attrs(page);
    out[`${route}|${theme}`] = { theme: a.theme, preset: a.preset, htmlBg: a.htmlBg, bodyBg: a.bodyBg, keys: a.keys.filter((k) => !k.startsWith("sod2029:")), sod2029Keys: a.keys.filter((k) => k.startsWith("sod2029:")), sodTheme: a.sodTheme, t2029: a.t2029 };
    await context.close();
  }
  return out;
}

if (process.argv.includes("--snapshot")) {
  const base = process.argv[process.argv.indexOf("--snapshot") + 1];
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  console.log(JSON.stringify(await legacySnapshot(browser, base), null, 1));
  await browser.close();
  process.exit(0);
}

const { server, base } = await serve(path.join(root, "dist"));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  // A. Host (Legacy) theme reaches hosted 2029 pages one-way; 2029 code never creates its own keys inside Legacy.
  {
    const { page, context } = await newPage(browser, base, { init: { "sod-theme": "dark" } });
    await page.goto(base + "/2029", { waitUntil: "load" }); await page.waitForTimeout(2000);
    let a = await attrs(page);
    assert.equal(a.preset, "dark"); assert.equal(a.t2029, "dark", "hosted 2029 page receives the host theme");
    // The hosted page's own chooser keeps working exactly as before: it writes the HOST (Legacy) key.
    await page.evaluate(() => { const b = [...document.querySelectorAll(".sod29-theme-options button")].find((x) => x.getAttribute("aria-pressed") === "false"); b?.click(); });
    await page.waitForTimeout(300);
    a = await attrs(page);
    assert.notEqual(a.sodTheme, "dark", "hosted chooser writes the host theme key, as before");
    assert.equal(a.preset, a.sodTheme); assert.equal(a.t2029, a.sodTheme, "hosted page mirrors the host theme");
    assert.deepEqual(a.keys.filter((k) => k.startsWith("sod2029:")), [], "Legacy runtime never creates 2029 theme keys");
    await context.close();
  }
  // A2. Legacy navbar toggle on a Legacy page, then in-app navigation to a hosted page: the host theme carries over.
  {
    const { page, context } = await newPage(browser, base, { init: { "sod-theme": "dark" } });
    await page.goto(base + "/", { waitUntil: "load" }); await page.waitForTimeout(1500);
    await page.locator("button.nav-theme").first().click(); await page.waitForTimeout(300);
    const toggled = await attrs(page);
    // Legacy behavior (identical before the separation): the navbar toggle drives the host preset attributes.
    assert.equal(toggled.preset, "light"); assert.equal(toggled.theme, "light");
    assert.equal(toggled.t2029, null, "a non-hosted Legacy page carries no 2029 theme attribute");
    await page.evaluate(() => { history.pushState({}, "", "/2029"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await page.waitForTimeout(2000);
    const hosted = await attrs(page);
    assert.equal(hosted.t2029, hosted.preset, "hosted page mirrors whatever the host theme is");
    assert.deepEqual(hosted.keys.filter((k) => k.startsWith("sod2029:")), []);
    await context.close();
  }
  // B. Public 2029: own store; first-visit one-time seed; afterwards Legacy theme is neither read nor followed.
  {
    const { page, context, consoleBad } = await newPage(browser, base, { theme2029Doc: true, init: { "sod-theme": "light" }, spyKeys: true });
    await page.goto(base + "/2029", { waitUntil: "load" }); await page.waitForTimeout(2000);
        let a = await attrs(page);
    assert.equal(a.t2029, "light", "first visit copies the existing preference once (approved migration)");
    assert.equal(a.theme, null, "2029 sets no global Legacy data-theme"); assert.equal(a.preset, null, "2029 sets no Legacy data-theme-preset");
    assert.ok(a.keys.includes("sod2029:theme-preset") && a.keys.includes("sod2029:theme-preset-seeded"));
    assert.equal(a.sodTheme, "light");
    // Change theme inside 2029 with its own chooser.
    await page.evaluate(() => { const b = [...document.querySelectorAll(".sod29-theme-options button")].find((x) => x.getAttribute("title") && x.getAttribute("aria-pressed") === "false"); b?.click(); });
    await page.waitForTimeout(300);
    const changed = await attrs(page);
    assert.notEqual(changed.t2029, "light", "2029 chooser changes the 2029 theme");
    assert.equal(changed.sodTheme, "light", "2029 change never writes the Legacy key");
    // Reload 2029 after Legacy's value changed: 2029 keeps its own choice and does not read the Legacy key again.
    await page.evaluate(() => localStorage.setItem("sod-theme", "dark"));
    await page.evaluate(() => { window.__reads.length = 0; });
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(2000);
    const reads = await page.evaluate(() => window.__reads.slice()); // before attrs(), which itself reads the Legacy key for reporting
    const again = await attrs(page);
    assert.equal(again.t2029, changed.t2029, "2029 theme is not synced from Legacy after the seed");
    assert.equal(reads.includes("sod-theme"), false, "after the seed the public 2029 never reads the Legacy theme key");
    assert.equal(consoleBad.filter((m) => /hydrat|mismatch|did not match/i.test(m)).length, 0, "no hydration/mismatch warnings");
    // No flash: exactly one value was ever applied during load, and it is the final one.
    const log = await page.evaluate(() => window.__attrLog);
    assert.ok(log.length >= 1 && new Set(log).size === 1 && log[0] === again.t2029, `theme flipped during load: ${JSON.stringify(log)}`);
    // Legacy afterwards still shows its own value untouched by 2029.
    await context.close();
  }
  // C. 2029 change does not alter Legacy pages: same browser profile, Legacy opened after 2029 changed its theme.
  {
    const { page, context } = await newPage(browser, base, { init: { "sod-theme": "dark", "sod2029:theme-preset": "light", "sod2029:theme-preset-seeded": "1" }, spyKeys: true });
    await page.goto(base + "/post", { waitUntil: "load" }); await page.waitForTimeout(1200);
    const reads = await page.evaluate(() => window.__reads.slice());
    const legacy = await attrs(page);
    assert.equal(legacy.preset, "dark"); assert.equal(legacy.theme, "dark");
    assert.equal(reads.includes("sod2029:theme-preset"), false, "Legacy never reads the 2029 theme key");
    await context.close();
  }
  console.log("theme separation browser acceptance: PASS");
} finally {
  await browser.close();
  server.close();
}
