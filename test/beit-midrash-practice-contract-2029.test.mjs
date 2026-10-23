import assert from "node:assert/strict";
import test from "node:test";

import {
  BEIT_MIDRASH_LEARNING_MANIFEST,
  beitMidrashLearningHref,
  buildBeitMidrashLearningProjection,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";

const activity = (id) => BEIT_MIDRASH_LEARNING_MANIFEST.practiceActivities.find((item) => item.id === id);

test("practice is a small gateway to existing lessons and canonical tools", () => {
  assert.deepEqual(
    BEIT_MIDRASH_LEARNING_MANIFEST.practiceActivities.map((item) => item.id),
    ["source-independence", "cipher-comparison", "calculation", "guided-discovery", "game"],
  );
  assert.equal(activity("source-independence").href, "/beit-midrash?section=sources&step=independence#source-step-independence");
  assert.equal(activity("cipher-comparison").href, "/beit-midrash?section=ciphers&step=comparison#cipher-step-comparison");
  assert.equal(activity("calculation").href, BEIT_MIDRASH_LEARNING_MANIFEST.destinations.calculator.href);
  assert.equal(activity("guided-discovery").href, "/beit-midrash?section=guided");
  assert.equal(activity("game").href, BEIT_MIDRASH_LEARNING_MANIFEST.destinations.game.href);
});

test("practice references exercises without copying their questions or answers", () => {
  const activities = BEIT_MIDRASH_LEARNING_MANIFEST.practiceActivities;
  for (const item of activities) {
    assert.equal("prompt" in item, false);
    assert.equal("options" in item, false);
    assert.equal("explanation" in item, false);
    assert.equal(item.researchRating, false);
  }
  assert.equal(activity("source-independence").feedbackMode, BEIT_MIDRASH_LEARNING_MANIFEST.sourceReadingLesson.exercise.feedbackMode);
  assert.equal(activity("cipher-comparison").feedbackMode, BEIT_MIDRASH_LEARNING_MANIFEST.cipherReadingLesson.exercise.feedbackMode);
});

test("game score remains playful and can never become research or completion state", () => {
  assert.deepEqual(BEIT_MIDRASH_LEARNING_MANIFEST.practicePolicy, {
    persistence: "url-only",
    completionInferred: false,
    gameScoreIsResearchRating: false,
  });
  assert.equal(activity("game").status, "preview_only");
  assert.equal(activity("game").feedbackMode, "game-only");
  assert.match(activity("game").description, /הניקוד שייך למשחק בלבד/);
});

test("an activity deep link stays inside Beit Midrash and resolves exactly", () => {
  const href = beitMidrashLearningHref("practice", { activityId: "source-independence" });
  assert.equal(href, "/beit-midrash?section=practice&activity=source-independence#practice-source-independence");

  const location = resolveBeitMidrashLearningLocation({
    search: "?section=practice&activity=source-independence",
  });
  assert.equal(location.section, "practice");
  assert.equal(location.activityId, "source-independence");
  assert.equal(location.canonicalHref, href);

  const projection = buildBeitMidrashLearningProjection({ search: "?section=practice&activity=source-independence" });
  assert.equal(projection.practiceActivity.id, "source-independence");
  assert.equal(projection.practiceActivity.kind, "lesson-exercise");
});

test("unknown activities and activity parameters outside practice fail closed", () => {
  const unknown = resolveBeitMidrashLearningLocation({ search: "?section=practice&activity=private-score" });
  assert.equal(unknown.activityId, null);
  assert.equal(unknown.canonicalHref, "/beit-midrash?section=practice");

  const outside = resolveBeitMidrashLearningLocation({ search: "?section=guided&activity=game" });
  assert.equal(outside.activityId, null);
  assert.equal(outside.canonicalHref, "/beit-midrash?section=guided");
  assert.equal(buildBeitMidrashLearningProjection({ search: "?section=guided&activity=game" }).practiceActivity, null);
});
