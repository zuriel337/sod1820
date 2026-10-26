import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildElsRazielLanguageCandidatePrompt,
  reviewElsRazielLanguageProposals,
  validateElsRazielLanguageCandidateMaterial,
} from "../supabase/functions/_shared/elsRazielLanguage.js";
import { normalizeElsRazielLanguageReview } from "../src/lib/research/razielSessionRequest2029.js";
import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";
import * as F from "./helpers/raziel-view-mode-fixtures.mjs";

const occurrenceRef = "anon:fixture-occurrence";
const materialInput = {
  contract: "els_language_candidate_material_v1",
  status: "CANDIDATE_INPUT",
  source: "canonical_matrix_letters",
  occurrence: { occurrenceRef, term: "משיח", scope: "torah", corpusId: "fixture-torah", skip: 17, dir: 1, start: 100 },
  authority: { letters: "CANONICAL", segmentation: "UNVERIFIED", meaning: "UNVERIFIED", canonicalReplayRequired: true },
  rays: [
    { id: "diagonal-left:80:16:8", orientation: "diagonal-left", text: "באשאטמינ", reverseText: "נימטאשאב", start: 80, step: 16, distance: 0 },
    { id: "vertical:101:17:7", orientation: "vertical", text: "שבררומי", reverseText: "ימוררבש", start: 101, step: 17, distance: 1 },
    { id: "horizontal:99:1:4", orientation: "horizontal", text: "אבגד", reverseText: "דגבא", start: 99, step: 1, distance: 1 },
  ],
};
const surfaceSemantic = {
  surface: "els",
  els: { term: "משיח", occurrence: occurrenceRef, corpus: "torah", skip: 17, dir: 1, start: 100 },
};

function matchResponse(request, suffix) {
  const positions = Array.from(request.term, (_, index) => request.start + request.skip * request.dir * index);
  return {
    result: {
      contract: "els_occurrence_replay_v1",
      status: "OK",
      verification_state: "MATCH",
      corpus_id: "fixture-torah",
      input: { normalized: request.term },
      occurrence: {
        occurrence_id: `els:fixture:${suffix}`,
        skip: request.skip,
        dir: request.dir,
        start: request.start,
        end: positions.at(-1),
        positions,
      },
    },
    trace_id: `trace-${suffix}`,
  };
}

test("candidate material is bound to the selected verified ELS occurrence and stays outside facts", () => {
  const material = validateElsRazielLanguageCandidateMaterial(materialInput, surfaceSemantic);
  assert.equal(material.contract, "els_language_candidate_material_v1");
  assert.equal(material.rays.length, 3);
  assert.equal(validateElsRazielLanguageCandidateMaterial(materialInput, { ...surfaceSemantic, els: { ...surfaceSemantic.els, start: 101 } }), null);
  assert.equal(validateElsRazielLanguageCandidateMaterial({ ...materialInput, authority: { ...materialInput.authority, meaning: "VERIFIED" } }, surfaceSemantic), null);
  const prompt = buildElsRazielLanguageCandidatePrompt(material);
  assert.match(prompt, /אינו facts ואינו ממצא מאומת/);
  assert.match(prompt, /R1: f=באשאטמינ; r=נימטאשאב/);
  assert.match(prompt, /els_language_proposals/);
  assert.doesNotMatch(prompt, /80|16|מיקום=/, "the model never receives replay coordinates in the candidate prompt");
});

test("model readings are replayed only with engine-owned ray coordinates and MATCH is projected", async () => {
  const material = validateElsRazielLanguageCandidateMaterial(materialInput, surfaceSemantic);
  const calls = [];
  const review = await reviewElsRazielLanguageProposals({
    material,
    proposals: [
      { ray_id: "R1", reading: "באש אטמין", interpretation: "קריאה אפשרית" },
      { ray_id: "R2", reading: "ימוררבש", interpretation: "קריאה הפוכה" },
      { ray_id: "R3", reading: "אב גד", interpretation: "דילוג אחד אינו ELS" },
    ],
    invokeVerify: async (request) => {
      calls.push(request);
      return matchResponse(request, calls.length);
    },
  });
  assert.deepEqual(calls, [
    { op: "verify", term: "באשאטמינ", scope: "torah", skip: 16, dir: 1, start: 80 },
    { op: "verify", term: "ימוררבש", scope: "torah", skip: 17, dir: -1, start: 203 },
  ]);
  assert.equal(review.status, "VERIFIED");
  assert.equal(review.proposals.length, 2);
  assert.equal(review.proposals[0].exactText, "באשאטמינ");
  assert.equal(review.proposals[0].reading, "באש אטמין");
  assert.deepEqual(review.proposals[0].authority, { exactText: "CANONICAL", reading: "PROPOSED", meaning: "INTERPRETATION" });
  assert.equal(review.proposals[1].verification.state, "MATCH");
  assert.equal(review.proposals[1].verification.start, 203);
  assert.equal(normalizeElsRazielLanguageReview(review)?.proposals.length, 2);
  assert.equal(normalizeElsRazielLanguageReview({ ...review, proposals: review.proposals.map((item) => ({ ...item, verification: { ...item.verification, state: "UNVERIFIED" } })) }), null);
});

test("mismatch, invented substring and model coordinates cannot become a verified proposal", async () => {
  const material = validateElsRazielLanguageCandidateMaterial(materialInput, surfaceSemantic);
  const calls = [];
  const review = await reviewElsRazielLanguageProposals({
    material,
    proposals: [
      { ray_id: "R1", reading: "באש", skip: 999, start: 999 },
      { ray_id: "R9", reading: "באש אטמין" },
      { ray_id: "R1", reading: "באש אטמין", skip: 999, start: 999 },
    ],
    invokeVerify: async (request) => {
      calls.push(request);
      return { result: { contract: "els_occurrence_replay_v1", status: "REPLAY_MISMATCH", verification_state: "MISMATCH", occurrence: null } };
    },
  });
  assert.deepEqual(calls, [{ op: "verify", term: "באשאטמינ", scope: "torah", skip: 16, dir: 1, start: 80 }]);
  assert.equal(review.status, "NO_VERIFIED_PROPOSALS");
  assert.deepEqual(review.proposals, []);
});

test("ai-analyze uses the existing bridge and removes raw model proposals from the response", () => {
  const server = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
  const transport = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  assert.match(server, /validateElsRazielLanguageCandidateMaterial\(body\?\.candidate_material, body\?\.surface_semantic\)/);
  assert.match(server, /functions\/v1\/els-search-bridge/);
  assert.match(server, /reviewElsRazielLanguageProposals/);
  assert.match(server, /delete contract\.els_language_proposals/);
  assert.match(server, /contract\.facts = \[\]/);
  assert.match(transport, /candidate_material: candidateMaterial/);
  assert.doesNotMatch(transport, /functions\.invoke\(['"]els-search-bridge/);
});

test("the real ai-analyze handler makes one model call and exposes only a canonical MATCH review", async () => {
  const replay = matchResponse({ term: "באשאטמינ", scope: "torah", skip: 16, dir: 1, start: 80 }, "runtime").result;
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מצא לי הצלבות למילה משיח",
      facts: "מופע ELS מאומת: משיח",
      visitor_id: "velslanguagereview123",
      intelligence_level: "deep",
      research_contract: "public-number-research-run-v1",
      surface_semantic: surfaceSemantic,
      conversation_resolution: F.expressionConversation("משיח"),
      candidate_material: materialInput,
    },
    researchBundleByExpression: { משיח: F.expressionCrossingBundle("משיח") },
    researchBundleByNumber: { 358: F.numberBundle(358) },
    elsVerifyResult: replay,
    modelResult: {
      text: JSON.stringify({
        v: 1,
        agent: "raziel",
        answer: "טיוטת מודל שאינה עוברת ישירות למשתמש",
        facts: [{ label: "אסור", value: "חומר מועמד" }],
        suggested_paths: [],
        follow_up_question: null,
        continue_wa: true,
        els_language_proposals: [{ ray_id: "R1", reading: "באש אטמין", interpretation: "קריאה אפשרית" }],
      }),
      usage: { input_tokens: 40, output_tokens: 30 },
      attempts: 1,
      degraded: false,
    },
  });

  assert.equal(run.models.length, 1);
  assert.equal(run.calls.filter((call) => call.name === "els-search-bridge").length, 1);
  assert.deepEqual(run.calls.find((call) => call.name === "els-search-bridge").payload, {
    op: "verify",
    term: "באשאטמינ",
    scope: "torah",
    skip: 16,
    dir: 1,
    start: 80,
    interaction_id: run.calls.find((call) => call.name === "els-search-bridge").payload.interaction_id,
  });
  assert.equal(run.result.raziel.els_language_review.status, "VERIFIED");
  assert.equal(run.result.raziel.els_language_review.proposals[0].verification.state, "MATCH");
  assert.equal(run.result.raziel.els_language_review.proposals[0].reading, "באש אטמין");
  assert.deepEqual(run.result.raziel.facts, []);
  assert.equal("els_language_proposals" in run.result.raziel, false);
  assert.doesNotMatch(run.result.raziel.answer, /טיוטת מודל|חומר מועמד/);
});
