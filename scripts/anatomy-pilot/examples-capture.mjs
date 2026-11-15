// Captures real "without / with" pairs for the examples page: Mistater, two method stages (ריבוע, מילוי) and the Zvi 3060 card.
// Read-only (canonical read RPCs only). Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/examples-capture.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4180";
const out = process.env.OUT || "/tmp/examples";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
// The Number page only renders its calculation card when the page-level number RPCs stay blocked (read-only run); the World page needs its arrivals reader.
const RPCS = new Set(["gematria_method_trace", "fn_method_profile", "fn_method_value", "gematria_api", "fn_zero_scale", "fn_verses_by_gematria", "fn_get_value_phrases", "get_all_value_phrases"]);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
const page = await ctx.newPage(); page.setDefaultTimeout(60000);
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", async (route) => {
  const req = route.request(), url = new URL(req.url());
  if (url.origin === base) { const r = req.isNavigationRequest() && url.pathname.startsWith("/2029/") ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req); return route.fulfill({ response: r }); }
  if (/\.(woff2?|ttf)$/.test(url.pathname) || /googletagmanager|google-analytics/.test(url.hostname)) return route.abort();
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { const rpc = url.pathname.split("/").pop(); return RPCS.has(rpc) ? route.continue() : route.fulfill({ status: 403, contentType: "application/json", body: "{}" }); }
  return route.continue();
});
const hideChrome = () => page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if ((p === "fixed" || p === "sticky") && !el.querySelector(".sod29-spatial-method-stage,.sod29-world-spatial-card")) el.style.visibility = "hidden"; } });
const shot = async (locator, name) => { await locator.scrollIntoViewIfNeeded(); await hideChrome(); await locator.screenshot({ path: `${out}/${name}.png` }); console.log("shot", name); };

async function numberExample({ slug, number, expression, method, withS4 }) {
  await page.goto(`${base}/2029/number/${number}?focus=${encodeURIComponent(expression)}&method=${encodeURIComponent(method)}`, { waitUntil: "domcontentloaded" });
  await page.locator(".sod29-number-v10-calculation-card").click({ timeout: 40000 }).catch(async (e) => { await page.screenshot({ path: `${out}/_debug-${slug}.png` }); console.log("DEBUG url", page.url(), "text:", (await page.locator("body").innerText()).slice(0, 200).replace(/\n/g, " ")); throw e; });
  const inspector = page.locator(".sod29-number-method-inspector"); await inspector.waitFor();
  await page.waitForFunction(() => { const el = document.querySelector(".sod29-number-method-inspector .sod29-spatial-method-stage"); return el && el.getAttribute("data-state") !== "loading" && el.getAttribute("data-method-key"); }, null, { timeout: 45000 });
  await page.waitForTimeout(800);
  // WITHOUT: the text steps the Number page shows today under "איך מחשבים?"
  await inspector.getByRole("button", { name: "איך מחשבים?", exact: true }).click();
  const steps = page.locator(".sod29-number-core2029-trace-steps"); await steps.waitFor();
  await shot(steps, `${slug}-without-text`);
  fs.writeFileSync(`${out}/${slug}-without-text.txt`, (await steps.innerText()).trim());
  // WITH: the visual stage
  const stage = inspector.locator(".sod29-spatial-method-stage").first();
  await shot(stage, `${slug}-with-stage`);
  if (withS4) {
    await stage.locator('[data-s4-action="deepen"]').click();
    await stage.locator(".sod29-spatial-method-stage__s4 canvas").waitFor(); await page.waitForTimeout(3500);
    await shot(stage.locator(".sod29-spatial-method-stage__s4"), `${slug}-with-3d`);
  }
}
await numberExample({ slug: "mistater-1237", number: 1237, expression: "התגלות", method: "מסתתר", withS4: true });
await numberExample({ slug: "ribua-5787", number: 5787, expression: "תפרצי בתשפז", method: "ריבוע" });
await numberExample({ slug: "milui-1237", number: 1237, expression: "אופק אדנק", method: "מילוי" });

// Zvi 3060: the World spatial card without / with the convergence view
RPCS.add("world_group_source_arrivals_v2");
await page.goto(`${base}/world?view=explore&kind=spatial#spatial-yesharim-cube-3060`, { waitUntil: "domcontentloaded" });
const card = page.locator("#spatial-yesharim-cube-3060"); await card.waitFor();
const layers = card.locator(".sod29-world-spatial-body");
await page.waitForTimeout(1200);
await shot(layers, "zvi-3060-without-card");
fs.writeFileSync(`${out}/zvi-3060-without-card.txt`, (await layers.innerText()).trim());
await card.locator('[data-convergence-card] button', { hasText: "פתח המחשת התכנסות" }).click();
const conv = card.locator(".is-convergence"); await conv.waitFor();
await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 45000 });
await page.waitForTimeout(800);
await conv.locator('[data-path-index="3"]').click();
await shot(conv, "zvi-3060-with-2d");
await conv.locator('[data-s4-action="deepen"]').click();
await conv.locator(".sod29-spatial-method-stage__s4 canvas").waitFor(); await page.waitForTimeout(3500);
await shot(conv.locator(".sod29-spatial-method-stage__s4"), "zvi-3060-with-3d");
console.log("errors:", errors.length, errors.slice(0, 2));
await browser.close();
