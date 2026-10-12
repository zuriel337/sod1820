import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const companion = read("src/components/experience2029/CompanionPanel2029.jsx");
const hook = read("src/components/experience2029/useSystemFeed2029.js");
const contextRail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const projector = read("src/components/experience2029/GoldenProjectorModeLayer2029.jsx");
const gate = read("src/lib/projectorPilotGate.js");

test("2029 left Companion and mobile Now share one public stream watcher and exact row identities", () => {
  const attention = frame.split("function AttentionProjection(")[1]?.split("function ToolsProjection(")[0];
  assert.ok(attention, "mobile AttentionProjection is present");
  assert.match(hook, /watchWorldDiscoveryStream\(/);
  assert.match(hook, /includeResearch:\s*false/);
  assert.doesNotMatch(attention, /watchWorldDiscoveryStream|fetchWorldDiscoveryStream|\.from\(["']research_objects["']\)/);
  assert.match(frame, /<AttentionProjection[\s\S]{0,240}?feed=\{feed\}/);
  assert.match(companion, /feed\.rows\.map\(\(row\)/);
  assert.match(attention, /rows\.slice\(0,\s*8\)\.map\(\(row\)/);
  assert.match(attention, /const href = row\.href/);
  assert.match(attention, /feed\?\.see\?\.\(row\)/);
  assert.match(attention, /row\.typeLabel/);
});

test("one public reader retains group-source availability and partial-failure notices for mobile", () => {
  assert.match(hook, /unavailableSources:\s*Array\.isArray\(result\?\.unavailableSources\)/);
  assert.match(hook, /groupArrivals:\s*result\?\.groupArrivals\s*\|\|\s*null/);
  assert.match(hook, /error:\s*current\.items\.length\s*===\s*0/);
  const attention = frame.split("function AttentionProjection(")[1]?.split("function ToolsProjection(")[0];
  assert.match(attention, /feed\?\.groupArrivals/);
  assert.match(attention, /feed\?\.unavailableSources/);
  assert.match(attention, /חלק ממקורות העדכון אינם זמינים/);
  assert.match(attention, /חדש אינו בהכרח ממצא מחקר מאומת/);
});

test("Golden Projector remains inside the existing contextual rail and strictly pilot/admin scoped", () => {
  assert.match(contextRail, /<GoldenProjectorModeLayer2029 context=\{context\} surface=\{surface\}/);
  assert.match(companion, /\{contextNode\}/);
  assert.match(projector, /if \(!visible \|\| loading \|\| !isAdmin\) return null/);
  assert.match(projector, /isProjectorPilotVisible\(/);
  assert.match(gate, /PROJECTOR_PILOT_POST_IDS\s*=\s*Object\.freeze\(\["5112", "92"\]\)/);
});

test("real reading-sections progress stays INSIDE the one command island, not a new fixed dock", () => {
  assert.match(frame, /const readingProgress = showBottomTrail/);
  assert.match(frame, /progressSections\.length\s*>=\s*2/);
  assert.match(frame, /data-reading-progress=/);
  assert.match(frame, /openTransient\(TRANSIENT\.CONTEXT\)/);
  assert.match(frame, /sod29-command-island is-unified-bar/);
  assert.doesNotMatch(frame, /<(?:New|Second|Floating)BottomDock/);
});
