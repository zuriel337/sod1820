import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_SURFACE, projectEventContextForSurface } from "./eventObservationCompiler.js";
import { compileNasrallahPost92Golden } from "./nasrallahPost92Golden.js";
import { applyMomentClockLaw, normalizeClockObservation, clockRepresentations } from "./momentClockSystemMethod.js";
import { gematriaTraceToFinding } from "./gematriaTrace.js";

const post = { id: 92, slug: "post-92", date: "2024-09-29T06:29:04Z" };
const clock = { display: "18:20", hour: 18, minute: 20, timezone: "Asia/Beirut", context: "site approved reading", source_ref: "post:92" };
const day = { ordinal: 358, counting_context: "day of the war (source claim)", source_ref: "post:92" };
const ruleVersions = { moment_clock_law: 2 };
const receiptResolver = (m) => (m.expression === "משיח" && m.method_key === "רגיל"
  ? gematriaTraceToFinding({ status: "ok", method_key: "רגיל", input: "משיח", result: 358, method_version: "fixture-v1" }, { inputText: "משיח", createdAt: "2026-10-06T00:00:00Z" })
  : null);
const run = (over = {}) => compileNasrallahPost92Golden({ post, clockObservation: clock, dayOrdinal: day, ruleVersions, receiptResolver, ...over });
const find = (pack, id) => pack.bundle.findings.find(f => f.id === id);

test("typed clock occurrence preserves display/hour/minute/timezone/context/source_ref and is not a Number", async () => {
  const p = await run();
  const f = find(p, p.golden.clock_occurrence_finding_id);
  const fact = f.evidence.facts[0];
  assert.deepEqual([fact.original_display, fact.local_hour, fact.local_minute, fact.timezone, fact.context, fact.source_ref], ["18:20", 18, 20, "Asia/Beirut", "site approved reading", "post:92"]);
  assert.equal(fact.is_number, false);
  assert.equal(f.subject.value, null);
  assert.ok(!f.projection.anchors.some(a => a.space === "number"));
});

test("moment_clock_law v2: 24h=1820 and 12h=620, same-occurrence derivations, not independent", async () => {
  const p = await run();
  const reps = Object.fromEntries(p.golden.representations.map(r => [r.representation, r]));
  assert.equal(reps.CLOCK_24H_CONCAT.output, 1820);
  assert.equal(reps.CLOCK_12H_CONCAT.output, 620);
  for (const r of p.golden.representations) {
    const f = find(p, r.finding_id);
    assert.equal(f.source.adapter, "numeric-rule-application-v1");
    assert.equal(f.evidence.facts[0].rule_version, 2);
    assert.equal(f.evidence.facts[0].dependency_class, "SAME_OCCURRENCE_DERIVATION");
    assert.equal(f.evidence.facts[0].independent_evidence, false);
    assert.deepEqual(f.provenance.parentFindingIds, [p.golden.clock_occurrence_finding_id]);
    const o = p.bundle.finding_outcomes.find(x => x.finding_id === r.finding_id);
    assert.equal(o.evidence_relation, "derivation");
  }
  for (const o of p.bundle.finding_outcomes) assert.notEqual(o.evidence_relation, "independent_evidence");
  // Number 1820 reachable from same pack, but the occurrence is not collapsed into it
  const n1820 = projectEventContextForSurface(p, EVENT_SURFACE.NUMBER, { number: 1820 });
  assert.ok(n1820.finding_ids.includes(reps.CLOCK_24H_CONCAT.finding_id));
  assert.ok(!n1820.finding_ids.includes(p.golden.clock_occurrence_finding_id));
});

test("display digits stay separate; zero in display never triggers zero-scale", async () => {
  const p = await run();
  const f = find(p, p.golden.representations[0].finding_id);
  assert.equal(f.evidence.facts[0].output.display_digits, "1820");
  assert.ok(!p.bundle.findings.some(x => ["zero_scale_law", "zero_navigation"].includes(x.source?.method)));
  const r = clockRepresentations(normalizeClockObservation({ ...clock, display: "0:05", hour: 0, minute: 5 }).observation);
  assert.deepEqual(r.map(x => [x.display_digits, x.output]), [["005", 5], ["1205", 1205]]);
});

test("fail closed: no attestation, v1, free text, ambiguous or incomplete observation", async () => {
  const ev = { key: "K", ref: "event_candidate:K" };
  for (const rv of [null, {}, { moment_clock_law: 1 }]) {
    const r = await applyMomentClockLaw({ observation: clock, ruleVersions: rv, event: ev });
    assert.equal(r.ok, false);
    assert.equal(r.applications.length, 0);
  }
  for (const bad of ["18:20", { ...clock, display: "6:20 PM" }, { ...clock, hour: 17 }, { ...clock, timezone: null, context: null }, { ...clock, source_ref: null }, { ...clock, meridiem: "AM" }, { ...clock, hour: "18" }]) {
    assert.equal(normalizeClockObservation(bad).ok, false, JSON.stringify(bad));
  }
  const p = await run({ ruleVersions: null });
  assert.equal(p.golden.interpretation_finding_id, null);
  assert.ok(p.golden.refusals.some(r => r.part === "clock_occurrence"));
});

test("day ordinal typed separately; anchors Number 358 without claiming gematria", async () => {
  const p = await run();
  const d = find(p, p.golden.day_ordinal_finding_id);
  assert.equal(d.subject.type, "day_ordinal");
  assert.equal(d.subject.value, null);
  assert.equal(d.evidence.facts[0].is_gematria_result, false);
  assert.equal(d.evidence.facts[0].is_rule_application, false);
  assert.equal(d.source.method, null);
  assert.equal(d.source.engine, null);
  const n358 = projectEventContextForSurface(p, EVENT_SURFACE.NUMBER, { number: 358 });
  assert.ok(n358.finding_ids.includes(d.id));
  assert.ok(n358.finding_ids.includes(p.golden.engine_trace_finding_id));
  assert.notEqual(d.id, p.golden.engine_trace_finding_id);
  assert.equal(normalizeClockObservation(clock).ok, true);
  assert.equal(p.golden.refusals.length, 0);
});

test("canonical Trace משיח=358 is a separate engine finding; no receipt -> no engine fact and no interpretation", async () => {
  const p = await run();
  const t = find(p, p.golden.engine_trace_finding_id);
  assert.equal(t.source.engine, "gematria");
  assert.equal(t.verification.engine_result, 358);
  const none = await run({ receiptResolver: () => null });
  assert.equal(none.golden.engine_trace_finding_id, null);
  assert.equal(none.golden.interpretation_finding_id, null);
});

test("site interpretation composes 1820+358, attributed כי לה׳ המלוכה, depends on observations + engine, not independent", async () => {
  const p = await run({ humanGate: "ZURIEL" });
  const i = find(p, p.golden.interpretation_finding_id);
  assert.equal(i.stage, "interpretation");
  assert.equal(i.evidence.facts[0].attribution.display_name, "כי לה׳ המלוכה");
  assert.equal(i.evidence.facts[0].attribution.role, "site_interpretation");
  assert.equal(i.evidence.facts[0].is_engine_fact, false);
  assert.equal(i.evidence.facts[0].independent_evidence, false);
  assert.deepEqual(i.evidence.facts[0].numbers, [1820, 358]);
  assert.deepEqual([...i.provenance.parentFindingIds].sort(), [p.golden.representations[0].finding_id, p.golden.day_ordinal_finding_id, p.golden.engine_trace_finding_id].sort());
  const o = p.bundle.finding_outcomes.find(x => x.finding_id === i.id);
  assert.equal(o.evidence_relation, "derivation");
  assert.deepEqual([...o.depends_on].sort(), [...i.provenance.parentFindingIds].sort());
  assert.ok(!JSON.stringify(p.bundle.findings.map(f => f.evidence?.facts?.[0]?.attribution)).includes("צוריאל"));
});

test("PublishedAt != OccurredAt; legacy auto_from_post graph date is never event time; Post != Event", async () => {
  const p = await run({ legacyGraphOccurredAt: "2024-09-29T06:29:04Z" });
  assert.equal(p.event.occurred_at, null);
  assert.equal(p.event.published_at, post.date);
  assert.equal(p.event.canonical, false);
  assert.equal(p.event.minted, false);
  assert.equal(p.event.graph_node_id, null);
  assert.equal(p.golden.legacy_graph_occurred_at.consumed_as_event_time, false);
  assert.notEqual(p.event.key, `post:${post.id}`);
  const tl = projectEventContextForSurface(p, EVENT_SURFACE.TIMELINE);
  assert.ok(!tl.entries.some(e => e.axis === "occurred_at"));
  const sourced = await run({ occurredAt: { at: "2024-09-27", source_ref: "src:independent" } });
  assert.equal(sourced.event.occurred_at, "2024-09-27");
  assert.notEqual(sourced.event.occurred_at, sourced.event.published_at);
});

test("alternate observation: separate source finding, default reading and ids unchanged, deeper prominence", async () => {
  const base = await run();
  const alt = await run({ alternateObservation: { display: "19:05", day_ordinal: 359, source_ref: "ext:caller-supplied", attribution: { role: "source_work", display_name: "Caller Source" }, verification_state: "not_tested", discrepancy_status: "unreconciled" } });
  const f = find(alt, alt.golden.alternate_observation_finding_id);
  assert.equal(f.evidence.facts[0].overrides_approved_reading, false);
  assert.equal(f.evidence.facts[0].discrepancy.explain_why, "מקור נוסף מציג זמן אחר");
  assert.equal(f.evidence.facts[0].attribution.display_name, "Caller Source");
  assert.equal(f.projection.dimensions.prominence, "depth");
  for (const k of ["clock_occurrence_finding_id", "day_ordinal_finding_id", "engine_trace_finding_id", "interpretation_finding_id"]) assert.equal(alt.golden[k], base.golden[k]);
  assert.deepEqual(alt.golden.representations, base.golden.representations);
  assert.deepEqual(alt.golden.default_reading_ids.sort(), base.golden.default_reading_ids.sort());
  assert.ok(alt.golden.depth_reading_ids.includes(f.id));
  assert.ok(!alt.golden.default_reading_ids.includes(f.id));
  const n = projectEventContextForSurface(alt, EVENT_SURFACE.NUMBER, { number: 358 });
  assert.ok(!n.finding_ids.includes(f.id));
  // governance actor can never be attribution
  const bad = await run({ alternateObservation: { display: "x", source_ref: "s", attribution: { role: "source_work", display_name: "צוריאל" } } });
  assert.equal(bad.golden.alternate_observation_finding_id, null);
});

test("same finding ids across all surfaces; bounded; no per-surface copies; no source-name branches", async () => {
  const p = await run();
  const all = new Set(p.bundle.findings.map(f => f.id));
  for (const s of Object.values(EVENT_SURFACE)) {
    const v = projectEventContextForSurface(p, s, { number: 1820 });
    for (const id of v.finding_ids) assert.ok(all.has(id), `${s}:${id}`);
    assert.ok(v.returned_count <= (s === "world" ? 40 : 12));
  }
  assert.equal(projectEventContextForSurface(p, EVENT_SURFACE.RAZIEL).raziel.can_canonicalize, false);
  assert.equal(projectEventContextForSurface(p, EVENT_SURFACE.FOLLOW).recommendation.auto_follow, false);
  const again = await run();
  assert.deepEqual(again.bundle.findings.map(f => f.id), p.bundle.findings.map(f => f.id));
  assert.ok(Object.values(p.invariants).every(v => v === true));
});
