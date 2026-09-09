// W1 Slice 1 — architectural guard.
// The Adaptive Shell must extend existing owners, never fork them. This test fails
// if a future change reintroduces a second context store, a second navigation system,
// a second personal area, a second Raziel session, or a duplicated route projection.
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const spine = read("src/lib/shell/shellContext.js");
const hook = read("src/lib/shell/useShellContext.js");
const slots = read("src/lib/shell/slots.js");
const header = read("src/components/layout/OrientationHeader.jsx");
const dock = read("src/components/layout/BottomBar.jsx");
const layout = read("src/components/layout/LayoutCore.jsx");

// --- the spine owns nothing: no state, no storage, no client, no navigation ---
assert.doesNotMatch(spine, /useState|createContext|localStorage|sessionStorage/,
  "spine must stay a pure derivation — no second Research Context store");
// checked against real import statements, not prose in the comments
assert.doesNotMatch(spine, /^\s*import\s/m,
  "spine must stay dependency-free (React included) so it cannot become a provider");
assert.doesNotMatch(spine, /supabase/i, "spine must not read data directly");

// --- the hook binds to the EXISTING owners only ---
assert.match(hook, /useResearch/, "context comes from the existing ResearchProvider");
assert.match(hook, /useLocation/, "route comes from the existing router");
assert.doesNotMatch(hook, /createContext|useState|useReducer/,
  "the hook must not become a second provider/store");

// --- no parallel systems anywhere in the new shell code ---
// slots.js is inert data that legitimately *names* existing owners (e.g. RazielChat)
// as pointers; only the executable surfaces are checked for parallel systems.
for (const [name, src] of [["header", header], ["hook", hook]]) {
  assert.doesNotMatch(src, /UserCenterProvider|createContext/,
    `${name} must not create a second personal area / context provider`);
  assert.doesNotMatch(src, /getAiAnalysis|ai-analyze|RazielChat/,
    `${name} must not open a second Raziel/AI session`);
  assert.doesNotMatch(src, /research_items|research_objects|journey_saves/,
    `${name} must not touch canonical research stores directly`);
}

// --- the Orientation Header is in-flow: it cannot collide with the Dock ---
// checked against the emitted CSS only, so the prose in the header's own comments
// (which describes exactly these forbidden properties) cannot trigger a false pass/fail
const headerCss = header.slice(header.indexOf("const CSS ="));
assert.ok(headerCss.length > 200, "header CSS block must be locatable for this guard");
assert.doesNotMatch(headerCss, /position:\s*fixed|position:\s*sticky|z-index/,
  "orientation header must stay in-flow — no overlay/clearance collision with the Dock");
assert.match(header, /useShellContext/, "header reads the shared spine, not its own copy");
assert.doesNotMatch(header, /<nav|<a href/,
  "orientation is not the navigation menu (system frame v2 §3.1)");
// both themes defined explicitly (city_background_dual_theme_law §3)
assert.match(header, /dark \?/, "header must define light and dark explicitly");

// --- ONE route projection: the Dock no longer carries a private copy ---
assert.doesNotMatch(dock, /function contextFromLocation/,
  "route projection must live only in the spine");
assert.doesNotMatch(dock, /function lensLabel|function lensForSubject/,
  "lens vocabulary must live only in the spine");
assert.match(dock, /useShellContext/, "the Dock reads the shared spine");
assert.match(dock, /shellNav\.goReturn/, "exact-return is shared, not re-implemented");

// --- rollout gate: no public entry point changes in this slice ---
assert.match(layout, /const showOrientation = showBottomBar && !isHome;/,
  "orientation ships under the same admin pilot gate as the Dock, and never on Home");
assert.match(layout, /\{showOrientation && <OrientationHeader \/>\}/);

// --- prepared slots must not claim to be shipped ---
assert.match(slots, /SLOT_PREPARED_LEGACY_NAVBAR_STILL_CANONICAL/);
assert.match(slots, /SLOT_PREPARED_NO_NEW_AI_SESSION/);
assert.match(slots, /DEFERRED_SLOT_PROJECTIONS/);
assert.doesNotMatch(slots, /^\s*import\s/m, "slot declaration is inert data, not a wiring layer");
assert.doesNotMatch(slots, /=>|function\s/, "slot declaration must not execute anything");

console.log("shell-one-owner-guard: ok");
