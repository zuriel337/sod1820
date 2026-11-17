import test from "node:test";
import assert from "node:assert/strict";
import { homePreloadComment, withRoutePreloads2029, HOME_PRELOAD_MARK } from "../public-reading-deploy/route-preload.js";

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
  const hrefs = [...comment.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(hrefs.sort(), ["/assets/Home2029Page-a.css", "/assets/Home2029Page-a.js", "/assets/Sod2029Shell-b.css", "/assets/Sod2029Shell-b.js", "/assets/nowPublications2029-c.js"].sort());
  assert.ok(!hrefs.includes("/assets/react-1.js"), "the entry's graph is already fetched by the entry");
  assert.ok(!hrefs.includes("/assets/RealityRiver2029-d.js"), "a lazy part of the Home stays lazy");
  assert.match(comment, /<link rel="modulepreload" crossorigin href="\/assets\/Home2029Page-a\.js">/);
  assert.match(comment, /<link rel="preload" as="style" crossorigin href="\/assets\/Home2029Page-a\.css">/, "the same CORS mode as the app's own stylesheet link, or it downloads twice");
  assert.equal(homePreloadComment({}), "", "no graph: no list (the build then stops)");
});

test("the document handler gives the hints to the Home only; every other document loses the list", () => {
  const html = `<head><link rel="modulepreload" crossorigin href="/assets/2029-entry.js">${homePreloadComment(manifest)}</head>`;
  const home = withRoutePreloads2029(html, { path: "/", status: 200 });
  assert.ok(!home.includes(HOME_PRELOAD_MARK) && (home.match(/<link /g) || []).length === 6, "the comment becomes live hints");
  for (const [path, status] of [["/post/p-1", 200], ["/community/chat", 200], ["/nowhere", 404], ["/", 404]]) {
    const other = withRoutePreloads2029(html, { path, status });
    assert.ok(!other.includes(HOME_PRELOAD_MARK) && (other.match(/<link /g) || []).length === 1, `${path} ${status}: no Home hints`);
  }
  assert.equal(withRoutePreloads2029("<head></head>", { path: "/", status: 200 }), "<head></head>", "a document without the list is unchanged");
});
