import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  classifyWorldPresentationDensity,
  worldProjectionCounts,
} from "../src/lib/research/world2029Presentation.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const world = read("src/pages/World2029Page.jsx");
const app = read("src/App2029.jsx");

// World is a projection inside the one Frame, not its own shell/control system.
assert.match(world, /FrameState/);
assert.match(world, /use2029Shell/);
assert.match(world, /shell\.openCommand\(\)/);
assert.match(world, /shell\.openAttention\(\)/);
assert.equal(world.includes("shell.openRaziel()"), false, "Raziel must remain a System Frame capability, not World-only chrome");
assert.equal(world.includes('to="/heichal"'), false, "Heichal deepening must remain reachable through the shared tools/frame seam");
assert.equal(world.includes("shareOrCopy"), false, "World must not own a second share seam");
assert.equal(world.includes("NumberDrawer"), false);
assert.equal(world.includes("AskRaziel"), false);
assert.equal(world.includes("UserCenter"), false);
assert.equal(world.includes('status="LIVE"'), false, "branch-only surface must not claim LIVE state");
assert.match(world, /status="2029 · NATIVE PREVIEW"/);

// No silent fallback: explicit native states exist for loading/error/empty/unavailable.
for (const kind of ["loading", "error", "empty", "unavailable"]) {
  assert.match(world, new RegExp(`kind="${kind}"`));
}
assert.match(world, /אין fallback/);

// The route is a direct isolated 2029 deep link.
assert.match(app, /path="\/world"/);

// Density is presentation-only and must gracefully cover rich / medium / sparse.
const sparse = { identity: { nodeId: "s", type: "number", label: "832" } };
const medium = {
  identity: { nodeId: "m", type: "number", label: "71" },
  graph: { relations: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}` })) },
};
const rich = {
  identity: { nodeId: "r", type: "number", label: "1237" },
  graph: { relations: Array.from({ length: 30 }, (_, i) => ({ id: `r${i}` })) },
};
const multiChannelRich = {
  identity: { nodeId: "r2", type: "number", label: "358" },
  graph: { relations: [{ id: "a" }] },
  research: { findings: [{ id: "b" }] },
  sources: [{ ref: "c" }],
};

assert.equal(classifyWorldPresentationDensity(null), "unavailable");
assert.equal(classifyWorldPresentationDensity(sparse), "sparse");
assert.equal(classifyWorldPresentationDensity(medium), "medium");
assert.equal(classifyWorldPresentationDensity(rich), "rich");
assert.equal(classifyWorldPresentationDensity(multiChannelRich), "rich");
assert.deepEqual(worldProjectionCounts(medium), {
  relations: 5,
  findings: 0,
  sources: 0,
  worlds: 0,
  timeline: 0,
});

// Density language must remain presentation semantics, not truth/ranking semantics.
const helper = read("src/lib/research/world2029Presentation.js");
assert.match(helper, /does NOT rank truth/i);
assert.equal(/canonical\s*=|verified\s*=|confidence\s*=/.test(helper), false);

console.log("2029 native World surface acceptance: PASS");
