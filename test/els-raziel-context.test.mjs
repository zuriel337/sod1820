import test from "node:test";
import assert from "node:assert/strict";
import {
  buildElsRazielExactHref,
  buildElsRazielSurfaceContext,
  buildElsRazielGuidance,
  readElsRazielExactReturn,
} from "../src/lib/research/elsRazielContext.js";

const researchContext = {
  lens: "els",
  subject: { id: "subject:private", type: "phrase", label: "טקסט פרטי", href: "/els" },
  selection: { entityType: "els", corpus: "torah" },
  journey: { id: "path-1", kind: "research_path", position: 2, revisionId: "rev-1", revisionNo: 4 },
};

const projection = {
  contract: "els_2029_projection_v1",
  status: "OK",
  corpusId: "torah-v1",
  term: "משיח",
  completion: { totalHits: 12, returnedHits: 4, truncated: true },
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
};

const languageInspection = {
  contract: "els_matrix_language_inspection_v1",
  status: "CANDIDATE_INPUT",
  source: "canonical_matrix_letters",
  axis: { term: "משיח", scope: "torah", skip: 17, dir: 1, start: 100 },
  authority: { letters: "CANONICAL", segmentation: "UNVERIFIED", meaning: "UNVERIFIED", canonicalReplayRequired: true },
  coverage: { stage: "A", rayCap: 24, maxLetters: 24, totalRays: 61, returnedRays: 2, truncated: true },
  modelCallsTriggered: 0,
  rays: [
    { id: "ignored", orientation: "diagonal-left", text: "באשאטמינ", reverseText: "נימטאשאב", start: 80, step: 16, length: 8, distance: 0, intersectsAxis: true },
    { id: "ignored-too", orientation: "vertical", text: "שבררומי", reverseText: "ימוררבש", start: 101, step: 17, length: 7, distance: 1, intersectsAxis: false },
  ],
};

test("Raziel ELS context carries the selected expression and exact coordinates without the private subject label", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection });
  assert.equal(out.surface, "els");
  assert.match(out.subject.ref, /^anon:/);
  assert.match(out.occurrence.occurrenceRef, /^anon:/);
  assert.equal(out.occurrence.occurrenceRef.includes("משיח"), false);
  assert.equal(out.occurrence.term, "משיח");
  assert.equal(out.occurrence.corpus, "torah");
  assert.equal(out.result.corpusId, "torah-v1");
  assert.equal(out.result.presentationPolicy, "exact_replay_v1");
  assert.deepEqual(out.verification, { state: "MATCH", source: "canonical_els_engine", interpretation: false });
  assert.equal(out.privacy.includeText, false);
  assert.equal(out.privacy.rawPrivatePayloadLogged, false);
  assert.equal("text" in out, false);
  assert.equal("id" in out.subject, false);
  assert.equal("href" in out.subject, false);
  assert.equal("label" in out.subject, false);
  assert.equal("term" in out.result, false);
});

test("authorized caller may explicitly include bounded visible text", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection, includeText: true });
  assert.equal(out.privacy.includeText, true);
  assert.equal(out.text.subjectLabel, "טקסט פרטי");
  assert.equal(out.text.term, "משיח");
});

test("Raziel context preserves Journey and exact locus without creating evidence or truth state", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection });
  assert.equal(out.journey.id, "path-1");
  assert.equal(out.journey.revisionNo, 4);
  assert.deepEqual(out.occurrence.positions, [100,117,134,151]);
  assert.equal("evidenceWeight" in out, false);
  assert.equal("truth" in out, false);
  assert.equal("canonical" in out, false);
});

test("Raziel adapter keeps absent exact fields null instead of inventing zero", () => {
  const out = buildElsRazielSurfaceContext({
    researchContext: { lens: "els", selection: { entityType: "els", corpus: "torah" }, journey: { id: "path-2", kind: "research_path", position: null } },
    projection: {
      contract: "els_2029_projection_v1",
      status: "OK",
      term: "משיח",
      presentation: { policy: "exact_replay_v1", representative: true },
      completion: { totalHits: null, returnedHits: null, truncated: false },
      selectedOccurrence: {
        occurrenceId: "occ-null",
        corpusId: "torah-v1",
        skip: 9,
        dir: 1,
        start: 50,
        end: null,
        positions: [50, null, 68],
        dependencyGroup: "g-null",
        coordinateConvention: "zero_based_character_index",
      },
    },
  });
  assert.equal(out.occurrence.end, null);
  assert.deepEqual(out.occurrence.positions, [50, 68]);
  assert.equal(out.result.totalHits, null);
  assert.equal(out.journey.position, null);
});

test("Raziel receives only bounded automatic-plan coverage beside an exact verified occurrence", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection, planSummary: {
    contract: "els_automatic_plan_summary_v1", sourceCount: 2, variantCount: 9,
    scannedCount: 4, partialCount: 1, failedCount: 0, hasPending: true, scope: "torah",
    privateTerm: "טקסט פרטי",
  } });
  assert.equal(out.plan.variantCount, 9);
  assert.equal(JSON.stringify(out).includes("טקסט פרטי"), false);
  const guidance = buildElsRazielGuidance(out);
  assert.match(guidance.lead, /9 צורות/);
  assert.match(guidance.lead, /לא ראיות עצמאיות/);
  assert.equal(guidance.evidencePromotion, false);
  assert.match(guidance.title, /משיח/);
  assert.match(guidance.boundary, /פרשנות נפרדת/);
  assert.match(guidance.inactive, /לחזור למופע המדויק/);
});

test("Raziel receives a bounded exact-letter language map only when it belongs to the selected occurrence", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection, languageInspection });
  assert.equal(out.languageInspection.contract, "els_matrix_language_inspection_v1");
  assert.equal(out.languageInspection.status, "CANDIDATE_INPUT");
  assert.equal(out.languageInspection.modelCallsTriggered, 0);
  assert.equal(out.languageInspection.rays.length, 2);
  assert.equal(out.languageInspection.rays[0].id, "diagonal-left:80:16:8");
  assert.deepEqual(out.languageInspection.authority, {
    letters: "CANONICAL",
    segmentation: "UNVERIFIED",
    meaning: "UNVERIFIED",
    canonicalReplayRequired: true,
  });
  assert.equal("label" in out.languageInspection.rays[0], false);

  const differentOccurrence = buildElsRazielSurfaceContext({
    researchContext,
    projection: { ...projection, selectedOccurrence: { ...projection.selectedOccurrence, start: 101 } },
    languageInspection,
  });
  assert.equal("languageInspection" in differentOccurrence, false, "a stale map cannot leak into a newly selected occurrence");

  const interpreted = buildElsRazielSurfaceContext({
    researchContext,
    projection,
    languageInspection: { ...languageInspection, status: "VERIFIED_LANGUAGE" },
  });
  assert.equal("languageInspection" in interpreted, false, "the seam never accepts an engine-external truth promotion");
});

test("unverified, ordinary-search and incomplete occurrences never cross the ELS to Raziel seam", () => {
  assert.equal(buildElsRazielSurfaceContext({ researchContext, projection: { ...projection, status: "UNVERIFIED" } }), null);
  assert.equal(buildElsRazielSurfaceContext({ researchContext, projection: { ...projection, presentation: { policy: "ordered_prefix_v1" } } }), null);
  assert.equal(buildElsRazielSurfaceContext({ researchContext, projection: { ...projection, selectedOccurrence: { ...projection.selectedOccurrence, start: null } } }), null);
  assert.equal(buildElsRazielSurfaceContext({ researchContext: { ...researchContext, selection: null }, projection }), null);
});

test("exact return round-trips through the existing canonical research-load coordinates", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection });
  const href = buildElsRazielExactHref(out);
  assert.match(href, /^\/code\?els_return=verified-v1&/);
  const loaded = readElsRazielExactReturn(href.split("?")[1]);
  assert.deepEqual({
    term: loaded.term,
    scope: loaded.scope,
    corpusId: loaded.corpusId,
    skip: loaded.skip,
    dir: loaded.dir,
    start: loaded.start,
    hitId: loaded.hitId,
  }, {
    term: "משיח",
    scope: "torah",
    corpusId: "torah-v1",
    skip: 17,
    dir: 1,
    start: 100,
    hitId: "17_1_100",
  });
  assert.equal(readElsRazielExactReturn("els_return=verified-v1&term=משיח&scope=torah&skip=17&dir=1"), null);
  assert.equal(readElsRazielExactReturn("els_return=unverified&term=משיח&scope=torah&skip=17&dir=1&start=100"), null);
  assert.equal(readElsRazielExactReturn(`els_return=verified-v1&term=${"א".repeat(81)}&scope=torah&skip=17&dir=1&start=100`), null);
});

console.log("ELS Raziel surface context adapter: PASS");
