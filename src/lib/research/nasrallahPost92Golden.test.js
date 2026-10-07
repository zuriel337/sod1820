import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_SURFACE, projectEventContextForSurface } from "./eventObservationCompiler.js";
import { compileNasrallahPost92Golden } from "./nasrallahPost92Golden.js";
import { applyMomentClockLaw, normalizeClockObservation, clockRepresentations } from "./momentClockSystemMethod.js";
import { gematriaTraceToFinding } from "./gematriaTrace.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { VERIFIED_AUTHORITY_SOURCE } from "./researchPlanV2.js";

const post = { id: 92, slug: "post-92", date: "2024-09-29T06:29:04Z" };
const clock = { display: "18:20", hour: 18, minute: 20, timezone: "Asia/Beirut", context: "site approved reading", source_ref: "post:92", accessTier: "public" };
const day = { ordinal: 358, counting_context: "day of the war (source claim)", source_ref: "post:92", accessTier: "public" };
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
  const alt = await run({ alternateObservation: { display: "19:05", day_ordinal: 359, source_ref: "ext:caller-supplied", accessTier: "public", attribution: { role: "source_work", display_name: "Caller Source" }, verification_state: "not_tested", discrepancy_status: "unreconciled" } });
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
  const bad = await run({ alternateObservation: { display: "x", source_ref: "s", accessTier: "public", attribution: { role: "source_work", display_name: "צוריאל" } } });
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

// ── REV1: existing research_objects as CONTEXT (no verification upgrade, access-governed) ──
const RO_14F = "14f1df64-8152-419d-938f-859193a41f90";
const ro14f = { id: RO_14F, kind: "relation", status: "candidate", privacy_scope: "private", statement: "compound relation", value: 1820, engine_detail: {}, created_at: "2026-09-01T00:00:00Z" };
const roPublic = { id: "95e00000-0000-4000-8000-000000000001", kind: "claim", status: "public_candidate", privacy_scope: "public_candidate", statement: "public candidate", value: 358, engine_detail: {} };
const attested = { authority_source: VERIFIED_AUTHORITY_SOURCE.ADMIN_RPC, allowed_access_tiers: ["public", "public_candidate", "private"] };

test("REV1-A: private research_object absent under default access; capability_trace reports access_filtered", async () => {
  const p = await run({ contextResearchObjects: [ro14f] });
  assert.ok(!p.bundle.findings.some(f => f.identity?.sourceIdentity?.researchObjectId === RO_14F));
  const cap = p.bundle.capability_trace.find(c => c.key === "event_research_context");
  assert.ok(cap, "capability present in trace");
  assert.equal(cap.access_filtered.count, 1);
});

test("REV1-B: attested private descriptor admits SAME row; verification not fabricated", async () => {
  const p = await run({ contextResearchObjects: [ro14f], accessDescriptor: attested });
  const f = p.bundle.findings.find(x => x.identity?.sourceIdentity?.researchObjectId === RO_14F);
  assert.ok(f, "row admitted under attested private access");
  assert.equal(f.verification.verification_state, null);
  assert.equal(f.status, "candidate");
  assert.equal(f.projection.dimensions.eventMemberType, "research_context");
  assert.ok(!f.projection.anchors.some(a => a.space === "number"), "no number anchor from row.value");
  const o = p.bundle.finding_outcomes.find(x => x.finding_id === f.id);
  assert.notEqual(o.evidence_relation, "independent_evidence");
});

test("REV1-C: same research-object Finding id (== canonical adapter id) on all event surfaces; no Number", async () => {
  const p = await run({ contextResearchObjects: [ro14f], accessDescriptor: attested });
  const id = researchObjectToUniversalFinding(ro14f).id;
  for (const s of [EVENT_SURFACE.POST, EVENT_SURFACE.TIMELINE, EVENT_SURFACE.CONTEXT_RAIL, EVENT_SURFACE.WORLD, EVENT_SURFACE.RAZIEL, EVENT_SURFACE.FOLLOW]) {
    assert.ok(projectEventContextForSurface(p, s).finding_ids.includes(id), s);
  }
  assert.ok(!projectEventContextForSurface(p, EVENT_SURFACE.NUMBER, { number: 1820 }).finding_ids.includes(id));
});

test("REV1-D: duplicate row yields one Finding; public_candidate governed by descriptor; base ids unchanged", async () => {
  const base = await run();
  const dup = await run({ contextResearchObjects: [ro14f, ro14f, roPublic], accessDescriptor: attested });
  assert.equal(dup.bundle.findings.filter(f => f.identity?.sourceIdentity?.researchObjectId === RO_14F).length, 1);
  const deflt = await run({ contextResearchObjects: [roPublic] });
  assert.ok(!deflt.bundle.findings.some(f => f.identity?.sourceIdentity?.researchObjectId === roPublic.id));
  for (const k of ["clock_occurrence_finding_id", "day_ordinal_finding_id", "engine_trace_finding_id", "interpretation_finding_id"]) assert.equal(dup.golden[k], base.golden[k]);
});


// ── REV2: explicit temporal access inheritance + output scrub ──
const adminAll = { authority_source: VERIFIED_AUTHORITY_SOURCE.ADMIN_RPC, allowed_access_tiers: ["public", "public_candidate", "private", "personal"] };
const PRIV_REF = "private-diary:SECRET-77";
const privClock = { ...clock, source_ref: PRIV_REF, accessTier: "private" };
const privDay = { ...day, source_ref: PRIV_REF, accessTier: "private" };
const privAlt = { display: "19:05", day_ordinal: 359, source_ref: PRIV_REF, accessTier: "private", attribution: { role: "source_work", display_name: "Caller Source" } };

test("REV2-A: public Post92 unchanged (18:20 -> 1820/620, day 358, משיח=358, interpretation visible)", async () => {
  const p = await run();
  assert.deepEqual(p.golden.approved_reading, { clock: "18:20", clock_24h_concat: 1820, day_ordinal: 358 });
  assert.deepEqual(p.golden.representations.map(r => r.output).sort(), [1820, 620]);
  assert.ok(p.golden.interpretation_finding_id);
  assert.equal(find(p, p.golden.interpretation_finding_id).access.tier, "public");
  assert.equal(find(p, p.golden.engine_trace_finding_id).verification.engine_result, 358);
  assert.equal(p.golden.refusals.length, 0);
  assert.equal(find(p, p.golden.clock_occurrence_finding_id).access.tier, "public");
  for (const r of p.golden.representations) assert.equal(find(p, r.finding_id).access.tier, "public");
  const cap = p.bundle.capability_trace.find(c => c.key === "moment_clock_applications");
  assert.equal(cap.access_class, "source_access_controlled");
  assert.deepEqual(cap.source_refs, ["post:92"]);
});

test("REV2-B: private clock leaks nothing publicly; attested admin sees same ids with tier", async () => {
  const pub = await run({ clockObservation: privClock });
  const s = JSON.stringify(pub);
  assert.ok(!s.includes(PRIV_REF));
  assert.equal(pub.golden.clock_occurrence_finding_id, null);
  assert.deepEqual(pub.golden.representations, []);
  assert.equal(pub.golden.interpretation_finding_id, null);
  assert.deepEqual([pub.golden.approved_reading.clock, pub.golden.approved_reading.clock_24h_concat], [null, null]);
  assert.equal(pub.golden.approved_reading.day_ordinal, 358);
  assert.ok(!pub.bundle.findings.some(f => ["clock_time", "number"].includes(f.subject.type) && f.source?.method === "moment_clock_law"));
  assert.ok(!pub.bundle.findings.some(f => f.kind === "event-site-interpretation"));
  const adm = await run({ clockObservation: privClock, accessDescriptor: adminAll });
  const ref = await run({ clockObservation: privClock });
  assert.ok(adm.golden.clock_occurrence_finding_id && adm.golden.interpretation_finding_id);
  assert.equal(find(adm, adm.golden.clock_occurrence_finding_id).access.tier, "private");
  for (const r of adm.golden.representations) assert.equal(find(adm, r.finding_id).access.tier, "private");
  assert.equal(find(adm, adm.golden.interpretation_finding_id).access.tier, "private");
  assert.equal(adm.golden.clock_occurrence_finding_id, (await run({ clockObservation: privClock, accessDescriptor: adminAll })).golden.clock_occurrence_finding_id);
  assert.ok(ref);
});

test("REV2-C: private day leaks nothing publicly; admin sees", async () => {
  const pub = await run({ dayOrdinal: privDay });
  assert.ok(!JSON.stringify(pub).includes(PRIV_REF));
  assert.equal(pub.golden.day_ordinal_finding_id, null);
  assert.equal(pub.golden.approved_reading.day_ordinal, null);
  assert.equal(pub.golden.interpretation_finding_id, null);
  assert.ok(!pub.bundle.findings.some(f => f.subject.type === "day_ordinal" || f.kind === "event-site-interpretation"));
  assert.equal(pub.golden.approved_reading.clock, "18:20");
  const adm = await run({ dayOrdinal: privDay, accessDescriptor: adminAll });
  assert.equal(adm.golden.approved_reading.day_ordinal, 358);
  assert.ok(adm.golden.day_ordinal_finding_id && adm.golden.interpretation_finding_id);
  assert.equal(find(adm, adm.golden.day_ordinal_finding_id).access.tier, "private");
});

test("REV2-D: private alternate absent publicly incl. metadata/depth; admin sees", async () => {
  const pub = await run({ alternateObservation: privAlt });
  assert.ok(!JSON.stringify(pub).includes(PRIV_REF));
  assert.equal(pub.golden.alternate_observation_finding_id, null);
  const base = await run();
  assert.deepEqual(pub.golden.depth_reading_ids.sort(), base.golden.depth_reading_ids.sort());
  const adm = await run({ alternateObservation: privAlt, accessDescriptor: adminAll });
  assert.ok(adm.golden.alternate_observation_finding_id);
  assert.ok(adm.golden.depth_reading_ids.includes(adm.golden.alternate_observation_finding_id));
  assert.equal(find(adm, adm.golden.alternate_observation_finding_id).access.tier, "private");
});

test("REV2-E: missing/invalid tier fails closed for clock/day/alternate", async () => {
  for (const bad of [undefined, null, "", "secret", "PUBLIC", "internal"]) {
    assert.equal(normalizeClockObservation({ ...clock, accessTier: bad }).ok, false, String(bad));
    const p = await run({ clockObservation: { ...clock, accessTier: bad }, dayOrdinal: { ...day, accessTier: bad }, alternateObservation: { ...privAlt, accessTier: bad } });
    assert.deepEqual(p.golden.refusals.map(r => r.part).sort(), ["alternate_observation", "clock_occurrence", "day_ordinal", "site_interpretation"]);
    assert.equal(p.golden.clock_occurrence_finding_id, null);
    assert.equal(p.golden.day_ordinal_finding_id, null);
    assert.equal(p.golden.alternate_observation_finding_id, null);
  }
});

test("REV2-F: site interpretation tier is the most restrictive parent", async () => {
  for (const tier of ["public_candidate", "private", "personal"]) {
    const adm = await run({ dayOrdinal: { ...day, accessTier: tier }, accessDescriptor: adminAll });
    assert.equal(find(adm, adm.golden.interpretation_finding_id).access.tier, tier);
    const pub = await run({ dayOrdinal: { ...day, accessTier: tier } });
    assert.equal(pub.golden.interpretation_finding_id, null);
  }
  const mixed = await run({ clockObservation: { ...clock, accessTier: "private" }, dayOrdinal: { ...day, accessTier: "personal" }, accessDescriptor: adminAll });
  assert.equal(find(mixed, mixed.golden.interpretation_finding_id).access.tier, "personal");
  // descriptor allowing private but not personal filters the personal-derived interpretation
  const noPersonal = await run({ dayOrdinal: { ...day, accessTier: "personal" }, clockObservation: { ...clock, accessTier: "private" }, accessDescriptor: attested });
  assert.equal(noPersonal.golden.interpretation_finding_id, null);
  assert.equal(noPersonal.golden.approved_reading.day_ordinal, null);
});

test("REV2-H: no source-name branches in temporal adapters", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["momentClockSystemMethod.js", "nasrallahPost92Golden.js"]) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    assert.ok(!/(===|==|!==)\s*["'`](post:92|NASRALLAH)/.test(src), f);
  }
});
