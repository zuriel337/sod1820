import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildGoldenPostContextPack, goldenClaimOutcomes } from "./goldenPostContextPacks.js";
import {
  ADMIN_LAYER, PROJECTOR_MODE, buildGoldenAdminUniverse, fetchGoldenAdminUniverse, goldenContextNumbers,
  goldenPublicSurfaceFindings, orderBySmartProminence, resolveProjectorMode,
} from "./goldenProjectorModes.js";
import { normalizeResearchContext } from "./researchContext.js";
import { createCanonicalNumberW2Executors } from "./researchW2Executors.js";
import { buildResearchFacetControl, filterResearchFacetItems } from "./researchFacetProjection.js";

const trace = (input, result, extra = {}) => ({ input, result, method_key: "רגיל", method_version: 1, trace_kind: "LETTER_LEDGER", verification: { parity: true, trace_value: result, canonical_value: result }, ...extra });
const A_TRACES = [
  trace("אשר בשמים ממעל", 1073), trace("ולמות לא נתנני", 1073),
  trace("משיח בן דוד", 424), trace("ולדימיר פוטין", 424, { method_key: "מסתתר" }),
  trace("שבעים וחמש", 776),
  trace("ביאת המשיח", 777), // engine disagrees with the source claim -> REJECT, never a calculation row
];
const B_TRACES = [
  trace("חכמה", 73), trace("משיח", 358),
  trace("סוד יהונתן תשפד", 1202, { method_key: "מסתתר", verification: { parity: false } }), // parity failure
];
const ZERO = { 73: 73, 730: 73 };
const numericOperators = createCanonicalNumberW2Executors({
  supabase: { rpc: async (name, { p_value }) => (name === "fn_zero_scale" && ZERO[p_value]
    ? { data: { applicable: true, method_id: "zero_scale_law", version: 1, core_root: 73, scale_chain: [73, 730] }, error: null }
    : { data: { applicable: false }, error: null }) },
  numericRuleVersions: async () => ({ shitat_haechad_alef_law: 1, zero_navigation: 1, zero_scale_law: 1 }),
}).numeric_operators;
const packA = () => buildGoldenPostContextPack({ postId: "5112", post: { id: 5112, slug: "flydubai-fz1073-363-14000-remzei-geula", date: "2026-09-30T20:15:36Z" }, traces: A_TRACES, numericOperators });
const packB = () => buildGoldenPostContextPack({ postId: "92", post: { id: 92, slug: "p92", date: "2024-09-29T06:29:04Z" }, traces: B_TRACES, ruleVersions: async () => ({ moment_clock_law: 2 }) });

const ro = (id, extra = {}) => ({ id, kind: "fact", statement: `s-${id}`, value: 1073, source: "channel_updates", source_ref: `channel_updates:${id}`, privacy_scope: "private", status: "approved", engine_detail: {}, created_at: "2026-10-01T00:00:00Z", ...extra });

test("mode: admin defaults to ADMIN_ALL; PUBLIC_VIEW is an explicit toggle; non-admin is always PUBLIC_VIEW", () => {
  assert.equal(resolveProjectorMode({ isAdmin: true }), PROJECTOR_MODE.ADMIN_ALL);
  assert.equal(resolveProjectorMode({ isAdmin: true, requested: "garbage" }), PROJECTOR_MODE.ADMIN_ALL);
  assert.equal(resolveProjectorMode({ isAdmin: true, requested: PROJECTOR_MODE.PUBLIC_VIEW }), PROJECTOR_MODE.PUBLIC_VIEW);
  assert.equal(resolveProjectorMode({ isAdmin: false, requested: PROJECTOR_MODE.ADMIN_ALL }), PROJECTOR_MODE.PUBLIC_VIEW);
  assert.equal(resolveProjectorMode(), PROJECTOR_MODE.PUBLIC_VIEW);
});

test("SMART: ten rows from one occurrence never outrank / crowd out two independent occurrences", () => {
  const same = Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, label: `a${i}`, kind: "calculation", sourceLabel: "x", occurrenceKey: "occ-A" }));
  const independent = [
    { id: "b", label: "b", kind: "calculation", sourceLabel: "x", occurrenceKey: "occ-B" },
    { id: "c", label: "c", kind: "calculation", sourceLabel: "x", occurrenceKey: "occ-C" },
  ];
  const ordered = orderBySmartProminence([...same, ...independent]).map((r) => r.id);
  assert.deepEqual(ordered.slice(0, 3), ["a0", "b", "c"]);
  // In a bounded list of 8 both independent occurrences survive.
  assert.ok(ordered.slice(0, 8).includes("b") && ordered.slice(0, 8).includes("c"));
});

test("SMART: lexicographic axes (no scalar) — direct source rows lead, interpretation after, unknown connections last", () => {
  const rows = [
    { id: "conn", label: "718", kind: "טופיק" },
    { id: "interp", label: "i", kind: "interpretation", sourceLabel: "כי לה׳ המלוכה" },
    { id: "calc", label: "c", kind: "calculation", sourceLabel: "מנוע גימטריה" },
    { id: "rel", label: "r", kind: "typed_relation", sourceLabel: "שיטות המערכת" },
  ];
  assert.deepEqual(orderBySmartProminence(rows).map((r) => r.id), ["calc", "rel", "interp", "conn"]);
  const src = fs.readFileSync("src/lib/research/goldenProjectorModes.js", "utf8");
  assert.ok(!/score\s*[:=]\s*\d|0-100|\/\s*100/.test(src.replace(/no 0-100 score|0-100 score/g, "")), "no scalar truth score");
});

test("public layer: existing surfaceFindings shape only, bounded, survives Research Context normalization", async () => {
  const pack = await packA();
  const rows = goldenPublicSurfaceFindings({ rows: [...pack.rows, { id: "topic-718", label: "718", value: "718", kind: "טופיק" }] });
  assert.ok(rows.length <= 8 && rows.length > 0);
  for (const r of rows) assert.deepEqual(Object.keys(r).filter((k) => !["id", "label", "value", "kind", "reason", "href", "sourceLabel"].includes(k)), []);
  assert.ok(rows.some((r) => r.id === "topic-718"));
  const ctx = normalizeResearchContext({ subject: { id: "5112", type: "post" }, dimensions: { surfaceFindings: rows } });
  assert.equal(ctx.dimensions.surfaceFindings.length, rows.length);
});

test("claim outcomes: mismatch => REJECT, parity failure => FAILED, missing => UNKNOWN; none become calculation rows", async () => {
  const a = goldenClaimOutcomes("5112", A_TRACES);
  assert.equal(a.find((c) => c.expression === "ביאת המשיח").outcome, "value_mismatch");
  assert.equal(a.find((c) => c.expression === "אשר בשמים ממעל").outcome, "match");
  const b = goldenClaimOutcomes("92", B_TRACES);
  assert.equal(b.find((c) => c.expression === "סוד יהונתן תשפד").outcome, "parity_failed");
  assert.equal(goldenClaimOutcomes("92", []).every((c) => c.outcome === "trace_unavailable"), true);
  const pA = await packA();
  assert.ok(!pA.rows.some((r) => r.kind === "calculation" && /ביאת המשיח/.test(r.label)));
  const pB = await packB();
  assert.ok(!pB.rows.some((r) => r.kind === "calculation" && r.value === "1202"));
  const u = buildGoldenAdminUniverse({ pack: pA });
  const states = u.layers[ADMIN_LAYER.TRACE].map((i) => i.states[0]);
  assert.ok(states.includes("נדחה") && states.includes("התקבל"));
});

test("admin universe: every governed finding and every authorized row stays reachable; nothing hidden by ranking", async () => {
  const pack = await packA();
  assert.ok(pack.audit.findings.length >= pack.rows.length);
  const many = Array.from({ length: 150 }, (_, i) => ro(`r${i}`, { source_ref: `channel_updates:m${i % 5}` }));
  const u = buildGoldenAdminUniverse({ pack, researchRowsByNumber: { 1073: many, 73: many.slice(0, 3) } });
  assert.equal(u.layers[ADMIN_LAYER.RESEARCH].length, 150, "deduped by id, none dropped");
  const governedIds = new Set([...u.layers[ADMIN_LAYER.PUBLIC], ...u.layers[ADMIN_LAYER.GOVERNED]].map((i) => i.id.replace(/^(pub|gov):/, "")));
  for (const f of pack.audit.findings) assert.ok(governedIds.has(f.id), `governed finding ${f.id} reachable`);
  for (const item of u.layers[ADMIN_LAYER.RESEARCH]) {
    assert.ok(item.states.length && item.reason && item.provenance, "explicit state/reason/provenance");
    assert.match(item.reason, /אותו ערך אינו אותה זהות/);
  }
  const multi = u.layers[ADMIN_LAYER.RESEARCH].find((i) => i.researchObjectId === "r0");
  assert.ok(multi.states.includes("פרטי"));
  assert.ok(multi.states.some((s) => s.startsWith("אותו מקום במקור")));
  assert.equal(u.total, Object.values(u.layers).reduce((n, l) => n + l.length, 0));
});

test("admin universe: ordinary private research stays visible; only explicit person_only is excluded", async () => {
  const pack = await packA();
  const ordinaryPrivate = ro("ordinary-private", { privacy_scope: "private" });
  const personOnly = ro("person-only", {
    privacy_scope: "private",
    meta: { ext: { personal_scope: { scope: "person_only", owner_slug: "ariel-ben-moshe" } } },
  });
  const u = buildGoldenAdminUniverse({ pack, researchRowsByNumber: { 1073: [ordinaryPrivate, personOnly] } });
  const ids = u.layers[ADMIN_LAYER.RESEARCH].map((item) => item.researchObjectId);
  assert.ok(ids.includes("ordinary-private"), "private research must remain visible to admin");
  assert.equal(ids.includes("person-only"), false, "explicit person_only research must stay in the person lens, not the general Projector");
});

test("admin universe: Projector consumes the same structured one-tree facets as World", async () => {
  const pack = await packA();
  const faceted = ro("facet-x4", {
    statement: "  טוב   כפול ארבע  ",
    engine_detail: {
      verification_state: "match",
      compound: {
        kind: "quantity-product",
        quantity: 4,
        result: 1073,
        computedTotal: 1073,
        status: "ENGINE_VERIFIED_COMPOSITE",
        operand: { phrase: "טוב", method: "ragil", value: 17 },
      },
    },
    meta: {
      ext: {
        spatial_research: {
          role: "STRUCTURAL_3D",
          cluster: "סט תלת־ממדי לדוגמה",
          research_focus_key: "zvi:spatial:test-x4",
        },
        source_media_profile: { class: "SPATIAL_3D", load_bearing_visual_candidate: true },
      },
    },
  });
  const u = buildGoldenAdminUniverse({
    pack,
    researchRowsByNumber: { 1073: [faceted] },
    researchMethodRegistryRows: [{ method_key: "רגיל", db_column: "ragil", display_label: "רגיל", active: true, in_engine: true }],
  });
  const research = u.layers[ADMIN_LAYER.RESEARCH];
  assert.equal(research.length, 1);
  assert.equal(research[0].sourceText, "טוב כפול ארבע");
  assert.deepEqual(research[0].researchFacets.operation.factors, [4]);
  assert.equal(research[0].researchFacets.spatial.is3d, true);
  const control = buildResearchFacetControl(research);
  assert.equal(control.byMethod["רגיל"], 1, "db_column alias ragil resolves to canonical Registry method_key רגיל");
  assert.equal(control.byMethod.ragil, undefined, "raw db_column alias must not fork the method filter");
  assert.equal(control.byFactor["4"], 1);
  assert.equal(control.spatial3d, 1);
  assert.equal(filterResearchFacetItems(research, { factor: "4" }).length, 1);
  assert.equal(filterResearchFacetItems(research, { spatial: "3d" }).length, 1);
  assert.equal(filterResearchFacetItems(research, { family: "zvi:spatial:test-x4" }).length, 1);
});

test("admin universe: same value != same identity; duplicates and HOLD/REJECT/unknown verification are labeled", async () => {
  const pack = await packA();
  const rows = [
    ro("x1", { engine_detail: { claimed_expression: "אשר בשמים ממעל", claimed_method: "רגיל", verification_state: "match" }, source_ref: "channel_updates:1" }),
    ro("x2", { engine_detail: { claimed_expression: "אשר בשמים ממעל", claimed_method: "רגיל", verification_state: "match" }, source_ref: "channel_updates:2" }),
    ro("y1", { statement: "dup", source_ref: "channel_updates:9" }),
    ro("y2", { statement: "dup", source_ref: "channel_updates:9" }),
    ro("z", { status: "candidate", privacy_scope: "public_candidate", engine_detail: { verification_state: "mismatch" }, source_ref: null }),
  ];
  const u = buildGoldenAdminUniverse({ pack, researchRowsByNumber: { 1073: rows } });
  const by = Object.fromEntries(u.layers[ADMIN_LAYER.RESEARCH].map((i) => [i.researchObjectId, i]));
  assert.ok(by.x1.states.includes("2 מופעי מקור עצמאיים"));
  assert.ok(!by.y1.states.some((s) => s.includes("מופעי מקור עצמאיים")), "value-only rows never merge identities");
  assert.ok(by.y2.states.includes("כפילות בתוך אותו מקום במקור"));
  assert.ok(by.z.states.includes("מועמד") && by.z.states.includes("מיקום מקור לא צוין") && by.z.states.includes("נמצאה אי־התאמה"));
  assert.ok(by.z.states.some((s) => s.startsWith("מועמד לציבור")), "public_candidate is labeled not-published");
  // The typed identity backed by two independent occurrences leads the research layer.
  assert.equal(u.layers[ADMIN_LAYER.RESEARCH][0].researchObjectId, "x1");
});

test("context numbers come only from governed outputs + source claims", async () => {
  const nums = goldenContextNumbers(await packB());
  for (const n of [73, 358, 1202]) assert.ok(nums.includes(n), String(n));
  assert.ok(!nums.includes(424) && !nums.includes(776), "Post92 never claims 424/776");
});

test("NEGATIVE PRIVACY: admin read goes only through the injected RLS reader; a public (RLS-empty) session gets zero research rows", async () => {
  const pack = await packA();
  const calls = [];
  const publicSession = async (node) => { calls.push(node.label); return { rows: [], findings: [], access: { available: true, reason: null } }; };
  const u = await fetchGoldenAdminUniverse({ postSlug: "x", loadPack: async () => pack, readResearchObjects: publicSession });
  assert.equal(u.layers[ADMIN_LAYER.RESEARCH].length, 0);
  assert.ok(calls.length > 0 && calls.every((l) => /^\d+$/.test(l)));
  const denied = await fetchGoldenAdminUniverse({ postSlug: "x", loadPack: async () => pack, readResearchObjects: async () => { throw new Error("permission denied"); } });
  assert.equal(denied.layers[ADMIN_LAYER.RESEARCH].length, 0);
  assert.equal(denied.researchAccess.available, false);
  assert.equal(await fetchGoldenAdminUniverse({ postSlug: "x", loadPack: async () => null, readResearchObjects: publicSession }), null);
});

test("NEGATIVE PRIVACY (wiring): PUBLIC_VIEW never fetches admin data; admin payload never enters Research Context; admin chrome only for admins", () => {
  const layer = fs.readFileSync("src/components/experience2029/GoldenProjectorModeLayer2029.jsx", "utf8");
  // Fetch only inside the ADMIN_ALL branch; any other mode resets state to empty (no client-side hiding).
  assert.match(layer, /if \(!visible \|\| mode !== PROJECTOR_MODE\.ADMIN_ALL \|\| !postSlug\) \{\s*setUniverse\(\{ status: "idle", data: null \}\);/);
  assert.match(layer, /if \(!visible \|\| loading \|\| !isAdmin\) return null;/);
  assert.match(layer, /resolveProjectorMode\(\{ isAdmin: !loading && isAdmin, requested \}\)/);
  assert.match(layer, /RESEARCH_FACET_FILTER_DEFAULTS/);
  assert.match(layer, /filterResearchFacetItems/);
  assert.match(layer, /מכפיל/);
  assert.match(layer, /תלת־ממד/);
  assert.match(layer, /סט מחקרי/);
  assert.match(layer, /דברי המקור/);
  assert.ok(!/updateResearchContext|setContext|addToResearch|localStorage/.test(layer), "admin layer never writes Research Context / persistent storage");
  assert.ok(!/\?admin|searchParams|URLSearchParams/.test(layer), "no query-param admin switch");
  assert.match(layer, /isProjectorPilotVisible\(/);
  // The public Post path never imports the admin reader.
  const post = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
  assert.ok(!/entityHubProjection|fetchResearchObjectsForEntity|fetchGoldenAdminUniverse/.test(post));
  const proj = fs.readFileSync("src/lib/research/post2029ReadingProjection.js", "utf8");
  assert.ok(!/research_objects/.test(proj.slice(proj.indexOf("export async function fetchGoldenContextPack"), proj.indexOf("export async function fetchPost2029ReadingProjection"))));
  // Rail mounts the layer only on the post surface; no change to other surfaces.
  const rail = fs.readFileSync("src/components/experience2029/SurfaceContextRail2029.jsx", "utf8");
  assert.match(rail, /surface === "post" \? <GoldenProjectorModeLayer2029/);
});

test("Research Context cannot carry admin-only fields even if a caller tried", () => {
  const ctx = normalizeResearchContext({ dimensions: { surfaceFindings: [{ id: "a", label: "l", states: ["PRIVATE"], provenance: "secret", statement: "private text" }] } });
  assert.deepEqual(Object.keys(ctx.dimensions.surfaceFindings[0]).sort(), ["id", "label"]);
});
