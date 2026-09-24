import { verseIdentity } from "./tanakhVerseIdentity.js";

export const YEAR_VERSE_COUNTING_SCHEME = Object.freeze({
  SOD_REGULAR_5845_V1: "sod_regular_5845_v1",
  TANACH_VERSES_5846_V1: "tanach_verses_5846_v1",
});

function makeYearVerseGolden({
  year,
  verseRef,
  sourceOrdinal,
  sourceCountingScheme,
  technicalOrdinal,
  sourceRef,
  sourceNote,
}) {
  const verse = verseIdentity(verseRef, { textWitness: "displayText" });
  if (!verse) throw new Error("invalid canonical verse identity");
  return Object.freeze({
    year,
    relationKind: "source_attested_year_to_verse",
    canonicalVerse: verse,
    sourceClaim: Object.freeze({
      ordinal: sourceOrdinal,
      countingScheme: sourceCountingScheme,
      sourceRef,
      sourceNote,
      truthState: "source_attested_not_canonical",
    }),
    technicalProjection: Object.freeze({
      ordinal: technicalOrdinal,
      countingScheme: YEAR_VERSE_COUNTING_SCHEME.TANACH_VERSES_5846_V1,
      corpusSourceId: verse.source.corpusSourceId,
      truthState: "derived_from_current_corpus_order",
    }),
    comparison: Object.freeze({
      sameVerseIdentity: true,
      ordinalDelta: technicalOrdinal - sourceOrdinal,
      countingSchemesEquivalent: sourceOrdinal === technicalOrdinal,
    }),
    journey: Object.freeze({
      whyTransition: `שנה ${year} → טענת מקור על מיקום הפסוק → זהות הפסוק הקנונית`,
      exactReturnRef: `year-verse:${year}:${verse.verseIdentity}`,
    }),
  });
}

export const YEAR_VERSE_JOURNEY_GOLDEN = Object.freeze([
  makeYearVerseGolden({
    year: 2216,
    verseRef: { book: "שמות", chapter: 25, verse: 23 },
    sourceOrdinal: 2216,
    sourceCountingScheme: YEAR_VERSE_COUNTING_SCHEME.SOD_REGULAR_5845_V1,
    technicalOrdinal: 2216,
    sourceRef: "posts:5028",
    sourceNote: "SOD Hachashmal source states Exodus 25:23 is verse 2216 from Torah start and links it to year 2216.",
  }),
  makeYearVerseGolden({
    year: 5786,
    verseRef: { book: "דברים", chapter: 32, verse: 34 },
    sourceOrdinal: 5786,
    sourceCountingScheme: YEAR_VERSE_COUNTING_SCHEME.SOD_REGULAR_5845_V1,
    technicalOrdinal: 5787,
    sourceRef: "posts:5010",
    sourceNote: "SOD Hachashmal source explicitly states the claim uses the regular convention of 5845 Torah verses.",
  }),
]);

export function yearVerseGoldenByYear(year) {
  return YEAR_VERSE_JOURNEY_GOLDEN.find((item) => item.year === Number(year)) || null;
}
