// Lab only: build the first-document article of each sample post with the experiment's client functions under happy-dom (scratch dependency).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { JSDOM } = createRequire(import.meta.url)("/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad/afdom/node_modules/jsdom");
const SP = "/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad";
const window = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/" }).window;
globalThis.document = window.document; globalThis.CSSStyleSheet = window.CSSStyleSheet;
const { postArticleDocumentHtml2029, POST_ARTICLE_DOCUMENT_STYLE } = await import(`${SP}/wt-af-exp/src/lib/research/postArticleDocument2029.js`);
const rows = JSON.parse(readFileSync(`${SP}/afssr/rows.json`, "utf8"));
const out = {};
for (const row of rows) {
  const started = performance.now();
  const html = postArticleDocumentHtml2029(row, { document: window.document });
  out[row.id] = { html, ms: Math.round((performance.now() - started) * 10) / 10, bytes: Buffer.byteLength(html) };
  console.log(row.id, "bytes", out[row.id].bytes, "ms", out[row.id].ms, "scripts left", (html.match(/<script/gi) || []).length, "anchors", (html.match(/<a\s+name=/gi) || []).length);
}
writeFileSync(`${SP}/afssr/articles.json`, JSON.stringify({ style: POST_ARTICLE_DOCUMENT_STYLE, articles: out }));
window.close();
