import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_SURFACE } from "./eventObservationCompiler.js";
import { compileEventTemporalObservation } from "./eventTemporalObservations.js";
import { createCanonicalNumberW2Executors } from "./researchW2ExecutorsBase.js";
import {
  composeEventFamilyContext,
  selectEventFamilyContext as select,
  selectEventFamilyForMember as forMember,
} from "./eventFamilyContextProjection.js";
import { OCT7_LANES, OCT7_FAMILY, buildOct7FamilyInput } from "./eventFamilyOct7Descriptor.js";

const numericOperators = createCanonicalNumberW2Executors({
  supabase: { rpc: async () => ({ data: { applicable: false }, error: null }) },
  numericRuleVersions: async () => ({ shitat_haechad_alef_law: 1, zero_navigation: 1, zero_scale_law: 1 }),
}).numeric_operators;

const A = { accessDescriptor: { allowed_access_tiers: ["public"] } };
const AUTH = { accessDescriptor: { authority_source: "admin_rpc", admin: true, authenticated: true, allowed_access_tiers: ["public", "private"] } };
const clock = (key, ref, disp, time, role, tier = "public", extra = {}) => ({ key, accessTier: tier, role, source_ref: ref, original_display: disp, local_time: time, timezone: "Asia/Jerusalem", clock_format: "24h", ...extra });

const packFor = (candidate, post, temporalObservations, over = {}) => compileEventTemporalObservation({
  candidate, post, members: [], numericOperators, temporalObservations, momentClockRuleVersion: 2, ...A, ...over,
});

// Root hub pack: Post233 claim 06:30, IDF 06:30, IDF history study 06:29 — coexist, unresolved.
const rootPack = (opts = {}) => packFor({ key: "OCT7" }, { id: 233, date: "2022-12-18" }, [
  clock("post233", "post:233", "06:30", "06:30", "source_claim"),
  clock("idf-0630", "https://www.idf.il/oct7-statement", "06:30", "06:30", "later_authoritative_source"),
  clock("idf-0629", "https://www.idf.il/296392", "06:29", "06:29", "later_authoritative_source"),
], opts);
const nasrallahPack = (tier = "public") => packFor({ key: "NASRALLAH_STRIKE" }, { id: 92 }, [
  clock("post92-clock", "post:92", "18:20", "18:20", "source_claim", tier),
  clock("idf-clock", "https://www.idf.il/310591", "18:21", "18:21", "later_authoritative_source", tier, { local_date: "2024-09-27" }),
], opts_(tier));
function opts_(tier) { return tier === "private" ? AUTH : {}; }
const fz = () => packFor({ key: "FZ1073", occurred_at: "2026-09-30", occurred_at_source_ref: "post:5112" }, { id: 5112, date: "2026-10-01" }, []);

const input = async (over = {}) => {
  const packs = { 233: await rootPack(), 92: await nasrallahPack(over.tier92 ?? "public"), 5112: await fz() };
  return buildOct7FamilyInput({
    tierFor: (id) => ((over.privateIds ?? []).includes(id) ? "private" : "public"),
    rootTier: "public",
    rootDates: { date: "2022-12-18", modified: "2024-03-15" },
    packs,
  });
};
const compose = async (access = A, over = {}) => composeEventFamilyContext({ ...(await input(over)), ...access });

test("1 family projection is a non-canonical query-time key; no identity minted", async () => {
  const b = await compose();
  assert.equal(b.family.canonical, false);
  assert.equal(b.family.graph_node_id, null);
  assert.equal(b.family.query_time_projection, true);
  assert.equal(b.family.minted, false);
  assert.ok(b.members.every(m => m.canonical === false && m.minted_event_identity === false));
  assert.deepEqual(b.family.entity_refs.map(e => e.node_id), OCT7_FAMILY.entity_refs.map(e => e.node_id));
});

test("2 Post233 dates stay representation metadata, never occurrence", async () => {
  const b = await compose();
  assert.equal(b.root.representation_dates.is_occurrence, false);
  assert.equal(b.root.representation_dates.published_at, "2022-12-18");
  assert.ok(!b.chronology.some(e => /2022-12-18|2024-03-15/.test(e.at)));
  const t = select(b, EVENT_SURFACE.TIMELINE);
  assert.ok(!t.entries.some(e => /2022|2024-03/.test(e.at)));
  assert.equal(t.representation_dates.axis, "representation");
});

test("3 06:30 and 06:29 coexist with unresolved conflict; 630 only via moment_clock_law; no 63", async () => {
  const b = await compose();
  const ev = b.occurrence_evidence.find(e => e.member_ref === "post:233");
  assert.deepEqual(ev.observations.map(o => o.local_time).sort(), ["06:29", "06:30", "06:30"]);
  assert.equal(ev.conflict_state, "unresolved_source_conflict");
  const vals = ev.representations.map(r => r.value);
  assert.ok(vals.includes(630) && vals.includes(629));
  assert.ok(!vals.includes(63));
  const clockFindings = b.findings.filter(f => f.projection.dimensions.clockRepresentation);
  assert.ok(clockFindings.length > 0);
  assert.ok(clockFindings.every(f => /moment_clock_law/.test(JSON.stringify(f.source ?? f.provenance ?? f.evidence))));
  assert.ok(!b.findings.some(f => f.subject?.value === 63));
});

test("4 composer never derives 63 locally and keeps 630 derivations dependent", async () => {
  const b = await compose();
  const ids = new Set(b.findings.map(f => f.id));
  assert.ok(!b.findings.some(f => f.subject?.value === 63 || f.subject?.value === "63"));
  assert.equal(b.invariants.writes_nothing, true);
  const root = b.members.find(m => m.is_root);
  assert.ok(root.finding_ids.every(id => ids.has(id)));
});

test("5 missing graph members stay as source members, no Event minted", async () => {
  const b = await compose();
  for (const id of [42, 94, 174, 5005, 5112, 5116, 149]) {
    const m = b.members.find(x => x.ref === `post:${id}`);
    assert.ok(m, `post:${id} present`);
    assert.equal(m.graph.gap, true);
    assert.equal(m.minted_event_identity, false);
  }
  assert.equal(b.members.find(m => m.ref === "post:149").graph.post_node, true);
  assert.equal(b.members.find(m => m.ref === "post:149").graph.event_node, false);
  assert.equal(b.members.find(m => m.ref === "post:42").event_ref, null);
});

test("6 lane membership/order exactly as listed; non-chronological lanes excluded", async () => {
  const b = await compose();
  for (const l of OCT7_LANES) assert.deepEqual(b.lanes.find(x => x.key === l.key).member_refs, l.post_ids.map(i => `post:${i}`));
  assert.equal(b.members.filter(m => !m.is_root).length, 18);
  for (const k of ["INTERPRETIVE_NUMERIC", "CROSS_TIME", "DIM5_CONTINUATION"]) {
    const lane = b.lanes.find(x => x.key === k);
    assert.equal(lane.chronology_eligible, false);
    assert.ok(b.members.filter(m => m.lane === k).every(m => m.chronology_eligible === false && m.historical_child_event === false));
  }
  const north = b.edges.filter(e => e.lane === "NORTH_LEBANON").map(e => `${e.from}>${e.to}`);
  assert.deepEqual(north, ["post:104>post:97", "post:97>post:94", "post:94>post:92", "post:92>post:5005"]);
  assert.ok(b.edges.some(e => e.from === "post:5116" && e.to === "post:149" && e.relation === "interpretive_continuation" && e.implies_chronology === false));
});

test("7 same child Finding ids survive composition and every surface", async () => {
  const src = await input();
  const original = new Set(src.lanes.flatMap(l => l.members).concat([src.root]).flatMap(m => (m.pack?.bundle.findings ?? []).map(f => f.id)));
  const b = composeEventFamilyContext({ ...src, ...A });
  assert.deepEqual(new Set(b.findings.map(f => f.id)), original);
  const ofNasr = b.findings.find(f => f.identity.sourceIdentity?.eventCandidate === "NASRALLAH_STRIKE");
  assert.ok(ofNasr.projection.anchors.some(a => a.space === "event_family" && a.id === "OCT7"));
  for (const s of [EVENT_SURFACE.CONTEXT_RAIL, EVENT_SURFACE.WORLD, EVENT_SURFACE.RAZIEL]) {
    for (const id of select(b, s).finding_ids) assert.ok(original.has(id));
  }
});

test("8 selecting Post92/149/5112/233 returns the same family key and exact lane/outward links", async () => {
  const b = await compose();
  const sel = Object.fromEntries(["post:92", "post:149", "post:5112", "post:233"].map(r => [r, forMember(b, r)]));
  for (const s of Object.values(sel)) { assert.equal(s.family_key, "OCT7"); assert.equal(s.family_canonical, false); }
  assert.equal(sel["post:92"].lane, "NORTH_LEBANON");
  assert.deepEqual(sel["post:92"].outward.map(o => [o.other, o.direction]).sort(), [["post:5005", "out"], ["post:94", "in"]]);
  assert.deepEqual(sel["post:149"].outward.map(o => [o.other, o.relation]), [["post:5116", "interpretive_continuation"]]);
  assert.equal(sel["post:5112"].lane, "CROSS_TIME");
  assert.equal(sel["post:5112"].historical_child_event, false);
  assert.equal(sel["post:233"].is_root, true);
  assert.equal(select(b, EVENT_SURFACE.POST, { memberRef: "post:92" }).family_key, "OCT7");
});

test("9 Number selector reads Number-anchored findings from the same bundle", async () => {
  const b = await compose();
  const n = select(b, EVENT_SURFACE.NUMBER, { number: 1820 });
  const all = new Map(b.findings.map(f => [f.id, f]));
  assert.ok(n.finding_ids.length > 0);
  for (const id of n.finding_ids) assert.ok(all.has(id));
  assert.equal(select(b, EVENT_SURFACE.NUMBER, { number: 99999 }).total_count, 0);
  assert.equal(select(b, EVENT_SURFACE.NUMBER).total_count, 0);
});

test("10 timeline excludes non-chronological lanes (no FZ1073 date, no interpretive/dim5)", async () => {
  const b = await compose();
  const t = select(b, EVENT_SURFACE.TIMELINE);
  assert.ok(!t.entries.some(e => e.at === "2026-09-30"));
  assert.ok(!t.entries.some(e => ["INTERPRETIVE_NUMERIC", "CROSS_TIME", "DIM5_CONTINUATION"].includes(e.lane)));
  assert.deepEqual(t.cross_time, [{ member_ref: "post:5112", historical_child_event: false }]);
  const excluded = new Set(b.members.filter(m => !m.chronology_eligible && !m.is_root).flatMap(m => m.finding_ids));
  assert.ok(t.finding_ids.every(id => !excluded.has(id)));
});

test("11 rail bounded, World deeper, Raziel read-only", async () => {
  const b = await compose();
  const rail = select(b, EVENT_SURFACE.CONTEXT_RAIL);
  const world = select(b, EVENT_SURFACE.WORLD);
  assert.ok(rail.member_returned <= 12 && rail.member_truncated === true);
  assert.ok(world.member_returned > rail.member_returned);
  assert.ok(world.returned_count >= rail.returned_count);
  assert.equal(select(b, EVENT_SURFACE.CONTEXT_RAIL, { limit: 3 }).returned_count <= 3, true);
  const r = select(b, EVENT_SURFACE.RAZIEL).raziel;
  assert.deepEqual([r.read_only, r.can_invent, r.can_canonicalize], [true, false, false]);
  assert.equal(select(b, EVENT_SURFACE.FOLLOW).recommendation.auto_follow, false);
  assert.equal(select(b, "nope"), null);
});

test("12 private member/source/finding never leaks under public; authorized sees it", async () => {
  const pub = await compose(A, { privateIds: [94, 92], tier92: "private" });
  const auth = await compose(AUTH, { privateIds: [94, 92], tier92: "private" });
  const dump = JSON.stringify(pub);
  assert.ok(!pub.members.some(m => m.ref === "post:94" || m.ref === "post:92"));
  assert.ok(!dump.includes("post:94") && !dump.includes("post:92") && !dump.includes("310591") && !dump.includes("NASRALLAH"));
  assert.ok(!pub.edges.some(e => [e.from, e.to].some(r => r === "post:94" || r === "post:92")));
  assert.deepEqual(pub.lanes.find(l => l.key === "NORTH_LEBANON").member_refs, ["post:104", "post:97", "post:5005"]);
  assert.equal(pub.lanes.find(l => l.key === "NORTH_LEBANON").member_count, 3);
  assert.equal(pub.counts.members, 17);
  for (const s of Object.values(EVENT_SURFACE)) assert.ok(!JSON.stringify(select(pub, s, { memberRef: "post:92", number: 1820 })).includes("post:94"));
  assert.equal(forMember(pub, "post:92"), null);
  assert.equal(auth.counts.members, 19);
  assert.ok(auth.members.some(m => m.ref === "post:94") && auth.findings.some(f => f.identity.sourceIdentity?.eventCandidate === "NASRALLAH_STRIKE"));
  assert.ok(auth.findings.length > pub.findings.length);
});

test("fails closed: member without explicit tier is dropped; family key required", async () => {
  const src = await input();
  src.lanes[0].members[0].accessTier = undefined;
  assert.ok(!composeEventFamilyContext({ ...src, ...AUTH }).members.some(m => m.ref === "post:174"));
  assert.throws(() => composeEventFamilyContext({ family: {} }), /family key/);
});
