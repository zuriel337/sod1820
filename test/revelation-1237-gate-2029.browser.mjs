// 1,237 gate — REAL page (/topic/1237 in the 2029 app) on a local Vite server, reading LIVE PUBLIC
// data with the anonymous key. Read-only: every non-GET request except the engine's read RPC is
// aborted and recorded. Needs network access to the project's public API.
// Run: node test/revelation-1237-gate-2029.browser.mjs   (evidence -> work/evidence/revelation-1237/)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.REVELATION_PORT || 5195);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, "work/evidence/revelation-1237");
mkdirSync(OUT, { recursive: true });
const config = { server: { host: "127.0.0.1", port: PORT, strictPort: true, hmr: false } };
const server = spawn("node", ["--input-type=module", "-e",
  `import {createServer} from "vite";const s=await createServer(${JSON.stringify(config)});await s.listen();`], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 200; i += 1) { try { if ((await fetch(BASE)).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 100)); }
const HTML = await (await fetch(`${BASE}/2029.html`)).text();

const SUPABASE = "linswmnnkjxvweumprav.supabase.co";
// Verified live (pg_proc): STABLE and containing no write SQL. Anything else that is not a GET is a write attempt.
const READ_RPC = /\/rest\/v1\/rpc\/(fn_method_profile|convergence_meter|gematria_api|world_group_source_arrivals_v2)$/;
// Site telemetry the app fires on load; aborted so this check performs no write of any kind.
const TELEMETRY = /\/rest\/v1\/rpc\/(link_identity|track_visit|ingest_event)$/;
const report = { cases: [], writesAttempted: [], blockedTelemetry: [], errors: [] };
const ok = (name, detail = "") => { report.cases.push({ name, detail }); console.log(`ok - ${name}${detail ? ` (${detail})` : ""}`); };

const lum = ([r, g, b]) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const rgb = (css) => (css.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

const browser = await chromium.launch();
async function open(width, height, theme) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "he-IL" });
  await context.addInitScript((value) => { try { localStorage.setItem("sod-theme", value); } catch { /* ignore */ } }, theme);
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // HMR socket (sandbox) and our own aborted telemetry are tooling noise.
    if (/WebSocket|\[vite\]|Failed to send error|ERR_FAILED/.test(text)) return;
    report.errors.push(text.slice(0, 240));
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.hostname === "127.0.0.1") return url.pathname === "/topic/1237" ? route.fulfill({ contentType: "text/html", body: HTML }) : route.continue();
    if (url.hostname === SUPABASE) {
      if (method === "GET" || (method === "POST" && READ_RPC.test(url.pathname))) return route.continue();
      if (method === "POST" && TELEMETRY.test(url.pathname)) { report.blockedTelemetry.push(url.pathname); return route.abort(); }
      report.writesAttempted.push(`${method} ${url.pathname}`); return route.abort();
    }
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return route.continue();
    return route.abort();
  });
  await page.goto(`${BASE}/topic/1237`);
  await page.waitForSelector(".rv [data-rv-hero]", { timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll(".rv-method .rv-value").length === 2 && document.querySelectorAll(".rv-gallery .rv-source").length >= 2, null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  return { page, context };
}

// 1. Live data content, once (dark desktop).
{
  const { page, context } = await open(1280, 900, "dark");
  const methods = await page.locator(".rv-method").evaluateAll((els) => els.map((e) => ({ spelling: e.querySelector(".rv-spelling").textContent, text: e.innerText, status: e.dataset.status })));
  assert.equal(methods[0].spelling, "„התגלות”"); assert.match(methods[0].text, /שיטה: מסתתר/); assert.equal(methods[0].status, "confirmed");
  assert.match(methods[0].text, /1,237/); assert.match(methods[0].text, /בשיטה הרגילה: 844/);
  assert.equal(methods[1].spelling, "„וראית את אחרי”"); assert.match(methods[1].text, /שיטה: רגיל/); assert.equal(methods[1].status, "confirmed");
  ok("two methods confirmed by the engine", "התגלות·מסתתר=1,237 · וראית את אחרי·רגיל=1,237");

  const galleries = await page.locator(".rv-gallery").evaluateAll((els) => els.map((e) => ({ title: e.querySelector("h3").textContent, items: e.querySelectorAll(".rv-source").length, head: e.querySelector("header").innerText })));
  assert.deepEqual(galleries.map((g) => g.title), ["לילה כיום יאיר", "2137-318-1237"]);
  assert.ok(galleries.every((g) => g.items >= 1 && g.items <= 6), "bounded first page of public rows");
  assert.match(galleries[0].head, /92 תמונות/); assert.match(galleries[1].head, /29 תמונות/);
  ok("galleries 29 and 81 read through the public gate", galleries.map((g) => `${g.title}: ${g.items} shown`).join(" · "));

  const connections = await page.locator(".rv-conn").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.querySelector("h3").textContent, e.dataset.status])));
  assert.equal(connections["דוד ו־14"], "source_statement");
  assert.equal(connections["הציר ההודי"], "shared_source");
  for (const title of ["גאולה ו־45", "מירון", "דונלד טראמפ"]) assert.equal(connections[title], "candidate", title);
  assert.equal(await page.locator('.rv-conn[data-status="tree"]').count(), 0, "no tree relation is shown before an explicit, evidenced open");
  ok("connections are typed by evidence", JSON.stringify(connections));

  const news = await page.locator("#rv-news").innerText();
  assert.match(news, /זמן האירוע/); assert.match(news, /זמן הדיווח/); assert.match(news, /תוצאה סופית/); assert.match(news, /נקלט בארכיון/);
  assert.ok(!/hugeit_migration/.test(await page.locator(".rv").innerText()), "storage provenance is never shown as a credit");
  ok("report time, event time, archive time and result are separate; no migration tag as credit");

  const elections = await page.locator("#rv-elections").innerText();
  assert.match(elections, /סף צירי הוועידה, לא אלקטורים/); assert.match(elections, /1,237 צירי ועידה|1,237 צירים|1,237 צירי/);
  assert.equal(await page.locator('#rv-elections [data-layer]').count() >= 4, true);
  assert.match(elections, /1,237 נשמר כטענה במקור ההיסטורי על בנט/);
  ok("elections: Trump threshold in three separate layers; Israel only as an interpretation");

  await page.getByRole("button", { name: "פתיחת קשרי העץ של הציר" }).click();
  await page.waitForSelector("[data-relation-status]:not([data-relation-status=loading])", { timeout: 60000 });
  const status = await page.locator("[data-relation-status]").getAttribute("data-relation-status");
  const edges = await page.locator(".rv-edges code").allInnerTexts();
  assert.ok(["ok", "partial", "failed"].includes(status));
  assert.ok(edges.every((ref) => ref.startsWith("edge:")), "every shown relation carries an exact edgeRef");
  report.explicitOpen = { status, edges };
  ok("explicit relation open", `${status}; ${edges.length} edgeRef rows`);
  await context.close();
}

// 2. Viewports × themes: overflow, anchors, contrast.
for (const theme of ["light", "parchment", "dark"]) {
  for (const [name, width, height] of [["320", 320, 700], ["390", 390, 844], ["desktop", 1280, 900]]) {
    const { page, context } = await open(width, height, theme);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `${theme}/${name} overflow ${overflow}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll("h1").length), 1, "exactly one h1 on the page (the 2029 shell's)");
    const small = await page.evaluate(() => [...document.querySelectorAll(".rv a, .rv button")].filter((el) => el.offsetParent && el.getBoundingClientRect().height < 44 && !el.closest("summary")).map((el) => el.textContent.trim().slice(0, 30)));
    assert.deepEqual(small, [], `${theme}/${name} targets under 44px`);
    if (name === "desktop") {
      const colors = await page.evaluate(() => {
        // Effective background: nearest opaque ancestor background.
        const effective = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba\(.*,\s*0\)$/.test(c) && c !== "transparent") return c; } return "rgb(255, 255, 255)"; };
        const read = (sel) => { const el = document.querySelector(sel); return { color: getComputedStyle(el).color, bg: effective(el) }; };
        return { value: read(".rv-value"), link: read(".rv-section > .rv-gallery-pair .rv-link, .rv-card .rv-link"), note: read(".rv-note"), kicker: read(".rv-section-head .rv-kicker"), muted: read(".rv-muted"), lede: { color: getComputedStyle(document.querySelector(".rv-lede")).color, bg: "rgb(23, 18, 14)" } };
      });
      const checks = Object.fromEntries(Object.entries(colors).map(([key, pair]) => [key, contrast(rgb(pair.color), rgb(pair.bg))]));
      for (const [key, value] of Object.entries(checks)) assert.ok(value >= (key === "value" ? 3 : 4.5), `${theme} ${key} contrast ${value.toFixed(2)} (${JSON.stringify(colors)})`);
      ok(`contrast ${theme}`, Object.entries(checks).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(" · "));
    }
    await page.screenshot({ path: path.join(OUT, `${theme}-${name}.png`) });
    if (theme === "dark" || name === "390") await page.screenshot({ path: path.join(OUT, `${theme}-${name}-full.png`), fullPage: true });
    await context.close();
  }
  ok(`no overflow, one h1, 44px targets: ${theme} @ 320/390/desktop`);
}

// 3. Keyboard: chapter anchors reach their sections; reduced motion stops the animation.
{
  const { page, context } = await open(390, 844, "dark");
  await page.getByRole("link", { name: "גלריות" }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#rv-galleries");
  await context.close();
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await reduced.addInitScript(() => { try { localStorage.setItem("sod-theme", "dark"); } catch { /* ignore */ } });
  const page2 = await reduced.newPage();
  await page2.route("**/*", (route) => { const u = new URL(route.request().url()); if (u.hostname === "127.0.0.1") return u.pathname === "/topic/1237" ? route.fulfill({ contentType: "text/html", body: HTML }) : route.continue(); return u.hostname === SUPABASE && route.request().method() === "GET" ? route.continue() : route.abort(); });
  await page2.goto(`${BASE}/topic/1237`);
  await page2.waitForSelector(".rv-light", { timeout: 90000 });
  assert.equal(await page2.locator(".rv-light").evaluate((el) => getComputedStyle(el).animationName), "none");
  await reduced.close();
  ok("chapter anchors work by keyboard; reduced motion disables the animation");
}

await browser.close();
server.kill();
writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ ...report, blockedTelemetry: [...new Set(report.blockedTelemetry)] }, null, 2));
assert.deepEqual(report.writesAttempted, [], "no write request was attempted");
assert.deepEqual(report.errors, [], "no page/console errors");
console.log(`revelation-1237 gate: ${report.cases.length} cases on live public data; 0 writes attempted; telemetry aborted: ${[...new Set(report.blockedTelemetry)].join(", ") || "none"}`);
