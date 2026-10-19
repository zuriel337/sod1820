// Context Depth projection over the real 5112 evidence (read-only Supabase reads 19.10.2026).
// Coverage states only: no total, no 0–100, no ranking (DEC-METER-002 is OPEN).
import test from "node:test";
import assert from "node:assert/strict";
import { buildContextDepth, convergenceMeterFacts, COVERAGE, DIMENSIONS, measured, flagLabel, sourceGroups, NOT_MEASURED } from "../src/lib/research/contextDepthProjection2029.js";
import { buildYearHints, buildPaths } from "../src/lib/research/contextDepthProjection2029.js";
import { getCurrentTemporalContext } from "../src/lib/timeFlow.js";
import { cardReturnTo, cardRestoreFor } from "../src/lib/research/journeySourceReturn.js";
import { buildExactReturnPatch } from "../src/lib/research/researchContext.js";
import { POST_5112, NUMBERS_5112, YEAR_HINTS_5112, PATHS_5112 } from "./fixtures/context-map-harness/depthFixture.js";
import fs from "node:fs";

const at = (iso) => getCurrentTemporalContext(new Date(iso));
const NOW = at("2026-10-20T12:00:00+03:00");

const depth = (audience = "public", extra = {}) => buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience, temporal: NOW, yearHints: YEAR_HINTS_5112, paths: PATHS_5112, ...extra });
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
  // public: only the published row (תשפז) counts for 787; the two unpublished rows add nothing
  assert.deepEqual(calc.facts.find((f) => f.value === 787).results.map((r) => r.phrase), ["תשפז"]);
  assert.deepEqual(dim(depth("admin"), "calculations").facts.find((f) => f.value === 787).results.map((r) => r.phrase).sort(), ["ושמחת בחגך", "מי שגמלך כל טוב הוא יגמלך כל טוב סלה", "תשפז"].sort());
});

test("links: only hop 1 is read on open, so coverage is never full; tag-only numbers are marked", () => {
  const links = dim(depth(), "links");
  assert.equal(links.coverage, COVERAGE.PARTIAL);
  assert.equal(links.facts.find((f) => f.value === 787).viaTagsOnly, true);
  assert.equal(links.facts.find((f) => f.value === 1202).viaTagsOnly, false);
  assert.equal(links.facts.find((f) => f.value === 1202).nonTag, 26);
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

const n787 = (audience = "admin") => depth(audience).numbers.find((n) => n.value === 787);

test("787 in post 5112: three expressions, each split into three distinct layers", () => {
  const exprs = n787("admin").expressions;
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
  const [tashpaz, vesamachta, gomel] = n787("admin").expressions.map((e) => e.calculation);
  assert.deepEqual([tashpaz.rowVerified, tashpaz.rowPublished], [true, true]);
  assert.deepEqual([vesamachta.rowVerified, vesamachta.rowPublished], [true, false]);
  assert.deepEqual([gomel.reproducesClaim, gomel.rowVerified, gomel.rowPublished], [true, false, false]);
});

test("the plan document is documentation, not a source; the post body and tags are one source group", () => {
  const tashpaz = n787("admin").expressions[0];
  assert.ok(tashpaz.source.items.some((s) => s.kind === "plan_doc"));
  assert.deepEqual(tashpaz.source.groups, ["post:5112"]);
  assert.deepEqual(sourceGroups([{ kind: "tag", ref: "post:5112" }, { kind: "tag", ref: "post:5112" }, { kind: "post_body", ref: "post:5112" }]), ["post:5112"]);
  assert.deepEqual(sourceGroups([{ kind: "plan_doc", ref: "docs/x.md:1" }, { kind: "engine", ref: "gematria_api" }]), []);
  assert.deepEqual(depth("admin").sourceCount.groups, ["post:5112", "post:233"]);
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

test("publication stays separate from calculation: the public never gets a calculation for an unpublished row", () => {
  const [tashpaz, vesamachta, gomel] = n787("public").expressions;
  assert.equal(tashpaz.withheld, false); assert.equal(tashpaz.calculation.reproducesClaim, true);
  for (const e of [vesamachta, gomel]) {
    assert.equal(e.withheld, true); assert.equal(e.calculation, null);
    assert.ok(e.source.items.length > 0, "the source layer still shows the phrase as the post itself shows it");
  }
  assert.ok(!JSON.stringify(depth("public")).includes('"rowPublished":false'), "no unpublished-row flag reaches the public projection");
});

test("tag-derived relations never strengthen the meter", () => {
  const only = (graph) => buildContextDepth({ subject: POST_5112, numbers: [{ value: 5, graph, calculations: [], convergence: null }] }).dimensions.find((d) => d.key === "links");
  assert.equal(only({ direct: 28, tagDerived: 28 }).coverage, COVERAGE.NONE);
  assert.equal(only({ direct: 28 }).coverage, COVERAGE.NONE, "unknown tag count is treated as all-tag");
  assert.equal(only({ direct: 29, tagDerived: 28 }).coverage, COVERAGE.PARTIAL);
  const base = depth().dimensions.map((d) => d.coverage);
  const more = depth("public", { numbers: NUMBERS_5112.map((n) => ({ ...n, graph: { ...n.graph, direct: n.graph.direct + 20, tagDerived: n.graph.tagDerived + 20 } })) }).dimensions.map((d) => d.coverage);
  assert.deepEqual(more, base);
});

test("year hint: explicit, documented AND selected; the value 787 and the year 5787 stay two numbers", () => {
  assert.deepEqual(buildYearHints(YEAR_HINTS_5112, NOW, "public"), [], "pending selection: nothing for the public");
  const [candidate] = buildYearHints(YEAR_HINTS_5112, NOW, "admin");
  assert.equal(candidate.state, "candidate");
  const selected = YEAR_HINTS_5112.map((h) => ({ ...h, editorialSelection: true }));
  const [hint] = buildYearHints(selected, NOW, "public");
  assert.equal(hint.state, "active");
  assert.equal(hint.label, "רמז השנה · תשפ״ז");
  assert.equal(hint.value, 787); assert.equal(hint.hebrewYear, 5787);
  assert.equal(hint.valueLabel, "ערך גימטרי 787"); assert.match(hint.yearLabel, /5787/);
  assert.notEqual(hint.value, hint.hebrewYear);
  assert.deepEqual(buildYearHints(selected.map((h) => ({ ...h, link: "numeric_equality" })), NOW, "admin"), [], "numeric equality alone is never a year hint");
  assert.deepEqual(buildYearHints(selected, null, "public"), []);
});

test("year rollover updates the marker only: nothing is stored, the hint, source and locator remain", () => {
  const selected = YEAR_HINTS_5112.map((h) => ({ ...h, editorialSelection: true }));
  const before = at("2027-10-01T12:00:00+03:00"), after = at("2027-10-02T12:00:00+03:00");
  assert.equal(buildYearHints(selected, before, "public")[0].state, "active");
  const [next] = buildYearHints(selected, after, "public");
  assert.equal(next.state, "archived");
  assert.equal(next.label, "קבוצת שנה · תשפ״ז");
  assert.ok(!next.label.includes("רמז השנה"));
  assert.equal(next.locatorId, "plane-787-year-joy");
  assert.equal(at("2026-09-11T12:00:00+03:00").hebrew.year_label, "תשפ״ו");
  assert.equal(buildYearHints(selected, at("2026-09-11T12:00:00+03:00"), "public")[0].state, "upcoming");
  assert.deepEqual(buildYearHints(YEAR_HINTS_5112, after, "public"), []);
  // depth calculations, sources and strips are identical before and after the rollover
  const a = depth("admin", { temporal: before, yearHints: selected }), b = depth("admin", { temporal: after, yearHints: selected });
  assert.deepEqual(a.dimensions, b.dimensions); assert.deepEqual(a.numbers, b.numbers);
});

test("a year hint does not change coverage or add a source", () => {
  const selected = YEAR_HINTS_5112.map((h) => ({ ...h, editorialSelection: true }));
  const plain = depth("public", { yearHints: [] }), hinted = depth("public", { yearHints: selected });
  assert.deepEqual(hinted.dimensions, plain.dimensions);
  assert.deepEqual(hinted.sourceCount, plain.sourceCount);
});

test("the route 5112 → 1718/1202 → 233 stops before a pending link until the editor selects it", () => {
  const pub = buildPaths(PATHS_5112, "public")[0].stations;
  assert.deepEqual(pub.map((s) => s.kind), ["post", "number", "expression", "source_region"]);
  assert.ok(pub.every((s) => !s.pending));
  assert.equal(pub.find((s) => s.basis === "tag").strengthens, false);
  assert.equal(pub.find((s) => s.basis === "verified_calculation").strengthens, true);
  const admin = buildPaths(PATHS_5112, "admin")[0].stations;
  assert.equal(admin.length, 5); assert.equal(admin.at(-1).pending, true); assert.equal(admin.at(-1).basisLabel, "ממתין לחיבור"); assert.equal(admin.at(-1).strengthens, false);
  const chosen = PATHS_5112.map((p) => ({ ...p, stations: p.stations.map((s) => (s.pending ? { ...s, editorialSelection: true } : s)) }));
  assert.equal(buildPaths(chosen, "public")[0].stations.length, 5);
});

test("exact return to the card: a number opened from it comes back, other posts and plain contexts do not", () => {
  const post = { id: 5112, title: "טיסה 1073" };
  const back = cardReturnTo({ post, number: 787, listHref: "/posts?page=2#old" });
  assert.equal(back.href, "/posts?page=2#post-card-5112");
  const context = { subject: { id: "plane-787-year-joy", type: "source", label: "x", href: "/post/p#source-locator-plane-787-year-joy" }, returnTo: back };
  const patch = buildExactReturnPatch(context);
  assert.deepEqual(cardRestoreFor({ selection: patch.selection }, 5112), { number: 787 });
  assert.equal(cardRestoreFor({ selection: patch.selection }, 5113), null);
  assert.deepEqual(cardRestoreFor({ selection: buildExactReturnPatch({ returnTo: cardReturnTo({ post, listHref: "/posts" }) }).selection }, 5112), { number: null });
  assert.equal(cardRestoreFor({ selection: { entityId: "787", entityType: "number" } }, 5112), null);
  assert.equal(cardRestoreFor(null, 5112), null);
});

test("private research_objects never enter the depth modules or their fixtures", () => {
  for (const file of ["src/lib/research/contextDepthProjection2029.js", "src/components/experience2029/ContextDepthMeter2029.jsx", "src/components/experience2029/PostIndexCard2029.jsx",
    "src/lib/research/contextMapProjection2029.js", "src/lib/research/contextMapReaders2029.js", "test/fixtures/context-map-harness/depthFixture.js"]) {
    const text = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!/research_objects|privacy_scope|channel_updates|fetchResearchObjects/.test(text), file);
  }
});
