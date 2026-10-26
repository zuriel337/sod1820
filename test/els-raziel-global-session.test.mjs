import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildElsRazielExactHref,
  buildElsRazielLanguageCandidateMaterial,
  buildElsRazielSurfaceContext,
  readElsRazielExactReturn,
} from "../src/lib/research/elsRazielContext.js";
import {
  createRazielRequestContextSnapshot,
  prepareRazielSessionSubmission,
} from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import {
  buildRazielSavedSessionEntity,
  razielSavedSessionState,
} from "../src/lib/research/razielSavedSession2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/pages/Els2029Page.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");

const researchContext = {
  lens: "els",
  subject: { id: "subject", type: "phrase", label: "משיח" },
  selection: { entityType: "els", corpus: "torah" },
};

function exactProjection({ term = "משיח", start = 100, skip = 17, dir = 1 } = {}) {
  const end = start + skip * dir * (term.length - 1);
  return {
    contract: "els_2029_projection_v1",
    status: "OK",
    corpusId: "torah-v1",
    term,
    completion: { totalHits: 1, returnedHits: 1, truncated: false },
    presentation: { policy: "exact_replay_v1", representative: true },
    selectedOccurrence: {
      occurrenceId: `els:torah-v1:${term}:${skip}:${dir}:${start}`,
      corpusId: "torah-v1",
      skip,
      dir,
      start,
      end,
      positions: Array.from(term, (_, index) => start + index * skip * dir),
      coordinateConvention: "zero_based_character_index",
    },
  };
}

function exactContext(options) {
  return buildElsRazielSurfaceContext({ researchContext, projection: exactProjection(options) });
}

test("selecting or opening a verified ELS occurrence cannot call AI; one explicit question has one transport boundary", () => {
  assert.match(page, /shell\.openRaziel\(\{/);
  assert.doesNotMatch(page, /askRaziel|ai-analyze|session\.submit/);
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.equal((chat.match(/session\.submit\(/g) || []).length, 1);
  assert.match(chat, /<form[^>]*onSubmit=/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
  assert.doesNotMatch(provider.slice(0, provider.indexOf("const submit")), /transport\s*\(/);
});

test("the global conversation continues from an ELS turn on a different page", () => {
  const els = exactContext();
  const snapshot = createRazielRequestContextSnapshot(researchContext, { elsFocus: els }, "2026-10-26T12:00:00Z");
  const state = {
    ...createInitialRazielSessionState(),
    thread: [
      { role: "user", text: "מה מאומת כאן?", turnId: "els-turn" },
      { role: "raziel", text: "המיקום מאומת; המשמעות פרשנית.", turnId: "els-turn", level: "fast" },
    ],
    contextSnapshot: snapshot,
    status: "ready",
  };
  const prepared = prepareRazielSessionSubmission({
    question: "ועכשיו מה הקשר לדף הזה?",
    state,
    researchContext: { lens: "number", subject: { type: "number", id: "1820", label: "1820" } },
    view: { numberFocus: { root: 1820, expression: "1820" } },
    startedAt: "2026-10-26T12:01:00Z",
    createTurnId: () => "next-turn",
  });
  assert.match(prepared.request.context, /שיחה אחרונה:/);
  assert.match(prepared.request.context, /מה מאומת כאן/);
  assert.equal(prepared.request.surfaceSemantic.number.expression, "1820");
  assert.equal(prepared.request.surfaceSemantic.els, undefined);
});

test("save and restore preserve ELS occurrence identity and an exact canonical return", () => {
  const els = exactContext();
  const snapshot = createRazielRequestContextSnapshot(researchContext, { elsFocus: els }, "2026-10-26T12:00:00Z");
  const state = {
    ...createInitialRazielSessionState(),
    thread: [
      { role: "user", text: "מה מאומת כאן?", turnId: "els-turn" },
      { role: "raziel", text: "המיקום מאומת.", question: "מה מאומת כאן?", turnId: "els-turn", level: "fast", sourceNames: [] },
    ],
    contextSnapshot: snapshot,
    status: "ready",
    sessionRef: "els-session",
  };
  const built = buildRazielSavedSessionEntity(state, { now: () => "2026-10-26T12:02:00Z" });
  assert.equal(built.ok, true);
  const restored = razielSavedSessionState(built.entity);
  assert.deepEqual(restored.contextSnapshot.focus.els, snapshot.focus.els);
  assert.equal(restored.contextSnapshot.focus.els.term, "משיח");
  assert.equal(restored.contextSnapshot.focus.els.occurrence, els.occurrence.occurrenceRef);
  assert.equal(restored.contextSnapshot.focus.els.start, 100);
  assert.equal(restored.contextSnapshot.focus.els.skip, 17);
  const href = buildElsRazielExactHref(restored.contextSnapshot.focus.els);
  const reopened = readElsRazielExactReturn(href.split("?")[1]);
  assert.deepEqual(
    { term: reopened.term, scope: reopened.scope, skip: reopened.skip, dir: reopened.dir, start: reopened.start },
    { term: "משיח", scope: "torah", skip: 17, dir: 1, start: 100 },
  );
});

test("two successively selected occurrences retain distinct refs and the second request contains no first-occurrence coordinates", () => {
  const first = exactContext({ term: "משיח", start: 100, skip: 17 });
  const second = exactContext({ term: "טבת", start: 900, skip: 23, dir: -1 });
  assert.notEqual(first.occurrence.occurrenceRef, second.occurrence.occurrenceRef);
  const prepared = prepareRazielSessionSubmission({
    question: "מה רואים במופע השני?",
    state: createInitialRazielSessionState(),
    researchContext,
    facts: `מופע ELS מאומת: ${second.occurrence.term}`,
    view: { elsFocus: second },
    startedAt: "2026-10-26T12:03:00Z",
    createTurnId: () => "second-turn",
  });
  assert.equal(prepared.request.surfaceSemantic.els.term, "טבת");
  assert.equal(prepared.request.surfaceSemantic.els.occurrence, second.occurrence.occurrenceRef);
  assert.equal(prepared.request.surfaceSemantic.els.start, 900);
  assert.equal(prepared.request.surfaceSemantic.els.skip, 23);
  assert.doesNotMatch(JSON.stringify(prepared.request.surfaceSemantic.els), /"start":100|"skip":17/);
  assert.doesNotMatch(prepared.request.facts, /משיח/);
});

test("unverified ELS cannot become a Raziel fact and one-shots stay on the existing Bundle-gated submit", () => {
  const unverified = buildElsRazielSurfaceContext({
    researchContext,
    projection: { ...exactProjection(), status: "UNVERIFIED" },
  });
  assert.equal(unverified, null);
  assert.match(provider, /if \(!spec \|\| !shot\.ok\) return \{ ok: false, error: "no_material_for_one_shot" \}/);
  assert.match(provider, /return submit\(\{ \.\.\.options, question: shot\.question/);
  assert.doesNotMatch(provider, /submitOneShot[\s\S]*transport\(/);
});

test("one explicit ELS question carries candidate material outside facts through the existing request only", () => {
  const projection = exactProjection();
  const languageInspection = {
    contract: "els_matrix_language_inspection_v1",
    status: "CANDIDATE_INPUT",
    source: "canonical_matrix_letters",
    axis: { term: "משיח", scope: "torah", skip: 17, dir: 1, start: 100 },
    authority: { letters: "CANONICAL", segmentation: "UNVERIFIED", meaning: "UNVERIFIED", canonicalReplayRequired: true },
    coverage: { stage: "A", totalRays: 24, returnedRays: 24, truncated: true },
    modelCallsTriggered: 0,
    rays: Array.from({ length: 24 }, (_, index) => {
      const text = index === 4 ? "באשאטמינ" : index === 20 ? "ימוררבש" : `אבגד${"ה".repeat(index % 8)}`;
      return { orientation: index % 2 ? "diagonal-right" : "diagonal-left", text, reverseText: [...text].reverse().join(""), start: 200 + index, step: index % 2 ? 18 : 16, length: text.length, distance: index < 19 ? 0 : 1, intersectsAxis: index < 19 };
    }),
  };
  const els = buildElsRazielSurfaceContext({ researchContext, projection, languageInspection });
  const candidateMaterial = buildElsRazielLanguageCandidateMaterial(els);
  assert.equal(candidateMaterial.rays.length, 24);
  const prepared = prepareRazielSessionSubmission({
    question: "אילו קריאות לשוניות כדאי לאמת?",
    state: createInitialRazielSessionState(),
    researchContext,
    facts: "מופע ELS מאומת: משיח",
    view: { elsFocus: els },
    startedAt: "2026-10-26T12:04:00Z",
    createTurnId: () => "language-turn",
  });
  assert.doesNotMatch(prepared.request.facts, /ELS_LANGUAGE_MAP_V1|באשאטמינ|ימוררבש/);
  assert.equal(prepared.request.candidateMaterial.contract, "els_language_candidate_material_v1");
  assert.equal(prepared.request.candidateMaterial.rays.length, 24);
  assert.equal(prepared.request.candidateMaterial.rays[4].text, "באשאטמינ");
  assert.equal(prepared.request.candidateMaterial.rays[20].text, "ימוררבש");
  assert.equal(prepared.request.surfaceSemantic.els.occurrence, els.occurrence.occurrenceRef);
  assert.equal(prepared.turn.continuation.candidateMaterial.occurrence.occurrenceRef, els.occurrence.occurrenceRef);
  assert.equal(prepared.turn.continuation.candidateMaterial.rays.length, 24);
});

test("the 320px-safe UI uses bounded cards and links without a second chat/provider", () => {
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.match(frame, /data-raziel-saved-els-context="true"/);
  assert.match(frame, /data-raziel-return-to-els="true"/);
  assert.equal((frame.match(/function RazielNativeChat\(/g) || []).length, 1);
  assert.doesNotMatch(chat, /createContext\(|RazielSessionProvider/);
});

console.log("ELS global Raziel session seam: PASS");
