// Is the first-paint stylesheet enough for REAL articles? (OLD_POST_ARTICLE_FIRST, 16.11.2026.) For a sample of proven imported Posts, the real
// server function builds the article-first document; Chromium lays it out twice, with the first-paint stylesheet alone and with the full
// stylesheets after it (as the document loads them), at phone and desktop width, and compares the computed style and the box of EVERY element
// of the article. Any difference is a rule the extraction left out that applies. Reads public rows with the public anonymous key.
//   node scripts/build-public-reading-production.mjs && node scripts/check-article-first-critical-css.mjs [--limit 120] [--theme dark|light|parchment]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright; for (const name of ["playwright", "@playwright/test", "/opt/node-tools/node_modules/playwright"]) { try { playwright = require(name); break; } catch { /* next */ } }
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 120;
const theme = process.argv.includes("--theme") ? process.argv[process.argv.indexOf("--theme") + 1] : "dark";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(join(root, "src/lib/supabase.js"), "utf8"))[1];
const proof = JSON.parse(readFileSync(join(root, "public-reading-deploy/article-first-proven.json"), "utf8"));
const template = readFileSync(join(root, "public-reading-deploy/.generated/2029.html"), "utf8");
const dist = join(root, "public-reading-deploy/dist");
const { withArticleFirst2029, loadArticleFirstRenderer } = await import("../public-reading-deploy/api/article-first.js");
const { publicPostUrl } = await import("../src/lib/publicPostUrls.js");
await loadArticleFirstRenderer();

const ids = Object.keys(proof.posts); const step = Math.max(1, Math.floor(ids.length / limit)); const sample = ids.filter((_, index) => index % step === 0).slice(0, limit);
const rows = [];
for (let from = 0; from < sample.length; from += 60) {
  const response = await fetch(`${API}/rest/v1/posts?id=in.(${sample.slice(from, from + 60).join(",")})&select=id,wp_id,slug,source,link,title,excerpt,content,image_url,date,modified,tags,categories,author`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  rows.push(...await response.json());
}
const browser = await playwright.chromium.launch();
const results = [];
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route("**/*", route => { const url = new URL(route.request().url());
    if (url.hostname === "sod1820.co.il" && url.pathname.startsWith("/assets/") && url.pathname.endsWith(".css")) return route.fulfill({ path: join(dist, url.pathname), contentType: "text/css" });
    return url.hostname === "sod1820.co.il" && url.pathname === "/" ? route.fulfill({ body: "", contentType: "text/html" }) : route.abort(); });
  await page.goto("https://sod1820.co.il/");
  await page.evaluate(preset => { localStorage.setItem("sod2029:theme-preset", preset); localStorage.setItem("sod2029:theme-preset-seeded", "1"); }, theme);
  for (const row of rows) {
    const path = new URL(publicPostUrl(row), "https://sod1820.co.il").pathname;
    const out = withArticleFirst2029(template, { path, status: 200, post: row });
    if (out.state !== "served") { results.push({ id: row.id, width, state: out.state }); continue; }
    const readout = async html => { await page.setContent(html.replace(/<script\b[\s\S]*?<\/script>/gi, m => /data-sod-article-first-(theme|frame)/.test(m) ? m : ""), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);   // the local faces settle before the layout is read
      return page.evaluate(() => { const props = ["display", "position", "font-family", "font-size", "font-weight", "line-height", "color", "background-color", "margin-top", "margin-bottom", "padding-top", "padding-inline-start", "text-align", "width", "border-top-width"];
        return [...document.querySelectorAll("#sod29-ssr-article article *")].map(node => { const cs = getComputedStyle(node), r = node.getBoundingClientRect();
          return `${node.tagName}.${node.className}|${props.map(p => cs.getPropertyValue(p)).join("|")}|${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`; }); }); };
    // first-paint stylesheet alone (its class on <html>) vs the full stylesheets after the class is gone (the document's final state)
    const critical = await readout(out.html.replace(/<link data-sod-article-first-full [^>]*>/g, ""));
    const full = await readout(out.html.replace(/<html class="sod-af-first"/, "<html"));
    const differ = critical.map((line, index) => line === full[index] ? null : { critical: line.slice(0, 260), full: (full[index] || "").slice(0, 260) }).filter(Boolean);
    const deepest = differ.filter(item => item.critical.split("|").slice(0, -1).join("|") !== item.full.split("|").slice(0, -1).join("|"));
    results.push({ id: row.id, width, elements: critical.length, differ: differ.length, styleDiffers: deepest.length, first: deepest[0] || differ[0] || null });
  }
  await page.close();
}
await browser.close();
const bad = results.filter(item => item.differ);
console.log(JSON.stringify({ theme, posts: rows.length, checks: results.length, served: results.filter(item => item.elements != null).length, elements: results.reduce((sum, item) => sum + (item.elements || 0), 0), withDifferences: bad.length, examples: bad.slice(0, 6) }, null, 1));
process.exitCode = bad.length ? 1 : 0;
