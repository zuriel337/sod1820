import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatRazielEvidenceSummary,
  normalizeRazielEvidenceSummary,
} from "../src/lib/research/razielSessionRequest2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("conversation-first copy keeps internal contracts stable and technical language out of ordinary chat", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const chatStart = frame.indexOf("function RazielNativeChat");
  const chatEnd = frame.indexOf("function RazielProjection", chatStart);
  const chat = frame.slice(chatStart, chatEnd);

  assert.match(chat, />♡ שמור שיחה<\/button>/);
  assert.match(chat, />▤ השיחות שלי/);
  assert.match(chat, />＋ שיחה חדשה<\/button>/);
  assert.match(chat, />בדוק לעומק<\/button>/);
  assert.match(chat, /נהנית מהשיחה\? הירשם בחינם כדי לשמור אותה ולהמשיך בדיוק מאותה נקודה, גם ממכשיר אחר\./);
  assert.match(chat, /שיחות הניסיון להיום הסתיימו\. הרשמה חינמית תאפשר לך להמשיך לדבר עם רזיאל ולשמור את השיחות שלך\./);
  assert.doesNotMatch(chat, />♡ שמור מחקר<\/button>|<summary>מפת מחקר<\/summary>/);
  assert.doesNotMatch(chat, /credit_ledger|spendCredits|CREDIT_COST|Result Bundle/);

  assert.match(chat, /!user\?\.id && lastRaziel \? quotaEnded \?/,
    "registration and quota copy appear only after a Raziel answer exists");
  assert.match(chat, /window\.addEventListener\("sod:ai-quota", onQuota\)/,
    "the UI reacts to the existing server-owned quota event instead of counting locally");
  assert.doesNotMatch(chat, /quota\s*[-+]=|setQuota.*\+|localStorage.*quota/i,
    "the conversation does not invent a quota counter or durable quota store");
});

test("the full-picture action changes representation labels without renaming internal modes or saved-session types", () => {
  const modes = read("src/lib/research/razielViewMode2029.js");
  const saved = read("src/lib/research/razielSavedSession2029.js");
  const gate = read("src/lib/research/razielOneShotGate2029.js");

  assert.match(modes, /map: "🗺️ פתח את התמונה המלאה"/);
  assert.match(modes, /landscape: \{ label: "התמונה המלאה"/);
  assert.match(gate, /map: Object\.freeze\(\{ mode: "landscape", level: "fast" \}\)/);
  assert.match(saved, /RAZIEL_SAVED_SESSION_TYPE = "raziel_session"/);
  assert.match(saved, /RAZIEL_SAVED_SESSION_SCHEMA = "raziel-saved-session-v1"/);
});

test("ordinary answer copy says what Raziel found; depth copy may explain sources without engine jargon", () => {
  const summary = normalizeRazielEvidenceSummary({
    map_available: true,
    calculations: [{ expression: "אמת", method: "רגיל", value: 441 }],
    findings: [{ label: "קשר", lane: "engine_finding", value: 441, source_name: "מקור ציבורי" }],
  });
  const compact = formatRazielEvidenceSummary(summary);
  const expanded = formatRazielEvidenceSummary(summary, { expanded: true });

  assert.equal(compact, "🔎 רזיאל מצא 2 חיבורים מאחורי התשובה · אפשר לפתוח את התמונה המלאה.");
  assert.doesNotMatch(compact, /מחקר|ממצא|מקור מאומת|engine|evidence|provenance|Result Bundle/i);
  assert.match(expanded, /מה רזיאל מצא/);
  assert.match(expanded, /ממצא מחושב/);
  assert.match(expanded, /פתח את התמונה המלאה/);
  assert.doesNotMatch(expanded, /מנוע|engine|evidence|provenance|Result Bundle/i);
});
