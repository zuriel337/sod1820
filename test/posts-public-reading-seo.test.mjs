import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";

// Mount the real page under the real Router in each existing compiler profile.
// Controlled source adapters replace networking, layout and telemetry only.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const stripImports = source => source.replace(/^import[^\n]*\n/gm, "");
const page = stripImports(await readFile(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8"));
const taxonomy = stripImports(await readFile(new URL("../src/pages/PostsTaxonomy2029Page.jsx", import.meta.url), "utf8"))
  .replace("export default function", "function");
const files = [], apps = new Map();
for (const [name, foundation, release] of [["public", "false", "public-reading-20261101"],
  ["foundation", "true", "false"], ["golden", "false", "false"]]) {
  const outfile = resolve(`.test-public-posts-seo-${process.pid}-${name}.mjs`); files.push(outfile);
  await build({ stdin: { contents: `
    import React,{useEffect,useMemo,useRef,useState} from 'react';
    import {MemoryRouter,Routes,Route,Link,useLocation,useParams,useNavigate,useNavigationType,useSearchParams} from 'react-router-dom';
    import {PUBLIC_READING_RELEASE} from './src/lib/publicReadingRelease2029.js';
    import {postsCatalogScope2029,postClassification2029} from './src/lib/research/postsCatalog2029Projection.js';
    import {postsTaxonomyLocation2029,postsTaxonomyRoute2029,postsTaxonomyPage2029} from './src/lib/research/postsTaxonomy2029Route.js';
    import {publicPostHref} from './src/lib/publicPostUrls.js';
    const fetchPostsCatalog2029=options=>globalThis.__postsSeo.read(options);
    const fetchContentSeriesCatalog2029=async()=>({series:[]});
    const completeMixedSeriesPostsPage2029=()=>{throw Error('unexpected mixed-series read')};
    const CONTENT_SERIES_2029=[],AUTHORS={},POST_BACKGROUND_ASSETS_2029={};
    const startPostsCatalogViewportRestore2029=()=>({isRestoring:false,setReady(){},stop(){}});
    const trackPostsCatalogViewport2029=()=>()=>{},capturePostsCatalogDeparture2029=()=>{},rememberPostsCatalogViewport2029=()=>{},readPostsCatalogViewport2029=()=>null;
    const applySeo=value=>globalThis.__postsSeo.seo.push(value),track=()=>{},postContentEntry2029=()=>null;
    const humanContentTitle=value=>value,stripHtml=value=>value,bilingualDateLabel=value=>value;
    const NavigationIcon2029=()=>null,PostCategories2029=()=>null,PostFollowBox=()=>null,AdSlot=()=>null;
    const Sod2029Shell=({children})=>React.createElement(React.Fragment,null,children);
    const FrameState=({children})=>React.createElement('section',null,children);
    ${page}
    ${taxonomy}
    export function SeoTestApp({entry}){return <MemoryRouter initialEntries={[entry]}><Routes>
      <Route path="/post" element={<Posts2029Page/>}/><Route path="/2029/posts" element={<Posts2029Page/>}/>
      <Route path="/verified" element={<Posts2029Page verifiedOnly/>}/>
      <Route path="/tag/:slug" element={<PostsTaxonomy2029Page/>}/>
    </Routes></MemoryRouter>}
  `, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile,
  external: ["react", "react-router-dom"], logLevel: "silent", define: {
    __SOD_2029_BUILD__: "true", "import.meta.env": JSON.stringify({ VITE_PUBLIC_FOUNDATION_PREVIEW: foundation,
      VITE_PUBLIC_READING_RELEASE: release, VITE_INTEGRATED_PREVIEW: "false" }),
  } });
  apps.set(name, (await import(pathToFileURL(outfile))).SeoTestApp);
}
const previousDocument = globalThis.document;
globalThis.document = { getElementById: () => ({ scrollIntoView() {} }) };
after(async () => { await Promise.all(files.map(file => rm(file, { force: true })));
  globalThis.document = previousDocument; delete globalThis.__postsSeo; });

async function mount(profile, entry) {
  const fixture = { seo: [], reads: [], read(options) {
    fixture.reads.push(options);
    return Promise.resolve({ posts: [{ id: 42, wp_id: 42, slug: "fixture-post", source: "wordpress",
      title: "מקור ציבורי לדוגמה", excerpt: "תוכן בדיקה בלבד", author: "מקור", tags: [], categories: [] }],
      total: 48, taxonomy: { state: "ready", status: 200 } });
  } };
  globalThis.__postsSeo = fixture;
  let root; await act(async () => { root = Renderer.create(React.createElement(apps.get(profile), { entry })); });
  return { root, fixture };
}
async function unmount(root) { await act(async () => { root.unmount(); }); }

for (const profile of ["public", "foundation", "golden"]) test(`${profile}: catalog identity follows the existing release profile`, async () => {
  const { root, fixture } = await mount(profile, "/2029/posts#posts-catalog");
  assert.equal(fixture.seo.at(-1).path, profile === "golden" ? "/2029/posts" : "/post");
  assert.equal(fixture.seo.at(-1).noindex, profile === "golden");
  assert.ok(fixture.reads.length > 0);
  await unmount(root);
});

for (const query of ["q=synthetic", "page=2", "series=synthetic-series"]) test(`public catalog preserves selection privacy (${query})`, async () => {
  const { root, fixture } = await mount("public", "/post?" + query + "#posts-catalog");
  assert.equal(fixture.seo.at(-1).path, "/post");
  assert.equal(fixture.seo.at(-1).noindex, true);
  for (const link of root.root.findAllByType("a").filter(node => node.props.className === "sod29-posts-library-back")) {
    assert.equal(link.props.href, "/post");
  }
  await unmount(root);
});

test("public verified collection keeps its own canonical identity and server-approved indexability", async () => {
  const { root, fixture } = await mount("public", "/verified");
  assert.equal(fixture.seo.at(-1).path, "/verified");
  assert.equal(fixture.seo.at(-1).noindex, false);
  assert.equal(fixture.reads.at(-1).scope.kind, "verified");
  await unmount(root);
});

test("public tag canonical and admitted taxonomy state are retained", async () => {
  const path = "/tag/" + encodeURIComponent("סוד החשמל");
  const { root, fixture } = await mount("public", path);
  assert.equal(fixture.seo.at(-1).path, path);
  assert.equal(fixture.seo.at(-1).noindex, false);
  assert.equal(fixture.reads.at(-1).scope.kind, "tag");
  await unmount(root);
});
