// End-to-end acceptance for Design Contract V2 §8.3 "תוכן גלוי לפני כניסה" (Human Gate ZURIEL 12.11.2026)
// and §12 acceptance 10. Read-only: every non-GET request is aborted except PostgREST read RPCs, and
// analytics/telemetry endpoints are aborted too. No database write, no login, no personal data.
//
// Usage:
//   BASE_URL=https://sod1820.co.il node scripts/test-content-visible-before-entry-e2e.mjs
//   node scripts/test-content-visible-before-entry-e2e.mjs            # serves DIST_DIR (default dist) locally
// The local public-profile bundle is built with:
//   SOD_BUILD_TARGET=2029 VITE_PUBLIC_READING_RELEASE=public-reading-20261101 npx vite build --outDir <dir>
// (plain `npm run build` leaves the public reading routes off, so most surfaces would be 404).
// Options: DIST_DIR=<dir> · DEVICES=desktop,phone · ONLY=world,now,... · REPORT=<json path>
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const root = new URL("../", import.meta.url).pathname;
const supabaseSource = readFileSync(resolve(root, "src/lib/supabase.js"), "utf8");
const SUPABASE_URL = /SUPABASE_URL = '([^']+)'/.exec(supabaseSource)[1];
const SUPABASE_ANON = /SUPABASE_ANON = '([^']+)'/.exec(supabaseSource)[1];
const PERSONAL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:^|[^\d])(?:\+972[\s-]*|0)5\d(?:[\s-]*\d){7}(?!\d)/i;
const WRITE_RPC = /track|ingest|visit|event|telemetry|log_|_log|record|submit|insert|upsert|update|delete|save|create|vote|like|follow|subscribe/i;

let server = null;
let base = process.env.BASE_URL;
if (!base) {
  const dist = resolve(root, process.env.DIST_DIR || "dist");
  if (!existsSync(resolve(dist, "2029.html"))) throw new Error(`missing ${dist}/2029.html — build first (see header)`);
  const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json",
    ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml" };
  server = createServer((req, res) => {
    let file = resolve(dist, "." + decodeURIComponent(new URL(req.url, "http://local").pathname));
    if (file !== dist && !file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "2029.html");
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = new URL(base).origin;

const results = [];
const record = (device, surface, check, ok, detail = "") => results.push({ device, surface, check, ok: Boolean(ok), detail: String(detail).slice(0, 220) });

// In-page helpers (serialised into the browser).
async function mediaFacts(page, scope = "main") {
  await page.evaluate(async () => {
    for (let y = 0; y < Math.min(document.body.scrollHeight, 9000); y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);
  // Lazy images: bring the first listed ones into view and wait for their real pixels (bounded).
  await page.evaluate(async (selector) => {
    const area = document.querySelector(selector) || document.body;
    const lazy = [...area.querySelectorAll("img")].filter((img) => !img.closest("header,nav,footer") && !img.complete).slice(0, 12);
    for (const img of lazy) {
      img.scrollIntoView({ block: "center" });
      await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    }
    window.scrollTo(0, 0);
  }, scope);
  return page.evaluate((selector) => {
    const area = document.querySelector(selector) || document.body;
    const imgs = [...area.querySelectorAll("img")].filter((img) => !img.closest("header,nav,[role=navigation],footer"));
    const shown = imgs.filter((img) => { const r = img.getBoundingClientRect(); return r.width >= 40 && r.height >= 30; });
    return {
      loaded: shown.filter((img) => img.complete && img.naturalWidth > 0).length,
      broken: shown.filter((img) => img.complete && img.naturalWidth === 0).map((img) => (img.currentSrc || img.src).slice(0, 100)),
      videos: [...area.querySelectorAll("video")].map((v) => ({ poster: Boolean(v.poster), src: Boolean(v.currentSrc || v.src || v.querySelector("source")) })),
      ytThumbs: [...area.querySelectorAll("img")].filter((img) => /ytimg|youtube/.test(img.currentSrc || img.src) && img.naturalWidth > 0).length,
      text: (area.innerText || "").replace(/\s+/g, " ").trim(),
    };
  }, scope);
}

async function open(page, path) {
  await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(Number(process.env.SETTLE_MS || 6000));
}

async function anonRead(page, query) {
  return page.evaluate(async ({ url, key, query }) => {
    const response = await fetch(`${url}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    return response.ok ? response.json() : [];
  }, { url: SUPABASE_URL, key: SUPABASE_ANON, query });
}

const SURFACES = {
  async now(page, device) {
    await open(page, "/");
    const facts = await mediaFacts(page);
    record(device, "now", "real image previews load", facts.loaded >= 3, `loaded=${facts.loaded}`);
    record(device, "now", "no broken image in the list", facts.broken.length === 0, facts.broken.join(" "));
    record(device, "now", "videos show a poster/thumbnail", facts.videos.every((v) => v.poster) || facts.videos.length === 0 || facts.ytThumbs > 0,
      JSON.stringify(facts.videos));
    record(device, "now", "cards show text without a click", facts.text.length > 400, `chars=${facts.text.length}`);
  },
  async world(page, device) {
    await open(page, "/world");
    const updates = page.locator("#world-public-updates");
    await updates.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(2500);
    const cards = updates.locator("article");
    const count = await cards.count();
    record(device, "world", "public update cards render", count > 0, `cards=${count}`);
    const facts = await mediaFacts(page, "#world-public-updates");
    record(device, "world", "update cards show the source image (post/group thumbnail)", facts.loaded > 0, `loaded=${facts.loaded}`);
    record(device, "world", "no broken image in update cards", facts.broken.length === 0, facts.broken.join(" "));
    const findings = updates.getByRole("button", { name: "ממצאים", exact: true });
    if (await findings.count()) {
      await findings.first().click();
      await page.waitForTimeout(800);
      let label = await updates.locator('[data-public-research-status="candidate"]').count();
      for (let i = 0; i < 6 && !label; i += 1) {
        const more = updates.locator("button.sod29-action");
        if (!(await more.count())) break;
        await more.first().click(); await page.waitForTimeout(500);
        label = await updates.locator('[data-public-research-status="candidate"]').count();
      }
      record(device, "world", "public findings show the «טרם אומת» label", label > 0 && /טרם אומת/.test(await updates.innerText()), `labels=${label}`);
      const text = await updates.innerText();
      record(device, "world", "no personal fields in public findings", !PERSONAL.test(text));
    } else record(device, "world", "findings filter present", false, "missing");
  },
  async finding(page, device) {
    await open(page, "/world");
    const rows = await anonRead(page, "research_objects?select=id&privacy_scope=eq.public&status=eq.candidate"
      + "&source_ref=like.channel_updates:*&meta->ext->presentation->>statement_role=eq.research_statement&order=created_at.desc&limit=6");
    let shown = false;
    for (const row of Array.isArray(rows) ? rows : []) {
      await open(page, `/world?finding=${row.id}`);
      const focus = page.locator("[data-world-public-finding]");
      if (!(await focus.count())) continue;
      const text = await focus.first().innerText();
      shown = true;
      record(device, "finding", "exact public candidate opens with its content", text.replace(/\s+/g, " ").length > 60, `id=${row.id.slice(0, 8)}`);
      record(device, "finding", "exact candidate carries «טרם אומת» (status unchanged)",
        /טרם אומת/.test(text) && (await focus.locator('[data-public-research-status="candidate"]').count()) > 0);
      record(device, "finding", "no personal fields in the finding", !PERSONAL.test(text));
      break;
    }
    if (!shown) record(device, "finding", "exact public candidate opens with its content", false, `tried=${rows.length}`);
    await open(page, "/world?finding=00000000-0000-4000-8000-000000000000");
    record(device, "finding", "unknown finding id shows no finding", (await page.locator("[data-world-public-finding]").count()) === 0);
  },
  async posts(page, device) {
    await open(page, "/post");
    const facts = await mediaFacts(page);
    record(device, "posts", "post cards show real cover images", facts.loaded >= 6, `loaded=${facts.loaded}`);
    record(device, "posts", "no broken image in the post list", facts.broken.length === 0, facts.broken.join(" "));
    // A post card: a same-site link that carries a cover image and a title (not a series or paging link).
    const link = page.locator('main a[href^="/"]:not([href*="series="]):not([href^="/2029/posts"]):not([href^="/post?"])')
      .filter({ has: page.locator("img") }).filter({ has: page.locator("h2, h3, strong") }).first();
    const href = await link.getAttribute("href").catch(() => null);
    if (href) {
      await link.click(); await page.waitForTimeout(5000);
      const post = await mediaFacts(page);
      record(device, "posts", "a listed post opens with its text", new URL(page.url()).pathname !== "/post" && post.text.length > 400,
        `href=${href.slice(0, 60)} chars=${post.text.length}`);
      record(device, "posts", "post page has no broken image", post.broken.length === 0, post.broken.join(" "));
    } else record(device, "posts", "a listed post opens with its text", false, "no post link");
  },
  async gallery(page, device) {
    await open(page, "/gallery");
    const facts = await mediaFacts(page);
    record(device, "gallery", "gallery shows real image previews", facts.loaded >= 6, `loaded=${facts.loaded}`);
    record(device, "gallery", "no broken image in the gallery", facts.broken.length === 0, facts.broken.join(" "));
    // The whole image is already visible; a click enlarges it (lightbox) or opens its source deeper.
    const frame = page.locator("main a.r29-picture-frame, main button.sod29-canonical-media-figure").first();
    if (await frame.count()) {
      const before = page.url();
      await frame.scrollIntoViewIfNeeded(); await frame.click(); await page.waitForTimeout(2500);
      const dialog = await page.locator('[role="dialog"][aria-modal]').count();
      record(device, "gallery", "click enlarges the image or opens its source", dialog > 0 || page.url() !== before,
        dialog ? "lightbox" : new URL(page.url()).pathname + new URL(page.url()).search.slice(0, 60));
    } else record(device, "gallery", "click enlarges the image or opens its source", false, "no clickable image");
  },
  async number(page, device) {
    await open(page, "/number/878");
    const section = page.locator('section[aria-label="ממצאים ציבוריים למספר"]');
    if (!(await section.count())) { record(device, "number", "number findings section present", false, "missing"); return; }
    await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(6000);
    const cards = await section.locator(".zvi-research__card").count();
    const status = (await section.innerText()).replace(/\s+/g, " ");
    record(device, "number", "findings appear without pressing «הצגת ממצאים»", cards > 0 || /לא נמצאו ממצאים/.test(status),
      `cards=${cards} ${status.slice(0, 80)}`);
    record(device, "number", "no personal fields in number findings", !PERSONAL.test(status));
  },
  async books(page, device) {
    await open(page, "/books");
    const facts = await mediaFacts(page);
    const names = await page.locator("main h2, main h3").count();
    record(device, "books", "products show image and name before entry", facts.loaded >= 1 && names >= 2, `loaded=${facts.loaded} names=${names}`);
    record(device, "books", "no broken book image", facts.broken.length === 0, facts.broken.join(" "));
  },
  async community(page, device) {
    await open(page, "/community");
    const facts = await mediaFacts(page);
    record(device, "community", "community media previews load", facts.loaded >= 3, `loaded=${facts.loaded} yt=${facts.ytThumbs}`);
    record(device, "community", "no broken image in the community feed", facts.broken.length === 0, facts.broken.join(" "));
  },
  async orgeula(page, device) {
    await open(page, "/or-geula");
    const facts = await mediaFacts(page);
    record(device, "or-geula", "videos/images show a thumbnail before entry", facts.loaded >= 3, `loaded=${facts.loaded}`);
    record(device, "or-geula", "no broken thumbnail", facts.broken.length === 0, facts.broken.join(" "));
  },
  async topic(page, device) {
    await open(page, "/world");
    const topics = await anonRead(page, "topic_cards_public?select=slug&order=approved_at.desc.nullslast&limit=1");
    const slug = topics?.[0]?.slug;
    if (!slug) { record(device, "topic", "a published Topic opens", false, "no topic"); return; }
    await open(page, `/topic/${encodeURIComponent(slug)}`);
    const text = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
    record(device, "topic", "a published Topic opens with content", !/הציר לא נמצא/.test(text) && text.length > 200, `chars=${text.length}`);
  },
};

const only = (process.env.ONLY || Object.keys(SURFACES).join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
const browser = await chromium.launch(proxy ? { proxy } : {});
try {
  for (const device of (process.env.DEVICES || "desktop,phone").split(",")) {
    const context = await browser.newContext(device === "phone"
      ? { ...devices["iPhone 13"], deviceScaleFactor: 1, locale: "he-IL" }
      // A regular desktop browser identity: a "HeadlessChrome" agent is served the crawler document on the live host.
      : { viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: "he-IL", userAgent: devices["Desktop Chrome"].userAgent });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (/google-analytics|googletagmanager|doubleclick|facebook\.net|vercel-insights|\/_vercel\/insights/.test(url.href)) return route.abort();
      if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return route.continue();
      const rpc = /\/rest\/v1\/rpc\/([^/?]+)/.exec(url.pathname)?.[1];
      if (rpc && !WRITE_RPC.test(rpc)) return route.continue();
      return route.abort();
    });
    for (const name of only) {
      const page = await context.newPage();
      try { await SURFACES[name](page, device); }
      catch (error) { record(device, name, "surface completes", false, error.message); }
      finally { await page.close(); }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server?.close();
}

const failed = results.filter((row) => !row.ok);
for (const row of results) console.log(`${row.ok ? "PASS" : "FAIL"} · ${row.device} · ${row.surface} · ${row.check}${row.detail ? ` · ${row.detail}` : ""}`);
console.log(`\n${base}: ${results.length - failed.length}/${results.length} checks passed`);
if (process.env.REPORT) writeFileSync(process.env.REPORT, JSON.stringify({ base, results }, null, 2));
process.exitCode = failed.length ? 1 : 0;
