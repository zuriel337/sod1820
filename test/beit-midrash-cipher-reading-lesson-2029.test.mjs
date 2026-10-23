import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEIT_MIDRASH_LEARNING_MANIFEST,
  BEIT_MIDRASH_LEARNING_SECTION,
  beitMidrashLearningHref,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";

const lesson = BEIT_MIDRASH_LEARNING_MANIFEST.cipherReadingLesson;

test("cipher lesson teaches a repeatable reading sequence without becoming an ELS engine", () => {
  assert.equal(lesson.id, "cipher-reading");
  assert.deepEqual(
    lesson.steps.map((step) => step.id),
    ["text", "parameters", "letters", "repeat", "comparison", "source", "interpretation"],
  );
  assert.ok(lesson.steps.every((step) => step.title && step.body && step.check && step.boundary));
  assert.ok(lesson.steps.every((step) => step.href.startsWith("/beit-midrash?section=ciphers&step=")));
  assert.match(lesson.steps.find((step) => step.id === "comparison").boundary, /התאמה מקרית/);
  assert.match(lesson.steps.find((step) => step.id === "interpretation").boundary, /אינה לבדה הוכחה/);
  assert.equal(lesson.continuation.href, "/code?library=public");

  const source = fs.readFileSync(
    new URL("../src/lib/research/beitMidrashLearningProjection.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /els_search|els_verify|Els2029Page|calculateEls|runEls/i);
});

test("cipher lesson exercise explains search-space comparison and never scores research", () => {
  const exercise = lesson.exercise;
  assert.equal(exercise.correctOptionId, "comparison");
  assert.match(exercise.explanation, /התנאים ומרחב החיפוש/);
  assert.equal(exercise.feedbackMode, "explanation-only");
  for (const forbidden of ["score", "points", "rank", "rating"]) {
    assert.equal(Object.hasOwn(exercise, forbidden), false, forbidden);
  }
});

test("cipher lesson progress is URL-only and stores no personal result", () => {
  assert.deepEqual(lesson.progress, {
    persistence: "url-only",
    storesPersonalData: false,
  });
  assert.equal(Object.isFrozen(lesson), true);
  assert.equal(Object.isFrozen(lesson.objectives), true);
  assert.equal(Object.isFrozen(lesson.steps), true);
  assert.equal(Object.isFrozen(lesson.exercise), true);
  assert.equal(Object.isFrozen(lesson.exercise.options), true);
});

test("cipher practice opens canonical public images and replays them in the existing engine", () => {
  assert.deepEqual(lesson.enginePractice.visibility, {
    status: "published",
    access: "public",
    enforcedBy: "RLS",
  });
  assert.equal(lesson.enginePractice.searchHref, "/code");
  assert.equal(lesson.enginePractice.examplesHref, "/code?library=public");
  assert.equal(lesson.enginePractice.publicReader, "getMatrixLibraryPage");
  assert.equal(lesson.enginePractice.exactReplayHref, "savedMatrixWorkspaceHref");
  assert.equal(lesson.enginePractice.imageField, "image_url");
  assert.deepEqual(lesson.enginePractice.engineIdentityFields, [
    "corpus_id", "search_term", "skip_distance", "direction", "start_index",
  ]);
  assert.equal(lesson.enginePractice.createsEngine, false);
  assert.equal(lesson.enginePractice.createsImageStore, false);

  const reader = fs.readFileSync(new URL("../src/lib/elsMatrices.js", import.meta.url), "utf8");
  const replay = fs.readFileSync(new URL("../src/lib/elsSavedMatrix.js", import.meta.url), "utf8");
  assert.match(reader, /getMatrixLibraryPage/);
  assert.match(reader, /\.eq\("status", "published"\)\.eq\("visibility", "public"\)/);
  assert.match(reader, /image_url/);
  assert.match(replay, /savedMatrixWorkspaceHref/);
  assert.match(replay, /\/code\?cipher=/);
});

test("cipher steps have exact resumable links and do not leak into source lessons", () => {
  const comparison = resolveBeitMidrashLearningLocation({
    search: "?section=ciphers&step=comparison",
  });
  assert.equal(comparison.section, BEIT_MIDRASH_LEARNING_SECTION.CIPHERS);
  assert.equal(comparison.cipherStepId, "comparison");
  assert.equal(comparison.sourceStepId, null);
  assert.equal(
    comparison.canonicalHref,
    "/beit-midrash?section=ciphers&step=comparison#cipher-step-comparison",
  );
  assert.equal(
    beitMidrashLearningHref("ciphers", { cipherStepId: "letters" }),
    "/beit-midrash?section=ciphers&step=letters#cipher-step-letters",
  );

  const invalid = resolveBeitMidrashLearningLocation({ search: "?section=ciphers&step=unknown" });
  assert.equal(invalid.cipherStepId, null);
  assert.equal(invalid.canonicalHref, "/beit-midrash?section=ciphers");

  const source = resolveBeitMidrashLearningLocation({ search: "?section=sources&step=context" });
  assert.equal(source.sourceStepId, "context");
  assert.equal(source.cipherStepId, null);
});

test("cipher learning path connects the lesson, canonical tool and source reading", () => {
  const path = BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.find((item) => item.id === "ciphers");
  assert.equal(path.steps[0].href, lesson.href);
  assert.equal(path.steps[1].href, "/code?library=public");
  assert.equal(path.steps[2].href, BEIT_MIDRASH_LEARNING_MANIFEST.sourceReadingLesson.href);
});
