import test from "node:test";
import assert from "node:assert/strict";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { buildSourceBundles } from "./sourceBundleProjection.js";

const ZVI = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
const REF = "channel_updates:0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
const row = (id, kind, extra = {}) => ({
  id, kind, statement: `s-${id}`, value: 631, terms: ["בנט"], source: "channel_updates", source_ref: REF,
  status: "draft", privacy_scope: "public", created_at: `2026-10-01T00:00:0${id.length}Z`, ...extra,
});
const rows = [row("a1", "fact"), row("a2", "fact"), row("b", "relation"), row("c", "observation"), row("d", "hypothesis")];
const finds = (rs = rows) => rs.map((r) => researchObjectToUniversalFinding(r));

test("one source bundle, five unchanged ids, ordered research move", () => {
  const f = finds();
  const [bundle, ...rest] = buildSourceBundles(f);
  assert.equal(rest.length, 0);
  assert.deepEqual(new Set(bundle.findingIds), new Set(f.map((x) => x.id)));
  assert.equal(bundle.count, 5);
  assert.deepEqual(bundle.findings.map((x) => x.move), ["fact", "fact", "relation", "observation", "interpretation"]);
  assert.match(bundle.invariant, /not independent evidence/);
});

test("filtered-out private finding cannot be revealed or counted", () => {
  const withPrivate = [...rows, row("p", "fact", { privacy_scope: "private" })];
  const filtered = finds(withPrivate).filter((x) => x.access.tier !== "private");
  const [bundle] = buildSourceBundles(filtered);
  assert.equal(bundle.count, 5);
  assert.ok(!JSON.stringify(bundle).includes("private"));
});

test("source header from occurrence; child createdBy stays null without explicit attribution", () => {
  const f = finds();
  const [bundle] = buildSourceBundles(f, { occurrences: { [REF]: { contributorId: ZVI, contributorName: "צבי (OPOC)" } } });
  assert.deepEqual(bundle.header, { type: "source_author", contributorId: ZVI, label: "צבי (OPOC)" });
  assert.ok(f.every((x) => x.provenance.createdBy === null));
  assert.ok(bundle.findings.every((x) => x.createdBy === null));
});

test("explicit per-object attribution is structural only: createdBy stays null, identity unchanged", () => {
  const plain = researchObjectToUniversalFinding(row("a1", "fact"));
  const attributed = researchObjectToUniversalFinding(row("a1", "fact", { meta: { attribution_type: "source_authorship", contributor_id: ZVI } }));
  assert.equal(attributed.provenance.createdBy, null);
  assert.equal(attributed.id, plain.id);
  assert.deepEqual(attributed.identity, plain.identity);
  assert.deepEqual(attributed.projection.dimensions.attribution, { type: "source_authorship", contributorId: ZVI, resolved: true, explicit: true });
});

test("incomplete / inferred attribution stays unresolved", () => {
  const typeOnly = researchObjectToUniversalFinding(row("x", "fact", { meta: { attribution_type: "source_authorship" } }));
  const textOnly = researchObjectToUniversalFinding(row("y", "fact", { contributor: "צבי (OPOC)" }));
  const uploader = researchObjectToUniversalFinding(row("z", "fact", { contributor: "ZURIEL", meta: { attribution_type: "source_authorship", contributor_id: "not-a-uuid" } }));
  for (const f of [typeOnly, textOnly, uploader]) assert.equal(f.provenance.createdBy, null);
  assert.equal(typeOnly.projection.dimensions.attribution.resolved, false);
});

test("Sod Hashmal is source_work, never a contributor; uploader not shown", () => {
  const ref = "posts:5104";
  const f = finds([row("s1", "fact", { source_ref: ref, contributor: "ZURIEL" })]);
  const [bundle] = buildSourceBundles(f, { occurrences: { [ref]: { sourceWork: "סוד החשמל" } } });
  assert.deepEqual(bundle.header, { type: "source_work", contributorId: null, label: "סוד החשמל" });
  assert.ok(!JSON.stringify(bundle).includes("ZURIEL"));
});

test("singleton stays singleton; repeated finding does not inflate", () => {
  const f = finds([row("s", "fact", { source_ref: null })]);
  const [b] = buildSourceBundles(f);
  assert.equal(b.isSingleton, true);
  assert.equal(b.sourceRef, null);
  const [dup] = buildSourceBundles([...finds(), ...finds()]);
  assert.equal(dup.count, 5);
});
