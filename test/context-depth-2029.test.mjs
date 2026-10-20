// Context Depth projection over the real 5112 evidence (read-only Supabase reads 19.10.2026).
// Coverage states only: no total, no 0–100, no ranking (DEC-METER-002 is OPEN).
import test from "node:test";
import assert from "node:assert/strict";
import { buildContextDepth, convergenceMeterFacts, COVERAGE, DIMENSIONS, measured, flagLabel, sourceGroups, NOT_MEASURED } from "../src/lib/research/contextDepthProjection2029.js";
import { buildYearHints, buildPaths } from "../src/lib/research/contextDepthProjection2029.js";
import { getCurrentTemporalContext } from "../src/lib/timeFlow.js";
import { cardReturnTo, cardRestoreFor, sourceRegionFocus } from "../src/lib/research/journeySourceReturn.js";
import { buildExactReturnPatch, normalizeResearchContext } from "../src/lib/research/researchContext.js";
import { matchUnitApproval, fetchUnitApprovalRows, resolveUnitApprovals, APPROVAL, CHANNEL, PUBLIC_YEAR_HINT_PROJECTION } from "../src/lib/research/unitApproval2029.js";
import { POST_5112, NUMBERS_5112, YEAR_HINTS_5112, PATHS_5112, APPROVAL_ROW_5112, APPROVAL_ROW_UNIT_SIMULATED } from "./fixtures/context-map-harness/depthFixture.js";
import fs from "node:fs";

const at = (iso) => getCurrentTemporalContext(new Date(iso));
const NOW = at("2026-10-20T12:00:00+03:00");

const approvalOf = (row) => (row === "published" ? PUBLISHED_PROJECTION : { [YEAR_HINTS_5112[0].id]: matchUnitApproval(row ? [row] : [], YEAR_HINTS_5112[0]) });
const UNIT_ROW = APPROVAL_ROW_UNIT_SIMULATED;
const PUBLISHED_PROJECTION = { [YEAR_HINTS_5112[0].id]: { state: "published", channel: "public_projection", rowId: "simulated" } };
const depth = (audience = "public", extra = {}) => buildContextDepth({ subject: POST_5112, numbers: NUMBERS_5112, audience, temporal: NOW, yearHints: YEAR_HINTS_5112, approvals: approvalOf(APPROVAL_ROW_5112), paths: PATHS_5112, ...extra });
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

test("approval must cover the UNIT: the broad synthesis db28c232 is container-level only and never approves the 787 unit", () => {
  const hint = YEAR_HINTS_5112[0];
  assert.deepEqual(hint.approvalTerms, ["787", "תשפ\"ז", "ושמחת בחגך", "מי שגמלך כל טוב הוא יגמלך כל טוב סלה"], "all three layers incl. the gomel answer");
  assert.equal(hint.unit.sourceRef, "posts:5112#block:plane-787-year-joy");
  assert.deepEqual(matchUnitApproval([APPROVAL_ROW_5112], hint), { state: APPROVAL.CONTAINER_LEVEL_ONLY, rowId: APPROVAL_ROW_5112.id, channel: CHANNEL.RESEARCH_OBJECTS });
  assert.deepEqual(matchUnitApproval([UNIT_ROW], hint), { state: APPROVAL.APPROVED_UNPUBLISHED, rowId: UNIT_ROW.id, channel: CHANNEL.RESEARCH_OBJECTS });
  for (const patch of [{ source_ref: "posts:5112#block:other" }, { source_ref: "flydubai-fz1073-363-14000-remzei-geula" }, { source_ref: null },
    { terms: UNIT_ROW.terms.filter((t) => t !== "מי שגמלך כל טוב הוא יגמלך כל טוב סלה") }, { terms: UNIT_ROW.terms.filter((t) => t !== "ושמחת בחגך") }, { terms: ["787", "תשפ\"ז"] }]) {
    assert.notEqual(matchUnitApproval([{ ...UNIT_ROW, ...patch }], hint).state, APPROVAL.APPROVED_UNPUBLISHED, JSON.stringify(patch).slice(0, 80));
  }
  for (const patch of [{ privacy_scope: "private" }, { privacy_scope: "family_shared" }, { status: "candidate" }, { status: "rejected" }, { kind: "observation" }, { relates: ["post:5113"] }, { relates: [] }]) {
    assert.equal(matchUnitApproval([{ ...UNIT_ROW, ...patch }], hint).state, patch.privacy_scope ? APPROVAL.NONE : APPROVAL.NONE, JSON.stringify(patch));
  }
  assert.equal(matchUnitApproval([{ ...UNIT_ROW, privacy_scope: "private" }], hint).state, APPROVAL.NONE);
  assert.equal(matchUnitApproval([], hint).state, APPROVAL.NONE); assert.equal(matchUnitApproval(null, hint).state, APPROVAL.NONE);
  assert.deepEqual(Object.keys(matchUnitApproval([UNIT_ROW], hint)).sort(), ["channel", "rowId", "state"], "nothing from the row leaks");
  assert.equal(matchUnitApproval([{ ...UNIT_ROW, terms: UNIT_ROW.terms.map((t) => t.replace('"', "״")) }], hint).state, APPROVAL.APPROVED_UNPUBLISHED, "quote marks do not matter");
});

test("the public marker has no authorised path: not even a public-scope unit row publishes through research_objects", () => {
  assert.equal(PUBLIC_YEAR_HINT_PROJECTION.available, false);
  const hint = YEAR_HINTS_5112[0];
  for (const channel of [CHANNEL.RESEARCH_OBJECTS, CHANNEL.PUBLIC_PROJECTION]) {
    assert.notEqual(matchUnitApproval([{ ...UNIT_ROW, privacy_scope: "public" }], hint, { channel }).state, APPROVAL.PUBLISHED, channel);
  }
  const real = { [hint.id]: matchUnitApproval([{ ...UNIT_ROW, privacy_scope: "public" }], hint) };
  assert.deepEqual(buildYearHints(YEAR_HINTS_5112, NOW, "public", real), []);
  assert.deepEqual(buildYearHints(YEAR_HINTS_5112, NOW, "public", { [hint.id]: { state: "published", channel: "research_objects" } }), [], "a published state without a public projection channel is ignored");
});

test("reads: guests and users never query research_objects; the admin session reads explicit columns only", async () => {
  const calls = [];
  const client = { from(table) { const q = { table, cols: null, select(c) { q.cols = c; return q; }, contains() { return q; }, eq() { return q; }, in() { return q; },
    limit() { calls.push({ table, cols: q.cols }); return Promise.resolve({ data: [UNIT_ROW], error: null }); } }; return q; } };
  for (const audience of ["public", "user", undefined]) assert.deepEqual(await fetchUnitApprovalRows("post:5112", { audience, client }), []);
  assert.equal(calls.length, 0, "no query at all for guests and signed-in users");
  assert.deepEqual(await fetchUnitApprovalRows("post:5112", { audience: "admin", client }), [UNIT_ROW]);
  assert.equal(calls.length, 1); assert.equal(calls[0].table, "research_objects");
  assert.ok(!calls[0].cols.includes("*") && !/statement|contributor|meta|owner_person_id/.test(calls[0].cols), calls[0].cols);
  const failing = { from() { throw new Error("permission denied"); } };
  assert.deepEqual(await fetchUnitApprovalRows("post:5112", { audience: "admin", client: failing }), [], "an error fails closed");
  const denied = { from() { const q = { select: () => q, contains: () => q, eq: () => q, in: () => q, limit: () => Promise.resolve({ data: null, error: { code: "42501" } }) }; return q; } };
  assert.deepEqual(await resolveUnitApprovals(YEAR_HINTS_5112, { audience: "admin", client: denied }), { [YEAR_HINTS_5112[0].id]: { state: "none", rowId: null, channel: "research_objects" } });
});

test("year hint states: the public sees nothing today; the admin preview tells container-level, unit-level and none apart", () => {
  const hint = YEAR_HINTS_5112;
  const states = (audience, row) => buildYearHints(hint, NOW, audience, approvalOf(row)).map((h) => h.state);
  for (const row of [null, APPROVAL_ROW_5112, UNIT_ROW]) assert.deepEqual(states("public", row), []);
  assert.deepEqual(states("admin", null), ["candidate"]);
  assert.deepEqual(states("admin", APPROVAL_ROW_5112), ["candidate"]);
  assert.match(buildYearHints(hint, NOW, "admin", approvalOf(APPROVAL_ROW_5112))[0].label, /סינתזה מאושרת ברמת הפוסט, לא ליחידה/);
  assert.deepEqual(states("admin", UNIT_ROW), ["approved_unpublished"]);
  assert.match(buildYearHints(hint, NOW, "admin", approvalOf(UNIT_ROW))[0].label, /מאושר עריכתית, טרם פורסם/);
  const [active] = buildYearHints(hint, NOW, "public", approvalOf("published"));
  assert.equal(active.state, "active"); assert.equal(active.label, "רמז השנה · תשפ״ז");
  assert.equal(active.value, 787); assert.equal(active.hebrewYear, 5787); assert.notEqual(active.value, active.hebrewYear);
  assert.equal(active.valueLabel, "ערך גימטרי 787"); assert.match(active.yearLabel, /5787/);
  assert.deepEqual(active.layers.map((l) => l.key), ["year", "holiday", "gratitude"]);
  assert.equal(active.unit.sourceRef, "posts:5112#block:plane-787-year-joy"); assert.equal(active.unit.containerRef, "post:5112");
  assert.deepEqual(buildYearHints(hint, null, "public", approvalOf("published")), []);
});

test("year rollover תשפ״ו → תשפ״ז → תשפ״ח moves the marker, nothing is stored or deleted", () => {
  const approvals = approvalOf("published"), hint = YEAR_HINTS_5112;
  const at786 = at("2026-09-11T12:00:00+03:00"), at787 = at("2026-09-12T12:00:00+03:00"), lastDay = at("2027-10-01T12:00:00+03:00"), at788 = at("2027-10-02T12:00:00+03:00");
  assert.deepEqual([at786, at787, lastDay, at788].map((c) => c.hebrew.year_label), ["תשפ״ו", "תשפ״ז", "תשפ״ז", "תשפ״ח"]);
  assert.deepEqual([at786, at787, lastDay, at788].map((c) => c.hebrew.year_value), [786, 787, 787, 788]);
  const state = (ctx, audience = "public") => buildYearHints(hint, ctx, audience, approvals)[0].state;
  assert.deepEqual([at786, at787, lastDay, at788].map((c) => state(c)), ["upcoming", "active", "active", "archived"]);
  const next = buildYearHints(hint, at788, "public", approvals)[0];
  assert.equal(next.label, "קבוצת שנה · תשפ״ז"); assert.ok(!next.label.includes("רמז השנה")); assert.equal(next.locatorId, "plane-787-year-joy");
  const a = depth("admin", { temporal: lastDay, approvals }), b = depth("admin", { temporal: at788, approvals });
  assert.deepEqual(a.dimensions, b.dimensions); assert.deepEqual(a.numbers, b.numbers); assert.deepEqual(a.sourceCount, b.sourceCount);
  assert.deepEqual(buildYearHints(hint, at788, "public", approvalOf(APPROVAL_ROW_5112)), [], "an unpublished approval never becomes visible through the rollover");
});

test("787 is not a year hint by number: other expressions of value 787 and numeric-only links are never marked", () => {
  const extra = { value: 787, source: { kind: "מאגר", note: "ביטוי אחר בערך 787" }, graph: null, calculations: [], convergence: null,
    expressions: [{ phrase: "אשם גזלות", theme: null, sources: [{ kind: "post_link", ref: "post:9", quote: "ביטוי אחר" }],
      calculation: { method: "רגיל", value: 787, claimedValue: 787, reproducesClaim: true, rowVerified: true, rowPublished: true }, interpretation: null }] };
  const d = buildContextDepth({ subject: POST_5112, numbers: [...NUMBERS_5112, extra], audience: "admin", temporal: NOW, yearHints: YEAR_HINTS_5112, approvals: approvalOf("published") });
  assert.equal(d.yearHints.length, 1); assert.equal(d.yearHints[0].unit.sourceRef, "posts:5112#block:plane-787-year-joy");
  const guilt = d.numbers.at(-1).expressions[0];
  assert.ok(!("yearHint" in guilt) && !guilt.layers, "no marker on the expression");
  const numeric = YEAR_HINTS_5112.map((h) => ({ ...h, link: "numeric_equality" }));
  assert.deepEqual(buildYearHints(numeric, NOW, "admin", approvalOf("published")), []);
  assert.deepEqual(buildYearHints(YEAR_HINTS_5112, NOW, "public", { other: { state: "published" } }), [], "an approval of another unit does not count");
});

test("the year hint is independent of WordPress and of posts: an image or video unit works the same way", () => {
  const unitHint = (kind, containerRef) => ({ id: `${kind}-1`, link: "explicit_documented", unit: { kind, containerRef, sourceRef: `${containerRef}#unit`, locatorId: `${kind}-1` },
    hebrewYear: 5787, yearLabel: "תשפ״ז", value: 787, expression: "תשפז", layers: [], approvalTerms: ["787", "תשפ\"ז"] });
  for (const [kind, ref] of [["image", "gallery_image:abc"], ["video", "video:def"], ["research_unit", "research_object:ghi"]]) {
    const hint = unitHint(kind, ref);
    const row = { id: "r1", kind: "relation", status: "approved", privacy_scope: "public_candidate", relates: [ref], source_ref: `${ref}#unit`, terms: ["787", "תשפ\"ז"] };
    assert.equal(matchUnitApproval([row], hint).state, APPROVAL.APPROVED_UNPUBLISHED, kind);
    assert.equal(matchUnitApproval([{ ...row, source_ref: ref }], hint).state, APPROVAL.CONTAINER_LEVEL_ONLY, `${kind}: container-level only`);
    const [admin] = buildYearHints([hint], NOW, "admin", { [hint.id]: matchUnitApproval([row], hint) });
    assert.equal(admin.state, "approved_unpublished"); assert.equal(admin.unit.kind, kind);
    const [live] = buildYearHints([hint], NOW, "public", { [hint.id]: { state: "published", channel: "public_projection" } });
    assert.equal(live.state, "active", kind);
    assert.ok(!JSON.stringify(live).match(/wp_id|wordpress|post_tags/i));
  }
});

test("a year hint is a separate marker: it changes no coverage, adds no source and reads nothing", () => {
  const hinted = depth("public", { approvals: approvalOf("published") }), plain = depth("public", { yearHints: [] });
  assert.equal(hinted.yearHints.length, 1);
  assert.deepEqual(hinted.dimensions, plain.dimensions); assert.deepEqual(hinted.sourceCount, plain.sourceCount); assert.deepEqual(hinted.numbers, plain.numbers);
  assert.equal(buildYearHints(YEAR_HINTS_5112, NOW, "public", approvalOf("published")) instanceof Promise, false, "pure projection: no search per card");
});

test("private research_objects and their text never enter the depth modules or fixtures", () => {
  for (const file of ["src/lib/research/contextDepthProjection2029.js", "src/components/experience2029/ContextDepthMeter2029.jsx", "src/components/experience2029/PostIndexCard2029.jsx",
    "src/lib/research/contextMapProjection2029.js", "src/lib/research/contextMapReaders2029.js", "test/fixtures/context-map-harness/depthFixture.js", "src/lib/research/unitApproval2029.js"]) {
    const text = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!/channel_updates|fetchResearchObjectsForEntity|\.statement\b|"statement"|contributor/.test(text), file);
  }
  const fixture = fs.readFileSync(new URL("./fixtures/context-map-harness/depthFixture.js", import.meta.url), "utf8");
  assert.ok(!/statement|הפוסט FZ1073 מחבר מחדש/.test(fixture), "the approval row is copied without its statement");
});

test("opening a reviewed region puts its focus (and the year-hint label, as a label only) into the existing Research Context", () => {
  const source = { locatorId: "plane-787-year-joy", sourceRef: "posts:5112#block:plane-787-year-joy", quote: "תשפז = 787", href: "/post/p#source-locator-plane-787-year-joy" };
  const context = normalizeResearchContext({ dimensions: sourceRegionFocus({ source, hintLabel: "רמז השנה · תשפ״ז" }) });
  const focus = context.dimensions.surfaceFocus;
  assert.equal(focus.reference, source.sourceRef); assert.equal(focus.locator, "#source-locator-plane-787-year-joy"); assert.equal(focus.sourceLabel, "רמז השנה · תשפ״ז");
  assert.equal(focus.type, "source");
  assert.equal(normalizeResearchContext({ dimensions: sourceRegionFocus({ source }) }).dimensions.surfaceFocus.sourceLabel, undefined);
});
