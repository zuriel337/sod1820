// Proves, Post by Post, that the server builds exactly the browser's article (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), and writes the list
// the document handler serves from (public-reading-deploy/article-first-proven.json). For every public imported Post that is a candidate
// (postArticleFirstPolicy2029.js): the page's article pipeline runs under jsdom (the server) and in Chromium (the browser, the same source
// bundled by esbuild); Chromium parses both outputs and compares them node by node. Only identical Posts are listed, keyed by the exact
// stored source, so an edited Post leaves the list until this runs again. Reads public rows with the public anonymous key only.
//   node scripts/build-article-first-proofs.mjs            (needs network to the public API and the pinned Chromium)
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright; for (const name of ["playwright", "@playwright/test", "/opt/node-tools/node_modules/playwright"]) { try { playwright = require(name); break; } catch { /* next */ } }
if (!playwright) throw new Error("article_first_proofs_need_playwright");
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8"))[1];
const FIELDS = "id,wp_id,slug,source,link,title,excerpt,content,image_url,date,modified,tags,categories,author";

const { postArticleFirstCandidate2029 } = await import("../src/lib/research/postArticleFirstPolicy2029.js");
const { postArticleSourceHtmlFromRow2029, postArticleSourceKey2029 } = await import("../src/lib/research/postArticlePipeline2029.js");

const rows = [];
for (let from = 0; ; from += 200) {
  const response = await fetch(`${API}/rest/v1/posts?source=eq.wordpress&select=${FIELDS}&order=id&limit=200&offset=${from}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!response.ok) throw new Error(`article_first_proofs_read_${response.status}`);
  const page = await response.json(); rows.push(...page); if (page.length < 200) break;
}
const candidates = rows.filter(postArticleFirstCandidate2029);

// Server: the same pipeline under jsdom.
const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/" });
globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
const server = candidates.map(row => { try { return postArticleSourceHtmlFromRow2029(row); } catch { return null; } });
delete globalThis.document; delete globalThis.CSSStyleSheet;

// Browser: the same source bundled for Chromium.
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../src/lib/research/postArticlePipeline2029.js", import.meta.url))], bundle: true, write: false, format: "iife",
  globalName: "__articleFirstPipeline", platform: "browser", logLevel: "silent", define: { "import.meta.env.VITE_REALITY_MAP_PREVIEW": '"false"' } });
const browser = await playwright.chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const posts = {}; const differ = [];
for (let index = 0; index < candidates.length; index += 50) {
  const slice = candidates.slice(index, index + 50).map((row, k) => ({ row, server: server[index + k] }));
  const verdicts = await page.evaluate(items => items.map(({ row, server }) => {
    if (server == null) return false;
    const parse = html => { const t = document.createElement("template"); t.innerHTML = html; return [...t.content.childNodes]; };
    const a = parse(window.__articleFirstPipeline.postArticleSourceHtmlFromRow2029(row)), b = parse(server);
    return a.length === b.length && a.every((node, k) => node.isEqualNode(b[k]));
  }), slice);
  verdicts.forEach((same, k) => { const row = slice[k].row; if (same) posts[String(row.id)] = postArticleSourceKey2029(row.content); else differ.push(row.id); });
}
await browser.close();
const base = (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; } })();
const out = { generated: new Date().toISOString(), base, note: "Imported Posts whose exact stored source was proven to give the browser's article on the server (scripts/build-article-first-proofs.mjs). Keyed by post id; the value is the source key.",
  counts: { imported: rows.length, candidates: candidates.length, proven: Object.keys(posts).length, differ: differ.length }, differ, posts };
writeFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out.counts));
