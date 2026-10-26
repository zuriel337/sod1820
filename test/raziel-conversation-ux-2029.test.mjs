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
  assert.doesNotMatch(chat, />♡ שמור מחקר<\/button>|<summary>מפת מחקר<\/summary>/);
  assert.doesNotMatch(chat, /credit_ledger|spendCredits|CREDIT_COST|Result Bundle/);
});

test("slice 3 offers registration only after value and represents only the server-owned guest quota denial", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const actions = read("src/components/experience2029/RazielOneShotActions2029.jsx");
  const chatStart = frame.indexOf("function RazielNativeChat");
  const chatEnd = frame.indexOf("const RESEARCH_SECTIONS", chatStart);
  const slice = `${frame.slice(chatStart, chatEnd)}\n${actions}`;

  assert.match(slice, /!user\?\.id && lastRaziel \? guestQuotaEnded \?/,
    "the registration journey is absent before the first Raziel answer");
  assert.match(slice, /data-raziel-registration-nudge="after-value"/);
  assert.match(slice, /נהנית מהשיחה\? הירשם בחינם כדי לשמור אותה ולהמשיך בדיוק מאותה נקודה, גם ממכשיר אחר\./);
  assert.match(slice, /data-raziel-quota-ended="guest"/);
  assert.match(slice, /שיחות הניסיון להיום הסתיימו\. הרשמה חינמית תאפשר לך להמשיך לדבר עם רזיאל ולשמור את השיחות שלך\./);
  assert.match(slice, /window\.addEventListener\("sod:ai-quota", onQuota\)/);
  assert.match(slice, /event\?\.detail\?\.tier === "anon"/,
    "only the existing server event for the anonymous tier can block the guest composer");
  assert.match(slice, /useEffect\(\(\) => \{ setGuestQuotaEnded\(false\); \}, \[user\?\.id\]\)/,
    "quota representation is reset across principal changes");
  assert.doesNotMatch(slice, /completedAiAnswers|aiAnswerCount|answerCount|two.*answers|2.*answers/i);
  assert.doesNotMatch(slice, /credit_ledger|spendCredits|CREDIT_COST|creditsCharged/i);
  assert.doesNotMatch(slice, /localStorage[\s\S]{0,120}quota|quota\s*[-+]=|quotaLimit|limitOverride/i);
  assert.match(slice, /runSessionAction\(\(\) => session\.submit\(\{ question: q/);
  assert.match(slice, /runSessionAction\(\(\) => session\.submitOneShot\(kind, \{ projection \}\)\)/);
});

test("the full-picture action changes representation labels without renaming internal modes or saved-session types", () => {
  const modes = read("src/lib/research/razielViewMode2029.js");
  const saved = read("src/lib/research/razielSavedSession2029.js");
  const gate = read("src/lib/research/razielOneShotGate2029.js");

  assert.match(modes, /map: "🗺️ פתח מפת מחקר"/);
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
  assert.match(expanded, /פתח מפת מחקר/);
  assert.doesNotMatch(expanded, /מנוע|engine|evidence|provenance|Result Bundle/i);
});

test("desktop Companion has three local presentation states and changing them never reaches submit or transport", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const companion = read("src/components/experience2029/CompanionPanel2029.jsx");
  const chooserStart = frame.indexOf("const chooseRazielCompanionView");
  const chooserEnd = frame.indexOf("// The logo opens", chooserStart);
  const chooser = frame.slice(chooserStart, chooserEnd);

  assert.match(frame, /useState\(readRazielCompanionView\)/);
  assert.match(chooser, /writeRazielCompanionView\(view\)/);
  assert.match(chooser, /setRazielCompanionView\(next\)/);
  assert.doesNotMatch(chooser, /submit|askRaziel|fetch|invoke|transport|model/i);
  assert.match(companion, /razielView !== "quiet"/);
  assert.match(companion, /data-raziel-companion-quiet="true"/);
  assert.match(companion, /data-raziel-hint="deterministic"/);
  assert.match(companion, /onRazielView\?\.\("hints"\)/);
  assert.match(companion, /onRazielView\?\.\("open"\)/);
  assert.match(companion, /onRazielView\?\.\("quiet"\)/);
  assert.doesNotMatch(companion, /useOptionalRazielSession2029|RazielSessionProvider|ResearchProvider|askRaziel|submit\(/);

  assert.match(frame, /const companionActive = companionWide && surface !== "control"/,
    "the desktop Companion remains media-gated");
  assert.match(frame, /onClick=\{companionActive && surface !== "post" \? focusCompanionRaziel : openRaziel\}/,
    "mobile continues through the existing Raziel sheet");
});
