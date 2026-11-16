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
