import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEIT_MIDRASH_LEARNING_MANIFEST,
  beitMidrashLearningHref,
  buildBeitMidrashLearningPath,
  buildBeitMidrashLearningProjection,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";

test("every learning path exposes stable URL-only journey steps", () => {
  const paths = BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths;
  assert.ok(paths.length >= 7);

  for (const path of paths) {
    assert.deepEqual(path.progress, {
      persistence: "url-only",
      storesPersonalData: false,
      completionInferred: false,
    });
    assert.equal(new Set(path.steps.map((step) => step.id)).size, path.steps.length);
    for (const step of path.steps) {
      assert.ok(step.id);
      assert.ok(step.href, `${path.id}:${step.id} keeps its canonical lesson destination`);
      assert.equal(
        step.pathHref,
        `/beit-midrash?section=paths&path=${path.id}&pathStep=${step.id}#path-${path.id}-step-${step.id}`,
      );
    }
  }
});

test("the 1820 path resumes an exact step without pretending it was completed", () => {
  const href = beitMidrashLearningHref("paths", {
    pathId: "sod1820",
    pathStepId: "math-profile",
  });
  assert.equal(
    href,
    "/beit-midrash?section=paths&path=sod1820&pathStep=math-profile#path-sod1820-step-math-profile",
  );

  const location = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&pathStep=math-profile",
  });
  assert.equal(location.pathId, "sod1820");
  assert.equal(location.pathStepId, "math-profile");
  assert.equal(location.canonicalHref, href);

  const journey = buildBeitMidrashLearningPath(location.pathId, location.pathStepId);
  assert.equal(journey.path.title, "מסלול 1820");
  assert.equal(journey.selectedIndex, 2);
  assert.equal(journey.selectedStep.id, "math-profile");
  assert.equal(journey.selectedStep.href, "/beit-midrash?section=numbers&concept=math-profile#number-concept-math-profile");
  assert.equal(journey.previousStep.id, "number-layers");
  assert.equal(journey.nextStep.id, "method");
});

test("unknown path input is discarded and an unknown step falls back to the path opening", () => {
  const unknownPath = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=private-draft&pathStep=secret",
  });
  assert.equal(unknownPath.pathId, null);
  assert.equal(unknownPath.pathStepId, null);
  assert.equal(unknownPath.canonicalHref, "/beit-midrash?section=paths");
  assert.equal(buildBeitMidrashLearningPath(unknownPath.pathId, unknownPath.pathStepId), null);

  const unknownStep = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&pathStep=not-a-step",
  });
  assert.equal(unknownStep.pathId, "sod1820");
  assert.equal(unknownStep.pathStepId, null);
  assert.equal(unknownStep.canonicalHref, "/beit-midrash?section=paths&path=sod1820#path-sod1820");
  assert.equal(buildBeitMidrashLearningPath("sod1820", "not-a-step").selectedStep.id, "presentation");
});

test("combined projection exposes the selected journey without another store or reader", () => {
  const projection = buildBeitMidrashLearningProjection({
    search: "?section=paths&path=ciphers&pathStep=cipher-tool",
  });
  assert.equal(projection.learningPath.path.id, "ciphers");
  assert.equal(projection.learningPath.selectedStep.id, "cipher-tool");
  assert.equal(projection.learningPath.selectedStep.href, "/code");
  assert.equal(projection.learningPath.previousStep.id, "cipher-lesson");
  assert.equal(projection.learningPath.nextStep.id, "source-reading");
});

test("learning path contract owns no fetch, storage or completion scoring", () => {
  const source = fs.readFileSync(
    new URL("../src/lib/research/beitMidrashLearningProjection.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /completedSteps|completionScore|markComplete/);
});
