import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildElsRazielSurfaceContext } from "../src/lib/research/elsRazielContext.js";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

test("ELS opens the existing 2029 Raziel panel only from canonical MATCH-derived layers", () => {
  assert.match(page, /use2029Shell/);
  assert.match(page, /buildElsRazielSurfaceContext/);
  assert.match(page, /onLanguageInspection=\{setLanguageInspection\}/);
  assert.match(page, /planSummary, languageInspection/);
  assert.match(page, /ready=\{replayMatched && layeredReady\}/);
  assert.match(page, /razielMicroIntent: "explain_els_occurrence"/);
  assert.match(page, /elsSurfaceContext: surfaceContext/);
  assert.match(page, /surfaceContext\?\.occurrence\?\.occurrenceRef/);
  assert.doesNotMatch(page, /surfaceContext\?\.occurrence\?\.occurrenceId/);
  assert.match(page, /disabled=\{!available \|\| shell\.razielLocked\}/);
  assert.doesNotMatch(page, /includeText:\s*true/);
  assert.doesNotMatch(page, /askRazielAdvanced|askRaziel\s*\(/);
  assert.match(page, /const hasRazielReturnMarker = params\.has\("els_return"\)/);
  assert.match(page, /!hasRazielReturnMarker && classicSeed/);
});

test("canonical System Frame Raziel consumer accepts bounded ELS context without creating a second Raziel component", () => {
  assert.match(frame, /function RazielProjection\(/);
  assert.match(frame, /elsSurfaceContext = null/);
  assert.match(frame, /payload\?\.elsSurfaceContext/);
  assert.match(frame, /elsSurfaceContext=\{transient\?\.payload\?\.elsSurfaceContext \|\| null\}/);
  assert.match(frame, /data-raziel-els-context="true"/);
  assert.match(frame, /result\?\.contract === "els_2029_projection_v1"/);
  assert.match(frame, /result\?\.status === "OK"/);
  assert.match(frame, /result\?\.presentationPolicy === "exact_replay_v1"/);
  assert.match(frame, /מאומתים הביטוי והמיקום; משמעות וקשרים הם פרשנות של רזיאל/);
  assert.match(frame, /data-raziel-return-to-els="true"/);
  assert.match(frame, /buildElsRazielLanguageFacts\(elsFocus\)/);
  assert.match(frame, /data-raziel-els-language-map="candidate-only"/);
  assert.equal((frame.match(/function RazielProjection\(/g) || []).length, 1);
  // The central session mount owns the one askRaziel transport; the frame is a consumer only.
  assert.doesNotMatch(frame, /askRazielAdvanced|functions\.invoke\(['"]ai-analyze/);
  assert.equal((frame.match(/askRaziel\s*\(/g) || []).length, 0);
});

test("ELS Raziel panel stays context-only; only an explicit chat submit sends the verified ELS facts", () => {
  assert.match(frame, /data-raziel-native-chat="true"/);
  assert.doesNotMatch(frame, /השיחה המלאה עם רזיאל תחובר בהמשך/);
  assert.doesNotMatch(frame, /onClick=\{[^}]*askRaziel/);
  assert.doesNotMatch(frame, /elsFocus[^\n]*askRaziel/);
  assert.match(frame, /מופע ELS מאומת:/);
  assert.match(frame, /אין לחשב או להשלים נתוני ELS חסרים/);
  assert.match(frame, /מפת שפה מקומית מוכנה/);
  assert.doesNotMatch(page, /synthesisPreview|razielRouteAction|local_message/);
});

test("ELS Raziel surface context exposes only the selected expression, not the private subject label or a truth score", () => {
  const out = buildElsRazielSurfaceContext({
    researchContext: {
      lens: "els",
      subject: { id: "subject:private", type: "phrase", label: "טקסט פרטי", href: "/els" },
      selection: { entityType: "els", corpus: "torah" },
    },
    projection: {
      contract: "els_2029_projection_v1",
      status: "OK",
      corpusId: "torah-v1",
      term: "משיח",
      completion: { totalHits: 1, returnedHits: 1, truncated: false },
      presentation: { policy: "exact_replay_v1", representative: true },
      selectedOccurrence: {
        occurrenceId: "els:torah-v1:משיח:17:1:100",
        corpusId: "torah-v1",
        skip: 17,
        dir: 1,
        start: 100,
        end: 151,
        positions: [100,117,134,151],
        dependencyGroup: "g1",
        coordinateConvention: "zero_based_character_index",
      },
    },
  });
  assert.equal(out.surface, "els");
  assert.equal(out.privacy.includeText, false);
  assert.equal("text" in out, false);
  assert.equal(out.occurrence.term, "משיח");
  assert.equal(JSON.stringify(out).includes("טקסט פרטי"), false);
  assert.match(out.subject.ref, /^anon:/);
  assert.equal("id" in out.subject, false);
  assert.equal("href" in out.subject, false);
  assert.equal("label" in out.subject, false);
  assert.equal("term" in out.result, false);
  assert.equal("truth" in out, false);
  assert.equal("evidenceWeight" in out, false);
});

console.log("ELS 2029 Raziel consumer V1 contract: PASS");
