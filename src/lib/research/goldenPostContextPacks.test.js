import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildGoldenPostContextPack, mergeContextPackWithConnections, goldenContextPackExpressions } from "./goldenPostContextPacks.js";
import { buildSurfaceFindings } from "./surfaceFindingsAdapter.js";
import { normalizeResearchContext } from "./researchContext.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { isProjectorPilotVisible, PROJECTOR_PILOT_POST_IDS } from "../projectorPilotGate.js";

const trace = (input, result, extra = {}) => ({ input, result, method_key: "רגיל", method_version: 1, trace_kind: "LETTER_LEDGER", verification: { parity: true, trace_value: result, canonical_value: result }, ...extra });
const A_TRACES = [trace("אשר בשמים ממעל", 1073), trace("ולמות לא נתנני", 1073), trace("חכמה", 73)];
const B_TRACES = [trace("משיח", 358), trace("יבא שילה", 358), trace("משיח בן דוד", 424), trace("שבעים וחמש", 776), trace("ביאת המשיח", 776)];

test("gate preserved: only 5112 and 92; packs exist only for those posts", () => {
  assert.deepEqual([...PROJECTOR_PILOT_POST_IDS], ["5112", "92"]);
  assert.equal(buildGoldenPostContextPack({ postId: "5113", traces: A_TRACES }), null);
  assert.equal(buildGoldenPostContextPack({ postId: null }), null);
  assert.equal(isProjectorPilotVisible({ surface: "post", pathname: "/post/x", context: { subject: { type: "post", id: "5113", href: "/post/x" } } }), false);
});

test("Pack A: separated kinds; one calculation row per value; no duplicate identity", () => {
  const pack = buildGoldenPostContextPack({ postId: "5112", traces: A_TRACES });
  const kinds = pack.rows.map((r) => r.kind);
  assert.deepEqual(kinds, ["event_fact", "calculation", "calculation", "typed_relation", "interpretation"]);
  const calc1073 = pack.rows.find((r) => r.value === "1073");
  assert.equal(calc1073.label, "אשר בשמים ממעל = ולמות לא נתנני");
  assert.equal(new Set(pack.rows.map((r) => r.id)).size, pack.rows.length);
  assert.match(pack.rows.find((r) => r.kind === "typed_relation").reason, /לא שוויון ולא ראיה בלתי־תלויה/);
  assert.ok(pack.rows.length <= 8);
});

test("Pack B: Post is source representation; clock/day typed, not gematria; source_work not contributor", () => {
  const pack = buildGoldenPostContextPack({ postId: "92", traces: B_TRACES });
  assert.deepEqual(pack.rows.map((r) => r.kind), ["source_representation", "typed_event", "calculation", "calculation", "calculation", "source_work", "interpretation"]);
  const ev = pack.rows.find((r) => r.kind === "typed_event");
  assert.match(ev.reason, /CLOCK_24H_CONCAT=1820/);
  assert.match(ev.reason, /358 = תצפית מקור מוקלדת, לא גימטריה/);
  assert.match(ev.reason, /סותר ולא נפתר/);
  assert.equal(ev.value, undefined); // no numeric calculation value on the event row
  const calc358 = pack.rows.find((r) => r.value === "358");
  assert.equal(calc358.kind, "calculation");
  assert.equal(calc358.label, "משיח = יבא שילה");
  const work = pack.rows.find((r) => r.kind === "source_work");
  assert.match(work.reason, /לא Contributor/);
  assert.ok(!JSON.stringify(pack).includes("ZURIEL") && !/contributor_id|createdBy/.test(JSON.stringify(pack)));
});

test("fail-closed calculations: no/failed/non-parity/undeclared traces never produce rows; 604/730 never admitted", () => {
  assert.equal(buildGoldenPostContextPack({ postId: "5112", traces: [] }).rows.filter((r) => r.kind === "calculation").length, 0);
  const bad = [
    { ...trace("חכמה", 73), verification: { parity: false } },
    { status: "error", input: "חכמה", result: 73 },
    trace("חכמה", 73, { method_key: "מילוי" }),
    trace("מילה מחוץ לחבילה", 604),
    trace("מילה אחרת", 730),
  ];
  const rows = buildGoldenPostContextPack({ postId: "5112", traces: bad }).rows;
  assert.equal(rows.filter((r) => r.kind === "calculation").length, 0);
  const all = [...buildGoldenPostContextPack({ postId: "5112", traces: A_TRACES }).rows, ...buildGoldenPostContextPack({ postId: "92", traces: B_TRACES }).rows];
  assert.ok(!all.some((r) => r.value === "604" || r.value === "730"));
  assert.ok(!goldenContextPackExpressions("5112").concat(goldenContextPackExpressions("92")).some((e) => /604|730/.test(e)));
});

test("Zvi bundle: presentation-only, attribution not inherited, private never leaks", () => {
  const REF = "channel_updates:0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
  const ro = (id, kind, extra = {}) => ({ id, kind, statement: `s-${id}`, value: 1073, source_ref: REF, privacy_scope: "public", created_at: "2026-10-01T00:00:00Z", ...extra });
  const kids = ["fact", "relation", "observation"].map((k, i) => researchObjectToUniversalFinding(ro(`z${i}`, k)));
  const priv = researchObjectToUniversalFinding(ro("zs", "fact", { statement: "SECRETWORD", privacy_scope: "private" }));
  const findings = [...kids, priv].filter((f) => f.access.tier !== "private");
  const occ = { [REF]: { contributorId: "c66f0464-0928-490e-be9b-66d8a87e7fc8", contributorName: "צבי (OPOC)" } };
  const pack = buildGoldenPostContextPack({ postId: "5112", traces: A_TRACES, findings, occurrences: occ });
  const bundle = pack.rows.find((r) => r.kind === "source_bundle");
  assert.equal(bundle.bundleCount, 3);
  assert.equal(bundle.sourceLabel, "צבי (OPOC)");
  assert.match(bundle.reason, /לא ראיה בלתי־תלויה/);
  assert.ok(kids.every((f) => f.provenance.createdBy === null));
  assert.ok(!JSON.stringify(pack).includes("SECRETWORD"));
  // Pack B has no Zvi bundle slot
  assert.ok(!buildGoldenPostContextPack({ postId: "92", traces: B_TRACES, findings, occurrences: occ }).rows.some((r) => r.kind === "source_bundle"));
});

test("merge: existing connection repeating a pack value is a reference (dropped), others kept; same adapter, bounded context", () => {
  const pack = buildGoldenPostContextPack({ postId: "5112", traces: A_TRACES });
  const connections = [
    { id: "number-1073", label: "מספר הטיסה", value: "1073", kind: "מספר" },
    { id: "topic-718", label: "718", value: "718", kind: "טופיק" },
  ];
  const merged = mergeContextPackWithConnections(pack, connections);
  assert.ok(!merged.some((r) => r.id === "number-1073"));
  assert.ok(merged.some((r) => r.id === "topic-718"));
  assert.deepEqual(mergeContextPackWithConnections(null, connections), connections);
  const rows = buildSurfaceFindings({ connections: merged });
  assert.ok(rows.length <= 8);
  const ctx = normalizeResearchContext({ subject: { id: "5112", type: "post" }, dimensions: { surfaceFindings: rows } });
  assert.equal(ctx.dimensions.surfaceFindings.length, rows.length);
  assert.ok(ctx.dimensions.surfaceFindings.every((r) => !("findings" in r) && !("evidence" in r)));
  assert.ok(ctx.dimensions.surfaceFindings.some((r) => r.kind === "calculation" && r.value === "1073"));
});

test("wiring: same Post surfaceFindings path, no UI/CSS change, no client-side calculation, no DB write", () => {
  const post = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
  assert.match(post, /buildSurfaceFindings\(\{\s*connections: mergeContextPackWithConnections\(/);
  const mod = fs.readFileSync("src/lib/research/goldenPostContextPacks.js", "utf8");
  assert.ok(!/supabase|fetch\(|\.insert\(|\.upsert\(|\.rpc\(/.test(mod.replace(/\/\/.*$/gm, "")));
  const proj = fs.readFileSync("src/lib/research/post2029ReadingProjection.js", "utf8");
  assert.match(proj, /rpc\("gematria_method_trace"/);
  assert.ok(!/\.insert\(|\.upsert\(/.test(proj));
});
