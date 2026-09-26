import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildElsRazielSurfaceContext,
  buildElsRazielGuidance,
} from "../src/lib/research/elsRazielContext.js";

function exactContext() {
  return buildElsRazielSurfaceContext({
    researchContext: {
      lens: "els",
      subject: { id: "משיח", type: "phrase", label: "משיח", href: "/research?tool=els&q=משיח" },
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
        dependencyGroup: "els:torah-v1:משיח",
        coordinateConvention: "zero_based_character_index",
      },
    },
  });
}

test("guided explanation is deterministic structural projection of exact replay only", () => {
  const context = exactContext();
  const guide = buildElsRazielGuidance(context);
  assert.equal(guide.contract, "els_raziel_guidance_v1");
  assert.equal(guide.kind, "structural_explanation");
  assert.equal(guide.language, "he");
  assert.equal(guide.voice, "raziel");
  assert.match(guide.lead, /דילוג של 17/);
  assert.match(guide.lead, /קדימה/);
  assert.match(guide.lead, /מיקום 100/);
  assert.match(guide.lead, /מיקום 151/);
  assert.match(guide.lead, /4 נקודות/);
  assert.equal(guide.interpretation, false);
  assert.equal(guide.evidencePromotion, false);
  assert.equal(guide.audioExecuted, false);
});

test("guided/spoken representation does not leak raw ELS text when includeText is false", () => {
  const context = exactContext();
  const guide = buildElsRazielGuidance(context);
  const contextJson = JSON.stringify(context);
  const guideJson = JSON.stringify(guide);
  assert.equal(contextJson.includes("משיח"), false);
  assert.equal(contextJson.includes("q=משיח"), false);
  assert.equal(guideJson.includes("משיח"), false);
  assert.match(context.subject.ref, /^anon:/);
  assert.match(context.occurrence.occurrenceRef, /^anon:/);
  assert.match(context.occurrence.dependencyRef, /^anon:/);
  assert.equal("occurrenceId" in context.occurrence, false);
  assert.equal("dependencyGroup" in context.occurrence, false);
});

test("guide refuses non-exact or non-OK projection context", () => {
  const exact = exactContext();
  assert.equal(buildElsRazielGuidance({
    ...exact,
    result: { ...exact.result, presentationPolicy: "ordered_prefix_v1" },
  }), null);
  assert.equal(buildElsRazielGuidance({
    ...exact,
    result: { ...exact.result, status: "REPLAY_MISMATCH" },
  }), null);
  assert.equal(buildElsRazielGuidance({
    ...exact,
    occurrence: null,
  }), null);
});

test("Raziel voice shape stays calm/bounded and prepares spoken reuse without executing TTS", () => {
  const guide = buildElsRazielGuidance(exactContext());
  assert.match(guide.boundary, /אינן מוסיפות לו חוזק ראייתי/);
  assert.match(guide.inactive, /עדיין אינן פעילות/);
  assert.equal((guide.question.match(/\?/g) || []).length, 1);
  assert.equal(guide.spokenScript, [guide.lead, guide.boundary, guide.inactive, guide.question].join(" "));

  const source = readFileSync(new URL("../src/lib/research/elsRazielContext.js", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(frame, /buildElsRazielGuidance\(elsFocus\)/);
  assert.match(frame, /data-raziel-els-guide=\{elsGuide.contract\}/);
  assert.doesNotMatch(source + frame, /speechSynthesis|SpeechSynthesisUtterance|textToSpeech|tts\s*\(|audio\.play|new Audio/);
  assert.doesNotMatch(source + frame, /askRazielAdvanced|functions\.invoke\(['"]ai-analyze/);
});

console.log("ELS 2029 explain guidance V1 contract: PASS");
