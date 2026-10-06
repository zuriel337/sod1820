import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildGoldenPostContextPack, mergeContextPackWithConnections, goldenContextPackClaims, GOLDEN_CONTEXT_PACK_MAX_ROWS } from "./goldenPostContextPacks.js";
import { buildSurfaceFindings } from "./surfaceFindingsAdapter.js";
import { normalizeResearchContext } from "./researchContext.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { createCanonicalNumberW2Executors } from "./researchW2Executors.js";
import { isProjectorPilotVisible, PROJECTOR_PILOT_POST_IDS } from "../projectorPilotGate.js";

const trace = (input, result, extra = {}) => ({ input, result, method_key: "רגיל", method_version: 1, trace_kind: "LETTER_LEDGER", verification: { parity: true, trace_value: result, canonical_value: result }, ...extra });
const A_TRACES = [
  trace("אשר בשמים ממעל", 1073), trace("ולמות לא נתנני", 1073),
  trace("משיח בן דוד", 424), trace("ולדימיר פוטין", 424, { method_key: "מסתתר" }),
  trace("שבעים וחמש", 776), trace("ביאת המשיח", 776),
  trace("חכמה", 73), // decoy: not a Post 5112 source claim
  trace("משהו אחר", 604), trace("עוד", 730),
];
const B_TRACES = [
  trace("חכמה", 73), trace("משיח", 358), trace("סוד יהונתן תשפד", 1202, { method_key: "מסתתר" }),
  trace("משיח בן דוד", 424), trace("שבעים וחמש", 776), trace("יבא שילה", 358), // decoys: not Post 92 source claims
];

// Live-shaped dependencies (the REAL governed numeric_operators executor over fn_zero_scale / nodes).
const ZERO = { 73: 73, 730: 73 };
const fakeSupabase = {
  rpc: async (name, { p_value }) => (name === "fn_zero_scale" && ZERO[p_value]
    ? { data: { applicable: true, method_id: "zero_scale_law", version: 1, core_root: 73, scale_chain: [73, 730] }, error: null }
    : { data: { applicable: false }, error: null }),
};
const numericOperators = createCanonicalNumberW2Executors({
  supabase: fakeSupabase,
  numericRuleVersions: async () => ({ shitat_haechad_alef_law: 1, zero_navigation: 1, zero_scale_law: 1 }),
}).numeric_operators;
const ruleVersions = async () => ({ moment_clock_law: 2 });
const POST_A = { id: 5112, slug: "flydubai-fz1073", date: "2026-09-30T20:15:36Z" };
const POST_B = { id: 92, slug: "post-92", date: "2024-09-29T06:29:04Z" };
const packA = (over = {}) => buildGoldenPostContextPack({ postId: "5112", post: POST_A, traces: A_TRACES, numericOperators, ...over });
const packB = (over = {}) => buildGoldenPostContextPack({ postId: "92", post: POST_B, traces: B_TRACES, ruleVersions, ...over });
const calcValues = (pack) => pack.rows.filter((r) => r.kind === "calculation").map((r) => r.value);

test("gate preserved: only 5112 and 92; packs exist only for those posts", async () => {
  assert.deepEqual([...PROJECTOR_PILOT_POST_IDS], ["5112", "92"]);
  assert.equal(await buildGoldenPostContextPack({ postId: "5113", traces: A_TRACES }), null);
  assert.equal(await buildGoldenPostContextPack({ postId: null }), null);
  assert.equal(isProjectorPilotVisible({ surface: "post", pathname: "/post/x", context: { subject: { type: "post", id: "5113", href: "/post/x" } } }), false);
});

test("adapter declares no static domain law: clock/day/convergence/interpretation prose lives only in owners", () => {
  const mod = fs.readFileSync("src/lib/research/goldenPostContextPacks.js", "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/CLOCK_24H_CONCAT|CLOCK_12H|DAY_ORDINAL|1820|סותר|→ 73|← 730|1073 →|פרשנות האתר|כי לה׳ המלוכה/.test(mod));
  assert.ok(!/supabase|fetch\(|\.insert\(|\.upsert\(|\.rpc\(/.test(mod));
});

test("Pack A: governed event/convergence rows + source-claimed calculations only; no חכמה/604/730 calculation", async () => {
  const pack = await packA();
  assert.deepEqual(calcValues(pack), ["424", "776", "1073"]);
  const text = JSON.stringify(pack.rows);
  assert.ok(!/חכמה/.test(JSON.stringify(pack.rows.filter((r) => r.kind === "calculation"))));
  assert.ok(!calcValues(pack).some((v) => ["73", "604", "730"].includes(v)));
  assert.ok(pack.rows.some((r) => r.kind === "event_fact" && r.label === "FZ1073"));
  const conv = pack.rows.find((r) => r.kind === "typed_relation");
  assert.ok(conv, "73/730 axis appears as governed typed convergence");
  assert.match(conv.label, /1073/); assert.match(conv.label, /730/); assert.match(conv.label, /→ 73$/);
  assert.equal(conv.value, undefined);
  assert.ok(!/604/.test(text));
  assert.equal(pack.rows.find((r) => r.value === "424").label, "משיח בן דוד = ולדימיר פוטין");
  assert.match(pack.rows.find((r) => r.value === "424").reason, /מסתתר/);
  assert.ok(pack.rows.length <= GOLDEN_CONTEXT_PACK_MAX_ROWS);
});

test("Pack B: values exactly 73/358/1202 via correct traces; no 424/776/יבא שילה; governed clock/day/interpretation", async () => {
  const pack = await packB();
  assert.deepEqual(calcValues(pack), ["73", "358", "1202"]);
  const text = JSON.stringify(pack.rows);
  assert.ok(!/יבא שילה|424|776/.test(text));
  assert.match(pack.rows.find((r) => r.value === "1202").reason, /מסתתר/);
  const clock = pack.rows.find((r) => r.kind === "typed_derivation");
  assert.equal(clock.value, "1820");
  assert.match(clock.label, /^18:20/);
  assert.ok(pack.rows.some((r) => r.kind === "typed_observation" && /358/.test(r.label)));
  assert.ok(!pack.rows.some((r) => r.kind === "calculation" && r.label === "יום"));
  const interp = pack.rows.find((r) => r.kind === "interpretation");
  assert.equal(interp.sourceLabel, "כי לה׳ המלוכה");
  assert.equal(interp.label, "כי לה׳ המלוכה");
  assert.ok(!/פרשנות האתר|ZURIEL|צוריאל|contributor_id|createdBy/.test(text));
  // source work attribution (never a Contributor) on the source-claimed observations
  assert.equal(clock.sourceLabel, "סוד החשמל");
  assert.ok(pack.rows.length <= GOLDEN_CONTEXT_PACK_MAX_ROWS);
});

test("claims allowlist: 604/730 never admitted; Post 92 never claims 424/776; Post 5112 never claims חכמה", () => {
  const a = goldenContextPackClaims("5112"); const b = goldenContextPackClaims("92");
  assert.ok(![...a, ...b].some((c) => [604, 730].includes(c.claimed_value)));
  assert.ok(!b.some((c) => [424, 776].includes(c.claimed_value) || /יבא שילה/.test(c.expression)));
  assert.ok(!a.some((c) => c.expression === "חכמה"));
  assert.deepEqual(b.map((c) => [c.expression, c.method_key, c.claimed_value]), [["משיח", "רגיל", 358], ["חכמה", "רגיל", 73], ["סוד יהונתן תשפד", "מסתתר", 1202]]);
});

test("fail-closed: no/failed/non-parity/wrong-method/wrong-value traces never produce calculation rows", async () => {
  assert.deepEqual(calcValues(await packA({ traces: [] })), []);
  const bad = [
    { ...trace("אשר בשמים ממעל", 1073), verification: { parity: false } },
    { status: "error", input: "ולמות לא נתנני", result: 1073 },
    trace("משיח בן דוד", 424, { method_key: "מילוי" }),
    trace("ולדימיר פוטין", 424), // registered method for this claim is מסתתר, regular must not stand in
    trace("שבעים וחמש", 777), // value differs from the source claim
  ];
  assert.deepEqual(calcValues(await packA({ traces: bad })), []);
  const bBad = [trace("סוד יהונתן תשפד", 2475)]; // regular over the wrong call / wrong value
  assert.ok(!calcValues(await packB({ traces: bBad })).includes("1202"));
  // owners refuse without live attestation: no clock rows invented
  const noRules = await packB({ ruleVersions: null });
  assert.ok(!noRules.rows.some((r) => r.kind === "typed_derivation" || r.kind === "interpretation"));
  // no governed numeric_operators: no convergence invented
  const noOps = await packA({ numericOperators: null });
  assert.ok(!noOps.rows.some((r) => r.kind === "typed_relation"));
});

test("Zvi bundle: no findings supplied => explicitly unavailable, no static/fake row; supplied access-filtered findings => presentation-only bundle, private never leaks", async () => {
  const none = await packA();
  assert.deepEqual(none.sourceBundle, { status: "unavailable", reason: "no_access_filtered_findings_supplied" });
  assert.ok(!none.rows.some((r) => r.kind === "source_bundle"));
  assert.equal((await packB()).sourceBundle.status, "not_applicable");

  const REF = "channel_updates:0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
  const ro = (id, kind, extra = {}) => ({ id, kind, statement: `s-${id}`, value: 1073, source_ref: REF, privacy_scope: "public", created_at: "2026-10-01T00:00:00Z", ...extra });
  const kids = ["fact", "relation", "observation"].map((k, i) => researchObjectToUniversalFinding(ro(`z${i}`, k)));
  const priv = researchObjectToUniversalFinding(ro("zs", "fact", { statement: "SECRETWORD", privacy_scope: "private" }));
  const findings = [...kids, priv].filter((f) => f.access.tier !== "private"); // access filter owned upstream
  const occ = { [REF]: { contributorId: "c66f0464-0928-490e-be9b-66d8a87e7fc8", contributorName: "צבי (OPOC)" } };
  const pack = await packA({ findings, occurrences: occ });
  const bundle = pack.rows.find((r) => r.kind === "source_bundle");
  assert.equal(bundle.bundleCount, 3);
  assert.match(bundle.reason, /לא ראיה בלתי־תלויה/);
  assert.equal(pack.sourceBundle.status, "available");
  assert.ok(!JSON.stringify(pack).includes("SECRETWORD"));
  assert.ok(!(await packB({ findings, occurrences: occ })).rows.some((r) => r.kind === "source_bundle"));
});

test("no duplicate Finding identity across rows", async () => {
  for (const pack of [await packA(), await packB()]) {
    assert.equal(new Set(pack.rows.map((r) => r.id)).size, pack.rows.length);
  }
});

test("merge: repeated pack values become references; other existing connections (e.g. 718) are preserved; bounded summary-only context", async () => {
  const pack = await packA();
  const connections = [
    { id: "number-1073", label: "מספר הטיסה", value: "1073", kind: "מספר" },
    { id: "topic-718", label: "718", value: "718", kind: "טופיק" },
    { id: "topic-363", label: "363", value: "363", kind: "טופיק" },
  ];
  const merged = mergeContextPackWithConnections(pack, connections);
  assert.ok(!merged.some((r) => r.id === "number-1073"));
  const rows = buildSurfaceFindings({ connections: merged });
  assert.ok(rows.length <= 8);
  assert.ok(rows.some((r) => r.id === "topic-718"), "pack must not crowd out existing FZ connections");
  assert.deepEqual(mergeContextPackWithConnections(null, connections), connections);
  const ctx = normalizeResearchContext({ subject: { id: "5112", type: "post" }, dimensions: { surfaceFindings: rows } });
  assert.equal(ctx.dimensions.surfaceFindings.length, rows.length);
  assert.ok(ctx.dimensions.surfaceFindings.every((r) => !("findings" in r) && !("evidence" in r)));
  assert.ok(ctx.dimensions.surfaceFindings.some((r) => r.kind === "calculation" && r.value === "1073"));
});

test("wiring: same Post surfaceFindings path; governed owners + live deps injected in the projection; no DB write", () => {
  const post = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
  assert.match(post, /buildSurfaceFindings\(\{\s*connections: mergeContextPackWithConnections\(/);
  const proj = fs.readFileSync("src/lib/research/post2029ReadingProjection.js", "utf8");
  assert.match(proj, /rpc\("gematria_method_trace"/);
  assert.match(proj, /createCanonicalNumberW2Executors\(\{ supabase, numericRuleVersions: fetchLiveNumericRuleVersions \}\)/);
  assert.ok(!/\.insert\(|\.upsert\(/.test(proj));
});
