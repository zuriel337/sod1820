// Does the client's article pipeline give the SAME article when it runs on the server? For every public imported Post:
// Chromium runs markLegacyEqualityLines -> postReadingHtml2029 -> hardenPassiveMediaHtml (the page's own path); each server DOM runs the same
// source files; Chromium then parses both outputs and compares them node by node (isEqualNode). Scratch tool, read-only data.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const SP = "/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad";
const SRC = `${SP}/wt-af-exp/src/lib`;
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const posts = JSON.parse(readFileSync(`${SP}/afssr/all-old.json`, "utf8"));
const core = await import(`${SRC}/research/postArticleCore2029.js`);
const { hardenPassiveMediaHtml } = await import(`${SRC}/mediaEgressGuard.js`);
const pipeline = content => hardenPassiveMediaHtml(core.postReadingHtml2029(core.markLegacyEqualityLines(content)));

const DOMS = {
  "happy-dom": async () => { const { Window } = await import(`${SP}/afdom/node_modules/happy-dom/lib/index.js`); const w = new Window({ url: "https://sod1820.co.il/" }); return { document: w.document, CSSStyleSheet: w.CSSStyleSheet, close: () => w.happyDOM.close() }; },
  "jsdom": async () => { const { JSDOM } = require(`${SP}/afdom/node_modules/jsdom`); const d = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://sod1820.co.il/", runScripts: "outside-only" }); return { document: d.window.document, CSSStyleSheet: d.window.CSSStyleSheet, close: () => d.window.close() }; },
  "linkedom": async () => { const { parseHTML } = require(`${SP}/afdom/node_modules/linkedom`); const w = parseHTML("<!doctype html><html><body></body></html>"); return { document: w.document, CSSStyleSheet: w.CSSStyleSheet, close: () => {} }; },
};
const server = {};
for (const [name, make] of Object.entries(DOMS)) {
  const dom = await make(); const saved = { document: globalThis.document, CSSStyleSheet: globalThis.CSSStyleSheet };
  globalThis.document = dom.document; globalThis.CSSStyleSheet = dom.CSSStyleSheet;
  const t0 = performance.now(); const out = []; let threw = 0;
  for (const p of posts) { try { out.push(pipeline(p.content)); } catch (e) { threw++; out.push(null); } }
  server[name] = { out, ms: Math.round(performance.now() - t0), threw };
  globalThis.document = saved.document; globalThis.CSSStyleSheet = saved.CSSStyleSheet; await dom.close();
  console.error(name, "built", posts.length, "in", server[name].ms, "ms; threw", threw);
}

// The browser side: the same two source files, exports stripped, evaluated in a blank Chromium page.
const strip = file => readFileSync(file, "utf8").replace(/^import[^\n]*\n/gm, "").replace(/^export\s+(?=(const|function|class|let)\b)/gm, "");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ content: strip(`${SRC}/research/postArticleCore2029.js`) + "\n" + strip(`${SRC}/mediaEgressGuard.js`) + "\nwindow.__pipeline = c => hardenPassiveMediaHtml(postReadingHtml2029(markLegacyEqualityLines(c)));" });
const results = { posts: posts.length, doms: {} };
for (const name of Object.keys(DOMS)) results.doms[name] = { equal: 0, differ: 0, threw: server[name].threw, scriptsLeft: 0, ms: server[name].ms, firstDiffs: [] };
const BATCH = 50;
for (let i = 0; i < posts.length; i += BATCH) {
  const slice = posts.slice(i, i + BATCH).map((p, k) => ({ id: p.id, content: p.content, server: Object.fromEntries(Object.keys(DOMS).map(n => [n, server[n].out[i + k]])) }));
  const verdicts = await page.evaluate(items => items.map(item => {
    const mine = window.__pipeline(item.content);
    const parse = html => { const t = document.createElement("template"); t.innerHTML = html; return [...t.content.childNodes]; };
    const a = parse(mine);
    const out = { id: item.id };
    for (const [name, html] of Object.entries(item.server)) {
      if (html == null) { out[name] = { equal: false, threw: true }; continue; }
      const b = parse(html);
      let equal = a.length === b.length && a.every((n, k) => n.isEqualNode(b[k]));
      let diff = null;
      if (!equal) {
        // first differing top-level node, short
        const k = a.findIndex((n, j) => !b[j] || !n.isEqualNode(b[j]));
        const show = n => !n ? "∅" : (n.outerHTML || n.textContent || "").slice(0, 160);
        diff = { at: k, client: show(a[k]), server: show(b[k]) };
        const ca = a[k], sb = b[k];
        diff.kind = !ca || !sb ? "count" : ca.nodeType === 3 && sb.nodeType === 3 ? (ca.textContent.trim() === sb.textContent.trim() ? "whitespace" : "text")
          : (ca.nodeType === 1 && (ca.matches("style") || ca.querySelector("style"))) ? "style" : (ca.nodeType === 1 && (ca.matches("iframe") || ca.querySelector("iframe"))) ? "iframe" : "element";
      }
      const scripts = parse(html).reduce((s, n) => s + (n.nodeType === 1 ? (n.matches("script") ? 1 : 0) + n.querySelectorAll("script").length : 0), 0);
      out[name] = { equal, diff, scripts };
    }
    return out;
  }), slice);
  for (const v of verdicts) for (const name of Object.keys(DOMS)) {
    const r = results.doms[name], x = v[name];
    if (x.threw) continue;
    if (x.equal) r.equal++; else { r.differ++; r.kinds = r.kinds || {}; r.kinds[x.diff.kind] = (r.kinds[x.diff.kind] || 0) + 1; (r.byKind = r.byKind || {})[x.diff.kind] ||= []; if (r.byKind[x.diff.kind].length < 3) r.byKind[x.diff.kind].push({ id: v.id, ...x.diff }); if (r.firstDiffs.length < 6) r.firstDiffs.push({ id: v.id, ...x.diff }); }
    r.scriptsLeft += x.scripts || 0;
  }
}
await browser.close();
writeFileSync(`${SP}/afssr/equivalence.json`, JSON.stringify(results, null, 1));
for (const [name, r] of Object.entries(results.doms)) console.log(name.padEnd(10), "equal", r.equal, "differ", r.differ, "threw", r.threw, "scripts left", r.scriptsLeft, "build ms", r.ms, JSON.stringify(r.kinds || {}));
