import test from "node:test";
import assert from "node:assert/strict";
import { parseLegacyManualThread } from "../src/lib/legacyManualThreads.js";
const text = "נושא\n\nדברי הכותבים מתוך ההתכתבות\n\nציון דוד סיבוני · 13.10.2026\nהודעה ראשונה\n\nפסקה נוספת\n\n──────────\n\nליאור שיטרית · 14.10.2026\nתשובה\n\n──────────\n\nחיים שטרית · 14.10.2026 · 10:54\nתשובה נוספת";
test("projects authors, chronological source order and exact message paragraphs", () => {
 const result = parseLegacyManualThread({ source: "admin", text });
 assert.equal(result.count, 3);
 assert.deepEqual(result.messages.map(m => m.author), ["ציון דוד סיבוני","ליאור שיטרית","חיים שטרית"]);
 assert.equal(result.messages[0].body, "הודעה ראשונה\n\nפסקה נוספת");
 assert.equal(result.messages[2].time, "10:54");
 assert.equal(result.title, "נושא");
});
test("does not infer a curated thread from ordinary incoming content", () => {
 assert.equal(parseLegacyManualThread({source:"whatsapp",text}),null);
 assert.equal(parseLegacyManualThread({source:"admin",text:"הודעה רגילה"}),null);
});
test("malformed sections fall back without hiding source text", () => {
 assert.equal(parseLegacyManualThread({source:"admin",text:text+"\n\n──────────\n\nלא ידוע"}),null);
});
test("single message is counted honestly; CRLF is accepted", () => {
 const single=text.split("\n\n──────────")[0].replaceAll("\n","\r\n");
 assert.equal(parseLegacyManualThread({source:"admin",text:single}).count,1);
});
