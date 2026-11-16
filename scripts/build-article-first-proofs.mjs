// Proves, Post by Post, that the server builds exactly the browser's article (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), and writes the list
// the document handler serves from (public-reading-deploy/article-first-proven.json). For every public imported Post that is a candidate
// (postArticleFirstPolicy2029.js): the page's article pipeline runs under jsdom (the server) and in Chromium (the browser, the same source
// bundled by esbuild); Chromium parses both outputs and compares them node by node. Only identical Posts are listed, keyed by the exact
// stored source and voice, so an edited Post leaves the list until this runs again; the list records the fingerprint of the pipeline code and of
// the server DOM it was made with, and the build serves only a proof made for the code being built. Reads public rows with the public anonymous
// key only. Run it again after any change to the pipeline (CI: test/article-first-proof-fresh.test.mjs) and after content edits.
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
const { postArticleSourceHtmlFromRow2029, postArticleProofKey2029 } = await import("../src/lib/research/postArticlePipeline2029.js");
const { articleFirstFingerprint } = await import("./lib/article-first-fingerprint.mjs");
const identity = await articleFirstFingerprint(root);

const rows = [];
for (let from = 0; ; from += 200) {
  const response = await fetch(`${API}/rest/v1/posts?source=eq.wordpress&select=${FIELDS}&order=id&limit=200&offset=${from}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!response.ok) throw new Error(`article_first_proofs_read_${response.status}`);
  const page = await response.json(); rows.push(...page); if (page.length < 200) break;
}
const candidates = rows.filter(postArticleFirstCandidate2029);

// Server: the same pipeline under jsdom; and the vocabulary of every first-document article (its frame, header and body), from which the build
// keeps the first-paint rules (scripts/lib/article-first-critical-css.mjs).
const { postArticleDocumentHtml2029 } = await import("../src/lib/research/postArticleDocument2029.js");
const { emptyVocabulary, addToVocabulary, vocabularyToJson } = await import("./lib/article-first-critical-css.mjs");
const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/" });
globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
const server = candidates.map(row => { try { return postArticleSourceHtmlFromRow2029(row); } catch { return null; } });
const vocabulary = emptyVocabulary();
for (const row of candidates) {
  try { const template = window.document.createElement("template"); template.innerHTML = postArticleDocumentHtml2029(row, { document: window.document, path: "/x" }); addToVocabulary(vocabulary, template.content); } catch { /* not served */ }
}
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
    if (server == null) return { same: false, kind: "server-throws" };
    const parse = html => { const t = document.createElement("template"); t.innerHTML = html; return t.content; };
    const a = parse(window.__articleFirstPipeline.postArticleSourceHtmlFromRow2029(row)), b = parse(server);
    // Walk both trees together; the first difference is recorded, so an excluded Post says why.
    const wa = document.createTreeWalker(a, NodeFilter.SHOW_ALL), wb = document.createTreeWalker(b, NodeFilter.SHOW_ALL);
    for (let na = wa.nextNode(), nb = wb.nextNode(); na || nb; na = wa.nextNode(), nb = wb.nextNode()) {
      if (!na || !nb) return { same: false, kind: "length", detail: (na || nb).nodeName };
      if (na.nodeType !== nb.nodeType || na.nodeName !== nb.nodeName) return { same: false, kind: "node", detail: `${na.nodeName} / ${nb.nodeName}` };
      if (!na.isEqualNode(nb) && na.nodeType !== 1) return { same: false, kind: "text", detail: `${JSON.stringify(String(na.data).slice(-40))} / ${JSON.stringify(String(nb.data).slice(-40))}` };
      if (na.nodeType === 1) {
        const attrs = node => [...node.attributes].map(item => `${item.name}=${item.value}`);
        const x = attrs(na), y = attrs(nb), onlyA = x.filter(v => !y.includes(v)), onlyB = y.filter(v => !x.includes(v));
        if (onlyA.length || onlyB.length) return { same: false, kind: `attribute:${na.nodeName.toLowerCase()}`, detail: `browser ${JSON.stringify(onlyA).slice(0, 160)} / server ${JSON.stringify(onlyB).slice(0, 160)}` };
      }
    }
    return { same: true };
  }), slice);
  verdicts.forEach((verdict, k) => { const row = slice[k].row; if (verdict.same) posts[String(row.id)] = postArticleProofKey2029(row); else differ.push({ id: row.id, kind: verdict.kind, detail: verdict.detail || null }); });
}
await browser.close();
const base = (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; } })();
const out = { generated: new Date().toISOString(), base, fingerprint: identity.fingerprint, jsdom: identity.jsdom, pipeline: identity.inputs,
  note: "Imported Posts whose exact stored source (and voice) was proven to give the browser's article on the server (scripts/build-article-first-proofs.mjs). Keyed by post id; the value is the proof key (postArticleProofKey2029). Valid only for the pipeline code and server DOM of `fingerprint` (scripts/lib/article-first-fingerprint.mjs).",
  counts: { imported: rows.length, candidates: candidates.length, proven: Object.keys(posts).length, differ: differ.length }, differ, posts };
writeFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
writeFileSync(new URL("../public-reading-deploy/article-first-vocabulary.json", import.meta.url), JSON.stringify({ fingerprint: identity.fingerprint,
  note: "Every tag, id, class, attribute and attribute value of the proven first-document articles (scripts/build-article-first-proofs.mjs); the build keeps the first-paint rules that may match them.",
  ...vocabularyToJson(vocabulary) }) + "\n");
console.log(JSON.stringify(out.counts));
