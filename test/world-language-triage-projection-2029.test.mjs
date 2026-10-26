import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchWorldLanguageTriageProjection,
  projectWorldLanguageTriageRows,
} from "../src/lib/research/worldLanguageTriageProjection.js";

const verified = {
  id: "a", hebrew: "סוד", foreign_word: "secret", lang: "en", relationship_type: "shared_value",
  gematria_he: 70, status: "approved", method: "English Ordinal", evidence_level: "strong",
  translation_source: "curated · engine-verified", human_verified: true,
};

test("language triage keeps approval, human verification, method and evidence separate", () => {
  const projection = projectWorldLanguageTriageRows([
    verified,
    { ...verified, id: "b", hebrew: "הבטחה", foreign_word: "promise", human_verified: false, translation_source: null },
  ]);
  assert.equal(projection.counts.approved, 2);
  assert.equal(projection.counts.humanVerified, 1);
  assert.equal(projection.counts.needsHumanReview, 1);
  assert.equal(projection.rows[0].state, "needs_human_review");
  assert.match(projection.rows[0].recommendation, /דורש אימות אנושי/u);
  assert.equal(projection.rules.translationIsSeparateFromNumericEquality, true);
});

test("language duplicate detection does not delete either source row", () => {
  const projection = projectWorldLanguageTriageRows([verified, { ...verified, id: "b" }]);
  assert.equal(projection.rows.length, 2);
  assert.deepEqual(projection.duplicateGroups, [["a", "b"]]);
});

test("language triage reuses one canonical reader", async () => {
  const calls = [];
  const projection = await fetchWorldLanguageTriageProjection({ reader: async (limit) => { calls.push(limit); return [verified]; } });
  assert.deepEqual(calls, [200]);
  assert.equal(projection.rows.length, 1);
});
