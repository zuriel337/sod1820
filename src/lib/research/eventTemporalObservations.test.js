import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_MEMBER_TYPE as T, EVENT_SURFACE, projectEventContextForSurface } from "./eventObservationCompiler.js";
import { compileEventTemporalObservation, mostRestrictiveTier } from "./eventTemporalObservations.js";
import { applyMomentClockLaw } from "./momentClockSystemMethod.js";
import { createCanonicalNumberW2Executors } from "./researchW2ExecutorsBase.js";
import { gematriaTraceToFinding } from "./gematriaTrace.js";

const numericOperators = createCanonicalNumberW2Executors({
  supabase: { rpc: async () => ({ data: { applicable: false }, error: null }) },
  numericRuleVersions: async () => ({ shitat_haechad_alef_law: 1, zero_navigation: 1, zero_scale_law: 1 }),
}).numeric_operators;

const candidate = { key: "NASRALLAH_STRIKE", label: "Nasrallah strike" }; // no occurred_at: never borrowed
const post = { id: 92, slug: "post-92", date: "2024-09-29T06:29:04Z" };
const postClaim = { key: "post92-clock", accessTier: "public", role: "source_claim", source_ref: "post:92", original_display: "החיסול אירע בשעה 18:20", local_time: "18:20", timezone: "Asia/Jerusalem", clock_format: "24h", selected: true, attribution: { role: "site_interpretation", display_name: "כי לה׳ המלוכה" } };
const idf = { key: "idf-clock", accessTier: "public", role: "later_authoritative_source", source_ref: "https://www.idf.il/310591", original_display: "18:21", local_time: "18:21", timezone: "Asia/Jerusalem", clock_format: "24h", local_date: "2024-09-27", verification_state: "authoritative_unreviewed" };
const ordinal = { key: "war-day", accessTier: "public", ordinal: 358, unit: "day", epoch_label: "war", source_wording: "יום ה-358 ללחימה = משיח", source_ref: "post:92" };
const messiah = { type: T.EXPRESSION_MATCH, expression: "משיח", method_key: "רגיל", claimed_value: 358, source_ref: "post:92" };
const traceFor = (m) => (m.expression === "משיח" ? gematriaTraceToFinding({ status: "ok", method_key: "רגיל", input: "משיח", result: 358, method_version: "fixture-v1" }, { inputText: "משיח", createdAt: "2026-10-06T00:00:00Z" }) : null);

const run = (over = {}) => compileEventTemporalObservation({
  candidate, post, members: [messiah], numericOperators, receiptResolver: traceFor,
  temporalObservations: [postClaim, idf], reportedOrdinals: [ordinal], momentClockRuleVersion: 2, ...over,
});

test("moment law: 18:20 -> 1820 (24h) and 620 (12h); deterministic", () => {
  const r = applyMomentClockLaw(postClaim);
  assert.deepEqual(r.representations.map(x => [x.representation, x.value]), [["CLOCK_24H_CONCAT", 1820], ["CLOCK_12H_CONCAT", 620]]);
  assert.deepEqual(applyMomentClockLaw(postClaim), r);
  assert.deepEqual(applyMomentClockLaw(idf).representations.map(x => x.value), [1821, 621]);
});

test("moment law fails closed: ambiguity, missing tz/source/display, malformed, mismatch", () => {
  const base = { original_display: "3:58", local_time: "3:58", timezone: "Asia/Jerusalem", source_ref: "x" };
  assert.equal(applyMomentClockLaw(base).reason, "CONTEXT_REQUIRED");
  assert.equal(applyMomentClockLaw({ ...base, meridiem: "PM" }).representations[0].value, 1558);
  assert.equal(applyMomentClockLaw({ ...base, clock_format: "12h" }).reason, "CONTEXT_REQUIRED");
  assert.equal(applyMomentClockLaw({ ...base, timezone: null }).reason, "timezone_missing");
  assert.equal(applyMomentClockLaw({ ...base, source_ref: "" }).reason, "source_ref_missing");
  assert.equal(applyMomentClockLaw({ ...base, original_display: "" }).reason, "original_display_missing");
  assert.equal(applyMomentClockLaw({ ...base, original_display: "4:58", meridiem: "AM" }).reason, "original_display_does_not_match_local_time");
  assert.equal(applyMomentClockLaw({ ...base, local_time: "25:00", original_display: "25:00" }).reason, "local_time_malformed");
  assert.equal(applyMomentClockLaw({ ...base, local_time: "15:58:10", original_display: "15:58:10" }).reason, "local_time_malformed");
  assert.equal(applyMomentClockLaw(null).reason, "temporal_observation_invalid");
  // leading zero kept as display digits only
  const z = applyMomentClockLaw({ original_display: "04:24", local_time: "04:24", timezone: "Asia/Jerusalem", source_ref: "x", clock_format: "24h" });
  assert.deepEqual([z.representations[0].display_digits, z.representations[0].value], ["0424", 424]);
});

test("12h / 24h boundary hours", () => {
  const mk = (t, extra) => applyMomentClockLaw({ original_display: t, local_time: t, timezone: "UTC", source_ref: "x", ...extra }).representations.map(r => r.value);
  assert.deepEqual(mk("0:05"), [5, 1205]);
  assert.deepEqual(mk("12:30", { clock_format: "24h" }), [1230, 1230]);
});

test("Post92 claim keeps 18:20 -> 1820/620 as SAME_OCCURRENCE derivations (never independent)", async () => {
  const pack = await run();
  const reps = pack.temporal.representations.filter(r => r.occurrence.endsWith("post92-clock"));
  assert.deepEqual(reps.map(r => r.value).sort((a, b) => a - b), [620, 1820]);
  for (const r of reps) {
    const f = pack.bundle.findings.find(x => x.id === r.finding_id);
    const fact = f.evidence.facts[0];
    assert.equal(fact.rule_id, "moment_clock_law");
    assert.equal(fact.rule_version, 2);
    assert.equal(fact.dependency_class, "SAME_OCCURRENCE_DERIVATION");
    assert.equal(fact.independent_evidence, false);
    assert.equal(f.source.adapter, "numeric-rule-application-v1");
    assert.equal(pack.bundle.finding_outcomes.find(o => o.finding_id === r.finding_id).evidence_relation, "derivation");
  }
  for (const o of pack.bundle.finding_outcomes) assert.notEqual(o.evidence_relation, "independent_evidence");
});

test("no attested rule version -> no rule application (never defaulted)", async () => {
  const pack = await run({ momentClockRuleVersion: null });
  assert.equal(pack.temporal.representations.length, 0);
  assert.ok(pack.temporal.rejected.some(r => r.reason === "rule_version_not_attested"));
  assert.equal(pack.temporal.observations.length, 2);
});

test("IDF 18:21 coexists as later source; 18:20 not erased; conflict explicit and unresolved", async () => {
  const pack = await run();
  const obs = pack.temporal.observations;
  assert.deepEqual(obs.map(o => [o.key, o.local_time, o.presentation]), [["post92-clock", "18:20", "primary"], ["idf-clock", "18:21", "depth"]]);
  const c = pack.bundle.findings.find(f => f.id === pack.temporal.conflict_finding_id);
  const fact = c.evidence.facts[0];
  assert.equal(fact.state, "unresolved_source_conflict");
  assert.equal(fact.resolution, null);
  assert.equal(fact.overwritten, false);
  assert.deepEqual(fact.differing, ["local_time"]);
  assert.equal(fact.observations.length, 2);
  assert.ok(pack.temporal.representations.some(r => r.value === 1821));
  assert.ok(pack.temporal.representations.some(r => r.value === 1820));
  const only = await run({ temporalObservations: [postClaim] });
  assert.equal(only.temporal.conflict_finding_id, null);
});

test("PublishedAt never becomes OccurredAt; candidate stays non-canonical", async () => {
  const pack = await run();
  assert.equal(pack.event.occurred_at, null);
  assert.equal(pack.event.published_at, "2024-09-29T06:29:04Z");
  assert.equal(pack.event.canonical, false);
  const tl = projectEventContextForSurface(pack, EVENT_SURFACE.TIMELINE);
  assert.ok(!tl.entries.some(e => e.axis === "occurred_at"));
  for (const id of pack.temporal.observations.map(o => o.finding_id)) {
    assert.equal(pack.bundle.findings.find(f => f.id === id).evidence.facts[0].published_at_is_occurrence, false);
  }
});

test("reported day ordinal stays a typed ordinal; Number 358 is an anchor only; unresolved convention", async () => {
  const pack = await run();
  const o = pack.bundle.findings.find(f => f.kind === "event-reported-ordinal");
  assert.equal(o.subject.type, "day_ordinal");
  assert.equal(o.subject.value, null);
  const fact = o.evidence.facts[0];
  assert.equal(fact.origin, "reported_ordinal");
  assert.equal(fact.counting_convention_state, "unresolved");
  assert.equal(fact.is_fact, false);
  assert.deepEqual([fact.number_anchor.gematria_result, fact.number_anchor.corroborates_number], [false, false]);
  assert.ok(o.projection.anchors.some(a => a.space === "number" && a.id === "358"));
  // wording without the value -> no anchor
  const noAnchor = await run({ reportedOrdinals: [{ ...ordinal, source_wording: "היום ה-n ללחימה" }] });
  const o2 = noAnchor.bundle.findings.find(f => f.kind === "event-reported-ordinal");
  assert.ok(!o2.projection.anchors.some(a => a.space === "number"));
  assert.equal(o2.evidence.facts[0].number_anchor, null);
  // invalid ordinal / missing provenance fail closed
  const bad = await run({ reportedOrdinals: [{ ...ordinal, source_ref: null }, { ...ordinal, key: "b", ordinal: "x" }, { ...ordinal, key: "c", source_wording: null }] });
  assert.equal(bad.bundle.findings.filter(f => f.kind === "event-reported-ordinal").length, 0);
  assert.equal(bad.temporal.rejected.length, 3);
});

test("משיח=358 only with canonical Trace; ordinal 358 meets engine 358 in a typed convergence card", async () => {
  const pack = await run();
  const engine = pack.bundle.findings.find(f => f.subject.type === "expression");
  assert.equal(engine.verification.engine_result, 358);
  assert.equal(engine.source.engine, "gematria");
  const card = pack.bundle.findings.find(f => f.id === pack.temporal.convergence_finding_ids[0]);
  const fact = card.evidence.facts[0];
  assert.deepEqual(fact.members.map(m => m.origin_role), ["reported_ordinal", "engine_gematria_result"]);
  assert.equal(fact.ordinal_was_calculated_by_gematria, false);
  assert.equal(fact.independent_evidence, false);
  const out = pack.bundle.finding_outcomes.find(o => o.finding_id === card.id);
  assert.equal(out.evidence_relation, "convergence");
  // no receipt -> no verified משיח and no convergence card
  const none = await run({ receiptResolver: () => null });
  assert.equal(none.bundle.findings.filter(f => f.subject.type === "expression").length, 0);
  assert.equal(none.temporal.convergence_finding_ids.length, 0);
  // ordinal alone never creates a Gematria result
  assert.ok(!none.bundle.findings.some(f => f.source?.engine === "gematria"));
});

test("1820 is clock-derived only; 358 clock-ordinal-engine are distinct identities", async () => {
  const pack = await run();
  const ids = [pack.bundle.findings.find(f => f.kind === "event-reported-ordinal").id, pack.bundle.findings.find(f => f.subject.type === "expression").id];
  assert.equal(new Set(ids).size, 2);
  const clock1820 = pack.bundle.findings.find(f => f.kind === "numeric-operator" && f.subject.value === 1820);
  assert.equal(clock1820.evidence.facts[0].output.representation, "CLOCK_24H_CONCAT");
  assert.equal(clock1820.provenance.parentFindingIds.length, 1);
});

test("attribution preserved: site interpretation vs source; governance actor refused", async () => {
  const pack = await run();
  const obs = pack.bundle.findings.find(f => f.identity.sourceIdentity?.observation === "post92-clock");
  assert.equal(obs.evidence.facts[0].attribution.display_name, "כי לה׳ המלוכה");
  const bad = await run({ temporalObservations: [{ ...postClaim, attribution: { role: "source_work", display_name: "צוריאל" } }] });
  assert.equal(bad.temporal.observations.length, 0);
  assert.equal(bad.temporal.rejected[0].reason, "governance_actor_is_not_attribution");
});

test("same finding ids project through Post / Number / Date-Event / Context Rail / World / Raziel; bounded", async () => {
  const pack = await run();
  const post92 = projectEventContextForSurface(pack, EVENT_SURFACE.POST);
  const rail = projectEventContextForSurface(pack, EVENT_SURFACE.CONTEXT_RAIL);
  const num = projectEventContextForSurface(pack, EVENT_SURFACE.NUMBER, { number: 1820 });
  const n358 = projectEventContextForSurface(pack, EVENT_SURFACE.NUMBER, { number: 358 });
  const world = projectEventContextForSurface(pack, EVENT_SURFACE.WORLD);
  assert.ok(num.finding_ids.length >= 1);
  assert.ok(n358.finding_ids.length >= 2);
  assert.ok(post92.finding_ids.length >= 1);
  for (const s of [post92, rail, num, n358, world]) for (const id of s.finding_ids) assert.ok(pack.bundle.findings.some(f => f.id === id));
  assert.equal(projectEventContextForSurface(pack, EVENT_SURFACE.RAIL ?? EVENT_SURFACE.CONTEXT_RAIL, { limit: 2 }).finding_ids.length, 2);
  // no clock finding is anchored as a Number other than its derived representation values
  assert.ok(pack.bundle.findings.filter(f => f.kind === "event-source-occurrence-observation").every(f => !f.projection.anchors.some(a => a.space === "number")));
});

test("malformed / ambiguous observations rejected without poisoning valid ones", async () => {
  const pack = await run({ temporalObservations: [postClaim, { ...idf, key: "amb", local_time: "6:20", original_display: "6:20", clock_format: undefined }, { ...postClaim, key: "post92-clock" }, { ...idf, key: "x", role: "weird" }] });
  assert.deepEqual(pack.temporal.observations.map(o => o.key), ["post92-clock"]);
  assert.deepEqual(pack.temporal.rejected.map(r => r.reason), ["CONTEXT_REQUIRED", "duplicate_observation_key", "observation_role_unknown"]);
});

// ── ACCESS REV1: explicit source tier, inheritance, fail-closed, restrictive conflict/convergence ──
const ADMIN = { authority_source: "admin_rpc", admin: true, authenticated: true, allowed_access_tiers: ["public", "private"] };
const privObs = { ...idf, key: "priv-clock", accessTier: "private", source_ref: "private:secret-source-77", original_display: "18:22", local_time: "18:22" };
const dump = (x) => JSON.stringify(x);

test("access: private clock observation omitted for default/public descriptor, visible for attested admin", async () => {
  const pub = await run({ temporalObservations: [postClaim, privObs] });
  assert.ok(!pub.temporal.observations.some(o => o.key === "priv-clock"));
  assert.ok(!pub.bundle.findings.some(f => f.identity.sourceIdentity?.observation === "priv-clock"));
  assert.ok(!pub.temporal.representations.some(r => r.occurrence.endsWith("priv-clock")));
  assert.ok(!dump(pub).includes("secret-source-77"));
  const adm = await run({ temporalObservations: [postClaim, privObs], accessDescriptor: ADMIN });
  assert.ok(adm.temporal.observations.some(o => o.key === "priv-clock"));
  const f = adm.bundle.findings.find(x => x.identity.sourceIdentity?.observation === "priv-clock");
  assert.equal(f.access.tier, "private");
  const rules = adm.bundle.findings.filter(x => x.kind === "numeric-operator" && x.provenance.parentFindingIds.includes(f.id));
  assert.ok(rules.length === 2 && rules.every(x => x.access.tier === "private"));
});

test("access: mixed public+private conflict is not visible publicly and leaks no private source_ref/time", async () => {
  const pub = await run({ temporalObservations: [postClaim, privObs] });
  assert.equal(pub.temporal.conflict_finding_id, null);
  assert.equal(pub.temporal.conflict_state, null);
  assert.ok(!pub.bundle.findings.some(f => f.kind === "event-occurrence-conflict"));
  const text = dump(pub);
  assert.ok(!text.includes("secret-source-77") && !text.includes("18:22") && !text.includes("1822"));
  const adm = await run({ temporalObservations: [postClaim, privObs], accessDescriptor: ADMIN });
  const c = adm.bundle.findings.find(f => f.kind === "event-occurrence-conflict");
  assert.equal(c.access.tier, "private");
  // public+public conflict unchanged
  const pp = await run();
  assert.equal(pp.bundle.findings.find(f => f.kind === "event-occurrence-conflict").access.tier, "public");
});

test("access: private day ordinal + public engine 358 yields no public ordinal/convergence leak", async () => {
  const pub = await run({ reportedOrdinals: [{ ...ordinal, accessTier: "private", source_ref: "private:ordinal-src" }] });
  assert.ok(!pub.bundle.findings.some(f => f.kind === "event-reported-ordinal" || f.kind === "event-ordinal-engine-convergence"));
  assert.equal(pub.temporal.reported_ordinals.length, 0);
  assert.equal(pub.temporal.convergence_finding_ids.length, 0);
  assert.ok(!dump(pub).includes("ordinal-src"));
  assert.ok(pub.bundle.findings.some(f => f.subject.type === "expression")); // public engine 358 stays
  const adm = await run({ reportedOrdinals: [{ ...ordinal, accessTier: "private" }], accessDescriptor: ADMIN });
  const card = adm.bundle.findings.find(f => f.kind === "event-ordinal-engine-convergence");
  assert.equal(card.access.tier, "private");
  assert.equal(adm.bundle.findings.find(f => f.kind === "event-reported-ordinal").access.tier, "private");
});

test("access: missing or unrecognised tier fails closed (rejected, nothing emitted)", async () => {
  const noTier = { ...postClaim, key: "nt" }; delete noTier.accessTier;
  const bad = { ...idf, key: "bad", accessTier: "world" };
  const noOrd = { ...ordinal }; delete noOrd.accessTier;
  const pack = await run({ temporalObservations: [noTier, bad], reportedOrdinals: [noOrd] });
  assert.deepEqual(pack.temporal.rejected.map(r => r.reason), ["access_tier_missing", "access_tier_invalid", "access_tier_missing"]);
  assert.equal(pack.temporal.observations.length, 0);
  assert.ok(!pack.bundle.findings.some(f => f.kind.startsWith("event-") && f.kind !== "event-candidate" && /occurrence|ordinal/.test(f.kind)));
});

test("access: combiner is most-restrictive and fails closed on unknown tiers", () => {
  assert.equal(mostRestrictiveTier(["public", "public"]), "public");
  assert.equal(mostRestrictiveTier(["public", "private"]), "private");
  assert.equal(mostRestrictiveTier(["private", "personal"]), "personal");
  assert.equal(mostRestrictiveTier(["public", "weird"]), "private");
  assert.equal(mostRestrictiveTier([]), "private");
});

test("access: public Post92/IDF fixtures remain fully visible with public tier", async () => {
  const pack = await run();
  assert.equal(pack.temporal.observations.length, 2);
  assert.equal(pack.temporal.representations.length, 4);
  assert.ok(pack.temporal.conflict_finding_id && pack.temporal.convergence_finding_ids.length === 1 && pack.temporal.reported_ordinals.length === 1);
  for (const f of pack.bundle.findings.filter(x => /occurrence|ordinal/.test(x.kind) || x.source.adapter === "numeric-rule-application-v1")) assert.equal(f.access.tier, "public");
});
