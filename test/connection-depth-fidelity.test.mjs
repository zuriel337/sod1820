import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCurationCatalog2029,
  buildNumberCuration2029,
  curationForValue2029,
  normalizeCurationNode,
} from "../src/lib/research/curationProjection2029.js";
import { buildWorldContextualProminence } from "../src/lib/research/worldContextualProminence.js";
import { buildTopic2029Projection } from "../src/lib/research/topic2029Projection.js";

// Synthetic fixtures only. The callers must supply already-authorized reader outputs;
// these pure projections do not replace RLS, Human Include/Publish, or source admission.
const core = (overrides = {}) => ({
  id: "human-core", type: "entity", label: "זהות ליבה",
  metadata: { tier: "gold", role: "core" }, ...overrides,
});

const graph = ({
  id, label = id, type = "entity", tier = null, role = null,
  relationType = "related", verification = null,
}) => ({
  id: `finding-${id}`,
  projection: { relations: [{
    id: `edge-${id}`, fromNodeId: "anchor", toNodeId: id, relationType,
    from: { id: "anchor", type: "number", label: "1820" },
    to: { id, type, label, curation: { tier, role }, signal: {} },
  }] },
  source: { sourceRef: `edge:edge-${id}` },
  evidence: { refs: [`edge:edge-${id}`] },
  verification: { verification_state: verification },
});

const hub = (relations = [], rows = []) => ({
  identity: { nodeId: "anchor", type: "number", label: "1820" },
  graph: { relations }, research: { rows, findings: [] },
  topics: { rows: [], findings: [] }, sources: [],
});

const topic = (quality, meterScore) => ({
  id: "topic-finding", kind: "convergence",
  subject: { key: "source-topic", label: "נושא" },
  evidence: { facts: [{ type: "topic-card-source", quality, meter_score: meterScore }] },
});

test("curation missing or nonnumeric values remain unknown; a genuine zero survives", () => {
  for (const value of [undefined, null, "", "  ", false, true, [], {}, "invalid"]) {
    const item = normalizeCurationNode(core({ metadata: { tier: "gold", value } }));
    assert.equal(item.value, null, `must not invent a value for ${String(value)}`);
  }
  for (const value of [0, "0", 424, "424"]) {
    assert.equal(normalizeCurationNode(core({ metadata: { tier: "gold", value } })).value, Number(value));
  }
  assert.equal(normalizeCurationNode(core({ type: "number", label: "14", metadata: { tier: "gold", role: "anchor" } })).value, 14);
});

test("unknown core values do not attach to zero or to an absent number root", () => {
  const catalog = buildCurationCatalog2029([
    core(),
    { id: "zero", type: "number", label: "0", metadata: { tier: "gold", role: "anchor" } },
  ]);
  assert.equal(buildNumberCuration2029({ root: 0, catalog }).coreCount, 0);
  for (const root of [null, undefined, "", "  ", false, []]) {
    const projection = buildNumberCuration2029({ root, catalog });
    assert.equal(projection.anchor, null);
    assert.equal(projection.coreCount, 0);
    assert.equal(curationForValue2029(catalog, root), null);
  }
  assert.equal(curationForValue2029(catalog, 0).id, "zero");
});

test("the original curation reason stays inspectable without replacing public Hebrew copy with internal provenance", () => {
  const reason = "ZURIEL Human Gate: core identity; Gold is curation, not truth";
  const item = normalizeCurationNode(core({ metadata: { tier: "gold", curation_reason: reason } }));
  assert.equal(item.rawReason, reason);
  assert.equal(item.reason, normalizeCurationNode(core()).reason);
  assert.match(item.reason, /זהות ליבה/);
  const fallback = normalizeCurationNode(core({ metadata: { tier: "gold", curation_reason: "  " } }));
  assert.equal(fallback.rawReason, null);
  assert.ok(fallback.reason);
});

test("the same marked relation projected twice is one witness identity, never two independent sources", () => {
  const raw = { id: "witness-edge", metadata: { curation_role: "diamond_witness" } };
  const wrapped = { id: "different-finding-id", projection: { relations: [structuredClone(raw)] } };
  const projection = buildNumberCuration2029({ root: 1820, relations: [raw, raw, wrapped] });
  assert.equal(projection.witnessCount, 1);
  assert.equal(projection.witnessRowCount, 3);
  assert.equal(projection.unresolvedWitnessRowCount, 0);
  assert.equal("independentSourceCount" in projection, false);
  assert.equal(projection.hasCuration, false, "a witness must not grant curation to its number");
});

test("explicit source edge identity deduplicates missing projected ids without using Finding identity", () => {
  const relation = { metadata: { curation_role: "gold_witness" } };
  const rows = ["finding-1", "finding-2"].map((id) => ({
    id, identity: { sourceIdentity: { edgeId: "canonical-edge" } },
    projection: { relations: [relation] },
  }));
  const projection = buildNumberCuration2029({ relations: rows });
  assert.equal(projection.witnessCount, 1);
  assert.equal(projection.witnessRowCount, 2);
});

test("witness rows with no explicit relation identity remain unresolved", () => {
  const unknown = { metadata: { curation_role: "gold_witness" }, label: "אותו שם" };
  const wrapped = { id: "finding-wrapper-only", projection: { relations: [unknown] } };
  const projection = buildNumberCuration2029({ relations: [unknown, unknown, wrapped] });
  assert.equal(projection.witnessCount, 0);
  assert.equal(projection.witnessRowCount, 3);
  assert.equal(projection.unresolvedWitnessRowCount, 3);
  const malformed = buildNumberCuration2029({ relations: [{ ...unknown, id: {} }, { ...unknown, id: false }] });
  assert.equal(malformed.witnessCount, 0);
  assert.equal(malformed.unresolvedWitnessRowCount, 2);
});

test("a relation wrapper id does not substitute for a missing marked edge identity", () => {
  const projection = buildNumberCuration2029({ relations: [{
    id: "wrapper-not-edge",
    relation: { metadata: { curation_role: "gold_witness" } },
  }] });
  assert.equal(projection.witnessCount, 0);
  assert.equal(projection.witnessRowCount, 1);
  assert.equal(projection.unresolvedWitnessRowCount, 1);
});

test("distinct marked edge ids remain distinct even when labels, endpoints and source refs agree", () => {
  const rows = ["edge-a", "edge-b"].map((id) => ({
    id, label: "אותו שם", from_node: "same-a", to_node: "same-b",
    source: { sourceRef: "same-source" }, metadata: { curation_role: "gold_witness" },
  }));
  rows.push({ id: "not-a-witness", metadata: { curation_role: "related" } });
  const projection = buildNumberCuration2029({ relations: rows });
  assert.equal(projection.witnessCount, 2);
  assert.equal(projection.witnessRowCount, 2);
  assert.equal("independentSourceCount" in projection, false);
});

test("Diamond belongs to the explicit curated node; matching numbers and support edges do not inherit it", () => {
  const diamond = graph({ id: "diamond-core", label: "1820", tier: "diamond", role: "core" });
  const witness = graph({ id: "witness", label: "1820", role: "diamond_witness", relationType: "supports" });
  const crown = graph({ id: "crown", label: "1820", type: "number", role: "crown_anchor" });
  const built = buildWorldContextualProminence(hub([diamond, witness, crown]));
  const byId = Object.fromEntries(built.items.map((item) => [item.id, item]));
  assert.deepEqual(byId["graph:finding-diamond-core"].explainWhy.humanCuration, { tier: "diamond", role: "core" });
  assert.deepEqual(byId["graph:finding-witness"].explainWhy.humanCuration, { tier: null, role: "diamond_witness" });
  assert.deepEqual(byId["graph:finding-crown"].explainWhy.humanCuration, { tier: null, role: "crown_anchor" });
  assert.equal(built.candidateCount, 3);
});

test("Diamond is preserved as a late Human-curation dimension without displacing stronger verification", () => {
  const built = buildWorldContextualProminence(hub([
    graph({ id: "diamond", tier: "diamond", role: "core" }),
    graph({ id: "gold", tier: "gold", role: "anchor" }),
    graph({ id: "matched", verification: "match" }),
  ]), {}, { attentionFirst: false });
  assert.deepEqual(built.items.map((item) => item.id), ["graph:finding-matched", "graph:finding-diamond", "graph:finding-gold"]);
});

test("the bounded attention bundle keeps negative controls and relevant Gold without erasing Diamond", () => {
  const built = buildWorldContextualProminence(hub([
    graph({ id: "diamond", tier: "diamond", role: "core" }),
    graph({ id: "gold", tier: "gold", role: "anchor" }),
    ...["image", "media", "convergence", "post", "entity"].map((type) => graph({ id: type, type, verification: "match" })),
  ], [{ id: "negative", value: 1820, statement: "סתירה לבדיקה", engine_detail: { verification_state: "mismatch" } }]), {}, { limit: 4 });
  assert.equal(built.items[0].id, "research:negative");
  assert.ok(built.items.some((item) => item.explainWhy.humanCuration.tier === "gold"));
  // Diamond remains a candidate with its own tier; bounded display may still prefer
  // verified/direct evidence. Gold insertion must not silently strip that tier.
  const expanded = buildWorldContextualProminence(hub([
    graph({ id: "diamond", tier: "diamond", role: "core" }),
    graph({ id: "gold", tier: "gold", role: "anchor" }),
  ], [{ id: "negative", engine_detail: { verification_state: "mismatch" } }]), {}, { limit: 4 });
  assert.deepEqual(new Set(expanded.items.map((item) => item.explainWhy.humanCuration.tier)), new Set([null, "diamond", "gold"]));
});

test("Gold insertion into a full bundle preserves its already-selected Diamond and negative control", () => {
  // Family selection fills all four places before reaching Gold: negative, two
  // verified content families, then Diamond. Gold must replace an ordinary family,
  // not the Diamond sitting at the end of that first selection.
  const built = buildWorldContextualProminence(hub([
    graph({ id: "match-a", type: "image", verification: "match" }),
    graph({ id: "match-b", type: "post", verification: "match" }),
    graph({ id: "diamond", tier: "diamond", role: "core" }),
    graph({ id: "gold", tier: "gold", role: "anchor" }),
  ], [{ id: "negative", value: 1820, engine_detail: { verification_state: "mismatch" } }]), {}, { limit: 4 });
  assert.equal(built.candidateCount, 5);
  assert.deepEqual(built.items.map((item) => item.id), [
    "research:negative", "graph:finding-match-a", "graph:finding-diamond", "graph:finding-gold",
  ]);
});

test("Topic quality and meter preserve missingness, invalid values and genuine zero", () => {
  for (const missing of [undefined, null, "", "  ", false, true, [], {}, "invalid"]) {
    const projection = buildTopic2029Projection(topic(missing, missing));
    assert.equal(projection.quality, null);
    assert.equal(projection.meterScore, null);
  }
  for (const value of [0, "0", 7, "7"]) {
    const projection = buildTopic2029Projection(topic(value, value));
    assert.equal(projection.quality, Number(value));
    assert.equal(projection.meterScore, Number(value));
  }
});

test("curation projection does not mutate governance, verification or the authorized input scope", () => {
  const data = hub([graph({ id: "curated", tier: "diamond", role: "core" })]);
  const before = structuredClone(data);
  const built = buildWorldContextualProminence(data);
  assert.deepEqual(data, before);
  assert.equal(built.candidateCount, 1);
  assert.equal(built.contextSignals.accessBoundary, "governed_readers_current_session_rls_before_composition");
  assert.equal(built.items[0].explainWhy.researchStrengthSignals.includes("engine_match"), false);
  for (const field of ["status", "stage", "published", "canonical", "access"]) {
    assert.equal(field in built.items[0], false);
  }
  const source = topic(7, 100);
  source.stage = null;
  source.status = null;
  source.access = { reason: "source-flag:_do_not_publish" };
  const projection = buildTopic2029Projection(source);
  assert.equal(projection.withheld, true);
  assert.equal(projection.stage, null);
  assert.equal(projection.governanceStatus, null);
  assert.equal(projection.verificationState, null);
});
