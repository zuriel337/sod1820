import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EVENT_MEMBER_TYPE as T,
  EVENT_SURFACE,
  FZ1073_EVENT_CANDIDATE_DECLARATION,
  compileEventObservation,
  projectEventContextForSurface,
} from "./eventObservationCompiler.js";

// Fixture receipts stand in for the live canonical gematria_method_trace RPC (values verified live
// by GPT per assignment a1a67648). The compiler under test never computes a value.
const RECEIPTS = new Map([
  ["regular|המשיח", 363],
  ["regular|כ״ב בתשרי תשפ״ד", 1718],
  ["regular|י״ט בתשרי תשפ״ז", 1718],
  ["regular|שביעי באוקטובר", 718],
  ["regular|חדשות", 718],
  ["regular|תשפ״ז", 787],
  ["regular|ושמחת בחגך", 787],
  ["regular|המשיח נסתר", 1073],
  ["misratar|כ״ב בתשרי תשפ״ד", 1202],
  ["misratar|חרבות ברזל", 1202],
  ["misratar|י״ט בתשרי תשפ״ז", 1182],
]);
const resolver = (m) => {
  const result = RECEIPTS.get(`${m.method_key}|${m.expression}`);
  return result == null ? null : { status: "ok", method_key: m.method_key, input: m.expression, result, method_version: "fixture-v1" };
};

const post = { id: 5112, slug: "flydubai-fz1073-363-14000-remzei-geula", date: "2026-10-01" };
const ro = (id, extra = {}) => ({
  id, statement: `stmt ${id}`, value: 1073, status: "approved", privacy_scope: "public", source: "post", source_ref: `post:5112#${id}`,
  kind: "fact", terms: [], engine_detail: { verification_state: "match", claimed_value: 1073, engine_result: 1073 }, ...extra,
});
const m = (type, expression, method_key, claimed_value, extra = {}) => ({ type, expression, method_key, claimed_value, source_ref: "post:5112", ...extra });

const members = () => [
  { type: T.FLIGHT_NUMBER, number: 1073, key: "flight:FZ1073", label: "FZ1073", source_ref: "post:5112" },
  m(T.NUMBER, "המשיח", "regular", 363),
  m(T.DATE_EXPRESSION, "כ״ב בתשרי תשפ״ד", "regular", 1718),
  m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "regular", 1718),
  m(T.EXPRESSION_MATCH, "שביעי באוקטובר", "regular", 718),
  m(T.EXPRESSION_MATCH, "תשפ״ז", "regular", 787),
  { type: T.SYMBOLIC_TRANSFORMATION, from: 1718, to: 718, expression: "1718→718", source_ref: "post:5112" },
  { type: T.CALENDAR_RELATION, relation: "holiday", holiday: "sukkot", key: "cal:sukkot", source_ref: "post:5112" },
  m(T.EXPRESSION_MATCH, "כ״ב בתשרי תשפ״ד", "misratar", 1202, { scope: "cross_time", cross_time_subject: "oct7", source_ref: "post:5112" }),
];
const compile = (over = {}) => compileEventObservation({
  candidate: FZ1073_EVENT_CANDIDATE_DECLARATION, post, members: members(), researchObjects: [ro("ro-1")], receiptResolver: resolver, ...over,
});

test("typed separation: candidate is not a graph node; Post != Event; Published != Occurred; Date != Number", () => {
  const pack = compile();
  assert.equal(pack.event.canonical, false);
  assert.equal(pack.event.graph_node_id, null);
  assert.equal(pack.event.minted, false);
  assert.equal(pack.event.occurred_at, "2026-09-30");
  assert.equal(pack.event.published_at, "2026-10-01");
  assert.notEqual(pack.event.ref, `post:${post.id}`);
  assert.equal(pack.event.post.role, "source_presentation");
  const dates = pack.bundle.findings.filter(f => f.projection.dimensions.eventMemberType === T.DATE_EXPRESSION);
  assert.equal(dates.length, 2);
  for (const d of dates) { assert.equal(d.subject.type, "date_expression"); assert.equal(d.subject.value, null); assert.equal(d.verification.engine_result, 1718); }
  const flight = pack.bundle.findings.find(f => f.subject.type === "flight_number");
  assert.equal(flight.subject.value, 1073);
});

test("occurred_at is never borrowed from the post date", () => {
  const pack = compile({ candidate: { key: "FZ1073", occurred_at: "2026-09-30" } });
  assert.equal(pack.event.occurred_at, null);
  assert.equal(pack.event.occurred_at_unsourced, true);
  assert.equal(pack.event.published_at, "2026-10-01");
});

test("engine-receipt gate: no receipt or wrong value -> not a verified member", () => {
  const pack = compile({ members: [
    m(T.NUMBER, "אין קבלה", "regular", 5),
    m(T.NUMBER, "המשיח", "regular", 364),
    m(T.NUMBER, "המשיח", "regular", 363),
  ] });
  assert.equal(pack.bundle.findings.filter(f => f.subject.type === "number").length, 1);
  assert.deepEqual(pack.rejected_members.map(r => r.reason), ["engine_receipt_missing", "engine_receipt_value_mismatch:363"]);
});

test("symbolic 1718->718 is interpretation + derivation, never a registered method", () => {
  const pack = compile();
  const sym = pack.bundle.findings.find(f => f.projection.dimensions.eventMemberType === T.SYMBOLIC_TRANSFORMATION);
  assert.equal(sym.stage, "interpretation");
  assert.equal(sym.source.engine, null);
  assert.equal(sym.projection.dimensions.symbolic.registered_gematria_method, false);
  const out = pack.bundle.finding_outcomes.find(o => o.finding_id === sym.id);
  assert.equal(out.evidence_relation, "derivation");
  assert.equal(out.depends_on.length, 2);
  const bad = compile({ members: [{ type: T.SYMBOLIC_TRANSFORMATION, from: 1718, to: 718, method_key: "regular" }] });
  assert.equal(bad.rejected_members[0].reason, "symbolic_transformation_is_not_registered_gematria_method");
});

test("clock time is never a number", () => {
  const pack = compile({ members: [{ type: T.CLOCK_TIME, number: 1073, label: "10:73" }] });
  assert.equal(pack.rejected_members[0].reason, "clock_time_is_not_number");
});

test("1202/1182 guard: 2026 date cannot carry 1202; 1202 only as sourced Oct7 cross-time", () => {
  const claims1202 = compile({ members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "misratar", 1202)] });
  assert.equal(claims1202.bundle.findings.filter(f => f.subject.type === "date_expression").length, 0);
  assert.match(claims1202.rejected_members[0].reason, /engine_receipt_value_mismatch:1182/);
  // even with a (forged) matching receipt, an unscoped 1202 member is refused
  const forged = compile({
    members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "misratar", 1202)],
    receiptResolver: (x) => ({ status: "ok", method_key: "misratar", input: x.expression, result: 1202 }),
  });
  assert.equal(forged.rejected_members[0].reason, "1202_reserved_for_sourced_oct7_cross_time_member");
  const honest = compile({ members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "misratar", 1182)] });
  assert.equal(honest.rejected_members.length, 0);
  const cross = compile().bundle.findings.filter(f => f.projection.dimensions.crossTime);
  assert.equal(cross.length, 1);
  assert.equal(cross[0].verification.engine_result, 1202);
  assert.equal(cross[0].projection.dimensions.crossTime.historical_child_event, false);
  const noSource = compile({ members: [m(T.EXPRESSION_MATCH, "חרבות ברזל", "misratar", 1202, { scope: "cross_time", cross_time_subject: "oct7", source_ref: null })] });
  assert.equal(noSource.rejected_members[0].reason, "1202_reserved_for_sourced_oct7_cross_time_member");
});

test("dedup / source identity: duplicate rows and member references collapse to one finding", () => {
  const pack = compile({
    researchObjects: [ro("ro-1"), ro("ro-1"), ro("ro-2")],
    members: [...members(), { type: T.NUMBER, research_object_id: "ro-1" }],
  });
  const roF = pack.bundle.findings.filter(f => f.identity.sourceIdentity?.researchObjectId);
  assert.deepEqual(roF.map(f => f.identity.sourceIdentity.researchObjectId).sort(), ["ro-1", "ro-2"]);
  assert.equal(new Set(pack.bundle.findings.map(f => f.id)).size, pack.bundle.findings.length);
});

test("unverified research_objects and non-public tiers do not cross the bundle boundary", () => {
  const pack = compile({ researchObjects: [ro("ro-ok"), ro("ro-unv", { engine_detail: {} }), ro("ro-priv", { privacy_scope: "private" })] });
  const ids = pack.bundle.findings.map(f => f.identity.sourceIdentity?.researchObjectId).filter(Boolean);
  assert.deepEqual(ids, ["ro-ok"]);
  assert.equal(pack.gated_research_objects[0].research_object_id, "ro-unv");
});

test("ONE-WRITE propagation: one new research_object reaches every surface by identity, no per-surface arrays", () => {
  const before = compile();
  const injected = ro("ro-NEW", { value: 1073, source_ref: "post:5112#new" });
  const after = compile({ researchObjects: [ro("ro-1"), injected] });
  const newId = after.bundle.findings.find(f => f.identity.sourceIdentity?.researchObjectId === "ro-NEW").id;
  assert.ok(!before.bundle.findings.some(f => f.id === newId));
  const surfaces = {
    [EVENT_SURFACE.NUMBER]: { number: 1073 }, [EVENT_SURFACE.POST]: {}, [EVENT_SURFACE.DATE_EVENT]: {}, [EVENT_SURFACE.TIMELINE]: {},
    [EVENT_SURFACE.CONTEXT_RAIL]: {}, [EVENT_SURFACE.WORLD]: {}, [EVENT_SURFACE.RAZIEL]: {}, [EVENT_SURFACE.FOLLOW]: {},
  };
  for (const [surface, opts] of Object.entries(surfaces)) {
    const proj = projectEventContextForSurface(after, surface, opts);
    assert.ok(proj.finding_ids.includes(newId), `${surface} must reach the same finding`);
    assert.equal(proj.findings.find(x => x.finding_id === newId).source_identity.researchObjectId, "ro-NEW");
    assert.ok(!projectEventContextForSurface(before, surface, opts).finding_ids.includes(newId));
  }
  // no surface-specific input: projector signature is (pack, surface, opts) and source has no per-surface member arrays
  const src = readFileSync(new URL("./eventObservationCompiler.js", import.meta.url), "utf8");
  assert.equal((src.match(/export function projectEventContextForSurface/g) || []).length, 1);
});

test("surface semantics: sidecar/sheet placement, Raziel read-only, Follow recommends without auto-follow", () => {
  const pack = compile();
  const rail = projectEventContextForSurface(pack, EVENT_SURFACE.CONTEXT_RAIL);
  assert.deepEqual(rail.placement, { desktop: "contextual_sidecar", mobile: "bottom_context_sheet" });
  const raz = projectEventContextForSurface(pack, EVENT_SURFACE.RAZIEL);
  assert.equal(raz.raziel.can_canonicalize, false);
  assert.equal(raz.raziel.can_invent, false);
  const follow = projectEventContextForSurface(pack, EVENT_SURFACE.FOLLOW);
  assert.equal(follow.recommendation.auto_follow, false);
  assert.equal(follow.recommendation.new_resolver_identity, false);
  const tl = projectEventContextForSurface(pack, EVENT_SURFACE.TIMELINE);
  assert.deepEqual(tl.entries.map(e => e.axis), ["occurred_at", "published_at"]);
  assert.equal(tl.cross_time[0].historical_child_event, false);
  assert.equal(projectEventContextForSurface(pack, "bogus"), null);
});

test("bounded output: truncation is reported, never silent", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ro(`ro-${i}`));
  const pack = compile({ researchObjects: rows });
  const rail = projectEventContextForSurface(pack, EVENT_SURFACE.CONTEXT_RAIL);
  assert.equal(rail.returned_count, 12);
  assert.equal(rail.truncated, true);
  assert.ok(rail.total_count > 12);
  const world = projectEventContextForSurface(pack, EVENT_SURFACE.WORLD, { limit: 5 });
  assert.equal(world.returned_count, 5);
});

test("no graph minting / no writes: pack invariants and no store imports", () => {
  const pack = compile();
  assert.equal(pack.invariants.no_graph_mutation, true);
  assert.equal(pack.bundle.invariants.no_auto_canonicalization, true);
  const src = readFileSync(new URL("./eventObservationCompiler.js", import.meta.url), "utf8");
  assert.ok(!/supabase|\.insert\(|\.upsert\(|\.rpc\(|fetch\(/.test(src.replace(/\/\/.*$/gm, "")));
});
