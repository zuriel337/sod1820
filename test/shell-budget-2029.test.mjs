import test from "node:test";
import assert from "node:assert/strict";
import { staticImports, validateHistory, measureBuild, GUARDED_SOURCES } from "../scripts/test-2029-shell-budget.mjs";

// The ratchet itself (scripts/test-2029-shell-budget.mjs): what counts as a static import, how a raise is caught, what is measured.
test("static imports: default/named/side-effect/CSS/multi-line/export-from count; lazy, dynamic and commented imports do not", () => {
  const src = `import React, { useState } from "react";
import "./frame.css";
import {
  a,
  b,
} from "../lib/multi.js";
export { x } from './reexport.js';
// import Commented from "./commented.js";
/* import Block from "./block.js"; */
const Lazy = React.lazy(() => import("./Lazy.jsx"));
const later = () => import("./later.js");
const s = "import fake from './string.js'";`;
  assert.deepEqual(staticImports(src), ["../lib/multi.js", "./frame.css", "./reexport.js", "react"]);
});

const entry = (by, metrics, staticImports, reason = "a reason long enough") => ({ date: "2026-11-16", by, reason, metrics, staticImports });
const base = { eagerJsGzip: 100, frameJsGzip: 50 };
const imports = { "src/App2029.jsx": ["react"] };

test("history: a lowering by the ratchet passes; a raise or a new static import without a ZURIEL decision fails", () => {
  const ok = { metrics: { eagerJsGzip: 90, frameJsGzip: 50 }, staticImports: imports, history: [entry("CLAUDE", base, imports), entry("ratchet", { eagerJsGzip: 90, frameJsGzip: 50 }, imports)] };
  assert.doesNotThrow(() => validateHistory(ok));
  const raised = { metrics: { eagerJsGzip: 120, frameJsGzip: 50 }, staticImports: imports, history: [entry("CLAUDE", base, imports), entry("ratchet", { eagerJsGzip: 120, frameJsGzip: 50 }, imports)] };
  assert.throws(() => validateHistory(raised), /without a ZURIEL decision/);
  const more = { "src/App2029.jsx": ["react", "./heavy.js"] };
  const added = { metrics: base, staticImports: more, history: [entry("CLAUDE", base, imports), entry("CLAUDE", base, more)] };
  assert.throws(() => validateHistory(added), /src\/App2029\.jsx -> \.\/heavy\.js/);
  const decided = { metrics: { eagerJsGzip: 120, frameJsGzip: 50 }, staticImports: imports, history: [entry("CLAUDE", base, imports), entry("ZURIEL", { eagerJsGzip: 120, frameJsGzip: 50 }, imports, "approved: new frame capability")] };
  assert.doesNotThrow(() => validateHistory(decided));
  const noReason = { ...decided, history: [decided.history[0], { ...decided.history[1], reason: "ok" }] };
  assert.throws(() => validateHistory(noReason), /needs its reason/);
});

test("history: the numbers must be the last history entry (a raise cannot be made by editing only the numbers)", () => {
  const edited = { metrics: { eagerJsGzip: 200, frameJsGzip: 50 }, staticImports: imports, history: [entry("CLAUDE", base, imports)] };
  assert.throws(() => validateHistory(edited), /must equal the last history entry/);
});

test("measure: eager closure, the frame closure beyond it and the frame's own CSS", () => {
  const manifest = {
    "2029.html": { file: "assets/entry.js", isEntry: true, imports: ["_shared.js"], css: ["assets/entry.css"], dynamicImports: ["src/Page.jsx"] },
    "_shared.js": { file: "assets/shared.js" },
    "src/Page.jsx": { file: "assets/page.js", imports: ["_shell.js", "_shared.js"] },
    "_shell.js": { file: "assets/shell.js", name: "Sod2029Shell", imports: ["_icon.js", "_shared.js"], css: ["assets/shell.css"] },
    "_icon.js": { file: "assets/icon.js", css: ["assets/entry.css"] },
  };
  const sizes = { "assets/entry.js": 10, "assets/shared.js": 5, "assets/shell.js": 30, "assets/icon.js": 3, "assets/shell.css": 7, "assets/entry.css": 100 };
  assert.deepEqual(measureBuild(manifest, { sizeOf: (f) => sizes[f] }), { eagerJsFiles: 2, eagerJsGzip: 15, frameJsFiles: 2, frameJsGzip: 33, frameCssGzip: 7 });
});

test("the guarded sources are the always-loaded entry, app, frame and its eager providers", () => {
  for (const file of ["src/main2029.jsx", "src/App2029.jsx", "src/components/experience2029/SystemFrame2029.jsx", "src/lib/supabase.js"]) assert.ok(GUARDED_SOURCES.includes(file), file);
});

// ZURIEL 17.11.2026: the same guard on the artifact that is really published (public-reading-deploy/dist), always enforced.
test("the release profile: its own baseline and history under the same rules, always enforced, and run by the release build on its own output", async () => {
  const { profileBaseline, validateHistory: validate, PROFILES } = await import("../scripts/test-2029-shell-budget.mjs");
  const { readFileSync } = await import("node:fs");
  const file = JSON.parse(readFileSync(new URL("../scripts/2029-shell-budget-baseline.json", import.meta.url), "utf8"));
  const release = profileBaseline(file, "public-reading");
  validate(release);
  assert.deepEqual(Object.keys(release.metrics).sort(), Object.keys(file.metrics).sort(), "the same five numbers as the default build");
  assert.equal(PROFILES["public-reading"].enforceAlways, true, "VITE_* values of the production build never switch the release check off");
  assert.equal(PROFILES["public-reading"].dist, "public-reading-deploy/dist");
  const raised = structuredClone(file);
  raised.profiles["public-reading"].history.push({ date: "2026-11-18", by: "ratchet", reason: "x", metrics: { ...release.metrics, eagerJsGzip: release.metrics.eagerJsGzip + 1 } });
  raised.profiles["public-reading"].metrics = raised.profiles["public-reading"].history.at(-1).metrics;
  assert.throws(() => validate(profileBaseline(raised, "public-reading")), /without a ZURIEL decision/, "a raise of the release numbers is a ZURIEL decision too");
  assert.throws(() => profileBaseline(file, "nope"), /missing/);
  const gate = readFileSync(new URL("../scripts/test-2029-shell-budget.mjs", import.meta.url), "utf8");
  assert.match(gate, /const enforceBytes = profile\.enforceAlways \|\| !flagged\.length/, "enforcement does not depend on VITE_* for the release profile");
  const build = readFileSync(new URL("../scripts/build-public-reading-production.mjs", import.meta.url), "utf8");
  assert.match(build, /spawnSync\(process\.execPath, \[resolve\(root, "scripts\/test-2029-shell-budget\.mjs"\), "--profile", "public-reading", "--dist", output\]/);
  assert.match(build, /if \(budget\.status !== 0\) throw new Error\("public_reading_shell_budget_failed"\)/, "a grown release artifact fails its own build");
});
