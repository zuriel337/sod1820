import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attentionItems, numeric, readAdminSource, retentionRows, sourceFreshness, resolveControlView } from "../src/lib/admin/controlPlaneProjection.js";
import { budgetAlerts, cleanupProjection, viralComparison } from "../src/lib/admin/controlPlanePlanning.js";
import { freshState, parseState, simulate } from "../src/lib/admin/resourceSimulator.js";

const at = "2026-10-04T02:00:00.000Z", now = Date.parse(at);
const table = (name, changes = {}) => ({ table_name: name, total_rows: 100, protected_rows: 80, purge_candidates: 20, unknown_dependency_rows: 0, auto_purge_allowed: true, ...changes });
test("a failed source cannot erase or fabricate the independently read successful sources", async () => {
  const sources = await Promise.all([
    readAdminSource(async () => ({ value: 0, generated_at: at }), () => at),
    readAdminSource(async () => { throw new Error("RPC unavailable"); }, () => at),
    readAdminSource(async () => [], () => at),
    readAdminSource(async () => null, () => at),
  ]);
  assert.equal(sources[0].status, "ready"); assert.equal(sources[0].data.value, 0);
  assert.equal(sources[1].status, "error"); assert.equal(sources[1].data, null);
  assert.deepEqual(sources[2].data, []); assert.equal(sources[3].status, "error");
  for (const v of [null, undefined, "", [], false, "not a number"]) assert.equal(numeric(v), null);
  assert.equal(numeric("0"), 0);
});
test("old measurement remains stale even if retrieved now; read time does not become measurement time", () => {
  const source = { status: "ready", data: { generated_at: "2026-10-03T00:00:00Z" }, readAt: at };
  assert.equal(sourceFreshness(source, now).state, "stale");
  const noMeasurement = sourceFreshness({ status: "ready", data: [], readAt: at }, now);
  assert.equal(noMeasurement.measuredAt, null); assert.equal(noMeasurement.readAt, at);
  assert.equal(sourceFreshness({ ...source, status: "error" }, now).state, "error");
  assert.equal(sourceFreshness({ status: "idle", data: null }, now).state, "unknown");
});
test("attention preserves different queue owners, excludes closed decisions and retains unknown item age", () => {
  const data = { suggestions: [{ id: 5, status: "pending", title: "System", estimated_impact: "estimate", observed: { count: 0 } }, { id: 6, status: "accepted" }],
    command: { recommendations: [{ id: 5, reason: "Research" }], counters: { hints_pending: 3, journey_drafts: null } }, health: { bots: { outbox_failed: 2 } } };
  const before = structuredClone(data), items = attentionItems(data, now);
  assert.equal(items.length, 4); assert.equal(new Set(items.map(i => i.id)).size, 4);
  assert.equal(items.find(i => i.id === "suggestion:5").ageDays, null);
  assert.equal(items.find(i => i.id === "suggestion:5").estimate, "estimate");
  assert.equal(items.find(i => i.id === "counter:hints_pending").count, 3);
  assert.deepEqual(data, before); assert.equal(items[0].id, "health:outbox");
});
test("bounded queue evidence does not expose credential/recipient fields", () => {
  const [item] = attentionItems({ suggestions: [{ id: 1, observed: { password: "hidden", email: "hidden", sample: { token: "hidden", count: 7 } } }] }, now);
  assert.equal(item.evidence, "sample: count: 7"); assert.doesNotMatch(item.evidence, /hidden/);
});
test("existing attention feed keys retain source identities without handled items or duplicate clones", () => {
  const attention = [{ attention_key: "research:5", source_type: "research_object", status: "candidate", created_at: "2026-10-03T02:00:00Z", handled: false, body: "claim requiring review" },
    { attention_key: "research:5", source_type: "research_object" }, { attention_key: "comment:5", source_type: "comment", handled: true },
    { attention_key: "contact:5", source_type: "contact", handled: false }];
  const items = attentionItems({ attention }, now);
  assert.equal(items.length, 2); assert.equal(items[0].id, "attention:research:5"); assert.equal(items[0].ageDays, 1);
  assert.equal(items[0].href, "/admin?tab=warroom"); assert.equal(items[1].href, "/admin?tab=messages");
});
test("retention eligibility fails closed for protected, dependent, missing and inconsistent rows", () => {
  const result = retentionRows({ tables: [table("allowed"), table("blocked", { unknown_dependency_rows: 1 }), table("unauthorized", { auto_purge_allowed: false }),
    table("missing", { protected_rows: null }), table("overlap", { purge_candidates: 21 }), table("boolean-string", { auto_purge_allowed: "true" })] });
  assert.deepEqual(result.map(r => r.eligible), [true, false, false, false, false, false]);
  const p = cleanupProjection({ tables: result.map((_, i) => table(String(i), { auto_purge_allowed: false })) }, result.map(r => r.key), { bytesPerRow: 100 });
  assert.equal(p.removedRows, 0);
});
test("row counts never manufacture bytes or cost; cleanup plan preserves protected records", () => {
  const data = { tables: [table("safe"), table("provenance", { protected_rows: 100, purge_candidates: 0, auto_purge_allowed: false })] };
  const p = cleanupProjection(data, ["safe:0", "provenance:1"]);
  assert.equal(p.totalRows, 200); assert.equal(p.removedRows, 20); assert.equal(p.afterRows, 180);
  assert.equal(p.logicalGB, null); assert.equal(p.saving, null); assert.equal(p.afterGB, null);
  assert.equal(cleanupProjection({ tables: [table("missing", { total_rows: null })] }, []).afterRows, null);
});
test("cleanup savings use the single pricing owner and shared quota rather than bytes times price", () => {
  const data = { tables: [table("safe")] };
  const valid = cleanupProjection(data, ["safe:0"], { bytesPerRow: "250000000", averageGB: "12", rate: "0.5", quota: "10" });
  assert.equal(valid.logicalGB, 5); assert.equal(valid.afterGB, 7);
  assert.equal(valid.beforeCost, 1); assert.equal(valid.afterCost, 0); assert.equal(valid.saving, 1);
  const impossible = cleanupProjection(data, ["safe:0"], { bytesPerRow: "250000000", averageGB: "1", rate: "0.5", quota: "0" });
  assert.equal(impossible.afterGB, null); assert.equal(impossible.saving, null);
});
test("extreme cleanup assumptions and fractional row counts remain unknown instead of producing invalid money", () => {
  const data = { tables: [table("safe")] };
  const p = cleanupProjection(data, ["safe:0"], { bytesPerRow: 1e308, averageGB: 1e308, rate: 1e308, quota: 0 });
  assert.equal(p.logicalGB, null); assert.equal(p.saving, null);
  assert.equal(retentionRows({ tables: [table("fractional", { purge_candidates: 1.5 })] })[0].eligible, false);
  assert.equal(numeric(".5"), 0.5);
});
test("budget thresholds handle equality, warning, exceedance and zero budgets without Infinity", () => {
  const result = { rows: [0, 39, 40, 50, 51].map((delta, i) => ({ month: i + 1, delta })) };
  assert.deepEqual(budgetAlerts(result, 50, 80).map(x => x.state), ["within", "within", "warning", "warning", "critical"]);
  const zero = budgetAlerts(result, 0); assert.equal(zero[0].state, "within"); assert.equal(zero[1].state, "critical"); assert.equal(zero[1].ratio, null);
  assert.deepEqual(budgetAlerts(result, null), []); assert.deepEqual(budgetAlerts(result, 50, 200), []);
});
test("viral stress preserves assumptions and recomputes nonlinear quotas using the lab model", () => {
  const values = { ...freshState().values, uploads: 100, views: 1, months: 12, includedStorage: 100, includedCached: 100, includedUncached: 100 };
  const before = structuredClone(values), p = viralComparison(values, 10, 6), exact = simulate(values, 10).rows[5];
  assert.deepEqual(p.stress, exact); assert.equal(p.stress.uploads, p.current.uploads * 10);
  assert.deepEqual(values, before); assert.deepEqual(viralComparison(values, 1, 6).stress, p.current);
  assert.throws(() => viralComparison(values, 101)); assert.throws(() => viralComparison(values, ""));
});
test("legacy lab imports get example warning settings while explicit warning rules round-trip", () => {
  const legacy = freshState(); delete legacy.budgetWarningPercent; delete legacy.budgetWarningProvenance;
  const imported = parseState(legacy); assert.equal(imported.budgetWarningPercent, 80); assert.equal(imported.budgetWarningProvenance, "example");
  imported.budgetWarningPercent = 65; imported.budgetWarningProvenance = "user";
  assert.deepEqual(parseState(JSON.parse(JSON.stringify(imported))), imported);
  imported.budgetWarningPercent = 200; const corrected = parseState(imported);
  assert.equal(corrected.budgetWarningPercent, 80); assert.equal(corrected.budgetWarningProvenance, "example");
  assert.equal(resolveControlView("cleanup"), "cleanup"); assert.equal(resolveControlView("bad"), "attention");
});
test("new operation projections have read-only RPC boundaries and owner-native action links", () => {
  const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
  const readers = read("src/lib/admin/controlPlaneReads.js");
  assert.doesNotMatch(readers, /\.from\(|\.delete\(|\.insert\(|\.update\(|admin_suggestion_decide|admin_notify_set|admin_fire_watchman/);
  assert.match(readers, /admin_retention_preview/); assert.match(readers, /admin_suggestions_list/);
  const operations = read("src/components/experience2029/AdminOperations2029.jsx");
  const cleanup = read("src/components/experience2029/AdminCleanup2029.jsx");
  const budget = read("src/components/experience2029/AdminBudget2029.jsx");
  for (const source of [operations, cleanup, budget]) assert.doesNotMatch(source, /\bfetch\s*\(|\.rpc\(|\.delete\(|createClient|new WebSocket/);
  const page = read("src/pages/AdminPage.jsx"); assert.match(page, /GROUP_OF\[requested\] \? requested : "warroom"/);
  const decisions = read("src/components/SystemSuggestionsTab.jsx");
  assert.match(decisions, /if \(!saved\) throw new Error/); assert.ok(decisions.indexOf("if (!saved)") < decisions.indexOf("setItems(x => x.filter"));
});
