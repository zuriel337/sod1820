import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  classifyWorldPresentationDensity,
  worldDensityCounts,
  worldProjectionCounts,
} from "../src/lib/research/world2029Presentation.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const world = read("src/pages/World2029Page.jsx");
const app = read("src/App2029.jsx");
const experienceContext = read("src/lib/experienceContext.js");

// World is content inside the one shared Frame, not its own shell/control system.
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
assert.equal(world.includes('status="LIVE"'), false, "branch-only iteration must not claim a new LIVE state");
assert.match(world, /status="עולם · גילוי"/);

// World is the first runtime consumer of the released shared Experience Context.
assert.match(world, /EXPERIENCE_SURFACE/);
assert.match(world, /resolveExperienceContext/);
assert.match(world, /surface:\s*EXPERIENCE_SURFACE\.WORLD/);
assert.match(world, /WORLD_EXPERIENCE\.experience\.question/);
assert.match(world, /WORLD_EXPERIENCE\.brand\.identity/);
assert.match(world, /WORLD_EXPERIENCE\.brand\.canonicalLatinIdentity/);
assert.match(experienceContext, /\[EXPERIENCE_SURFACE\.WORLD\]/);
assert.match(experienceContext, /question:\s*"מה מתחבר\?"/);
assert.match(experienceContext, /semanticsSurviveDowngrade:\s*true/);

// Brand is consumed semantically. World must not invent or substitute protected artwork locally.
assert.equal(world.includes("/logo.png"), false, "World must not use /logo.png as a Master Mark substitute");
assert.equal(world.includes("master_crown_transparent"), false, "asset-key resolution belongs to the shared Experience/Brand owner, not World");
assert.equal(world.includes("WorldBrand"), false);

// Cross-cutting capabilities stay in shared owners; no World-specific variants.
for (const forbidden of [
  "WorldContext",
  "WorldFrame",
  "WorldNavigation",
  "WorldRaziel",
  "WorldSearch",
  "WorldCommand",
  "WorldWorkspace",
  "WorldShare",
  "WorldTrace",
  "WorldEntitlement",
]) {
  assert.equal(world.includes(forbidden), false, `${forbidden} must not be created inside World`);
}
assert.equal(world.includes("site_flags"), false, "World must not resolve availability locally");
assert.equal(world.includes("platform_tiers"), false, "World must not resolve entitlement locally");
assert.equal(world.includes("operationalTraceContract"), false, "lightweight World navigation must not fake a local operational trace");

// Public World copy speaks discovery/product language, not implementation/debug language.
for (const oldCopy of [
  "קורא רק דרך ה־2029 read models הפעילים",
  "אין fallback שקט ל־Legacy",
  "World הוא projection",
  "מגיעים מאותו System Frame",
  "אין projection זמין לעוגן הזה",
  "המציאות המחקרית פתוחה",
  "מפת המחקר של המציאות",
]) {
  assert.equal(world.includes(oldCopy), false, `debug/research-default copy leaked: ${oldCopy}`);
}
assert.match(world, /העולם פתוח/);
assert.match(world, /בחר נקודה וגלה מה מתחבר אליה/);
assert.match(world, /דברים שכבר קיימים במערכת/);

// No silent substitute: explicit native states exist for loading/error/empty/unavailable.
for (const kind of ["loading", "error", "empty", "unavailable"]) {
  assert.match(world, new RegExp(`kind="${kind}"`));
}
assert.match(world, /חומר שלא נטען אינו מוחלף במידע אחר/);

// The route is a direct isolated 2029 deep link.
assert.match(app, /path="\/world"/);

// Every World -> Books transition goes through the shared Frame so return_exact is snapshotted.
assert.equal(world.includes('to="/books"'), false, "World must not bypass System Frame with a bare Books link");
assert.equal(world.includes("from \"react-router-dom\""), false, "World should not need direct router links for cross-surface Books transitions");
const shellBookTransitions = [...world.matchAll(/shell\.go\((?:`|")\/books/g)].length;
assert.equal(shellBookTransitions, 3, "book card, book facet header, and anchored sources must all route through shell.go");
assert.match(world, /function AnchoredWorld\(\{ research, shell, subject, context \}\)/);
assert.match(world, /<AnchoredWorld research=\{research\} shell=\{shell\} subject=\{subject\} context=\{context\} \/>/);

// Real World deepening stays on the canonical entity read path and writes only Research Context.
assert.match(world, /fetchEntityHubProjection\(\{ nodeId: targetNodeId/);
assert.match(world, /shell\.openInspect\(/);
assert.match(world, /returnTo:\s*\{[\s\S]*href: "\/world"/);

// Relation vocabulary is humanized only at presentation; the canonical relation value remains untouched underneath.
assert.match(world, /function relationLabel/);
assert.match(world, /relationStatement\(finding, relation\?\.relationType\)/);

// Density is presentation-only and must gracefully cover rich / medium / sparse.
const sparse = {
  identity: { nodeId: "s", type: "number", label: "122" },
  timeline: [{ id: "identity", at: "2026-01-01T00:00:00Z" }],
};
const medium = {
  identity: { nodeId: "m", type: "number", label: "604" },
  graph: { relations: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}` })) },
  timeline: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}` })),
};
const rich = {
  identity: { nodeId: "r", type: "number", label: "1820" },
  graph: { relations: Array.from({ length: 30 }, (_, i) => ({ id: `r${i}` })) },
};
const multiChannelRich = {
  identity: { nodeId: "r2", type: "number", label: "358" },
  graph: { relations: [{ id: "a" }] },
  research: { findings: [{ id: "b" }] },
  sources: [{ ref: "c" }],
};

assert.equal(classifyWorldPresentationDensity(null), "unavailable");
assert.equal(classifyWorldPresentationDensity(sparse), "sparse", "identity creation alone must not inflate a sparse World");
assert.equal(classifyWorldPresentationDensity(medium), "medium");
assert.equal(classifyWorldPresentationDensity(rich), "rich");
assert.equal(classifyWorldPresentationDensity(multiChannelRich), "rich");
assert.deepEqual(worldProjectionCounts(sparse), {
  relations: 0,
  findings: 0,
  sources: 0,
  worlds: 0,
  timeline: 1,
});
assert.deepEqual(worldDensityCounts(sparse), {
  relations: 0,
  findings: 0,
  sources: 0,
  worlds: 0,
  timeline: 0,
});
assert.deepEqual(worldProjectionCounts(medium), {
  relations: 5,
  findings: 0,
  sources: 0,
  worlds: 0,
  timeline: 6,
});

// Density language must remain presentation semantics, not truth/ranking semantics.
const helper = read("src/lib/research/world2029Presentation.js");
assert.match(helper, /does NOT rank truth/i);
assert.equal(/canonical\s*=|verified\s*=|confidence\s*=/.test(helper), false);

console.log("2029 native World surface acceptance: PASS");