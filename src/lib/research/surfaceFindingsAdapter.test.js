import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { buildSurfaceFindings } from "./surfaceFindingsAdapter.js";
import { normalizeResearchContext } from "./researchContext.js";
import { buildRazielSurfaceContext } from "./razielSurfaceContext.js";

const REF = "channel_updates:0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
const ro = (id, kind, extra = {}) => ({ id, kind, statement: `s-${id}`, value: 631, source_ref: REF, privacy_scope: "public", created_at: "2026-10-01T00:00:00Z", ...extra });
const five = ["fact", "fact", "relation", "observation", "hypothesis"].map((k, i) => researchObjectToUniversalFinding(ro(`r${i}`, k)));
const ZVI = { [REF]: { contributorId: "c66f0464-0928-490e-be9b-66d8a87e7fc8", contributorName: "צבי (OPOC)" } };

test("source bundle of 5 renders as ONE REST entry with bundleCount=5", () => {
  const out = buildSurfaceFindings({ findings: five, occurrences: ZVI });
  assert.equal(out.length, 1);
  assert.equal(out[0].bundleCount, 5);
  assert.equal(out[0].sourceLabel, "צבי (OPOC)");
  assert.equal(out[0].focusKind, "source_bundle");
  assert.match(out[0].reason, /עובדות 2 · יחסים 1 · תצפיות 1 · פרשנויות 1/);
  assert.equal(new Set(out.map((x) => x.id)).size, out.length);
  assert.ok(!("findings" in out[0]) && !("findingIds" in out[0]));
});

test("generic connections work for ordinary (non-Bennett) post fixtures; focus excluded", () => {
  const connections = [
    { id: "c1", label: "אדם", value: "26", kind: "PERSON", reason: "r", href: "/x", provenanceLabel: "post:1" },
    { id: "focus", label: "מוקד", value: "7", kind: "NUMBER" },
  ];
  const out = buildSurfaceFindings({ connections, exclude: (r) => r.id === "focus" });
  assert.deepEqual(out.map((x) => x.id), ["c1"]);
  assert.equal(out[0].sourceLabel, "post:1");
});

test("two topic fixtures and normal vs Gold number share one adapter; Gold is prominence only", () => {
  const item = (id, tier) => ({ id, kind: "research", type: "fact", label: id, summary: "sum", sourceRef: "research_objects:" + id, explainWhy: { humanCuration: { tier } } });
  const topicA = buildSurfaceFindings({ prominenceItems: [item("a1", null)] });
  const topicB = buildSurfaceFindings({ prominenceItems: [item("b1", null), item("b2", null)] });
  assert.equal(topicA.length, 1); assert.equal(topicB.length, 2);
  const [normal] = buildSurfaceFindings({ prominenceItems: [item("n", null)] });
  const [gold] = buildSurfaceFindings({ prominenceItems: [item("g", "gold")] });
  assert.equal(gold.prominence, "gold"); assert.equal(normal.prominence, undefined);
  assert.equal(gold.verification, undefined); // Gold never becomes verification
});

test("cap <= 8, no findings -> honest empty", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, label: `L${i}` }));
  assert.equal(buildSurfaceFindings({ prominenceItems: many }).length, 8);
  assert.deepEqual(buildSurfaceFindings({}), []);
});

test("privacy: private child absent from filtered input cannot leak via bundle row or Raziel", () => {
  const priv = researchObjectToUniversalFinding(ro("secret", "fact", { statement: "SECRETWORD", privacy_scope: "private" }));
  const filtered = [...five, priv].filter((f) => f.access.tier !== "private");
  const out = buildSurfaceFindings({ findings: filtered, occurrences: ZVI });
  assert.equal(out[0].bundleCount, 5);
  const ctx = normalizeResearchContext({ subject: { id: "1", type: "post" }, dimensions: { surfaceFindings: out } });
  const blob = JSON.stringify(ctx) + JSON.stringify(buildRazielSurfaceContext(ctx));
  assert.ok(!blob.includes("secret") && !blob.includes("SECRETWORD"));
});

test("Research Context stays bounded: no child arrays, authorization or evidence", () => {
  const out = buildSurfaceFindings({ findings: five, occurrences: ZVI });
  const ctx = normalizeResearchContext({ subject: { id: "1", type: "post" }, dimensions: { surfaceFindings: [{ ...out[0], findings: five, access: { tier: "x" }, evidence: {} }] } });
  const row = ctx.dimensions.surfaceFindings[0];
  assert.equal(row.bundleCount, 5);
  assert.deepEqual(Object.keys(row).filter((k) => ["findings", "findingIds", "access", "evidence"].includes(k)), []);
});

test("attribution: Zvi header says צבי (OPOC), child createdBy null; Sod Hashmal source_work; uploader never author", () => {
  assert.ok(five.every((f) => f.provenance.createdBy === null));
  const sod = researchObjectToUniversalFinding(ro("s", "fact", { source_ref: "posts:5104", contributor: "ZURIEL" }));
  const sodTwo = researchObjectToUniversalFinding(ro("s2", "observation", { source_ref: "posts:5104", contributor: "ZURIEL" }));
  const [row] = buildSurfaceFindings({ findings: [sod, sodTwo], occurrences: { "posts:5104": { sourceWork: "סוד החשמל" } } });
  assert.equal(row.sourceLabel, "סוד החשמל");
  assert.ok(!JSON.stringify(row).includes("ZURIEL"));
});

test("no slug-specific surfaceFindings in Post page; same adapter wired in Post/Topic/Number; rail is one component with sheet mode", () => {
  const post = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
  assert.ok(!/surfaceFindings:\s*post\.slug/.test(post));
  for (const f of ["Post", "Topic", "Number"]) assert.match(fs.readFileSync(`src/pages/${f}2029Page.jsx`, "utf8"), /buildSurfaceFindings\(/);
  const rail = fs.readFileSync("src/components/experience2029/SurfaceContextRail2029.jsx", "utf8");
  assert.match(rail, /sheet = false/);
  assert.match(rail, /bundleCount/);
});

const UID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";

test("explicit attribution: createdBy stays null; exact pair only in projection.dimensions.attribution", () => {
  const f = researchObjectToUniversalFinding(ro("a1", "fact", { meta: { attribution_type: "source_author", contributor_id: UID } }));
  assert.equal(f.provenance.createdBy, null);
  assert.ok(!JSON.stringify(f.provenance).includes("CONTRIBUTOR:"));
  assert.deepEqual(f.projection.dimensions.attribution, { type: "source_author", contributorId: UID, resolved: true, explicit: true });
  const plain = researchObjectToUniversalFinding(ro("a2", "fact"));
  assert.equal(plain.projection.dimensions.attribution, undefined);
  const partial = researchObjectToUniversalFinding(ro("a3", "fact", { meta: { attribution_type: "source_author" } }));
  assert.equal(partial.projection.dimensions.attribution.resolved, false);
  assert.equal(partial.provenance.createdBy, null);
  // identity unchanged by attribution
  assert.deepEqual(f.identity.sourceIdentity, plain.identity.sourceIdentity.researchObjectId === "a2" ? { researchObjectId: "a1" } : null);
});

test("generic fact is a fact; calculation only with explicit method owner evidence", async () => {
  const { sourceBundleMoveFor, buildSourceBundles } = await import("./sourceBundleProjection.js");
  const numeric = researchObjectToUniversalFinding(ro("m0", "fact", { value: 631 }));
  assert.equal(sourceBundleMoveFor(numeric), "fact");
  const claimed = researchObjectToUniversalFinding(ro("m1", "fact", { engine_detail: { claimed_method: "mispar_hechrachi" } }));
  const tested = researchObjectToUniversalFinding(ro("m2", "fact", { engine_detail: { engine_method_tested: "mispar_hechrachi" } }));
  assert.equal(sourceBundleMoveFor(claimed), "calculation");
  assert.equal(sourceBundleMoveFor(tested), "calculation");
  assert.equal(sourceBundleMoveFor({ ...numeric, source: { ...numeric.source, engine: "e" } }), "calculation");
  const [bundle] = buildSourceBundles([numeric, claimed, researchObjectToUniversalFinding(ro("m3", "relation"))]);
  assert.deepEqual(bundle.byMove, { calculation: 1, fact: 1, relation: 1 });
  assert.deepEqual(bundle.findings.map((m) => m.move), ["calculation", "fact", "relation"]);
  const [row] = buildSurfaceFindings({ findings: [numeric, claimed] });
  assert.match(row.reason, /חישובים 1 · עובדות 1/);
});

test("World uses the same adapter on existing governed prominence; no fetch/new store; bounded stable write", () => {
  const world = fs.readFileSync("src/pages/World2029Page.jsx", "utf8");
  assert.match(world, /buildSurfaceFindings\(\{ findings: researchFindings, occurrences: data\?\.research\?\.sourceOccurrences \|\| \{\}, prominenceItems \}\)/);
  assert.match(world, /surfaceFindingsSurface: "world"/);
  assert.match(world, /worldSurfaceFindingsWritten/);
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, label: `L${i}`, type: "fact", sourceRef: `research_objects:w${i}` }));
  assert.equal(buildSurfaceFindings({ prominenceItems: items }).length, 8);
  assert.equal(JSON.stringify(buildSurfaceFindings({ prominenceItems: items })), JSON.stringify(buildSurfaceFindings({ prominenceItems: items })));
});

test("universal focus return: reading focus only on document surfaces; otherwise clear surfaceFocus only", () => {
  const rail = fs.readFileSync("src/components/experience2029/SurfaceContextRail2029.jsx", "utf8");
  const fn = rail.slice(rail.indexOf("const restFromFinding"), rail.indexOf("const [conceptFamiliarity"));
  assert.match(fn, /documentSurface && reading\.id && reading\.label/);
  assert.match(fn, /setSurfaceFocus\(null\)/);
  assert.ok(!/journey|returnTo|surfaceFindings:/.test(fn.replace(/\/\/.*$/gm, "")));
  // cleared focus is dropped by the context normalizer (no undefined/stale focus)
  const ctx = normalizeResearchContext({ subject: { id: "7", type: "number" }, dimensions: { surfaceFocus: null, surfaceFindings: [{ id: "x", label: "X" }], surfaceFindingsSurface: "world" } });
  assert.equal(ctx.dimensions.surfaceFocus, undefined);
  assert.equal(ctx.dimensions.surfaceFindings.length, 1);
  assert.equal(ctx.dimensions.surfaceFindingsSurface, "world");
});

test("bundle focus is a bounded summary: only authorized count, no child serialization; no source-specific branches", () => {
  const out = buildSurfaceFindings({ findings: five, occurrences: ZVI });
  const ctx = normalizeResearchContext({ subject: { id: "1", type: "post" }, dimensions: { surfaceFindings: out, surfaceFocus: { id: out[0].id, type: "finding", label: "x", bundleCount: 5, sourceRef: REF, findings: five } } });
  assert.equal(ctx.dimensions.surfaceFocus.bundleCount, 5);
  assert.ok(!("findings" in ctx.dimensions.surfaceFocus));
  const src = fs.readFileSync("src/lib/research/surfaceFindingsAdapter.js", "utf8") + fs.readFileSync("src/lib/research/sourceBundleProjection.js", "utf8");
  assert.ok(!/Zvi|OPOC|bennett|Sod Hashmal|FZ/i.test(src));
  assert.ok(!/supabase|fetch\(/.test(src));
  const rail = fs.readFileSync("src/components/experience2029/SurfaceContextRail2029.jsx", "utf8");
  assert.ok(!/supabase\.from|\.from\("research_objects"/.test(rail));
  const privateOnly = buildSurfaceFindings({ findings: [] });
  assert.deepEqual(privateOnly, []);
});
