import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { METHODS } from "../gematria.js";
import { buildClaudePacket, normalizeClaudePacketExpression } from "./claudePacket2029.js";
import { fetchClaudeNumberDossier } from "./claudePacketDossier2029.js";

test("the packet carries exactly the canonical engine's values for every method", () => {
  const packet = buildClaudePacket("שאול");
  assert.equal(packet.expression, "שאול");
  assert.equal(packet.rows.length, METHODS.length);
  for (const method of METHODS) {
    const row = packet.rows.find((item) => item.key === method.key);
    assert.equal(row.value, method.fn("שאול"), method.key);
  }
  const text = packet.text;
  for (const line of ["הביטוי: שאול", "הערך הרגיל: 337", "מילוי = 567 (פנימיות)", "אתבש = 502 (מראה)", "מסתתר = 328 (רובד נסתר)", "אלבם = 121", "סידורי = 40"]) {
    assert.ok(text.includes(line), line);
  }
  assert.match(text, /רגיל = גדול הוא כפילות מבנית ולא הצלבה/, "no final letters ⇒ structural duplicate");
  assert.match(text, /אל תחשב מחדש ואל תוסיף מספרים/);
  assert.match(text, /השער האנושי נשאר של צוריאל/);
});

test("final letters are reported as a real difference; invalid input yields no packet", () => {
  assert.match(buildClaudePacket("מלך").text, /אותיות סופיות: רגיל וגדול נבדלים/);
  for (const value of ["", "   ", "abc", "0", "1234567", "12 34", null, undefined, "א".repeat(81)]) assert.equal(buildClaudePacket(value), null, String(value));
  assert.equal(normalizeClaudePacketExpression("  עולה   ויורד "), "עולה ויורד");
});

test("the packet is isolated from Raziel and models; its database half only reads research-run", () => {
  // the engine-values builder stays fully offline
  assert.doesNotMatch(readFileSync(new URL("claudePacket2029.js", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""), /fetch\(|supabase|XMLHttpRequest|research-run|ai-analyze|Raziel/i);
  // the database half reuses research-run only, through an injected invoke: no model, no Raziel session, no writes
  for (const file of ["claudePacketDossier2029.js", "../../pages/ClaudeResearchPacket2029Page.jsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(source, /ai-analyze|useRazielSession|RazielSession|getAiAnalysis|askRaziel|callClaude|\.insert\(|\.upsert\(|\.rpc\(|fetch\(/i, file);
  }
  assert.match(readFileSync(new URL("claudePacketDossier2029.js", import.meta.url), "utf8"), /invoke\("research-run"/);
  // Reached only through the existing (lazily loaded) preview page; App2029 and the eager graph are untouched.
  const preview = readFileSync(new URL("../../pages/HomePreview2029Page.jsx", import.meta.url), "utf8");
  assert.match(preview, /import ClaudeResearchPacket2029Page from "\.\/ClaudeResearchPacket2029Page\.jsx";/, "shares the preview page's own lazy chunk: no new chunk, no new dependency-map entry in the eager entry");
  assert.match(preview, /get\("tool"\) === "claude"/);
  assert.doesNotMatch(readFileSync(new URL("../../App2029.jsx", import.meta.url), "utf8"), /ClaudeResearchPacket|ClaudePacket/);
});

test("a bare number is a number subject: no engine values are invented, the database supplies the phrases", async () => {
  const packet = buildClaudePacket("337");
  assert.deepEqual([packet.kind, packet.subject, packet.number, packet.rows.length], ["number", "337", 337, 0]);
  assert.match(packet.text, /המספר: 337/);
  assert.match(packet.text, /אל תחשב מחדש ואל תוסיף מספרים/);
  assert.equal(buildClaudePacket("שאול").kind, "expression");
  const failing = async () => ({ data: { status: "error" }, error: null });
  assert.deepEqual(await fetchClaudeNumberDossier(337, { invoke: failing }), { ok: false, reason: "no_bundle" });
  assert.deepEqual(await fetchClaudeNumberDossier(0, { invoke: failing }), { ok: false, reason: "unavailable" });
});

import { askClaudeRaziel } from "./claudeRazielClient2029.js";

test("claude raziel client: sends only question, packet and a capped clean history; maps access errors; never throws", async () => {
  const seen = [];
  const invoke = async (name, { body }) => { seen.push({ name, body }); return { data: { answer: "תשובה", degraded: false }, error: null }; };
  const history = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `t${i}` })).concat([{ role: "system", text: "x" }, { role: "user", text: " " }]);
  const ok = await askClaudeRaziel({ question: " ש ", packet: " חבילה ", history }, { invoke });
  assert.deepEqual(ok, { ok: true, answer: "תשובה", degraded: false });
  assert.equal(seen[0].name, "claude-raziel");
  assert.deepEqual(Object.keys(seen[0].body).sort(), ["history", "packet", "question"]);
  assert.equal(seen[0].body.history.length, 6);
  assert.equal(seen[0].body.history.every((turn) => turn.role !== "system" && turn.text.trim()), true);
  assert.deepEqual(await askClaudeRaziel({ question: "ש", packet: "ח" }, { invoke: async () => ({ data: null, error: { context: { status: 403 } } }) }), { ok: false, reason: "admin_required" });
  assert.deepEqual(await askClaudeRaziel({ question: "ש", packet: "ח" }, { invoke: async () => ({ data: { error: "admin_required" }, error: null }) }), { ok: false, reason: "admin_required" });
  assert.deepEqual(await askClaudeRaziel({ question: "ש", packet: "ח" }, { invoke: async () => { throw new Error("x"); } }), { ok: false, reason: "unavailable" });
  assert.deepEqual(await askClaudeRaziel({ question: "", packet: "ח" }, { invoke }), { ok: false, reason: "invalid" });
  assert.deepEqual((await askClaudeRaziel({ question: "ש", packet: "ח" }, { invoke: async () => ({ data: { answer: " " }, error: null }) })).reason, "unavailable");
});
