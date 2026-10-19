// Context Depth projection over the real 5112 evidence (read-only Supabase reads 19.10.2026).
// Coverage states only: no total, no 0–100, no ranking (DEC-METER-002 is OPEN).
import test from "node:test";
import assert from "node:assert/strict";
import { buildContextDepth, convergenceMeterFacts, COVERAGE, DIMENSIONS, measured, flagLabel, sourceGroups, NOT_MEASURED } from "../src/lib/research/contextDepthProjection2029.js";
import { POST_5112, NUMBERS_5112 } from "./fixtures/context-map-harness/depthFixture.js";

const depth = (audience = "public") => buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience });
const dim = (d, key) => d.dimensions.find((x) => x.key === key);

test("six separate dimensions, each with a coverage state, and no score anywhere", () => {
  const d = depth();
  assert.deepEqual(d.dimensions.map((x) => x.key), DIMENSIONS.map((x) => x.key));
  assert.ok(d.dimensions.every((x) => Object.values(COVERAGE).includes(x.coverage)));
  const json = JSON.stringify(d);
  assert.ok(!/"(score|total|rank|strength|percent)"/i.test(json));
  assert.ok(!("covered" in d) && !("dimensionCount" in d));
});

test("calculations: engine-verified results only; 1073 (flight number) stays without a calculation", () => {
  const calc = dim(depth(), "calculations");
  assert.equal(calc.coverage, COVERAGE.PARTIAL);
  assert.deepEqual(calc.facts.map((f) => f.value), [787, 1718, 1202, 363]);
});

test("links: only hop 1 is read on open, so coverage is never full; tag-only numbers are marked", () => {
  const links = dim(depth(), "links");
  assert.equal(links.coverage, COVERAGE.PARTIAL);
  assert.equal(links.facts.find((f) => f.value === 787).viaTagsOnly, true);
  assert.equal(links.facts.find((f) => f.value === 1202).viaTagsOnly, false);
});

test("independence and approval are reported as unmapped, never invented", () => {
  const d = depth();
  assert.equal(dim(d, "independence").coverage, COVERAGE.UNMAPPED);
  assert.equal(dim(d, "approval").coverage, COVERAGE.UNMAPPED);
  assert.match(dim(d, "independence").note, /DC_SMART_METER/);
});

test("two methods on one phrase are flagged as one dependent family, not two witnesses", () => {
  const dep = depth().dependencies;
  assert.equal(dep.length, 1);
  assert.equal(dep[0].phrase, "כב בתשרי תשפד");
  assert.deepEqual(dep[0].hits.map((h) => h.value).sort(), [1202, 1718]);
});

test("curation and card quality stay separate facts; the existing meter is inert", () => {
  const d = depth();
  const editor = dim(d, "editor").facts.find((f) => f.value === 1202);
  assert.deepEqual(editor.tiers, { gold: 2, silver: 4 });
  assert.deepEqual(editor.cardQuality.map((c) => c.quality), [8, 5, 0, 8, 0]);
  assert.equal(d.numbers.find((n) => n.value === 1202).existingMeter, 100);
  assert.equal(dim(d, "convergence").coverage, COVERAGE.PARTIAL);
});

test("no derived data means no meter at all (list cards never fabricate a state)", () => {
  assert.equal(buildContextDepth({ subject: POST_5112, numbers: [] }), null);
  assert.equal(buildContextDepth({ subject: null, numbers: NUMBERS_5112 }), null);
});

test("convergence_meter adapter keeps layers, cards and tiers from the existing function output", () => {
  const raw = { score: 33, cards: [{ slug: "gapfill-718", title: "718", quality: 8 }],
    layers: [{ ok: true, name: "התכנסות מילים", detail: "2 ישויות" }, { ok: false, name: "קשרי גרף", detail: "0 קשרים" }],
    entities: [{ tier: "gold" }, { tier: "silver" }, { tier: null }] };
  const f = convergenceMeterFacts(raw);
  assert.deepEqual(f.tiers, { gold: 1, silver: 1 });
  assert.equal(f.layers.filter((l) => l.ok).length, 1);
  assert.equal(f.existingMeter, 33);
  assert.equal(convergenceMeterFacts(null), null);
});

const n787 = () => depth().numbers.find((n) => n.value === 787);

test("787 in post 5112: three expressions, each split into three distinct layers", () => {
  const exprs = n787().expressions;
  assert.deepEqual(exprs.map((e) => e.phrase), ["תשפז", "ושמחת בחגך", "מי שגמלך כל טוב הוא יגמלך כל טוב סלה"]);
  for (const e of exprs) {
    assert.ok(e.source.items.length > 0, "source layer");
    assert.equal(e.calculation.reproducesClaim, true, "calculation layer");
    assert.ok(e.interpretation?.text && e.interpretation.attestedBy, "interpretation layer");
    // a layer never leaks into another one
    assert.ok(!("interpretation" in e.source) && !("text" in e.calculation) && !("sources" in e.interpretation));
  }
});

test("engine reproduction and row flags are separate facts; flags can differ from the reproduction", () => {
  const [tashpaz, vesamachta, gomel] = n787().expressions.map((e) => e.calculation);
  assert.deepEqual([tashpaz.rowVerified, tashpaz.rowPublished], [true, true]);
  assert.deepEqual([vesamachta.rowVerified, vesamachta.rowPublished], [true, false]);
  assert.deepEqual([gomel.reproducesClaim, gomel.rowVerified, gomel.rowPublished], [true, false, false]);
});

test("the plan document is documentation, not a source; the post body and tags are one source group", () => {
  const tashpaz = n787().expressions[0];
  assert.ok(tashpaz.source.items.some((s) => s.kind === "plan_doc"));
  assert.deepEqual(tashpaz.source.groups, ["post:5112"]);
  assert.deepEqual(sourceGroups([{ kind: "tag", ref: "post:5112" }, { kind: "tag", ref: "post:5112" }, { kind: "post_body", ref: "post:5112" }]), ["post:5112"]);
  assert.deepEqual(sourceGroups([{ kind: "plan_doc", ref: "docs/x.md:1" }, { kind: "engine", ref: "gematria_api" }]), []);
  assert.deepEqual(depth().sourceCount.groups, ["post:5112"]);
});

test("post_tags never make a post more independent: 28 tag edges stay one source", () => {
  const tags = Array.from({ length: 28 }, () => ({ kind: "tag", ref: "post:5112" }));
  assert.equal(sourceGroups(tags).length, 1);
  assert.equal(dim(depth(), "independence").coverage, COVERAGE.UNMAPPED);
});

test("null is never shown as a measured zero", () => {
  assert.equal(measured(null), NOT_MEASURED);
  assert.equal(measured(undefined), NOT_MEASURED);
  assert.equal(measured(Number.NaN), NOT_MEASURED);
  assert.equal(measured(0), "0");
  assert.equal(flagLabel(null, "כן", "לא"), "לא נבדק");
  assert.equal(flagLabel(false, "כן", "לא"), "לא");
  const d = buildContextDepth({ subject: POST_5112, numbers: [{ value: 5, graph: { direct: null }, calculations: [], convergence: null }, { value: 6, graph: { direct: 0, media: 0 }, calculations: [], convergence: { layers: [], cards: [{ slug: "x", quality: null }], tiers: { gold: 0, silver: 0 }, existingMeter: null } }] });
  const links = d.dimensions.find((x) => x.key === "links");
  assert.deepEqual(links.unread, [5]);
  assert.equal(links.facts.find((f) => f.value === 6).direct, 0);
  assert.equal(d.numbers[0].direct, null);
  assert.equal(d.numbers[1].existingMeter, null);
  assert.equal(d.dimensions.find((x) => x.key === "convergence").unread[0], 5);
});
