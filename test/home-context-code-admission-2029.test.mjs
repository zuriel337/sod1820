import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import React, { act } from "react";
import Renderer from "react-test-renderer";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const output = await mkdtemp(resolve(".test-home-context-code-"));
const fixtures = {
  "AuthContext.jsx": "export const useAuth=()=>globalThis.__contextAdmission.auth;",
  "ResearchProvider.jsx": "export const useResearch=()=>({});",
  "researchContext.js": "export const researchContextNumber=v=>v==null?null:Number(v);",
  "razielSessionSeam2029.js": "export const publicContextLabel=v=>v||'';export const contextDisplayTitle=()=>'';export const entityTypeNounHe=()=>'';",
  "ContextualInspector2029.jsx": "import React from 'react';export default ({children})=>React.createElement('section',{'data-context-rail':true},children);",
  "entryLearn2029.js": "export const LEARN_LAYER={},LEARN_SCOPE={};export const buildLearnHelpSeed=()=>'',emitEntryLearn=()=>{},getConceptFamiliarity=()=>null,getLearnFragment=()=>null,isEntryLearnSurfaceActive=()=>false,markConceptFamiliarity=()=>null;",
  "GoldenProjectorModeLayer2029.jsx": "import React from 'react';globalThis.__contextAdmission.moduleLoads++;export default ()=>React.createElement('div',{'data-projector':true},'admitted admin layer');",
};
await build({ entryPoints: ["src/components/experience2029/SurfaceContextRail2029.jsx"],
  bundle: true, splitting: true, format: "esm", platform: "node", outdir: output,
  outExtension: { ".js": ".mjs" }, external: ["react", "react/jsx-runtime"],
  plugins: [{ name: "controlled-context-boundaries", setup(b) {
    b.onResolve({ filter: /^\.\.?\// }, args => args.kind === "entry-point" ? undefined : ({ path: args.path.split("/").at(-1), namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "js",
      contents: fixtures[args.path] || "export default function Quiet(){return null;}" }));
  } }],
});
const { default: Rail } = await import(pathToFileURL(resolve(output, "SurfaceContextRail2029.mjs")));
after(async () => { await rm(output, { recursive: true, force: true }); delete globalThis.__contextAdmission; });

test("context stays usable while optional projector code follows verified admin and surface admission", async () => {
  const f = globalThis.__contextAdmission = { auth: { isAdmin: false, loading: false }, moduleLoads: 0 };
  const subject = { id: "1820", type: "number", label: "1820", resultValue: 1820 };
  const tree = surface => React.createElement(Rail, { surface, focus: subject, context: {}, suppressLearn: true });
  let root;
  await act(async () => { root = Renderer.create(tree("home")); });
  assert.equal(f.moduleLoads, 0);
  assert.equal(root.root.findAllByProps({ "data-context-rail": true }).length, 1);
  await act(async () => { root.update(tree("post")); });
  assert.equal(f.moduleLoads, 0, "a public Post must not even evaluate the admin projector module");
  f.auth = { isAdmin: true, loading: true };
  await act(async () => { root.update(tree("post")); });
  assert.equal(f.moduleLoads, 0, "unresolved identity cannot admit optional admin code");
  f.auth = { isAdmin: true, loading: false };
  await act(async () => { root.update(tree("number")); });
  assert.equal(f.moduleLoads, 0, "admin identity does not activate a post-only layer on other surfaces");
  await act(async () => { root.update(tree("post")); });
  for (let i = 0; i < 20 && !root.root.findAllByProps({ "data-projector": true }).length; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
  }
  assert.equal(f.moduleLoads, 1);
  assert.equal(root.root.findAllByProps({ "data-projector": true }).length, 1);
  f.auth = { isAdmin: false, loading: false };
  await act(async () => { root.update(tree("post")); });
  assert.equal(root.root.findAllByProps({ "data-projector": true }).length, 0, "identity loss unmounts the optional layer");
  assert.equal(root.root.findAllByProps({ "data-context-rail": true }).length, 1);
  await act(async () => { root.unmount(); });
});
