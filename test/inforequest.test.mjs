// Pure-logic test for src/lib/inforequest.js (state machine + row builder).
// No network: exercises buildRequestRow / canTransition / status enum only.
// Run: node test/inforequest.test.mjs
import { buildRequestRow, canTransition, IR_STATUS, IR_TRANSITIONS, IR_BUCKET, IR_TYPE } from "../src/lib/inforequest.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// 1 · row shape + reuse invariants (no schema change: research_items columns only)
const row = buildRequestRow("uid-1", { findingRef: "num:1820", personRef: "p:zvi", missingKind: "תאריך", why: "לאמת תאריך-האירוע", lang: "he", channel: "wa" });
ok(row.bucket === IR_BUCKET, "bucket=info_request");
ok(row.entity_type === IR_TYPE, "entity_type=cc_info_request");
ok(row.user_id === "uid-1", "user_id set");
ok(typeof row.entity_ref === "string" && row.entity_ref.startsWith("ir_"), "entity_ref generated");
ok(row.metadata && typeof row.metadata === "object", "metadata jsonb object");
ok(row.metadata.status === "draft", "default status=draft");
ok(row.metadata.findingRef === "num:1820", "findingRef preserved (provenance, not embed)");
ok(row.metadata.response === null, "response starts null (no RAW yet)");
ok(Array.isArray(row.metadata.history) && row.metadata.history.length === 1, "history seeded");
ok(row.title.length <= 140, "title bounded to column");
// only research_items columns present at top level (no invented columns)
ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(["bucket","entity_ref","entity_type","link","metadata","title","user_id"]), "top-level keys = research_items cols only");

// 2 · guards
let threw = false; try { buildRequestRow("uid", {}); } catch { threw = true; }
ok(threw, "missing findingRef throws (Request must link a Finding)");
threw = false; try { buildRequestRow(null, { findingRef: "x" }); } catch { threw = true; }
ok(threw, "missing uid throws (owner-scoped)");
threw = false; try { buildRequestRow("uid", { findingRef: "x", status: "bogus" }); } catch { threw = true; }
ok(threw, "invalid status throws");

// 3 · state machine — legal + illegal transitions
ok(canTransition("draft", "pending"), "draft→pending legal");
ok(canTransition("pending", "answered"), "pending→answered legal (answer via other channel)");
ok(canTransition("answered", "verified"), "answered→verified legal");
ok(!canTransition("draft", "verified"), "draft→verified ILLEGAL (no skipping)");
ok(!canTransition("verified", "answered"), "verified is terminal");
ok(!canTransition("cancelled", "pending"), "cancelled is terminal");
// separation: verified here = request answered+extracted, NOT a Governance/Fact promotion
ok(IR_STATUS.includes("answered") && IR_STATUS.includes("verified"), "status enum complete");
ok(IR_TRANSITIONS.verified.length === 0 && IR_TRANSITIONS.cancelled.length === 0, "terminal states have no exits");

// 4 · uniqueness — two requests on the same finding get distinct refs (finding↔many requests)
const a = buildRequestRow("u", { findingRef: "num:26" });
const b = buildRequestRow("u", { findingRef: "num:26" });
ok(a.entity_ref !== b.entity_ref, "distinct requests on same finding get distinct refs");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
