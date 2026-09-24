import test from "node:test";
import assert from "node:assert/strict";
import { buildElsRazielSurfaceContext } from "../src/lib/research/elsRazielContext.js";

const researchContext = {
  lens: "els",
  subject: { id: "subject:private", type: "phrase", label: "טקסט פרטי", href: "/els" },
  journey: { id: "path-1", kind: "research_path", position: 2, revisionId: "rev-1", revisionNo: 4 },
};

const projection = {
  contract: "els_2029_projection_v1",
  status: "OK",
  corpusId: "torah-v1",
  term: "משיח",
  completion: { totalHits: 12, returnedHits: 4, truncated: true },
  presentation: { policy: "ordered_prefix_v1", representative: false },
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

test("Raziel ELS context defaults to refs/coordinates without raw term or subject label", () => {
  const out = buildElsRazielSurfaceContext({ researchContext, projection });
  assert.equal(out.surface, "els");
  assert.equal(out.subject.id, "subject:private");
  assert.equal(out.occurrence.occurrenceId, "els:torah-v1:משיח:17:1:100");
  assert.equal(out.result.presentationPolicy, "ordered_prefix_v1");
  assert.equal(out.privacy.includeText, false);
  assert.equal(out.privacy.rawPrivatePayloadLogged, false);
  assert.equal("text" in out, false);
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
    researchContext: { lens: "els", journey: { id: "path-2", kind: "research_path", position: null } },
    projection: {
      contract: "els_2029_projection_v1",
      status: "OK",
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

console.log("ELS Raziel surface context adapter: PASS");
