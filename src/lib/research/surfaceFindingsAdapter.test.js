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
  assert.match(out[0].reason, /חישובים 2 · יחסים 1 · תצפיות 1 · פרשנויות 1/);
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
