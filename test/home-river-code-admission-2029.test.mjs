import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import React, { act } from "react";
import Renderer from "react-test-renderer";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const output = await mkdtemp(resolve(".test-home-river-code-"));
const fixtures = {
  "supabase.js": "export const getRealityHints=()=>[];",
  "entityHubProjection.js": "await globalThis.__riverAdmission.moduleGate;globalThis.__riverAdmission.moduleReady=true;export const fetchGallerySourceContext=()=>[];",
  "topicSourceContext.js": "export const realityStreamDatePresentation2029=()=>null;export const loadPublicRealityStream2029=args=>globalThis.__riverAdmission.read(args);",
  "worldFindingShare.js": "export const worldMediaPublicShare=()=>null;",
  "contentTitle.js": "export const publicMediaTitle=v=>v||'',publicMediaCaption=v=>v||'';",
  "numberExpressionFocus.js": "export const numberExpressionFocusHref=n=>'/2029/number/'+n;",
  "palette.js": "export const use2029Palette=()=>({}),treatmentVars=()=>({});",
};
await build({ entryPoints: ["src/components/research/RealityRiver2029.jsx"], bundle: true, splitting: true,
  format: "esm", platform: "node", outdir: output, outExtension: { ".js": ".mjs" },
  external: ["react", "react/jsx-runtime"], plugins: [{ name: "controlled-river-boundaries", setup(b) {
    b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: "router", namespace: "fixture" }));
    b.onResolve({ filter: /^\.\.?\// }, args => args.kind === "entry-point" ? undefined : ({ path: args.path.split("/").at(-1), namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "js", contents: args.path === "router"
      ? "import React from 'react';export const Link=({to,children,...props})=>React.createElement('a',{...props,href:to},children);"
      : fixtures[args.path] || "export default function Quiet(){return null;}" }));
  } }] });
const { default: River } = await import(pathToFileURL(resolve(output, "RealityRiver2029.mjs")));
after(async () => { await rm(output, { recursive: true, force: true }); delete globalThis.__riverAdmission; });

test("leaving before optional code arrives starts no read; later failure and explicit retry remain distinct", async () => {
  let releaseModule;
  const f = globalThis.__riverAdmission = { calls: 0, mode: "failure", moduleGate: new Promise(resolve => { releaseModule = resolve; }),
    async read(args) {
      f.calls++;
      assert.equal(typeof args.listHints, "function");
      assert.equal(typeof args.fetchSourceContext, "function");
      if (f.mode === "failure") throw Error("controlled source failure");
      return { items: [] };
    } };
  let root;
  await act(async () => { root = Renderer.create(React.createElement(River)); });
  assert.match(JSON.stringify(root.toJSON()), /פותחים את התמונות/);
  assert.doesNotMatch(JSON.stringify(root.toJSON()), /אין כרגע תמונות/);
  await act(async () => { root.unmount(); });
  await act(async () => { releaseModule(); });
  for (let i = 0; i < 20 && !f.moduleReady; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
  }
  assert.equal(f.moduleReady, true);
  assert.equal(f.calls, 0, "an import finishing after unmount must not start a detached canonical read");
  await act(async () => { root = Renderer.create(React.createElement(River)); });
  assert.equal(f.calls, 1);
  assert.match(JSON.stringify(root.toJSON()), /לא הצלחנו לפתוח/);
  assert.doesNotMatch(JSON.stringify(root.toJSON()), /אין כרגע תמונות/);
  f.mode = "empty";
  const retry = root.root.findAllByType("button").find(node => node.children.includes("לנסות שוב"));
  assert.ok(retry);
  await act(async () => { retry.props.onClick(); });
  assert.equal(f.calls, 2);
  assert.match(JSON.stringify(root.toJSON()), /אין כרגע תמונות ציבוריות/);
  await act(async () => { root.unmount(); });
});
