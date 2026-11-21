import test from "node:test";
import assert from "node:assert/strict";
import { homePreloadComment, withRoutePreloads2029, HOME_PRELOAD_MARK, sodHintLoader2029, hintLoaderScript2029 } from "../public-reading-deploy/route-preload.js";

// The Home's own code, fetched with its document (ZURIEL 17.11.2026): exactly the Home page's static graph beyond the entry, only on "/".
const manifest = {
  "2029.html": { file: "assets/2029-entry.js", isEntry: true, imports: ["_react.js"] },
  "_react.js": { file: "assets/react-1.js" },
  "src/pages/Home2029Page.jsx": { file: "assets/Home2029Page-a.js", isDynamicEntry: true, imports: ["_react.js", "_Shell.js", "_now.js"], css: ["assets/Home2029Page-a.css"], dynamicImports: ["src/components/research/RealityRiver2029.jsx"] },
  "_Shell.js": { file: "assets/Sod2029Shell-b.js", imports: ["_react.js"], css: ["assets/Sod2029Shell-b.css"] },
  "_now.js": { file: "assets/nowPublications2029-c.js" },
  "src/components/research/RealityRiver2029.jsx": { file: "assets/RealityRiver2029-d.js", isDynamicEntry: true },
};

test("the build lists the Home's static graph beyond the entry (scripts and their styles), never the entry's own files or what the Home loads later", () => {
  const comment = homePreloadComment(manifest);
  assert.ok(comment.startsWith(`<!--${HOME_PRELOAD_MARK} `) && comment.endsWith(" -->"), "one inert comment");
  const hrefs = JSON.parse(/__sodHints\((\[[\s\S]*?\])\)/.exec(comment)[1]).map(([href]) => href);
  assert.deepEqual(hrefs.sort(), ["/assets/Home2029Page-a.css", "/assets/Home2029Page-a.js", "/assets/Sod2029Shell-b.css", "/assets/Sod2029Shell-b.js", "/assets/nowPublications2029-c.js"].sort());
  assert.ok(!hrefs.includes("/assets/react-1.js"), "the entry's graph is already fetched by the entry");
  assert.ok(!hrefs.includes("/assets/RealityRiver2029-d.js"), "a lazy part of the Home stays lazy");
  assert.match(comment, /\["\/assets\/Home2029Page-a\.js"\]/, "a module hint");
  assert.match(comment, /\["\/assets\/Home2029Page-a\.css",1\]/, "a style hint (the loader gives it the app's CORS mode, or it downloads twice)");
  assert.equal(homePreloadComment({}), "", "no graph: no list (the build then stops)");
});

test("the document handler gives the hints to the Home only; every other document loses the list", () => {
  const html = `<head><link rel="modulepreload" crossorigin href="/assets/2029-entry.js">${homePreloadComment(manifest)}</head>`;
  const home = withRoutePreloads2029(html, { path: "/", status: 200 });
  assert.ok(!home.includes(HOME_PRELOAD_MARK) && /<script>__sodHints\(/.test(home) && (/__sodHints\(([\s\S]*?)\)<\/script>/.exec(home)[1].match(/"\/assets\//g) || []).length === 5, "the comment becomes the loader's live list (5 Home files)");
  for (const [path, status] of [["/post/p-1", 200], ["/community/chat", 200], ["/nowhere", 404], ["/", 404]]) {
    const other = withRoutePreloads2029(html, { path, status });
    assert.ok(!other.includes(HOME_PRELOAD_MARK) && (other.match(/<link /g) || []).length === 1, `${path} ${status}: no Home hints`);
  }
  assert.equal(withRoutePreloads2029("<head></head>", { path: "/", status: 200 }), "<head></head>", "a document without the list is unchanged");
});

// Slow networks (21.11.2026): the worker's script is never queued behind the hints; returning readers keep the hints at once.
function fakeDom({ controller = null, sw = true } = {}) {
  const appended = [], regs = { value: undefined };
  const d = { createElement: () => ({}), head: { appendChild: link => appended.push(link) } };
  const n = sw ? { serviceWorker: { controller, getRegistration: () => Promise.resolve(regs.value) } } : {};
  const w = {}; return { w, d, n, appended, regs };
}
const tick = ms => new Promise(done => setTimeout(done, ms));
test("hint loader: a controlled page (returning reader) gets every hint at once, in order, in the app's CORS mode", () => {
  const f = fakeDom({ controller: {} }); sodHintLoader2029(f.w, f.d, f.n);
  f.w.__sodHints([["/assets/entry.js"], ["/assets/a.css", 1]]);
  assert.deepEqual(f.appended.map(l => [l.rel, l.as, l.href, l.crossOrigin]), [["modulepreload", undefined, "/assets/entry.js", "anonymous"], ["preload", "style", "/assets/a.css", "anonymous"]]);
});
test("hint loader: a first visit waits until the browser holds the worker's script, then applies every queued list", async () => {
  const f = fakeDom(); sodHintLoader2029(f.w, f.d, f.n);
  f.w.__sodHints([["/assets/entry.js"]]); f.w.__sodHints([["/assets/Home.js"]]);
  await tick(120); assert.equal(f.appended.length, 0, "nothing competes with /sw.js while it downloads");
  f.regs.value = { installing: null, waiting: null, active: null }; await tick(120); assert.equal(f.appended.length, 0, "a registration without its script yet");
  f.regs.value = { installing: {}, waiting: null, active: null }; await tick(120);
  assert.deepEqual(f.appended.map(l => l.href), ["/assets/entry.js", "/assets/Home.js"]);
  f.w.__sodHints([["/assets/late.js"]]); assert.equal(f.appended.at(-1).href, "/assets/late.js", "after opening, a list applies at once");
});
test("hint loader: without the Service Worker API (the app cannot open) the hints are not fetched at all", async () => {
  const f = fakeDom({ sw: false }); sodHintLoader2029(f.w, f.d, f.n); f.w.__sodHints([["/assets/entry.js"]]); await tick(80);
  assert.equal(f.appended.length, 0);
  assert.match(hintLoaderScript2029(["/assets/e.js", "/assets/s.css"]), /^<script>\(function sodHintLoader2029[\s\S]*\)\(window,document,navigator\);__sodHints\(\[\["\/assets\/e\.js"\],\["\/assets\/s\.css",1\]\]\)<\/script>$/);
});
