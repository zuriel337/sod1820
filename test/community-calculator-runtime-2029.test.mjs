import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import React from "react";
import Renderer, { act } from "react-test-renderer";

// Real controller, date engine, form and 2029 composition; only external read,
// write, frame and navigation boundaries are fixtures. No browser/server build.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-community-calculator-${process.pid}.mjs`);
const fixtures = {
  "palette.js": "export const usePalette=()=>({});",
  "themeMode.js": "export const setForcedMode=(...args)=>globalThis.__communityCalc.effects.push(['theme',...args]);",
  "engine.js": "import {METHODS} from './src/lib/gematria.js';export const resolve=name=>({value:METHODS[0].fn(name)});",
  "supabase.js": `export const getAllValuePhrases=async value=>{globalThis.__communityCalc.reads.push(value);return [{phrase:'רז',is_verified:true}];};
    export const addWallWord=(...args)=>globalThis.__communityCalc.effects.push(['wall',...args]);
    export const getAiAnalysis=async(...args)=>{globalThis.__communityCalc.effects.push(['ai',...args]);return 'AI';};
    export const supabase={rpc:(...args)=>{globalThis.__communityCalc.effects.push(['rpc',...args]);return Promise.resolve({});}};`,
  "gematriaMethodRegistry.js": "export const fetchGematriaMethodStates=async()=>null;export const indexGematriaMethodStates=()=>null;",
  "tracking.js": "export const track=(...args)=>globalThis.__communityCalc.effects.push(['track',...args]);",
  "numberMessage.js": "export const buildMessages=()=>[];",
  "seo.js": "export const SITE_URL='https://sod1820.co.il';export const applySeo=()=>{};",
  "AuthContext.jsx": "export const useAuth=()=>({isAdmin:false});",
  "ResearchProvider.jsx": "export const useResearch=()=>({context:{},setResearchContext:context=>globalThis.__communityCalc.contexts.push(context)});",
  "Sod2029Shell.jsx": "import React from 'react';export default ({children})=>React.createElement('section',{},children);",
  "NavigationIcon2029.jsx": "export default ()=>null;",
  "ShareActions.jsx": "import React from 'react';export default props=>React.createElement('share-actions',props);",
  "VisitorSearchesBox.jsx": "export default ()=>{globalThis.__communityCalc.effects.push(['visitor-search']);return null;};",
  "NameMultiSearch.jsx": "export default ()=>{globalThis.__communityCalc.effects.push(['deep-name-search']);return null;};",
  "router": "import React from 'react';export const useLocation=()=>globalThis.__communityCalc.location;export const Link=({to,children,...props})=>React.createElement('a',{...props,href:to},children);",
};
await build({ entryPoints: ["src/pages/CommunityCalculator2029Page.jsx"], bundle: true, platform: "node", format: "esm", outfile,
  external: ["react"], define: { __SOD_2029_BUILD__: "true", "import.meta.env": JSON.stringify({ VITE_PUBLIC_READING_RELEASE: "public-reading-20261101" }) },
  plugins: [{ name: "community-calculator-boundaries", setup(builder) {
    builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: "router", namespace: "fixture" }));
    builder.onResolve({ filter: /\/(palette\.js|themeMode\.js|engine\.js|supabase\.js|gematriaMethodRegistry\.js|tracking\.js|numberMessage\.js|seo\.js|AuthContext\.jsx|ResearchProvider\.jsx|Sod2029Shell\.jsx|NavigationIcon2029\.jsx|ShareActions\.jsx|VisitorSearchesBox\.jsx|NameMultiSearch\.jsx)$/ }, args => ({ path: args.path.split("/").at(-1), namespace: "fixture" }));
    builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: "css-fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: fixtures[args.path], loader: "js", resolveDir: process.cwd() }));
    builder.onLoad({ filter: /.*/, namespace: "css-fixture" }, () => ({ contents: "", loader: "js" }));
  } }],
});
const Page = (await import(pathToFileURL(outfile))).default;
after(async () => { await rm(outfile, { force: true }); delete globalThis.__communityCalc; delete globalThis.window; });

function fixture(search) {
  const browserSearch = new URL(`https://preview.example/community/calculator${search}`).search;
  const value = { location: { pathname: "/community/calculator", search: browserSearch, hash: "#result", key: "arrival" }, effects: [], reads: [], contexts: [], replacements: [] };
  globalThis.__communityCalc = value;
  globalThis.window = { location: { origin: "https://preview.example", pathname: "/community/calculator" }, history: { state: { key: "arrival" }, replaceState: (_state, _title, url) => value.replacements.push(url) } };
  return value;
}
const output = root => JSON.stringify(root.toJSON());

test("public calculator mount and typing calculate immediately without wall, AI, legacy telemetry or deep search; typing emits one content-free beacon", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const state = fixture("?w=אור&w2=רז&compare=1&method=מילוי&result=643&source=one&source=two");
  let root;
  await act(async () => { root = Renderer.create(React.createElement(Page)); });
  assert.match(output(root), /643/);
  assert.deepEqual(state.replacements, [], "arrival URL is not rewritten on mount");
  await act(async () => { context.mock.timers.tick(2000); });
  assert.ok(state.reads.length > 0);
  assert.deepEqual(state.effects, []);
  assert.match(output(root), /ניתוח AI ושמירה אינם זמינים/);
  const numberLink = root.root.findAllByType("a").find(link => link.props.href.includes("/number/643?") && new URL(link.props.href, "https://sod1820.co.il").searchParams.get("focus") === "אור");
  await act(async () => { numberLink.props.onClick({ button: 0 }); });
  assert.equal(state.contexts[0].returnTo.href, state.location.pathname + state.location.search + state.location.hash);
  assert.equal(state.contexts[0].selection.method, "מילוי");
  await act(async () => { root.root.findByProps({ id: "community-calculator-name" }).props.onChange({ target: { value: "שלום" } }); });
  await act(async () => { context.mock.timers.tick(2000); });
  const updated = new URL(state.replacements.at(-1), "https://sod1820.co.il");
  assert.equal(updated.searchParams.get("w"), "שלום");
  assert.equal(updated.searchParams.get("w2"), "רז");
  assert.equal(updated.searchParams.get("method"), "מילוי");
  assert.deepEqual(updated.searchParams.getAll("source"), ["one", "two"]);
  // ZURIEL 6.11: the only telemetry is ONE content-free compute beacon (first_compute) for the typed, settled name.
  // The arrival seed ("אור") and the mount produced nothing; no legacy track/wall/AI/deep search ran.
  assert.deepEqual(state.effects.map(effect => effect[0]), ["rpc"]);
  const [, rpc, body] = state.effects[0];
  assert.equal(rpc, "ingest_reading_activity_v1", "the dedicated RPC, never the generic ingest_event");
  assert.equal(body.p_event_type, "first_compute"); assert.equal(body.p_path, "/community/calculator");
  assert.deepEqual(Object.keys(body).sort(), ["p_app_context", "p_event_type", "p_path", "p_props"], "no sod_id, session, bot flag, surface or actor class");
  assert.equal(body.p_props.entry, "share"); assert.equal(body.p_props.surface_kind, "community"); assert.equal(body.p_props.length_bucket, "4-8");
  assert.equal(/[\u0590-\u05FF]/.test(JSON.stringify(body)), false, "no expression, name or Hebrew text leaves the page");
  assert.deepEqual(Object.keys(body.p_props).sort(), ["activity_event_id", "activity_session", "entry", "length_bucket", "schema", "surface_kind"]);
  await act(async () => { root.unmount(); });
});

test("baby inputs retain family, three names and sunset conversion while editing", async () => {
  const state = fixture("?mode=baby&babyName=אור&babyName=רז&babyName=שלום&family=לוי&birthDate=2024-04-22&babyAfterSunset=1");
  let root;
  await act(async () => { root = Renderer.create(React.createElement(Page)); });
  assert.equal(root.root.findAllByProps({ placeholder: "שם בעברית" }).length, 3);
  assert.match(output(root), /ט״ו/);
  assert.deepEqual(state.replacements, [], "hydrating baby state preserves arrival URL");
  await act(async () => { root.root.findAllByProps({ placeholder: "שם בעברית" })[1].props.onChange({ target: { value: "אהבה" } }); });
  const shared = new URL(root.root.findByType("share-actions").props.url);
  assert.deepEqual(shared.searchParams.getAll("babyName"), ["אור", "אהבה", "שלום"]);
  assert.equal(shared.searchParams.get("family"), "לוי");
  assert.equal(shared.searchParams.get("birthDate"), "2024-04-22");
  assert.equal(shared.searchParams.get("babyAfterSunset"), "1");
  assert.deepEqual(state.effects, []);
  await act(async () => { root.unmount(); });
});

test("date tool applies sunset exactly once and continues to all methods with date state retained", async () => {
  const state = fixture("?mode=date&date=2024-04-22&afterSunset=1");
  let root;
  await act(async () => { root = Renderer.create(React.createElement(Page)); });
  assert.match(output(root), /ט״ו/);
  await act(async () => { root.root.findByProps({ type: "checkbox" }).props.onChange({ target: { checked: false } }); });
  assert.match(output(root), /י״ד/);
  const expandDate = root.root.findAllByType("button").find(button => button.children.includes("חישוב התאריך בכל השיטות"));
  await act(async () => { expandDate.props.onClick(); });
  const updated = new URL(state.replacements.at(-1), "https://sod1820.co.il");
  assert.equal(updated.searchParams.get("date"), "2024-04-22");
  assert.equal(updated.searchParams.get("dateMode"), "0");
  assert.ok(updated.searchParams.get("w").length > 0);
  assert.equal(updated.searchParams.get("afterSunset"), null);
  assert.deepEqual(state.effects, []);
  await act(async () => { root.unmount(); });
});
