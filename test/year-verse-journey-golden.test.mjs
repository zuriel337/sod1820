import test from "node:test";
import assert from "node:assert/strict";
import {
  YEAR_VERSE_COUNTING_SCHEME,
  YEAR_VERSE_JOURNEY_GOLDEN,
  yearVerseGoldenByYear,
} from "../src/lib/research/yearVerseJourneyGolden.js";

test("Year/Verse Golden keeps canonical Verse identity separate from ordinal/counting scheme", () => {
  const y2216 = yearVerseGoldenByYear(2216);
  const y5786 = yearVerseGoldenByYear(5786);

  assert.equal(y2216.canonicalVerse.verseIdentity, "verse:shmot:25:23");
  assert.equal(y5786.canonicalVerse.verseIdentity, "verse:devarim:32:34");

  assert.equal(y2216.sourceClaim.ordinal, 2216);
  assert.equal(y2216.technicalProjection.ordinal, 2216);
  assert.equal(y2216.comparison.ordinalDelta, 0);

  assert.equal(y5786.sourceClaim.ordinal, 5786);
  assert.equal(y5786.technicalProjection.ordinal, 5787);
  assert.equal(y5786.comparison.ordinalDelta, 1);
  assert.equal(y5786.comparison.countingSchemesEquivalent, false);
});

test("source claim remains source-attested and never upgrades to canonical truth", () => {
  for (const item of YEAR_VERSE_JOURNEY_GOLDEN) {
    assert.equal(item.relationKind, "source_attested_year_to_verse");
    assert.equal(item.sourceClaim.truthState, "source_attested_not_canonical");
    assert.equal(item.technicalProjection.truthState, "derived_from_current_corpus_order");
    assert.equal(item.comparison.sameVerseIdentity, true);
    assert.ok(item.journey.whyTransition);
    assert.ok(item.journey.exactReturnRef.startsWith("year-verse:"));
  }
});

test("counting schemes are explicit and independently named", () => {
  assert.equal(YEAR_VERSE_COUNTING_SCHEME.SOD_REGULAR_5845_V1, "sod_regular_5845_v1");
  assert.equal(YEAR_VERSE_COUNTING_SCHEME.TANACH_VERSES_5846_V1, "tanach_verses_5846_v1");
  assert.notEqual(
    YEAR_VERSE_COUNTING_SCHEME.SOD_REGULAR_5845_V1,
    YEAR_VERSE_COUNTING_SCHEME.TANACH_VERSES_5846_V1
  );
});

console.log("Year/Verse Journey Golden provenance fixture: PASS");
