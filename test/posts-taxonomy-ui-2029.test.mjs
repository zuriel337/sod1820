import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";

// Exercise the actual Posts page and taxonomy wrapper with React Router and
// controlled public reads. No browser, request, live side effect or full build.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const stripImports = source => source.replace(/^import[^\n]*\n/gm, "");
const page = stripImports(await readFile(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8"));
const wrapper = stripImports(await readFile(new URL("../src/pages/PostsTaxonomy2029Page.jsx", import.meta.url), "utf8"))
  .replace("export default function", "function");
const outfile = resolve(`.test-taxonomy-ui-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useEffect,useMemo,useRef,useState} from 'react';
  import {Link,MemoryRouter,Route,Routes,useLocation,useNavigate,useNavigationType,useSearchParams} from 'react-router-dom';
  import {postsCatalogScope2029,postClassification2029} from './src/lib/research/postsCatalog2029Projection.js';
  import {postsTaxonomyLocation2029,postsTaxonomyRoute2029,postsTaxonomyPage2029} from './src/lib/research/postsTaxonomy2029Route.js';
  import {publicPostHref} from './src/lib/publicPostUrls.js';
  import {PUBLIC_READING_RELEASE} from './src/lib/publicReadingRelease2029.js';
  const fetchPostsCatalog2029=options=>globalThis.__taxonomyUi.read(options);
  const fetchContentSeriesCatalog2029=()=>{throw Error('taxonomy must not request series sources')};
  const completeMixedSeriesPostsPage2029=()=>{throw Error('taxonomy must not join series sources')};
  const CONTENT_SERIES_2029=[],AUTHORS={},POST_BACKGROUND_ASSETS_2029={};
  const startPostsCatalogViewportRestore2029=()=>({isRestoring:false,setReady(){},stop(){}});
  const trackPostsCatalogViewport2029=()=>()=>{},capturePostsCatalogDeparture2029=()=>{},rememberPostsCatalogViewport2029=()=>{},readPostsCatalogViewport2029=()=>null;
  const applySeo=value=>globalThis.__taxonomyUi.seo.push(value),track=()=>{},postContentEntry2029=()=>null;
  const humanContentTitle=value=>value,stripHtml=value=>value,bilingualDateLabel=value=>value;
  const NavigationIcon2029=()=>null,PostCategories2029=()=>null;
  const PostFollowBox=()=>React.createElement('aside',{'data-follow-fixture':true}),AdSlot=()=>null;
  const Sod2029Shell=({children})=>React.createElement(React.Fragment,null,children);
  const FrameState=({kind,title,children})=>React.createElement('section',{'data-frame-kind':kind},React.createElement('h2',null,title),children);
  ${page}
  ${wrapper}
  function LocationProbe(){const location=useLocation();useEffect(()=>{globalThis.__taxonomyUi.location=location},[location]);return null}
  export function TaxonomyTestApp({entry}){return <MemoryRouter initialEntries={[entry]}><LocationProbe/><Routes>
    <Route path="/tag/:slug" element={<PostsTaxonomy2029Page/>}/><Route path="/category/:slug" element={<PostsTaxonomy2029Page/>}/>
    <Route path="*" element={<p>destination</p>}/></Routes></MemoryRouter>}
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile,
external: ["react", "react-router-dom"], define: { "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"', "import.meta.env.VITE_PUBLIC_FOUNDATION_PREVIEW": '"true"' } });
const { TaxonomyTestApp } = await import(pathToFileURL(outfile));
const previousDocument = globalThis.document;
globalThis.document = { getElementById: () => ({ scrollIntoView() {} }) };
after(async () => { await rm(outfile, { force: true }); delete globalThis.__taxonomyUi; globalThis.document = previousDocument; });

function fixture() {
  const f = { requests: [], seo: [], read(options) {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    f.requests.push({ options, resolve, reject }); return promise;
  } };
  globalThis.__taxonomyUi = f;
  return f;
}
const post = (id = 42) => ({ id, slug: `fixture-${id}`, title: `כותרת הפוסט ${id}`, excerpt: "תקציר המקור", source: "wordpress", wp_id: id,
  author: "ייחוס לא פתור במקור", tags: ["סוד החשמל"], categories: ["תיעוד אירועים"], thumb_url: "https://media.invalid/cover.webp", modified: "2026-11-01" });
const ready = (id = 42, total = 25) => ({ posts: [post(id)], total, taxonomy: { state: "ready", status: 200 } });
const main = root => root.root.findByType("main");
const cards = root => root.root.findAll(node => node.type === "article" && node.props["data-experience-capability"] === "post-index-card");
const frames = (root, kind) => root.root.findAllByProps({ "data-frame-kind": kind });
const textOf = node => typeof node === "string" ? node : node.children.map(textOf).join("");
const button = (root, label) => root.root.findAllByType("button").find(node => textOf(node) === label);
async function mount(entry) { let root; await act(async () => { root = Renderer.create(React.createElement(TaxonomyTestApp, { entry })); }); return root; }
async function settle(f, packet) { await act(async () => { f.requests.at(-1).resolve(packet); }); }

test("tag entry reuses Posts cards, source credit and media; a pathname does not invent Follow", async () => {
  const f = fixture(), root = await mount("/tag/%D7%A1%D7%95%D7%93-%D7%94%D7%97%D7%A9%D7%9E%D7%9C#posts-catalog");
  assert.equal(f.requests[0].options.scope.kind, "tag"); assert.equal(f.requests[0].options.scope.key, "סוד החשמל");
  assert.equal(f.requests[0].options.search, "");
  assert.equal(main(root).props["data-taxonomy-state"], "loading");
  await settle(f, ready());
  assert.equal(textOf(root.root.findByType("h1")), "סוד החשמל");
  assert.match(main(root).props.className, /is-taxonomy/);
  assert.equal(main(root).props["data-taxonomy-state"], "ready");
  assert.equal(cards(root).length, 1); assert.equal(cards(root)[0].props["data-post-source"], "posts:42");
  const card = cards(root)[0];
  assert.equal(card.findByType("a").props.href, "/fixture-42");
  assert.equal(card.findByType("img").props.src, post().thumb_url);
  assert.equal(card.findByType("img").props.loading, "lazy");
  assert.match(textOf(card), /ייחוס במקור: ייחוס לא פתור במקור/);
  assert.equal(root.root.findAllByProps({ "data-follow-fixture": true }).length, 0);
  assert.equal(f.seo.at(-1).path, f.location.pathname); assert.equal(f.seo.at(-1).noindex, false);
  await act(async () => { root.unmount(); });
});

test("search, pagination and clearing retain taxonomy identity and the exact route anchor", async () => {
  const f = fixture(), entry = "/tag/סוד-החשמל?sort=modified#posts-catalog", root = await mount(entry);
  await settle(f, ready());
  await act(async () => { root.root.findByType("input").props.onChange({ target: { value: "מסר" } }); });
  await act(async () => { root.root.findByType("form").props.onSubmit({ preventDefault() {} }); });
  assert.equal(f.location.pathname, "/tag/סוד-החשמל"); assert.equal(f.location.hash, "#posts-catalog");
  assert.equal(new URLSearchParams(f.location.search).get("q"), "מסר");
  assert.equal(new URLSearchParams(f.location.search).get("sort"), "modified");
  assert.equal(f.requests.at(-1).options.scope.key, "סוד החשמל");
  assert.equal(f.requests.at(-1).options.search, "מסר");
  assert.equal(cards(root).length, 0, "a previous response is not displayed under a new query");
  await settle(f, ready());
  await act(async () => { button(root, "פוסטים קודמים").props.onClick(); });
  assert.equal(f.requests.at(-1).options.page, 2);
  assert.equal(f.location.hash, "#posts-catalog");
  assert.equal(new URLSearchParams(f.location.search).get("q"), "מסר");
  await settle(f, ready(43));
  assert.equal(cards(root)[0].props["data-post-source"], "posts:43");
  await act(async () => { button(root, "ניקוי החיפוש").props.onClick(); });
  assert.equal(f.location.pathname, "/tag/סוד-החשמל"); assert.equal(f.location.hash, "#posts-catalog");
  assert.equal(new URLSearchParams(f.location.search).has("q"), false); assert.equal(new URLSearchParams(f.location.search).has("page"), false);
  assert.equal(new URLSearchParams(f.location.search).get("sort"), "modified");
  assert.equal(f.requests.at(-1).options.scope.kind, "tag");
  await act(async () => { root.unmount(); });
  assert.equal(f.requests.at(-1).options.signal.aborted, true);
});

test("canonical category identity retains the old address and does not acquire series or channel rows", async () => {
  const f = fixture(), root = await mount("/category/רמזי-הגאולה");
  assert.equal(f.requests[0].options.scope.kind, "category"); assert.equal(f.requests[0].options.scope.key, "רמזים חזקים");
  assert.equal(f.requests[0].options.allowApprovedSourcePage, false);
  await settle(f, { ...ready(), posts: [post()] });
  assert.equal(textOf(root.root.findByType("h1")), "רמזים חזקים");
  assert.equal(f.location.pathname, "/category/רמזי-הגאולה");
  assert.equal(root.root.findAllByProps({ "data-follow-fixture": true }).length, 0);
  await act(async () => { root.unmount(); });
});

test("unknown, empty-search and unavailable reads remain different useful states", async () => {
  for (const state of ["missing", "empty", "unavailable"]) {
    const f = fixture(), root = await mount("/tag/סוד-החשמל?q=אין");
    if (state === "unavailable") await act(async () => { f.requests[0].reject(Error("controlled raw failure")); });
    else await settle(f, { posts: [], total: 0, taxonomy: { state, status: state === "missing" ? 404 : 200 } });
    assert.equal(main(root).props["data-taxonomy-state"], state);
    assert.equal(cards(root).length, 0); assert.equal(f.seo.at(-1).noindex, true);
    if (state === "missing") assert.match(textOf(frames(root, "empty")[0]), /לא נמצאו פוסטים ציבוריים בכתובת הזו/);
    if (state === "empty") assert.ok(button(root, "לכל הפוסטים בתגית"));
    if (state === "unavailable") {
      assert.match(textOf(frames(root, "error")[0]), /רשימת הפוסטים אינה זמינה כרגע/);
      assert.doesNotMatch(textOf(frames(root, "error")[0]), /controlled raw failure/);
      await act(async () => { button(root, "ניסיון טעינה נוסף").props.onClick(); });
      assert.equal(f.requests.length, 2);
    }
    await act(async () => { root.unmount(); });
  }
});

test("suppressed taxonomy and conflicting selectors never request or render public Posts", async () => {
  for (const entry of ["/tag/טיוטה", "/tag/פורום", "/tag/סוד-החשמל?category=אחר"]) {
    const f = fixture(), root = await mount(entry);
    assert.equal(f.requests.length, 0); assert.equal(cards(root).length, 0);
    assert.equal(main(root).props["data-taxonomy-state"], "missing");
    assert.equal(f.seo.at(-1).noindex, true);
    await act(async () => { root.unmount(); });
  }
});

test("malformed taxonomy pagination stays missing until an explicit return to the first page", async () => {
  const f = fixture(), root = await mount("/tag/סוד-החשמל?page=invalid#posts-catalog");
  assert.equal(f.requests.length, 0); assert.equal(cards(root).length, 0);
  assert.equal(main(root).props["data-taxonomy-state"], "page-missing");
  await act(async () => { button(root, "חזרה לפוסטים האחרונים").props.onClick(); });
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].options.page, 1);
  assert.equal(f.location.search, ""); assert.equal(f.location.hash, "#posts-catalog");
  await act(async () => { root.unmount(); });
});
