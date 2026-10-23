import assert from "node:assert/strict";
import test from "node:test";

import {
  BEIT_MIDRASH_LEARNING_MANIFEST,
  BEIT_MIDRASH_LEARNING_SECTION,
  beitMidrashLearningHref,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";

const lesson = BEIT_MIDRASH_LEARNING_MANIFEST.sourceReadingLesson;

test("source reading lesson teaches the complete check without becoming a source repository", () => {
  assert.equal(lesson.id, "source-reading");
  assert.deepEqual(
    lesson.steps.map((step) => step.id),
    ["locator", "context", "quotation", "calculation", "independence", "interpretation", "return"],
  );
  assert.ok(lesson.steps.every((step) => step.title && step.body && step.check && step.boundary));
  assert.ok(lesson.steps.every((step) => step.href.startsWith("/beit-midrash?section=sources&step=")));
  assert.match(lesson.steps.find((step) => step.id === "independence").boundary, /מספר ההופעות אינו מספר המקורות העצמאיים/);
  assert.match(lesson.steps.find((step) => step.id === "return").boundary, /מראה מקום פנימי אינו בהכרח קישור/);
  assert.equal(lesson.continuation.href, "/beit-midrash?section=guided");
});

test("source reading exercise explains one source with repeated occurrences and never scores it", () => {
  const exercise = lesson.exercise;
  const correct = exercise.options.find((option) => option.id === exercise.correctOptionId);
  assert.equal(correct?.id, "one-source-three-occurrences");
  assert.match(exercise.explanation, /שלוש הופעות של מקור אחד/);
  assert.equal(exercise.feedbackMode, "explanation-only");
  for (const forbidden of ["score", "points", "rank", "rating"]) {
    assert.equal(Object.hasOwn(exercise, forbidden), false, forbidden);
  }
});

test("source lesson progress lives only in the URL and stores no personal data", () => {
  assert.deepEqual(lesson.progress, {
    persistence: "url-only",
    storesPersonalData: false,
  });
  assert.equal(Object.isFrozen(lesson), true);
  assert.equal(Object.isFrozen(lesson.objectives), true);
  assert.equal(Object.isFrozen(lesson.steps), true);
  assert.equal(Object.isFrozen(lesson.exercise), true);
  assert.equal(Object.isFrozen(lesson.exercise.options), true);

  const publicCopy = JSON.stringify(lesson);
  assert.doesNotMatch(publicCopy, /https?:\/\//);
  assert.doesNotMatch(publicCopy, /admin=1|search[_ ]?terms|private|candidate/i);
  assert.doesNotMatch(publicCopy, /\b(?:Web|projection|Research)\b/);
  assert.doesNotMatch(publicCopy, /sourceRef|sourceHref|canonicalFindingHref/);
  assert.doesNotMatch(
    lesson.steps.map(({ title, body, check, boundary }) => `${title} ${body} ${check} ${boundary}`).join(" "),
    /\blocator\b/i,
  );
});

test("source reading steps have exact resumable links and cannot leak into other sections", () => {
  const independence = resolveBeitMidrashLearningLocation({
    search: "?section=sources&step=independence",
  });
  assert.equal(independence.section, BEIT_MIDRASH_LEARNING_SECTION.SOURCES);
  assert.equal(independence.sourceStepId, "independence");
  assert.equal(
    independence.canonicalHref,
    "/beit-midrash?section=sources&step=independence#source-step-independence",
  );
  assert.equal(
    beitMidrashLearningHref("sources", { sourceStepId: "quotation" }),
    "/beit-midrash?section=sources&step=quotation#source-step-quotation",
  );

  const invalid = resolveBeitMidrashLearningLocation({
    search: "?section=sources&step=not-a-step",
  });
  assert.equal(invalid.sourceStepId, null);
  assert.equal(invalid.canonicalHref, "/beit-midrash?section=sources");

  const wrongSection = resolveBeitMidrashLearningLocation({
    search: "?section=guided&step=quotation",
  });
  assert.equal(wrongSection.sourceStepId, null);
  assert.equal(wrongSection.canonicalHref, "/beit-midrash?section=guided");
});

test("source learning path enters the canonical source reading lesson", () => {
  const path = BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.find((item) => item.id === "sources");
  assert.equal(path.steps[0].href, lesson.href);
});
