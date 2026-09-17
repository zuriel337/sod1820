import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  classifyWorldPresentationDensity,
  explainWorldRelation,
  filterWorldRelations,
  orderWorldRelations,
  worldDensityCounts,
  worldProjectionCounts,
  worldRelationCounterpart,
  worldRelationFacets,
} from "../src/lib/research/world2029Presentation.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const world = read("src/pages/World2029Page.jsx");
const app = read("src/App2029.jsx");
const experienceContext = read("src/lib/experienceContext.js");
const graphAdapter = read("src/lib/research/entityGraphFinding.js");
const adminMigration = read("supabase/migrations/20260917191500_world_admin_graph_read_v1.sql");

// World is content inside the one shared Frame, not its own shell/control system.
assert.match(world, /FrameState/);
assert.match(world, /use2029Shell/);
assert.match(world, /shell\.openCommand\(\)/);
assert.match(world, /shell\.openAttention\(\)/);
assert.equal(world.includes("shell.openRaziel()"), false);
assert.equal(world.includes('to="/heichal"'), false);
assert.equal(world.includes("shareOrCopy"), false);
assert.equal(world.includes("NumberDrawer"), false);
assert.equal(world.includes("AskRaziel"), false);
assert.equal(world.includes("UserCenter"), false);
assert.equal(world.includes('status="LIVE"'), false);
assert.match(world, /status="עולם · גילוי"/);

// World consumes the released shared Experience Context.
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
assert.equal(world.includes("/logo.png"), false);
assert.equal(world.includes("master_crown_transparent"), false);
assert.equal(world.includes("WorldBrand"), false);

// Cross-cutting capabilities stay in shared owners; no World-specific variants.
for (const forbidden of [
  "WorldContext", "WorldFrame", "WorldNavigation", "WorldRaziel", "WorldSearch",
  "WorldCommand", "WorldWorkspace", "WorldShare", "WorldTrace", "WorldEntitlement",
]) assert.equal(world.includes(forbidden), false, `${forbidden} must not be created inside World`);
assert.equal(world.includes("site_flags"), false);
assert.equal(world.includes("platform_tiers"), false);
assert.equal(world.includes("operationalTraceContract"), false);

// No manual arrangement path. World organization stays rule-driven and automatic.
for (const forbidden of ["draggable", "onDragStart", "onDrop", "manualOrder", "WorldRanking"]) {
  assert.equal(world.includes(forbidden), false, `manual/parallel organization leaked: ${forbidden}`);
}
assert.match(world, /filterWorldRelations/);
assert.match(world, /orderWorldRelations/);
assert.match(world, /explainWorldRelation/);
assert.match(world, /למה כאן\?/);
assert.match(world, /סינון קשרים/);
assert.match(world, /מיון קשרים/);

// Admin mode consumes the existing Auth owner and is visibility-only.
assert.match(world, /useAuth/);
assert.match(world, /const \{ isAdmin \} = useAuth\(\)/);
assert.match(world, /מצב מנהל/);
assert.match(world, /מצב מנהל אינו עוקף הרשאות בדפדפן/);
assert.match(world, /גישה ·/);
assert.match(world, /ממשל ·/);
assert.match(world, /אימות ·/);
assert.equal(/canonicalize|publishFinding|setGovernance|updateAccess/.test(world), false, "World admin view must not become a truth/publication writer");

// Admin graph visibility extends the canonical root-of-trust authorization only.
assert.match(adminMigration, /CREATE POLICY nodes_admin_read/i);
assert.match(adminMigration, /CREATE POLICY edges_admin_read/i);
assert.match(adminMigration, /FOR SELECT/i);
assert.match(adminMigration, /TO authenticated/i);
assert.match(adminMigration, /public\.rd_is_admin\(\)/);
assert.equal(/FOR (INSERT|UPDATE|DELETE)/i.test(adminMigration), false, "admin visibility migration must be read-only");
assert.equal(adminMigration.includes("nodes_public_read"), false, "public graph policy must not be weakened");
assert.equal(adminMigration.includes("edges_public_read"), false, "public graph policy must not be weakened");

// Public World copy speaks discovery/product language, not implementation/debug language.
for (const oldCopy of [
  "קורא רק דרך ה־2029 read models הפעילים", "אין fallback שקט ל־Legacy", "World הוא projection",
  "מגיעים מאותו System Frame", "אין projection זמין לעוגן הזה", "המציאות המחקרית פתוחה", "מפת המחקר של המציאות",
]) assert.equal(world.includes(oldCopy), false, `debug/research-default copy leaked: ${oldCopy}`);
assert.match(world, /העולם פתוח/);
assert.match(world, /בחר נקודה וגלה מה מתחבר אליה/);

// No silent substitute: explicit native states exist for loading/error/empty/unavailable.
for (const kind of ["loading", "error", "empty", "unavailable"]) assert.match(world, new RegExp(`kind="${kind}"`));
assert.match(world, /חומר שלא נטען אינו מוחלף במידע אחר/);
assert.match(app, /path="\/world"/);

// Every World -> Books transition goes through the shared Frame so return_exact is snapshotted.
assert.equal(world.includes('to="/books"'), false);
assert.equal(world.includes("from \"react-router-dom\""), false);
const shellBookTransitions = [...world.matchAll(/shell\.go\((?:`|")\/books/g)].length;
assert.equal(shellBookTransitions, 3);
assert.match(world, /fetchEntityHubProjection\(\{ nodeId: targetNodeId/);
assert.match(world, /shell\.openInspect\(/);
assert.match(world, /returnTo:\s*\{[\s\S]*href: "\/world"/);

// Graph adapter exposes only bounded relation-endpoint display context, never raw metadata.
assert.match(graphAdapter, /function projectedNodeContext/);
assert.match(graphAdapter, /curation:/);
assert.match(graphAdapter, /signal:/);
assert.match(graphAdapter, /from: projectedNodeContext\(from\)/);
assert.match(graphAdapter, /to: projectedNodeContext\(to\)/);

// Density gracefully covers rich / medium / sparse.
const sparse = { identity: { nodeId: "s", type: "number", label: "122" }, timeline: [{ id: "identity", at: "2026-01-01T00:00:00Z" }] };
const medium = { identity: { nodeId: "m", type: "number", label: "604" }, graph: { relations: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}` })) }, timeline: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}` })) };
const rich = { identity: { nodeId: "r", type: "number", label: "1820" }, graph: { relations: Array.from({ length: 30 }, (_, i) => ({ id: `r${i}` })) } };
const multiChannelRich = { identity: { nodeId: "r2", type: "number", label: "358" }, graph: { relations: [{ id: "a" }] }, research: { findings: [{ id: "b" }] }, sources: [{ ref: "c" }] };
assert.equal(classifyWorldPresentationDensity(null), "unavailable");
assert.equal(classifyWorldPresentationDensity(sparse), "sparse");
assert.equal(classifyWorldPresentationDensity(medium), "medium");
assert.equal(classifyWorldPresentationDensity(rich), "rich");
assert.equal(classifyWorldPresentationDensity(multiChannelRich), "rich");
assert.deepEqual(worldProjectionCounts(sparse), { relations: 0, findings: 0, sources: 0, worlds: 0, timeline: 1 });
assert.deepEqual(worldDensityCounts(sparse), { relations: 0, findings: 0, sources: 0, worlds: 0, timeline: 0 });

// Automatic relation projection: contextual curation visibility without an opaque truth score.
const relation = (id, label, type, tier = null, relationType = "related", createdAt = `2026-09-${id}T00:00:00Z`) => ({
  id,
  provenance: { createdAt },
  projection: { relations: [{
    id,
    fromNodeId: "1820-node",
    toNodeId: `${id}-node`,
    relationType,
    from: { id: "1820-node", type: "number", label: "1820", curation: { tier: null }, signal: {} },
    to: { id: `${id}-node`, type, label, space: "core", curation: { tier }, signal: {} },
  }] },
});
const relations = [
  relation("10", "360", "number", null, "equals"),
  relation("11", "חתימת זהב", "entity", "gold", "related"),
  relation("12", "1020", "number", null, "cross"),
];
assert.equal(worldRelationCounterpart(relations[0], "1820-node").label, "360");
assert.deepEqual(worldRelationFacets(relations, "1820-node"), [{ type: "number", count: 2 }, { type: "entity", count: 1 }]);
assert.deepEqual(filterWorldRelations(relations, { currentNodeId: "1820-node", filter: "number" }).map(x => x.id), ["10", "12"]);
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "recommended" }).map(x => x.id), ["11", "10", "12"], "Gold remains discoverable before neutral reader order without claiming truth");
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "number_asc" }).map(x => x.id), ["10", "12", "11"]);
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "number_desc" }).map(x => x.id), ["12", "10", "11"]);
const why = explainWorldRelation(relations[1], "1820-node");
assert.match(why.reasons.join(" "), /אוצרות אנושי: gold/);
assert.match(why.disclaimer, /אינו דירוג אמת/);

const helper = read("src/lib/research/world2029Presentation.js");
assert.match(helper, /does NOT rank truth/i);
assert.equal(/confidence\s*=/.test(helper), false);
assert.equal(helper.includes("universalScore"), false);

console.log("2029 native World surface acceptance: PASS");
