import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EVENT_SURFACE } from "./eventObservationCompiler.js";
import { compileEventObservationWithSystemMethods } from "./eventSystemMethodRuntime.js";
import { composeEventTemporalObservations } from "./eventTemporalComposition.js";
import { eventCandidateRef } from "./eventObservationCompiler.js";
import {
  composeEventFamilyContext,
  selectEventFamilyContext as select,
  selectEventFamilyForMember as forMember,
} from "./eventFamilyContextProjection.js";
import { OCT7_LANES, OCT7_FAMILY, buildOct7FamilyInput } from "./eventFamilyOct7Descriptor.js";

const ruleVersions = { moment_clock_law: 2 };
const PUB = { accessDescriptor: { allowed_access_tiers: ["public"] } };
const AUTH = { accessDescriptor: { authority_source: "admin_rpc", admin: true, authenticated: true, allowed_access_tiers: ["public", "private"] } };
const SPOOF = { accessDescriptor: { allowed_access_tiers: ["public", "private"] } }; // no attested authority_source
const clk = (ref, display, tier = "public", extra = {}) => {
  const [h, m] = display.split(":").map(Number);
  return { display, hour: h, minute: m, timezone: "Asia/Jerusalem", context: "source observation", source_ref: ref, accessTier: tier, ...extra };
};

// Child pack = the SAME canonical stack the Nasrallah Golden uses: the shared temporal composer feeds
// compileEventObservationWithSystemMethods. No family-specific temporal code anywhere.
async function packFor(candidate, post, clockObservations, access = PUB) {
  const t = await composeEventTemporalObservations({
    event: { key: candidate.key, ref: eventCandidateRef(candidate.key), postId: post.id },
    clockObservations,
    ruleVersions,
  });
  return compileEventObservationWithSystemMethods({ candidate, post, members: [], extraCapabilities: t.capabilities, ...access });
}

const IDF = "https://www.idf.il/oct7-statement";
const rootPack = () => packFor({ key: "OCT7" }, { id: 233, date: "2022-12-18" }, [
  clk("post:233", "06:30"), clk(IDF, "06:30"), clk("https://www.idf.il/296392", "06:29"),
]);
const nasrallahPack = (tier = "public") => packFor({ key: "NASRALLAH_STRIKE" }, { id: 92 }, [
  clk("post:92", "18:20", tier), clk("https://www.idf.il/310591", "18:21", tier),
], tier === "private" ? AUTH : PUB);
const fz = () => packFor({ key: "FZ1073", occurred_at: "2026-09-30", occurred_at_source_ref: "post:5112" }, { id: 5112, date: "2026-10-01" }, []);

const input = async (over = {}) => {
  const packs = { 233: await rootPack(), 92: await nasrallahPack(over.tier92 ?? "public"), 5112: await fz() };
  return buildOct7FamilyInput({
    tierFor: (id) => ((over.privateIds ?? []).includes(id) ? "private" : "public"),
    rootTier: "public",
    rootDates: { date: "2022-12-18", modified: "2024-03-15" },
    rootOccurrence: over.rootOccurrence === undefined ? { at: "2023-10-07", source_ref: IDF } : over.rootOccurrence,
    packs,
  });
};
const compose = async (access = PUB, over = {}) => composeEventFamilyContext({ ...(await input(over)), ...access });
const dump = (x) => JSON.stringify(x);

test("1 family projection is a non-canonical query-time context key; no identity minted", async () => {
  const b = await compose();
  assert.equal(b.family.canonical, false);
  assert.equal(b.family.graph_node_id, null);
  assert.equal(b.family.query_time_projection, true);
  assert.equal(b.family.minted, false);
  assert.equal(b.family.is_graph_identity, false);
  assert.equal(b.family.is_subscription_identity, false);
  assert.equal(b.family.context_ref_kind, "projection_navigation_only");
  assert.match(b.family.context_ref, /^event_family_context:/);
  assert.equal(b.family.ref, undefined);
  assert.ok(b.members.every(m => m.canonical === false && m.minted_event_identity === false));
  assert.deepEqual(b.family.entity_refs.map(e => e.node_id), OCT7_FAMILY.entity_refs.map(e => e.node_id));
  assert.equal(b.root.role, "editorial_hub_representation");
});

test("2 Post233 dates stay representation metadata; explicit sourced 2023-10-07 is the only root occurrence", async () => {
  const b = await compose();
  assert.equal(b.root.representation_dates.is_occurrence, false);
  assert.equal(b.root.representation_dates.published_at, "2022-12-18");
  assert.equal(b.root.representation_dates.modified_at, "2024-03-15");
  const t = select(b, EVENT_SURFACE.TIMELINE);
  const rootEntry = t.entries.find(e => e.member_ref === "post:233");
  assert.deepEqual([rootEntry.at, rootEntry.source_ref, rootEntry.source_kind], ["2023-10-07", IDF, "explicit_occurrence_source"]);
  assert.ok(!t.entries.some(e => /2022-12-18|2024-03-15/.test(e.at)));
  assert.equal(t.representation_dates.axis, "representation");
  // unsourced / self-sourced / borrowed Post dates never become occurrence
  for (const bad of [null, { at: "2023-10-07" }, { at: "2023-10-07", source_ref: "post:233" }, { at: "2022-12-18", source_ref: IDF }, { at: "2024-03-15", source_ref: IDF }]) {
    const nb = await compose(PUB, { rootOccurrence: bad });
    assert.ok(!nb.chronology.some(e => e.member_ref === "post:233"), JSON.stringify(bad));
  }
});

test("3 06:30 and 06:29 stay separate source observations with unresolved conflict; 630 only via moment_clock_law; no 63", async () => {
  const b = await compose();
  const ev = b.occurrence_evidence.find(e => e.member_ref === "post:233");
  assert.deepEqual(ev.observations.map(o => o.local_time).sort(), ["06:29", "06:30", "06:30"]);
  assert.deepEqual(new Set(ev.observations.map(o => o.source_ref)), new Set(["post:233", IDF, "https://www.idf.il/296392"]));
  assert.equal(ev.conflict_state, "unresolved_source_conflict");
  const vals = ev.representations.map(r => r.value);
  assert.ok(vals.includes(630) && vals.includes(629));
  assert.ok(!vals.includes(63));
  const apps = b.findings.filter(f => f.projection.dimensions.ruleApplication);
  assert.ok(apps.length > 0 && apps.every(f => f.projection.dimensions.ruleApplication.ruleId === "moment_clock_law" && f.provenance.createdBy.startsWith("RULE:moment_clock_law")));
  assert.ok(!b.findings.some(f => f.subject?.value === 63 || f.subject?.value === "63"));
});

test("4 family composer never derives 63 or any number locally", async () => {
  const src = readFileSync(new URL("./eventFamilyContextProjection.js", import.meta.url), "utf8");
  assert.ok(!/\b63\b|moment_clock|applyMomentClockLaw|numeric_operators/.test(src.replace(/\/\/.*$/gm, "").replace(/clockOccurrenceEvidence/g, "")));
  const b = await compose();
  assert.equal(b.invariants.writes_nothing, true);
  assert.ok(!dump(b).includes('"value":63,') && !b.occurrence_evidence.some(e => e.representations.some(r => r.value === 63)));
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
  assert.deepEqual(OCT7_LANES.map(l => [l.key, l.post_ids]), [
    ["ONSET", [174, 165]], ["GAZA_HOSTAGES", [131, 127]], ["NORTH_LEBANON", [104, 97, 94, 92, 5005]], ["IRAN", [43, 42, 41, 2600]],
    ["INTERPRETIVE_NUMERIC", [149, 87, 108]], ["CROSS_TIME", [5112]], ["DIM5_CONTINUATION", [5116]],
  ]);
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

test("7 child findings keep exact id/sourceIdentity/verification/access/source/status; overlay adds only projection", async () => {
  const src = await input();
  const kids = src.lanes.flatMap(l => l.members).concat([src.root]).flatMap(m => m.pack?.bundle.findings ?? []);
  const byId = new Map(kids.map(f => [f.id, f]));
  const b = composeEventFamilyContext({ ...src, ...PUB });
  assert.deepEqual(new Set(b.findings.map(f => f.id)), new Set(byId.keys()));
  for (const f of b.findings) {
    const o = byId.get(f.id);
    for (const k of ["identity", "verification", "access", "source", "status", "evidence", "provenance", "subject", "kind", "stage"]) assert.deepEqual(f[k], o[k], k);
    assert.ok(f.projection.anchors.some(a => a.space === "event_family_context" && a.id === "OCT7"));
    assert.deepEqual(f.projection.anchors.slice(0, o.projection.anchors.length), o.projection.anchors);
  }
  for (const s of [EVENT_SURFACE.CONTEXT_RAIL, EVENT_SURFACE.WORLD, EVENT_SURFACE.RAZIEL]) for (const id of select(b, s).finding_ids) assert.ok(byId.has(id));
});

test("8 Post92/149/5112/233 resolve to the same family context key and exact lane/outward links", async () => {
  const b = await compose();
  const sel = Object.fromEntries(["post:92", "post:149", "post:5112", "post:233"].map(r => [r, forMember(b, r)]));
  for (const s of Object.values(sel)) { assert.equal(s.family_context_key, "OCT7"); assert.equal(s.family_canonical, false); }
  assert.equal(sel["post:92"].lane, "NORTH_LEBANON");
  assert.deepEqual(sel["post:92"].outward.map(o => [o.other, o.direction]).sort(), [["post:5005", "out"], ["post:94", "in"]]);
  assert.deepEqual(sel["post:149"].outward.map(o => [o.other, o.relation]), [["post:5116", "interpretive_continuation"]]);
  assert.equal(sel["post:5112"].lane, "CROSS_TIME");
  assert.equal(sel["post:5112"].historical_child_event, false);
  assert.equal(sel["post:233"].is_root, true);
  assert.equal(select(b, EVENT_SURFACE.POST, { memberRef: "post:92" }).family_context_key, "OCT7");
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

test("11 rail bounded, World deeper, Raziel read-only; Follow carries no new family identity", async () => {
  const b = await compose();
  const rail = select(b, EVENT_SURFACE.CONTEXT_RAIL);
  const world = select(b, EVENT_SURFACE.WORLD);
  assert.ok(rail.member_returned <= 12 && rail.member_truncated === true);
  assert.ok(world.member_returned > rail.member_returned);
  assert.ok(world.returned_count >= rail.returned_count);
  assert.equal(select(b, EVENT_SURFACE.CONTEXT_RAIL, { limit: 3 }).returned_count <= 3, true);
  const r = select(b, EVENT_SURFACE.RAZIEL).raziel;
  assert.deepEqual([r.read_only, r.can_invent, r.can_canonicalize], [true, false, false]);
  const f = select(b, EVENT_SURFACE.FOLLOW).recommendation;
  assert.equal(f.auto_follow, false);
  assert.equal(f.new_resolver_identity, false);
  assert.equal(f.subject_ref, null);
  assert.ok(!dump(f).includes("event_family:") && !f.suggested_targets.some(t => /family/.test(t.ref ?? "")));
  assert.deepEqual(f.suggested_targets.map(t => t.ref ?? t.node_id), ["post:233", ...OCT7_FAMILY.entity_refs.map(e => e.node_id)]);
  assert.equal(f.family_context_key, "OCT7");
  assert.equal(f.family_context_is_identity, false);
  assert.equal(select(b, "nope"), null);
});

test("12 private member/source/finding/evidence never leaks under public; authorized sees it", async () => {
  const pub = await compose(PUB, { privateIds: [94, 92], tier92: "private" });
  const auth = await compose(AUTH, { privateIds: [94, 92], tier92: "private" });
  const d = dump(pub);
  assert.ok(!pub.members.some(m => m.ref === "post:94" || m.ref === "post:92"));
  assert.ok(!d.includes("post:94") && !d.includes("post:92") && !d.includes("310591") && !d.includes("NASRALLAH") && !d.includes("18:20"));
  assert.ok(!pub.edges.some(e => [e.from, e.to].some(r => r === "post:94" || r === "post:92")));
  assert.deepEqual(pub.lanes.find(l => l.key === "NORTH_LEBANON").member_refs, ["post:104", "post:97", "post:5005"]);
  // no bridging over hidden ordered members
  assert.deepEqual(pub.edges.filter(e => e.lane === "NORTH_LEBANON").map(e => `${e.from}>${e.to}`), ["post:104>post:97"]);
  assert.equal(pub.lanes.find(l => l.key === "NORTH_LEBANON").member_count, 3);
  assert.equal(pub.counts.members, 17);
  for (const s of Object.values(EVENT_SURFACE)) assert.ok(!dump(select(pub, s, { memberRef: "post:92", number: 1820 })).match(/post:94|post:92|NASRALLAH/));
  assert.equal(forMember(pub, "post:92"), null);
  assert.equal(auth.counts.members, 19);
  assert.ok(auth.members.some(m => m.ref === "post:94") && auth.findings.some(f => f.identity.sourceIdentity?.eventCandidate === "NASRALLAH_STRIKE"));
  assert.ok(auth.findings.length > pub.findings.length);
});

test("13 SPOOFED raw descriptor ({allowed_access_tiers:['private']} without attested authority) exposes nothing private", async () => {
  const spoof = await compose(SPOOF, { privateIds: [94, 92], tier92: "private" });
  const pub = await compose(PUB, { privateIds: [94, 92], tier92: "private" });
  assert.deepEqual(spoof.members.map(m => m.ref), pub.members.map(m => m.ref));
  assert.deepEqual(spoof.findings.map(f => f.id), pub.findings.map(f => f.id));
  assert.ok(!dump(spoof).match(/post:94|post:92|310591|NASRALLAH/));
  const bareTiers = await compose({ accessDescriptor: { allowed_access_tiers: ["private", "personal"] } }, { privateIds: [94], tier92: "private" });
  assert.ok(!bareTiers.members.some(m => m.ref === "post:94"));
  const auth = await compose(AUTH, { privateIds: [94], tier92: "private" });
  assert.ok(auth.members.some(m => m.ref === "post:94"));
});

test("14 private root-adjacent surfaces carry no hidden counts/evidence/outward links", async () => {
  const pub = await compose(PUB, { privateIds: [92], tier92: "private" });
  const world = select(pub, EVENT_SURFACE.WORLD);
  assert.equal(world.member_total, 18);
  assert.ok(!dump(world).includes("post:92"));
  assert.ok(!pub.occurrence_evidence.some(e => e.member_ref === "post:92"));
  assert.ok(!dump(select(pub, EVENT_SURFACE.TIMELINE)).includes("post:92"));
  assert.ok(!dump(forMember(pub, "post:5005")).includes("post:92"));
});

test("fails closed: member without explicit tier is dropped; family key required", async () => {
  const src = await input();
  src.lanes[0].members[0].accessTier = undefined;
  assert.ok(!composeEventFamilyContext({ ...src, ...AUTH }).members.some(m => m.ref === "post:174"));
  assert.throws(() => composeEventFamilyContext({ family: {} }), /family key/);
});

test("one temporal architecture: family and Nasrallah both import eventTemporalComposition; no second composer", () => {
  const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
  assert.match(read("nasrallahPost92Golden.js"), /from "\.\/eventTemporalComposition\.js"/);
  assert.match(read("eventFamilyContextProjection.js"), /from "\.\/eventTemporalComposition\.js"/);
  assert.ok(!/applyMomentClockLaw|function dayOrdinalFinding|function alternateObservationFinding/.test(read("nasrallahPost92Golden.js")));
  assert.ok(!/applyMomentClockLaw/.test(read("eventFamilyContextProjection.js")));
  assert.equal((read("eventTemporalComposition.js").match(/applyMomentClockLaw\(/g) ?? []).length, 1);
});

// ---- REV1: many-to-many Finding context + root hub navigation ----
const memberOfLane = (src, laneKey, postId) => src.lanes.find(l => l.key === laneKey).members.find(m => (m.source_ref ?? `post:${m.post_id}`) === `post:${postId}`);

test("15 same Finding id in two visible members: ONE object, both finding_ids, both contexts, identity unchanged", async () => {
  const shared = await nasrallahPack();
  const src = await input();
  // chronological (NORTH_LEBANON/97) + nonchronological (INTERPRETIVE_NUMERIC/149) carry the SAME pack
  memberOfLane(src, "NORTH_LEBANON", 97).pack = shared;
  memberOfLane(src, "INTERPRETIVE_NUMERIC", 149).pack = shared;
  const b = composeEventFamilyContext({ ...src, ...PUB });
  const srcIds = shared.bundle.findings.map(f => f.id);
  assert.ok(srcIds.length > 0);
  const m97 = b.members.find(m => m.ref === "post:97"), m149 = b.members.find(m => m.ref === "post:149");
  for (const id of srcIds) {
    assert.equal(b.findings.filter(f => f.id === id).length, 1, "one object per id");
    assert.ok(m97.finding_ids.includes(id) && m149.finding_ids.includes(id));
    // post:92 already carries this same pack in the Oct7 fixture, so it is a third visible context
    assert.deepEqual(b.finding_contexts[id].map(c => c.member_ref).sort(), ["post:149", "post:92", "post:97"]);
    const f = b.findings.find(x => x.id === id), o = shared.bundle.findings.find(x => x.id === id);
    assert.deepEqual(f.identity, o.identity);
    assert.equal(f.projection.dimensions.familyContext.lane, undefined, "overlay is context-neutral");
    assert.equal(f.projection.dimensions.familyContext.member_ref, undefined);
    assert.equal(f.projection.anchors.filter(a => a.space === "event_family_context").length, 1);
    for (const ref of ["post:97", "post:149"]) assert.ok(select(b, EVENT_SURFACE.POST, { memberRef: ref }).finding_ids.includes(id));
    assert.ok(select(b, EVENT_SURFACE.TIMELINE, { limit: 1000 }).finding_ids.includes(id), "chronological context keeps it eligible");
  }
  // solely nonchronological context never enters chronology
  const only = await input({ privateIds: [92] }); // post:92 (chronological holder of the same pack) hidden
  memberOfLane(only, "INTERPRETIVE_NUMERIC", 149).pack = shared;
  const nb = composeEventFamilyContext({ ...only, ...PUB });
  for (const id of srcIds) assert.ok(!select(nb, EVENT_SURFACE.TIMELINE, { limit: 1000 }).finding_ids.includes(id));
});

test("16 hiding one sharing member leaves only the visible context; no hidden ref leaks", async () => {
  const shared = await nasrallahPack();
  const src = await input({ privateIds: [92, 97] });
  memberOfLane(src, "NORTH_LEBANON", 97).pack = shared; // hidden member (private tier); post:92 hidden too
  memberOfLane(src, "INTERPRETIVE_NUMERIC", 149).pack = shared;
  const b = composeEventFamilyContext({ ...src, ...PUB });
  assert.ok(!b.members.some(m => m.ref === "post:97"));
  const ids = shared.bundle.findings.map(f => f.id);
  for (const id of ids) assert.deepEqual(b.finding_contexts[id].map(c => c.member_ref), ["post:149"]);
  // Context/membership structures never name a hidden member (finding payloads may legitimately cite their
  // own source refs, so they are not part of this check).
  const ctx = dump([b.members, b.lanes, b.edges, b.finding_contexts, forMember(b, "post:233")]);
  assert.ok(!ctx.match(/post:97|post:92/));
  assert.equal(forMember(b, "post:97"), null);
  assert.ok(!dump(select(b, EVENT_SURFACE.POST, { memberRef: "post:97" }).member ?? null).match(/post:97|post:92/));
});

test("17 root selection exposes navigation-only lane summaries (no new edges); private members shrink counts", async () => {
  const b = await compose();
  const edgesBefore = dump(b.edges);
  const root = forMember(b, "post:233");
  assert.deepEqual(root.branches.map(x => x.key), OCT7_LANES.map(l => l.key));
  for (const br of root.branches) {
    assert.equal(br.graph_truth, false);
    assert.equal(br.navigation_only, true);
    assert.equal(br.member_count, OCT7_LANES.find(l => l.key === br.key).post_ids.length);
  }
  assert.equal(root.branches.find(x => x.key === "CROSS_TIME").chronology_eligible, false);
  assert.ok(root.outward.every(e => e.relation !== "branch"));
  assert.equal(dump(b.edges), edgesBefore);
  assert.equal(forMember(b, "post:92").branches, undefined);
  const pub = await compose(PUB, { privateIds: [92, 94], tier92: "private" });
  const north = forMember(pub, "post:233").branches.find(x => x.key === "NORTH_LEBANON");
  assert.equal(north.member_count, 3);
  assert.deepEqual(north.member_refs, ["post:104", "post:97", "post:5005"]);
  assert.ok(!dump(forMember(pub, "post:233")).match(/post:92|post:94/));
  assert.deepEqual(forMember(pub, "post:233").outward, forMember(b, "post:233").outward);
});
