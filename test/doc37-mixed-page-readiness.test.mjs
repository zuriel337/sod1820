import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";

// The actual page/effects, with explicitly controlled metadata/rank completion.
// Canonical item projection is real; no request, live data or browser benchmark.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const pageSource = (await readFile(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8")).replace(/^import[^\n]*\n/gm, "");
const outfile = resolve(`.test-mixed-page-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useEffect,useMemo,useRef,useState} from 'react';
  import {CONTENT_SERIES_2029,contentSeriesByKey} from './src/lib/research/contentSeries2029Identity.js';
  import {mergeContentSeriesItems,projectContentSeriesItems} from './src/lib/research/contentSeries2029Projection.js';
  import {publicPostHref} from './src/lib/publicPostUrls.js';
  import * as viewport2029 from './src/lib/research/postsCatalogViewport2029.js';
  const useLocation=()=>globalThis.__mixedPage.location;
  const useNavigationType=()=>globalThis.__mixedPage.navigationType;
  const useSearchParams=()=>[new URLSearchParams(globalThis.__mixedPage.location.search),()=>{}];
  const postsCatalogScope2029=params=>{const key=params.get('series'),spec=contentSeriesByKey(key);return {kind:'series',key,spec,label:spec.label}};
  const fetchPostsCatalog2029=options=>globalThis.__mixedPage.readPosts(options);
  const fetchContentSeriesCatalog2029=options=>globalThis.__mixedPage.readSeries(options);
  const completeMixedSeriesPostsPage2029=options=>globalThis.__mixedPage.complete(options);
  const startPostsCatalogViewportRestore2029=()=>({isRestoring:false,setReady(){},stop(){}});
  const trackPostsCatalogViewport2029=()=>()=>{};
  const capturePostsCatalogDeparture2029=()=>{};
  const rememberPostsCatalogViewport2029=()=>{};
  const readPostsCatalogViewport2029=options=>viewport2029.readPostsCatalogViewport2029({...options,win:globalThis.__mixedPage.win});
  const applySeo=()=>{},track=()=>{},postContentEntry2029=()=>null;
  const humanContentTitle=value=>value,stripHtml=value=>value,bilingualDateLabel=value=>value;
  const postClassification2029=()=>({credit:null});
  const AUTHORS={},POST_BACKGROUND_ASSETS_2029={};
  const NavigationIcon2029=()=>null,PostCategories2029=()=>null;
  const PostFollowBox=()=>React.createElement('aside',{'data-follow-fixture':true});
  const Link=({to,...props})=>React.createElement('a',{...props,href:to});
  const Sod2029Shell=({children})=>React.createElement(React.Fragment,null,children);
  const FrameState=({kind,title,children})=>React.createElement('section',{'data-frame-kind':kind},React.createElement('h2',null,title),children);
  ${pageSource}
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile,
external: ["react"], define: { "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"', "import.meta.env.VITE_PUBLIC_FOUNDATION_PREVIEW": '"true"' } });
const { default: Posts2029Page } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__mixedPage; });

const KEY = "messages-from-righteous", REF = "channel_updates:9d4e6b80-f52b-4461-9231-ca30f37f0db9";
const source = { kind: "channel_update", id: REF, sourceRef: REF, title: "מקור בדיקה", href: "/video/fixture", publishedAt: "2026-11-02T00:00:00Z" };
const posts = (start, count = 24) => Array.from({ length: count }, (_, i) => ({ id: start + i, title: `פוסט ${start + i}`, slug: `post-${start + i}`,
  categories: ["מסרים מצדיקים"], tags: [], date: "2026-10-01T00:00:00Z", source: "wordpress", wp_id: start + i }));
const packet = (sourceState = "measured") => ({ series: CONTENT_SERIES_2029.map(spec => ({ ...spec, items: [],
  sourceStates: spec.key === KEY ? [{ sourceRef: REF, state: sourceState }] : [],
  sourceItems: spec.key === KEY && sourceState === "measured" ? [source] : [],
})) });
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture(page = 2, { navigationType = "PUSH", savedY, savedPatch = {} } = {}) {
  const f = { location: { pathname: "/2029/posts", search: `?series=${KEY}&page=${page}`, hash: "", key: `entry-${page}` }, posts: [], series: [], completions: [],
    navigationType,
    readPosts(options) { const d = deferred(); f.posts.push({ ...d, ...options }); return d.promise; },
    readSeries(options) { const d = deferred(); f.series.push({ ...d, ...options }); return d.promise; },
    complete(options) { const d = deferred(); f.completions.push({ ...d, ...options }); return d.promise; },
  };
  const href = `${f.location.pathname}${f.location.search}${f.location.hash}`;
  f.win = { location: new URL(href, "https://preview.example"), history: { state: { key: f.location.key } } };
  if (savedY !== undefined) f.win.history.state.sodPostsViewport2029 = { entryKey: f.location.key, href, x: 0, y: savedY, ...savedPatch };
  globalThis.__mixedPage = f;
  return f;
}
const cards = root => root.root.findAll(node => node.type === "article" && node.props["data-experience-capability"] === "post-index-card");
const ids = root => cards(root).map(card => card.props["data-series-source"]);
const frames = (root, kind) => root.root.findAllByProps({ "data-frame-kind": kind });
const follow = root => root.root.findAllByProps({ "data-follow-fixture": true });
async function mounted(f) { let root; await act(async () => { root = Renderer.create(React.createElement(Posts2029Page)); }); return root; }

test("page2 waits for rank/predecessor assignment, then mounts only the canonical24 without changing requests", async () => {
  const f = fixture(), root = await mounted(f);
  await act(async () => { f.posts[0].resolve({ posts: posts(25), total: 60 }); });
  assert.equal(cards(root).length, 0, "provisional Posts25..48 are not canonical mixed page2 yet");
  assert.equal(follow(root).length, 0, "no provisional footer that later shifts below the cards");
  assert.equal(frames(root, "loading").length, 1); assert.equal(frames(root, "empty").length, 0);
  await act(async () => { f.series[0].resolve(packet()); });
  assert.equal(f.completions.length, 1); assert.equal(cards(root).length, 0, "source read alone does not settle rank/predecessor");
  await act(async () => { f.completions[0].resolve({ posts: posts(24), postTotal: 60, sourceItems: [], sourceTotal: 1, total: 61 }); });
  assert.deepEqual(ids(root), posts(24).map(post => `posts:${post.id}`));
  assert.equal(frames(root, "loading").length, 0); assert.equal(follow(root).length, 1);
  assert.equal(f.posts.length, 1); assert.equal(f.series.length, 1); assert.equal(f.completions.length, 1);
  await act(async () => { root.unmount(); });
});

test("page1 retains already-readable Posts while source and rank are pending", async () => {
  const f = fixture(1), root = await mounted(f);
  await act(async () => { f.posts[0].resolve({ posts: posts(1), total: 60 }); });
  assert.deepEqual(ids(root), posts(1).map(post => `posts:${post.id}`));
  await act(async () => { f.series[0].resolve(packet()); });
  assert.equal(cards(root).length, 24);
  await act(async () => { root.unmount(); });
  assert.equal(f.completions[0].signal.aborted, true);
});

test("page1 POP/reload at a saved positive viewport waits for stable insertion order", async () => {
  const f = fixture(1, { navigationType: "POP", savedY: 2500 }), root = await mounted(f);
  // A tracker update after arrival must not change the arrival's readiness rule.
  f.win.history.state.sodPostsViewport2029.y = 0;
  await act(async () => { f.posts[0].resolve({ posts: posts(1), total: 60 }); });
  assert.equal(cards(root).length, 0, "deep-return readers must not see their visible card move after source insertion");
  assert.equal(follow(root).length, 0); assert.equal(frames(root, "loading").length, 1);
  await act(async () => { f.series[0].resolve(packet()); });
  assert.equal(cards(root).length, 0, "rank completion, not source metadata alone, fixes the order");
  await act(async () => { f.completions[0].resolve({ posts: posts(1, 23), postTotal: 60, sourceItems: [source], sourceTotal: 1, total: 61 }); });
  assert.deepEqual(ids(root), [REF, ...posts(1, 23).map(post => `posts:${post.id}`)]);
  assert.equal(frames(root, "loading").length, 0); assert.equal(follow(root).length, 1);
  assert.equal(f.posts.length, 1); assert.equal(f.series.length, 1); assert.equal(f.completions.length, 1);
  await act(async () => { root.unmount(); });
});

test("fresh/top page1 and invalid saved entries stay incremental, even after later tracking", async () => {
  for (const options of [
    { navigationType: "POP", savedY: 0 },
    { navigationType: "PUSH", savedY: 2500 },
    { navigationType: "POP", savedY: 2500, savedPatch: { entryKey: "another-entry" } },
    { navigationType: "POP", savedY: 2500, savedPatch: { href: "/2029/posts?series=another-series" } },
    { navigationType: "POP" },
  ]) {
    const f = fixture(1, options), root = await mounted(f);
    if (options.savedY === undefined) f.win.history.state.sodPostsViewport2029 = {
      entryKey: f.location.key, href: `${f.location.pathname}${f.location.search}`, x: 0, y: 2500,
    };
    await act(async () => { f.posts[0].resolve({ posts: posts(1), total: 60 }); });
    assert.deepEqual(ids(root), posts(1).map(post => `posts:${post.id}`));
    assert.equal(frames(root, "loading").length, 0);
    await act(async () => { root.unmount(); });
  }
});

test("failed or access-filtered source preserves available held-page Posts without claiming measured empty", async () => {
  for (const page of [1, 2]) for (const outcome of ["failed", "access_filtered", "catalog_failure"]) {
    const f = fixture(page, { navigationType: "POP", savedY: 2500 }), root = await mounted(f), start = page === 1 ? 1 : 25;
    await act(async () => { f.posts[0].resolve({ posts: posts(start), total: 60 }); });
    assert.equal(cards(root).length, 0);
    await act(async () => {
      if (outcome === "catalog_failure") f.series[0].reject(Error("controlled source read failure"));
      else f.series[0].resolve(packet(outcome));
    });
    assert.deepEqual(ids(root), posts(start).map(post => `posts:${post.id}`));
    assert.equal(frames(root, "empty").length, 0);
    const failedMessage = root.root.findAll(node => node.type === "p" && node.children.join("") === "המקור הנוסף בסדרה לא זמין כרגע.")[0];
    assert.equal(failedMessage.parent.props["aria-hidden"], false);
    await act(async () => { root.unmount(); });
  }
});

test("rank failure returns available Posts; successful empty is shown only after assignment completion", async () => {
  for (const page of [1, 2]) {
    const f = fixture(page, { navigationType: "POP", savedY: 2500 }), root = await mounted(f), start = page === 1 ? 1 : 25;
    await act(async () => { f.posts[0].resolve({ posts: posts(start), total: 60 }); f.series[0].resolve(packet()); });
    assert.equal(cards(root).length, 0);
    await act(async () => { f.completions[0].reject(Error("controlled HEAD failure")); });
    assert.deepEqual(ids(root), posts(start).map(post => `posts:${post.id}`));
    assert.equal(frames(root, "empty").length, 0);
    await act(async () => { root.unmount(); });
  }
  const empty = fixture(), emptyRoot = await mounted(empty);
  await act(async () => { empty.posts[0].resolve({ posts: [], total: 0 }); empty.series[0].resolve(packet()); });
  assert.equal(frames(emptyRoot, "empty").length, 0);
  await act(async () => { empty.completions[0].resolve({ posts: [], postTotal: 0, sourceItems: [], sourceTotal: 0, total: 0 }); });
  assert.equal(frames(emptyRoot, "empty").length, 1);
  await act(async () => { emptyRoot.unmount(); });
});

test("late page2 completion cannot display under a later page and unmount aborts remaining readers", async () => {
  const f = fixture(), root = await mounted(f);
  await act(async () => { f.posts[0].resolve({ posts: posts(25), total: 60 }); f.series[0].resolve(packet()); });
  assert.equal(cards(root).length, 0);
  f.location = { ...f.location, search: `?series=${KEY}&page=3`, key: "entry-3" };
  await act(async () => { root.update(React.createElement(Posts2029Page)); });
  assert.equal(f.completions[0].signal.aborted, true);
  await act(async () => { f.completions[0].resolve({ posts: posts(24), postTotal: 60, sourceItems: [], sourceTotal: 1, total: 61 }); });
  assert.equal(cards(root).length, 0, "old page completion remains discarded");
  await act(async () => { f.posts[1].resolve({ posts: posts(49, 12), total: 60 }); });
  assert.equal(cards(root).length, 0);
  await act(async () => { f.completions[1].resolve({ posts: posts(48, 13), postTotal: 60, sourceItems: [], sourceTotal: 1, total: 61 }); });
  assert.deepEqual(ids(root), posts(48, 13).map(post => `posts:${post.id}`));
  await act(async () => { root.unmount(); });
  assert.equal(f.posts[1].signal.aborted, true); assert.equal(f.series[0].signal.aborted, true);
});
