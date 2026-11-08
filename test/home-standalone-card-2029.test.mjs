import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";

// The real "מחקרים ותוכן נוסף" Home component with a controlled reader. No network, browser timing or product write.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("// \"פוסטים אחרונים\": the newest public Posts"), source.indexOf("function AvailabilityItem("));
assert.ok(components.includes("function HomeStandalonePosts"));
const outfile = resolve(`.test-home-standalone-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useState,useEffect,useMemo} from 'react';
  const HOME_STANDALONE_LIMIT = 6;
  const getHomeStandalonePostCards = options => globalThis.__standalone.read(options);
  const postHref = post => '/post/' + post.slug;
  const clean = value => String(value ?? '');
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = () => React.createElement('img', {alt:''});
  const PublicationTime = () => React.createElement('time');
  const Section = ({title, link, children, className, admissionRef}) => React.createElement('section', {className, 'aria-label': title, ref: admissionRef}, link, children);
  ${components}
  export {HomeStandalonePosts};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"] });
const { HomeStandalonePosts } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__standalone; });

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() { const f = { calls: [], read(options) { const d = deferred(); f.calls.push({ ...d, ...options }); return d.promise; } }; globalThis.__standalone = f; return f; }
const card = id => ({ id, slug: `post-${id}`, title: `מחקר ${id}`, excerpt: id === 1 ? "תמצית קצרה של הפוסט" : null, poster: null, author: id % 2 ? "SOD1820" : null, publishedAt: "2026-10-30T00:00:00Z", sourcePost: { id, slug: `post-${id}` } });
const render = (props, root) => React.createElement(HomeStandalonePosts, { exclude: new Set(), admitted: true, admissionRef: null, ...props });
const posts = root => root.root.findAll(node => node.type === "li" && node.props["data-home-standalone-post"]);
const skeletons = root => root.root.findAll(node => node.type === "li" && String(node.props.className).includes("h29-skel"));

test("before admission: reserved skeletons only, and no read is started", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(render({ admitted: false })); });
  assert.equal(f.calls.length, 0);
  assert.equal(skeletons(root).length, 6);
  assert.equal(posts(root).length, 0);
  const grid = root.root.findAll(node => node.props["data-home-standalone"] === "true")[0];
  assert.equal(grid.props["aria-busy"], true);
  await act(async () => { root.unmount(); });
});

test("admitted: one bounded read, then at most six compact rows linked to their own Posts; excluded items are not repeated", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(render({ exclude: new Set(["post-3"]) })); });
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].limit, 14); assert.ok(f.calls[0].signal instanceof AbortSignal);
  await act(async () => { f.calls[0].resolve([1, 2, 3, 4, 5, 6, 7, 8].map(card)); });
  assert.deepEqual(posts(root).map(node => node.props["data-home-standalone-post"]), ["post-1", "post-2", "post-4", "post-5", "post-6", "post-7"]);
  assert.deepEqual(posts(root).map(node => node.findAllByType("a")[0].props.href), ["/post/post-1", "/post/post-2", "/post/post-4", "/post/post-5", "/post/post-6", "/post/post-7"]);
  assert.ok(root.root.findAll(node => node.type === "section" && node.props["aria-label"] === "פוסטים אחרונים").length === 1, "the area is named פוסטים אחרונים");
  assert.equal(posts(root)[0].findAll(node => node.type === "small" && /h29-recent-excerpt/.test(String(node.props.className))).length, 1, "short excerpt when the Post has one");
  assert.equal(posts(root)[1].findAll(node => node.type === "small" && /h29-recent-excerpt/.test(String(node.props.className))).length, 0, "no excerpt, no empty line");
  assert.equal(skeletons(root).length, 0);
  assert.ok(root.root.findAll(node => node.type === "a" && node.props.href === "/2029/posts").length >= 1, "link to all posts");
  // An item that another Home source shows later is removed without another read.
  await act(async () => { root.update(render({ exclude: new Set(["post-3", "post-1"]) })); });
  assert.deepEqual(posts(root).map(node => node.props["data-home-standalone-post"]), ["post-2", "post-4", "post-5", "post-6", "post-7", "post-8"]);
  assert.equal(f.calls.length, 1);
  await act(async () => { root.unmount(); });
  assert.equal(f.calls[0].signal.aborted, true);
});

test("nothing to show or a failed read renders nothing: no empty strip and no error text", async () => {
  for (const outcome of ["empty", "failure", "all-excluded"]) {
    const f = fixture(); let root;
    await act(async () => { root = Renderer.create(render({ exclude: outcome === "all-excluded" ? new Set(["post-1"]) : new Set() })); });
    await act(async () => { outcome === "failure" ? f.calls[0].reject(new Error("offline")) : f.calls[0].resolve(outcome === "empty" ? [] : [card(1)]); });
    assert.equal(root.toJSON(), null, outcome);
    await act(async () => { root.unmount(); });
  }
});
