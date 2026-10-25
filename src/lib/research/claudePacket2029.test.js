import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { METHODS } from "../gematria.js";
import { buildClaudePacket, normalizeClaudePacketExpression } from "./claudePacket2029.js";

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
  for (const value of ["", "   ", "abc", "123", null, undefined, "א".repeat(81)]) assert.equal(buildClaudePacket(value), null, String(value));
  assert.equal(normalizeClaudePacketExpression("  עולה   ויורד "), "עולה ויורד");
});

test("the packet module and page are isolated from Raziel, the network, the database and models", () => {
  for (const file of ["claudePacket2029.js", "../../pages/ClaudeResearchPacket2029Page.jsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /fetch\(|supabase|XMLHttpRequest|ai-analyze|research-run|useRazielSession|RazielSession|getAiAnalysis|callClaude/i, file);
  }
  // Reached only through the existing (lazily loaded) preview page; App2029 and the eager graph are untouched.
  const preview = readFileSync(new URL("../../pages/HomePreview2029Page.jsx", import.meta.url), "utf8");
  assert.match(preview, /import ClaudeResearchPacket2029Page from "\.\/ClaudeResearchPacket2029Page\.jsx";/, "shares the preview page's own lazy chunk: no new chunk, no new dependency-map entry in the eager entry");
  assert.match(preview, /get\("tool"\) === "claude"/);
  assert.doesNotMatch(readFileSync(new URL("../../App2029.jsx", import.meta.url), "utf8"), /ClaudeResearchPacket|ClaudePacket/);
});
