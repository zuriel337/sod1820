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

// Method identities are the canonical Registry/Trace keys (רגיל, מסתתר); API aliases such as
// regular/misratar are NOT method identity. Fixture receipts stand in for the live canonical gematria_method_trace RPC (values verified live
// by GPT per assignment a1a67648). The compiler under test never computes a value.
const RECEIPTS = new Map([
  ["רגיל|המשיח", 363],
  ["רגיל|כ״ב בתשרי תשפ״ד", 1718],
  ["רגיל|י״ט בתשרי תשפ״ז", 1718],
  ["רגיל|שביעי באוקטובר", 718],
  ["רגיל|חדשות", 718],
  ["רגיל|תשפ״ז", 787],
  ["רגיל|ושמחת בחגך", 787],
  ["רגיל|המשיח נסתר", 1073],
  ["מסתתר|כ״ב בתשרי תשפ״ד", 1202],
  ["מסתתר|חרבות ברזל", 1202],
  ["מסתתר|י״ט בתשרי תשפ״ז", 1182],
]);
const resolver = (m) => {
  const result = RECEIPTS.get(`${m.method_key}|${m.expression}`);
  return result == null ? null : { status: "ok", method_key: m.method_key, input: m.expression, result, method_version: "fixture-v1" };
};

const post = { id: 5112, slug: "flydubai-fz1073-363-14000-remzei-geula", date: "2026-09-30T20:15:36.179757+00:00" }; // live Post 5112 published_at
const ro = (id, extra = {}) => ({
  id, statement: `stmt ${id}`, value: 1073, status: "approved", privacy_scope: "public", source: "post", source_ref: `post:5112#${id}`,
  kind: "fact", terms: [], engine_detail: { verification_state: "match", claimed_value: 1073, engine_result: 1073 }, ...extra,
});
const m = (type, expression, method_key, claimed_value, extra = {}) => ({ type, expression, method_key, claimed_value, source_ref: "post:5112", ...extra });

const members = () => [
  { type: T.FLIGHT_NUMBER, number: 1073, key: "flight:FZ1073", label: "FZ1073", source_ref: "post:5112" },
  { type: T.NUMBER, number: 363, key: "number:363", label: "363", source_ref: "post:5112" },
  m(T.EXPRESSION_MATCH, "המשיח", "רגיל", 363),
  m(T.DATE_EXPRESSION, "כ״ב בתשרי תשפ״ד", "רגיל", 1718),
  m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "רגיל", 1718),
  m(T.EXPRESSION_MATCH, "שביעי באוקטובר", "רגיל", 718),
  m(T.EXPRESSION_MATCH, "תשפ״ז", "רגיל", 787),
  { type: T.SYMBOLIC_TRANSFORMATION, from: 1718, to: 718, expression: "1718→718", source_ref: "post:5112" },
  { type: T.CALENDAR_RELATION, relation: "holiday", holiday: "simchat_torah", span_days: 3, key: "cal:simchat-torah", source_ref: "post:5112" },
  m(T.EXPRESSION_MATCH, "כ״ב בתשרי תשפ״ד", "מסתתר", 1202, { scope: "cross_time", cross_time_subject: "oct7", source_ref: "post:5112" }),
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
  assert.equal(pack.event.published_at, "2026-09-30T20:15:36.179757+00:00");
  // same civil date, still two distinct axes
  assert.equal(pack.event.published_at.slice(0, 10), pack.event.occurred_at);
  assert.notEqual(pack.event.published_at, pack.event.occurred_at);
  const tlAxes = projectEventContextForSurface(pack, EVENT_SURFACE.TIMELINE).entries;
  assert.deepEqual(tlAxes.map(e => e.axis), ["occurred_at", "published_at"]);
  assert.notEqual(tlAxes[0].at, tlAxes[1].at);
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
  assert.equal(pack.event.published_at, post.date);
});

test("engine-receipt gate: no receipt or wrong value -> not a verified Expression member", () => {
  const pack = compile({ members: [
    m(T.EXPRESSION_MATCH, "אין קבלה", "רגיל", 5),
    m(T.EXPRESSION_MATCH, "המשיח", "רגיל", 364),
    m(T.EXPRESSION_MATCH, "המשיח", "רגיל", 363),
  ] });
  assert.equal(pack.bundle.findings.filter(f => f.subject.type === "expression").length, 1);
  assert.deepEqual(pack.rejected_members.map(r => r.reason), ["engine_receipt_missing", "engine_receipt_value_mismatch:363"]);
});

test("canonical method identity: API aliases are rejected; receipt must carry canonical method_key", () => {
  const alias = compile({ members: [m(T.EXPRESSION_MATCH, "המשיח", "regular", 363), m(T.EXPRESSION_MATCH, "המשיח", "misratar", 363)] });
  assert.deepEqual(alias.rejected_members.map(r => r.reason), ["method_key_not_canonical", "method_key_not_canonical"]);
  const aliasReceipt = compile({
    members: [m(T.EXPRESSION_MATCH, "המשיח", undefined, 363)],
    receiptResolver: (x) => ({ status: "ok", method_key: "regular", input: x.expression, result: 363 }),
  });
  assert.equal(aliasReceipt.rejected_members[0].reason, "engine_receipt_method_not_canonical");
  const ok = compile({ members: [m(T.EXPRESSION_MATCH, "המשיח", "רגיל", 363)] });
  assert.equal(ok.bundle.findings[0].verification.engine_method_tested, "רגיל");
});

test("source Number != Expression result: 363 is a source fact without receipt; המשיח is a separate Expression under רגיל", () => {
  let resolverCalls = 0;
  const pack = compile({
    members: [
      { type: T.NUMBER, number: 363, source_ref: "post:5112" },
      { type: T.FLIGHT_NUMBER, number: 1073, source_ref: "post:5112" },
      m(T.EXPRESSION_MATCH, "המשיח", "רגיל", 363),
    ],
    receiptResolver: (x) => { resolverCalls++; return resolver(x); },
  });
  assert.equal(resolverCalls, 1, "only the Expression member consults the engine receipt resolver");
  assert.equal(pack.rejected_members.length, 0);
  const num = pack.bundle.findings.find(f => f.subject.type === "number");
  assert.equal(num.subject.value, 363);
  assert.equal(num.source.engine, null);
  assert.equal(num.verification.verification_state, null);
  assert.equal(num.verification.engine_result, null);
  const expr = pack.bundle.findings.find(f => f.subject.type === "expression");
  assert.equal(expr.subject.value, null);
  assert.equal(expr.verification.engine_result, 363);
  assert.equal(expr.verification.engine_method_tested, "רגיל");
  assert.notEqual(num.id, expr.id);
  const flight = pack.bundle.findings.find(f => f.subject.type === "flight_number");
  assert.equal(flight.subject.value, 1073);
  assert.equal(flight.verification.engine_result, null);
  // a source number may not masquerade as an expression result, nor lack its source
  const bad = compile({ members: [
    { type: T.NUMBER, number: 363, expression: "המשיח", source_ref: "post:5112" },
    { type: T.NUMBER, number: 363 },
    { type: T.FLIGHT_NUMBER, expression: "x" },
  ] });
  assert.deepEqual(bad.rejected_members.map(r => r.reason), ["source_number_is_not_expression_result", "number_without_source_ref", "source_number_is_not_expression_result"]);
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
  const bad = compile({ members: [{ type: T.SYMBOLIC_TRANSFORMATION, from: 1718, to: 718, method_key: "רגיל" }] });
  assert.equal(bad.rejected_members[0].reason, "symbolic_transformation_is_not_registered_gematria_method");
});

test("clock time is never a number", () => {
  const pack = compile({ members: [{ type: T.CLOCK_TIME, number: 1073, label: "10:73" }] });
  assert.equal(pack.rejected_members[0].reason, "clock_time_is_not_number");
});

test("1202/1182 guard: 2026 date cannot carry 1202; 1202 only as sourced Oct7 cross-time", () => {
  const claims1202 = compile({ members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "מסתתר", 1202)] });
  assert.equal(claims1202.bundle.findings.filter(f => f.subject.type === "date_expression").length, 0);
  assert.match(claims1202.rejected_members[0].reason, /engine_receipt_value_mismatch:1182/);
  // even with a (forged) matching receipt, an unscoped 1202 member is refused
  const forged = compile({
    members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "מסתתר", 1202)],
    receiptResolver: (x) => ({ status: "ok", method_key: "מסתתר", input: x.expression, result: 1202 }),
  });
  assert.equal(forged.rejected_members[0].reason, "1202_reserved_for_sourced_oct7_cross_time_member");
  const honest = compile({ members: [m(T.DATE_EXPRESSION, "י״ט בתשרי תשפ״ז", "מסתתר", 1182)] });
  assert.equal(honest.rejected_members.length, 0);
  const cross = compile().bundle.findings.filter(f => f.projection.dimensions.crossTime);
  assert.equal(cross.length, 1);
  assert.equal(cross[0].verification.engine_result, 1202);
  assert.equal(cross[0].projection.dimensions.crossTime.historical_child_event, false);
  // arbitrary cross_time subject must not admit 1202, even with source + canonical מסתתר receipt
  const otherSubject = compile({ members: [m(T.EXPRESSION_MATCH, "כ״ב בתשרי תשפ״ד", "מסתתר", 1202, { scope: "cross_time", cross_time_subject: "other-event", source_ref: "post:5112" })] });
  assert.equal(otherSubject.rejected_members[0].reason, "1202_reserved_for_sourced_oct7_cross_time_member");
  // oct7 with a non-מסתתר receipt is refused too
  const wrongMethod = compile({
    members: [m(T.EXPRESSION_MATCH, "x", "רגיל", 1202, { scope: "cross_time", cross_time_subject: "oct7" })],
    receiptResolver: (x) => ({ status: "ok", method_key: "רגיל", input: x.expression, result: 1202 }),
  });
  assert.equal(wrongMethod.rejected_members[0].reason, "1202_reserved_for_sourced_oct7_cross_time_member");
  const noSource = compile({ members: [m(T.EXPRESSION_MATCH, "חרבות ברזל", "מסתתר", 1202, { scope: "cross_time", cross_time_subject: "oct7", source_ref: null })] });
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

test("legacy research_objects: engine_verified=true alone is insufficient; a canonical receipt admits the same identity once", () => {
  const legacy = (id, extra = {}) => ({
    id, statement: `legacy ${id}`, value: 363, status: "approved", privacy_scope: "public", source: "post", source_ref: `post:5112#${id}`,
    kind: "fact", terms: [], engine_verified: true,
    engine_detail: { claimed_expression: "המשיח", claimed_method: "רגיל", claimed_value: 363 }, ...extra,
  });
  const row = legacy("ro-legacy");
  const snapshot = JSON.stringify(row);
  // no resolver / no receipt -> gated, never inferred from engine_verified
  for (const over of [{}, { researchObjectReceiptResolver: () => null }]) {
    const pack = compile({ researchObjects: [row], ...over });
    assert.ok(!pack.bundle.findings.some(f => f.identity.sourceIdentity?.researchObjectId === "ro-legacy"));
    assert.equal(pack.gated_research_objects[0].research_object_id, "ro-legacy");
  }
  // invalid receipts: alias method, wrong value
  for (const bad of [{ method_key: "regular", result: 363 }, { method_key: "רגיל", result: 364 }, { method_key: "מסתתר", result: 363 }]) {
    const pack = compile({ researchObjects: [row], researchObjectReceiptResolver: (r) => ({ status: "ok", input: "המשיח", ...bad }) });
    assert.ok(!pack.bundle.findings.some(f => f.identity.sourceIdentity?.researchObjectId === "ro-legacy"), JSON.stringify(bad));
  }
  // canonical receipt (duplicate rows supplied) -> admitted exactly once, same identity, row untouched
  const good = (r) => ({ status: "ok", method_key: "רגיל", input: r.engine_detail.claimed_expression, result: 363 });
  const pack = compile({ researchObjects: [row, row], researchObjectReceiptResolver: good });
  const found = pack.bundle.findings.filter(f => f.identity.sourceIdentity?.researchObjectId === "ro-legacy");
  assert.equal(found.length, 1);
  assert.equal(found[0].verification.verification_state, "match");
  assert.equal(found[0].verification.engine_result, 363);
  assert.equal(found[0].identity.sourceIdentity.researchObjectId, "ro-legacy");
  assert.equal(found[0].source.sourceRef, "post:5112#ro-legacy");
  assert.equal(found[0].projection.dimensions.legacyReverified, true);
  assert.equal(JSON.stringify(row), snapshot, "DB row is not mutated");
  assert.equal(pack.gated_research_objects.length, 0);
});

test("legacy re-verification respects access: private rows never reach the resolver or the bundle", () => {
  let calls = 0;
  const priv = { id: "ro-priv-legacy", statement: "s", value: 363, status: "approved", privacy_scope: "private", source_ref: "post:5112#p", engine_verified: true,
    engine_detail: { claimed_expression: "המשיח", claimed_method: "רגיל", claimed_value: 363 } };
  const pack = compile({ researchObjects: [priv], researchObjectReceiptResolver: (r) => { calls++; return { status: "ok", method_key: "רגיל", input: "המשיח", result: 363 }; } });
  assert.equal(calls, 0);
  assert.ok(!pack.bundle.findings.some(f => f.identity.sourceIdentity?.researchObjectId === "ro-priv-legacy"));
});
