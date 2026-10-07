import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_MEMBER_TYPE as T,
  EVENT_SURFACE,
  FZ1073_EVENT_CANDIDATE_DECLARATION,
  projectEventContextForSurface,
} from "./eventObservationCompiler.js";
import { compileEventObservationWithSystemMethods } from "./eventSystemMethodRuntime.js";
import { createCanonicalNumberW2Executors } from "./researchW2ExecutorsBase.js";
import { gematriaTraceToFinding } from "./gematriaTrace.js";
import { galleryImageToResearchAdmission } from "../researchAdmission.js";

// Fixture standing in for the live canonical sources (verified live by GPT in the assignment):
// fn_zero_scale v1 (73 and 730 share core_root 73) and the nodes rule registry versions. The REAL
// numeric_operators executor runs against it — nothing about shitat / zero logic is re-implemented
// in the module under test.
const ZERO_SCALE = { 73: { core_root: 73 }, 730: { core_root: 73 } };
const fakeSupabase = {
  rpc: async (name, { p_value }) => {
    const z = name === "fn_zero_scale" ? ZERO_SCALE[p_value] : null;
    return z
      ? { data: { applicable: true, method_id: "zero_scale_law", version: 1, core_root: z.core_root, scale_chain: [73, 730, 7300, 73000, 730000] }, error: null }
      : { data: { applicable: false }, error: null };
  },
};
const numericOperators = createCanonicalNumberW2Executors({
  supabase: fakeSupabase,
  numericRuleVersions: async () => ({ shitat_haechad_alef_law: 1, zero_navigation: 1, zero_scale_law: 1 }),
}).numeric_operators;

const post = { id: 5112, slug: "flydubai-fz1073", date: "2026-09-30T20:15:36.179757+00:00" };
const flight = { type: T.FLIGHT_NUMBER, number: 1073, key: "flight:FZ1073", label: "FZ1073", source_ref: "post:5112" };
const wisdom = { type: T.EXPRESSION_MATCH, expression: "חכמה", method_key: "רגיל", claimed_value: 73, source_ref: "post:5112" };
const traceFor = (m) => (m.expression === "חכמה" && m.method_key === "רגיל"
  ? gematriaTraceToFinding({ status: "ok", method_key: "רגיל", input: "חכמה", result: 73, method_version: "fixture-v1" }, { inputText: "חכמה", createdAt: "2026-10-06T00:00:00Z" })
  : null);

const galleryRow = (id, extra = {}) => ({
  id, gallery_id: "56971760-384f-42b0-8032-f2a0eb72cb0d", wp_gallery_id: 39, image_type: "image", name: "730 = חכמה",
  ocr_status: "done", ocr_text: "730 = חכמה", ocr_numbers: [73, 730], ...extra,
});
const gallerySource = (id, extra = {}) => ({
  envelope: galleryImageToResearchAdmission(galleryRow(id), { projectionReason: "supports 730/73 context" }),
  supports: [730, 73], rank: 1, rankReason: "explicit 730=חכמה discussion", accessTier: "public", ...extra,
});

const run = (over = {}) => compileEventObservationWithSystemMethods({
  candidate: FZ1073_EVENT_CANDIDATE_DECLARATION, post, members: [flight, wisdom], numericOperators,
  supportNumbers: [730], supportingSources: [gallerySource("c502fa89")], receiptResolver: traceFor, ...over,
});
const chainOf = (pack, input, ruleId) => pack.system_methods.chains.find(c => c.input === input && c.rule_id === ruleId);

test("exact chain: FlightNumber 1073 -> shitat_haechad_alef_law v1 -> 73; raw identity untouched", async () => {
  const pack = await run();
  const c = chainOf(pack, 1073, "shitat_haechad_alef_law");
  assert.deepEqual([c.target, c.rule_version, c.role], [73, 1, "source"]);
  const f = pack.bundle.findings.find(x => x.id === c.finding_id);
  assert.equal(f.evidence.facts[0].output.remainder, 73);
  assert.equal(f.evidence.facts[0].output.leading_unit, 1000);
  const fl = pack.bundle.findings.find(x => x.subject.type === "flight_number");
  assert.equal(fl.subject.value, 1073);
  assert.equal(fl.subject.label, "FZ1073");
  assert.ok(!JSON.stringify(pack.bundle.findings).includes("10.73"));
});

test("exact chain: 730 -> zero_navigation / zero_scale v1 -> 73", async () => {
  const pack = await run();
  const nav = chainOf(pack, 730, "zero_navigation");
  const scale = chainOf(pack, 730, "zero_scale_law");
  assert.deepEqual([nav.target, nav.rule_version, nav.role], [73, 1, "support"]);
  assert.deepEqual([scale.target, scale.rule_version], [73, 1]);
});

test("convergence 1073 -> 73 <- 730: two chains, lineage, DERIVATION/CONVERGENCE, never independent, not equality", async () => {
  const pack = await run();
  assert.equal(pack.system_methods.convergence_finding_ids.length, 1);
  const id = pack.system_methods.convergence_finding_ids[0];
  const f = pack.bundle.findings.find(x => x.id === id);
  assert.equal(f.subject.value, 73);
  const fact = f.evidence.facts[0];
  assert.deepEqual([...new Set(fact.chains.map(c => c.input))].sort((a, b) => a - b), [730, 1073]);
  assert.equal(fact.numeric_equality_between_inputs, false);
  assert.equal(fact.independent_evidence, false);
  const out = pack.bundle.finding_outcomes.find(o => o.finding_id === id);
  assert.equal(out.evidence_relation, "convergence");
  assert.deepEqual([...out.depends_on].sort(), fact.chains.map(c => c.finding_id).sort());
  for (const o of pack.bundle.finding_outcomes) assert.notEqual(o.evidence_relation, "independent_evidence");
  for (const cid of out.depends_on) {
    assert.equal(pack.bundle.finding_outcomes.find(o => o.finding_id === cid).evidence_relation, "derivation");
  }
  // no direct relation between the two inputs
  assert.ok(!pack.bundle.findings.some(x => x.projection.relations?.length));
  assert.equal(pack.event.canonical, false);
  assert.equal(pack.invariants.convergence_is_not_numeric_equality, true);
});

test("no convergence from a single input; no permutation 1073<->730 anywhere", async () => {
  const solo = await run({ supportNumbers: [] });
  assert.equal(solo.system_methods.convergence_finding_ids.length, 0);
  const pack = await run();
  const text = JSON.stringify(pack.bundle.findings.filter(f => f.kind !== "event-supporting-source"));
  assert.ok(!/permut|reorder|swap/i.test(text));
  assert.ok(!pack.bundle.findings.some(f => f.verification?.engine_result === 1073 && String(f.source?.method).includes("730")));
});

test("canonical Trace חכמה רגיל=73 attaches as a separate engine finding, not a parent of the rule chain", async () => {
  const pack = await run();
  const w = pack.bundle.findings.find(f => f.subject.type === "expression");
  assert.equal(w.verification.engine_result, 73);
  assert.equal(w.source.engine, "gematria");
  const conv = pack.bundle.findings.find(f => f.id === pack.system_methods.convergence_finding_ids[0]);
  assert.ok(!conv.provenance.parentFindingIds.includes(w.id));
  // missing receipt -> no verified expression (the helper never computes 73=חכמה itself)
  const none = await run({ receiptResolver: () => null });
  assert.equal(none.bundle.findings.filter(f => f.subject.type === "expression").length, 0);
  assert.equal(none.rejected_members[0].reason, "engine_receipt_missing");
});

test("gallery admission stays representation/extraction with source_ref; OCR/all_values do not promote", async () => {
  const pack = await run({ supportingSources: [gallerySource("c502fa89", { supports: [] })] });
  const s = pack.bundle.findings.find(f => f.kind === "event-supporting-source");
  assert.equal(s.evidence.facts[0].semantic_role, "representation");
  assert.equal(s.evidence.facts[0].canonical, false);
  assert.equal(s.evidence.facts[0].extraction.is_fact, false);
  assert.equal(s.source.sourceRef, "gallery_images:c502fa89");
  assert.equal(s.evidence.facts[0].truth_score, null);
  // OCR numbers [73,730] did NOT become anchors/supports without an explicit declaration
  assert.deepEqual(s.evidence.facts[0].supports_numbers, []);
  assert.ok(!s.projection.anchors.some(a => a.space === "number"));
  // gallery is not the Event identity
  assert.equal(pack.event.ref, "event_candidate:FZ1073");
  assert.equal(pack.event.post.role, "source_presentation");
  // not admitted / canonical envelopes are refused
  const bad = await run({ supportingSources: [{ envelope: { admitted: false }, accessTier: "public" }, { envelope: { ...gallerySource("x").envelope, governance: { canonical: true } }, accessTier: "public" }] });
  assert.equal(bad.bundle.findings.filter(f => f.kind === "event-supporting-source").length, 0);
  assert.equal(bad.system_methods.supporting_sources.rejected.length, 2);
  // access fails closed without an explicit tier
  const noTier = await run({ supportingSources: [gallerySource("y", { accessTier: null })] });
  assert.equal(noTier.bundle.findings.filter(f => f.kind === "event-supporting-source").length, 0);
});

test("generic seam: a synthetic source from another corpus enters with no branch on source name", async () => {
  const synthetic = {
    envelope: galleryImageToResearchAdmission(galleryRow("sy"), {}),
    supports: [730], accessTier: "public", rank: 2,
  };
  synthetic.envelope = { ...synthetic.envelope, source: { type: "community_message", ref: "community:msg-1" }, intrinsicPayload: { name: "synthetic" } };
  const pack = await run({ supportingSources: [gallerySource("g1"), synthetic] });
  const refs = pack.bundle.findings.filter(f => f.kind === "event-supporting-source").map(f => f.source.sourceRef);
  assert.deepEqual(refs.sort(), ["community:msg-1", "gallery_images:g1"]);
  const src = readFileSyncText();
  assert.ok(!/zvi|sod\s*hashmal|community/i.test(src), "runtime module must not special-case any corpus name");
});

test("bounded: only top contextual sources in the pack, rest expandable by ref; deterministic", async () => {
  const many = Array.from({ length: 50 }, (_, i) => gallerySource(`img${String(i).padStart(2, "0")}`, { rank: 50 - i }));
  const pack = await run({ supportingSources: many });
  const shown = pack.bundle.findings.filter(f => f.kind === "event-supporting-source");
  assert.equal(shown.length, 3);
  assert.equal(pack.system_methods.supporting_sources.total, 50);
  assert.equal(pack.system_methods.supporting_sources.expandable_refs.length, 47);
  assert.equal(shown[0].source.sourceRef !== undefined, true);
  assert.deepEqual(pack.system_methods.supporting_sources.shown_refs[0], "gallery_images:img49");
  const cap = pack.bundle.capability_trace.find(c => c.key === "event_supporting_sources");
  assert.equal(cap.bounded.truncated, true);
  const sidecar = projectEventContextForSurface(pack, EVENT_SURFACE.CONTEXT_RAIL);
  assert.ok(sidecar.returned_count <= 12);
});

test("one-write propagation: the same rule-application/source finding ids are selectable from every surface", async () => {
  const pack = await run();
  const nav = chainOf(pack, 730, "zero_navigation").finding_id;
  const shitat = chainOf(pack, 1073, "shitat_haechad_alef_law").finding_id;
  const conv = pack.system_methods.convergence_finding_ids[0];
  const src = pack.bundle.findings.find(f => f.kind === "event-supporting-source").id;
  const ids = (surface, extra) => projectEventContextForSurface(pack, surface, extra).finding_ids;
  for (const s of [EVENT_SURFACE.POST, EVENT_SURFACE.DATE_EVENT, EVENT_SURFACE.TIMELINE, EVENT_SURFACE.CONTEXT_RAIL, EVENT_SURFACE.WORLD, EVENT_SURFACE.RAZIEL, EVENT_SURFACE.FOLLOW]) {
    const got = ids(s);
    for (const id of [nav, shitat, conv, src]) assert.ok(got.includes(id), `${s} missing ${id}`);
  }
  const n73 = ids(EVENT_SURFACE.NUMBER, { number: 73 });
  for (const id of [nav, shitat, conv]) assert.ok(n73.includes(id));
  assert.ok(ids(EVENT_SURFACE.NUMBER, { number: 1073 }).includes(shitat));
  assert.ok(ids(EVENT_SURFACE.NUMBER, { number: 730 }).includes(nav));
  // single identity: no duplicates in the bundle
  const all = pack.bundle.findings.map(f => f.id);
  assert.equal(new Set(all).size, all.length);
});

test("missing / unattested governed capability: no fabricated rule application", async () => {
  const none = await run({ numericOperators: null });
  assert.equal(none.system_methods.chains.length, 0);
  const unattested = createCanonicalNumberW2Executors({ supabase: fakeSupabase, numericRuleVersions: async () => ({}) }).numeric_operators;
  const p = await run({ numericOperators: unattested });
  assert.ok(!p.system_methods.chains.some(c => c.rule_id === "shitat_haechad_alef_law" || c.rule_id === "zero_navigation"));
  assert.equal(p.system_methods.convergence_finding_ids.length, 0);
});

import { readFileSync } from "node:fs";
function readFileSyncText() {
  return readFileSync(new URL("./eventSystemMethodRuntime.js", import.meta.url), "utf8")
    .split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n")
    .replace(/community_message/g, "");
}

// ── attribution ──
const ZVI_ID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
const named = (id, ref, type, attribution, accessTier = "public", extra = {}) => ({
  envelope: { ...galleryImageToResearchAdmission(galleryRow(id), {}), source: { type, ref }, intrinsicPayload: { name: ref } },
  supports: [730, 73], rank: 1, accessTier, attribution, ...extra,
});
const attrOf = (pack, ref) => pack.bundle.findings.find(f => f.source?.sourceRef === ref)?.evidence.facts[0].attribution;
const trio = () => [
  named("a", "research_object:contrib-1", "contributor_message", { role: "contributor", display_name: "צבי (OPOC)", contributor_id: ZVI_ID, channel: "research_intake" }, "public"),
  named("b", "post:145", "post", { role: "source_work", display_name: "סוד החשמל", source_id: "wp:31656", work_title: "post 145" }, "public", { rank: 2 }),
  named("c", "book:other-1", "book", { role: "source_work", display_name: "ספר אחר", work_title: "כותרת אחרת" }, "public", { rank: 3 }),
];

test("attribution: site interpretation is 'כי לה׳ המלוכה'; Human Gate stays governance metadata, never author", async () => {
  const pack = await run({ humanGate: "ZURIEL" });
  const conv = pack.bundle.findings.find(f => f.id === pack.system_methods.convergence_finding_ids[0]);
  const fact = conv.evidence.facts[0];
  assert.equal(fact.attribution.role, "site_interpretation");
  assert.equal(fact.attribution.display_name, "כי לה׳ המלוכה");
  assert.deepEqual(fact.governance, { human_gate: "ZURIEL", is_author: false });
  assert.ok(!JSON.stringify(fact.attribution).match(/צוריאל|zuriel/i));
  assert.ok(!readFileSyncText().includes("פרשנות צוריאל"));
});

test("attribution: contributor + source works + site coexist, separate identities, shared anchors, access untouched", async () => {
  const pack = await run({ supportingSources: trio(), maxSupportingSources: 5 });
  assert.deepEqual(attrOf(pack, "research_object:contrib-1"), { role: "contributor", display_name: "צבי (OPOC)", source_id: null, work_title: null, contributor_id: ZVI_ID, channel: "research_intake" });
  const sod = attrOf(pack, "post:145");
  assert.deepEqual([sod.role, sod.display_name, sod.source_id, sod.contributor_id], ["source_work", "סוד החשמל", "wp:31656", null]);
  assert.equal(attrOf(pack, "book:other-1").display_name, "ספר אחר");
  assert.equal(pack.bundle.findings.find(f => f.source.sourceRef === "research_object:contrib-1").access.tier, "public");
  // a private contributor source stays out under default access: attribution never widens access
  const priv = await run({ supportingSources: [named("q", "research_object:contrib-2", "contributor_message", { role: "contributor", display_name: "צבי (OPOC)", contributor_id: ZVI_ID }, "private")] });
  assert.equal(attrOf(priv, "research_object:contrib-2"), undefined);
  const srcs = pack.bundle.findings.filter(f => f.kind === "event-supporting-source");
  assert.equal(new Set(srcs.map(f => f.id)).size, 3);
  for (const f of srcs) assert.ok(f.projection.anchors.some(a => a.space === "number" && a.id === "730"));
  assert.ok(pack.bundle.findings.some(f => f.id === pack.system_methods.convergence_finding_ids[0]));
});

test("attribution: fail-closed — governance actor, missing contributor id, minted contributor for a work, unknown role", async () => {
  const bad = (a) => run({ supportingSources: [named("z", "x:1", "post", a)] }).then(p => [p.bundle.findings.filter(f => f.kind === "event-supporting-source").length, p.system_methods.supporting_sources.rejected[0]?.reason]);
  assert.deepEqual(await bad({ role: "source_work", display_name: "פרשנות צוריאל" }), [0, "governance_actor_is_not_attribution"]);
  assert.deepEqual(await bad({ role: "contributor", display_name: "צבי (OPOC)" }), [0, "contributor_id_required"]);
  assert.deepEqual(await bad({ role: "source_work", display_name: "סוד החשמל", contributor_id: ZVI_ID }), [0, "contributor_identity_not_mintable_for_role"]);
  assert.deepEqual(await bad({ role: "author", display_name: "x" }), [0, "attribution_role_unknown"]);
  assert.deepEqual(await bad({ role: "site_interpretation", display_name: "צוריאל" }), [0, "site_interpretation_label_fixed"]);
});

test("attribution: dedup by source ref never merges authorship; attribution does not change finding id or rank order", async () => {
  const plain = await run({ supportingSources: [named("p", "post:145", "post", null)] });
  const attributed = await run({ supportingSources: [named("p", "post:145", "post", { role: "source_work", display_name: "סוד החשמל" })] });
  const id = (p) => p.bundle.findings.find(f => f.kind === "event-supporting-source").id;
  assert.equal(id(plain), id(attributed));
  const two = await run({ supportingSources: trio() });
  assert.equal(two.system_methods.supporting_sources.total, 3);
});

test("attribution: same attribution/ids through every projection surface", async () => {
  const pack = await run({ supportingSources: trio() });
  const ids = pack.bundle.findings.filter(f => f.kind === "event-supporting-source").map(f => f.id);
  for (const s of [EVENT_SURFACE.POST, EVENT_SURFACE.TIMELINE, EVENT_SURFACE.CONTEXT_RAIL, EVENT_SURFACE.WORLD, EVENT_SURFACE.RAZIEL]) {
    const got = projectEventContextForSurface(pack, s).finding_ids;
    for (const id of ids) assert.ok(got.includes(id), `${s} missing ${id}`);
  }
  assert.ok(pack.bundle.findings.filter(f => f.kind === "event-supporting-source").every(f => f.projection.dimensions.attribution.display_name));
});
