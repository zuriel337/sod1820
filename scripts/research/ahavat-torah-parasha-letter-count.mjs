import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeHebrewLetters } from "./ahavat-torah-clean-word-corpus.mjs";
import { PARASHA_WORD_COUNTS } from "./ahavat-torah-parasha-word-count.mjs";

export const SOURCE_AND_CANONICAL_LETTER_COUNTS = [
  ["בראשית", "בראשית", 7_235, 7_235], ["בראשית", "נח", 6_908, 6_907],
  ["בראשית", "לך לך", 6_337, 6_336], ["בראשית", "וירא", 7_862, 7_862],
  ["בראשית", "חיי שרה", 5_314, 5_314], ["בראשית", "תולדות", 5_426, 5_426],
  ["בראשית", "ויצא", 7_512, 7_512], ["בראשית", "וישלח", 7_459, 7_458],
  ["בראשית", "וישב", 5_972, 5_972], ["בראשית", "מקץ", 7_915, 7_914],
  ["בראשית", "ויגש", 5_680, 5_680], ["בראשית", "ויחי", 4_448, 4_448],

  ["שמות", "שמות", 6_762, 6_762], ["שמות", "וארא", 6_701, 6_701],
  ["שמות", "בא", 6_149, 6_149], ["שמות", "בשלח", 6_422, 6_423],
  ["שמות", "יתרו", 4_022, 4_022], ["שמות", "משפטים", 5_313, 5_313],
  ["שמות", "תרומה", 4_692, 4_692], ["שמות", "תצוה", 5_430, 5_430],
  ["שמות", "כי תשא", 7_424, 7_424], ["שמות", "ויקהל", 6_181, 6_181],
  ["שמות", "פקודי", 4_432, 4_432],

  ["ויקרא", "ויקרא", 6_222, 6_222], ["ויקרא", "צו", 5_096, 5_096],
  ["ויקרא", "שמיני", 4_670, 4_670], ["ויקרא", "תזריע", 3_667, 3_667],
  ["ויקרא", "מצורע", 4_697, 4_697], ["ויקרא", "אחרי מות", 4_294, 4_294],
  ["ויקרא", "קדושים", 3_229, 3_229], ["ויקרא", "אמור", 6_106, 6_106],
  ["ויקרא", "בהר", 2_817, 2_817], ["ויקרא", "בחוקותי", 3_992, 3_992],

  ["במדבר", "במדבר", 7_393, 7_393], ["במדבר", "נשא", 8_632, 8_632],
  ["במדבר", "בהעלותך", 7_055, 7_055], ["במדבר", "שלח", 5_819, 5_820],
  ["במדבר", "קרח", 5_325, 5_325], ["במדבר", "חקת", 4_670, 4_670],
  ["במדבר", "בלק", 5_358, 5_357], ["במדבר", "פינחס", 7_854, 7_853],
  ["במדבר", "מטות", 5_652, 5_652], ["במדבר", "מסעי", 5_773, 5_773],

  ["דברים", "דברים", 5_973, 5_972], ["דברים", "ואתחנן", 7_343, 7_343],
  ["דברים", "עקב", 6_865, 6_865], ["דברים", "ראה", 7_443, 7_442],
  ["דברים", "שופטים", 5_591, 5_590], ["דברים", "כי תצא", 5_856, 5_856],
  ["דברים", "כי תבא", 6_811, 6_811], ["דברים", "נצבים", 2_575, 2_575],
  ["דברים", "וילך", 2_123, 2_123], ["דברים", "האזינו", 2_326, 2_326],
  ["דברים", "וזאת הברכה", 1_989, 1_989],
];

export const LETTER_COUNT_CHECKPOINTS = [
  { book: "בראשית", sourceValue: "ע״ח אלף ס״ח", sourceCumulative: 78_068, canonicalCumulative: 78_064 },
  { book: "שמות", sourceValue: "קמ״א אלף תקצ״ו", sourceCumulative: 141_596, canonicalCumulative: 141_593 },
  { book: "ויקרא", sourceValue: "קפ״ו אלף שפ״ו", sourceCumulative: 186_386, canonicalCumulative: 186_383 },
  { book: "במדבר", sourceValue: "רמ״ט אלף תתקי״ז", sourceCumulative: 249_917, canonicalCumulative: 249_913 },
  { book: "דברים", sourceValue: "ש״ד אלף תתי״ב", sourceCumulative: 304_812, canonicalCumulative: 304_805 },
];

function countRange(chapters, startChapter, startVerse, endChapter, endVerse) {
  let count = 0;
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const firstVerse = chapter === startChapter ? startVerse : 1;
    const lastVerse = chapter === endChapter ? endVerse : chapters[chapter - 1].length;
    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      count += normalizeHebrewLetters(chapters[chapter - 1][verse - 1]).length;
    }
  }
  return count;
}

export function auditAhavatTorahParashaLetterCounts({ mamCorpusDir }) {
  if (!mamCorpusDir) throw new Error("mamCorpusDir is required; the external corpus is not vendored");
  if (PARASHA_WORD_COUNTS.length !== SOURCE_AND_CANONICAL_LETTER_COUNTS.length) {
    throw new Error("parasha definition and letter-count row lengths differ");
  }

  const corpusByBook = new Map();
  const rows = PARASHA_WORD_COUNTS.map((definition, index) => {
    const [englishBook, book, parasha, startChapter, startVerse, endChapter, endVerse] = definition;
    const [sourceBook, sourceParasha, sourceCount, canonicalExpected] = SOURCE_AND_CANONICAL_LETTER_COUNTS[index];
    if (book !== sourceBook || parasha !== sourceParasha) {
      throw new Error(`row ${index + 1}: parasha order mismatch`);
    }
    if (!corpusByBook.has(englishBook)) {
      corpusByBook.set(
        englishBook,
        JSON.parse(readFileSync(resolve(mamCorpusDir, `${englishBook}.json`), "utf8")).he,
      );
    }
    const canonicalCount = countRange(
      corpusByBook.get(englishBook), startChapter, startVerse, endChapter, endVerse,
    );
    if (canonicalCount !== canonicalExpected) {
      throw new Error(`${book}/${parasha}: actual=${canonicalCount} expected=${canonicalExpected}`);
    }
    return {
      id: `DS-04-P${String(index + 1).padStart(2, "0")}`,
      book,
      parasha,
      sourceCount,
      canonicalCount,
      delta: sourceCount - canonicalCount,
      start: `${startChapter}:${startVerse}`,
      end: `${endChapter}:${endVerse}`,
    };
  });

  let sourceRunning = 0;
  let canonicalRunning = 0;
  const checkpoints = LETTER_COUNT_CHECKPOINTS.map((checkpoint) => {
    const bookRows = rows.filter((row) => row.book === checkpoint.book);
    const sourceBookTotal = bookRows.reduce((sum, row) => sum + row.sourceCount, 0);
    const canonicalBookTotal = bookRows.reduce((sum, row) => sum + row.canonicalCount, 0);
    sourceRunning += sourceBookTotal;
    canonicalRunning += canonicalBookTotal;
    if (sourceRunning !== checkpoint.sourceCumulative || canonicalRunning !== checkpoint.canonicalCumulative) {
      throw new Error(`${checkpoint.book}: source=${sourceRunning}, canonical=${canonicalRunning}`);
    }
    return { ...checkpoint, sourceBookTotal, canonicalBookTotal, delta: sourceRunning - canonicalRunning };
  });

  return {
    source: "book:hebrewbooks:5635#p41-p42:letters_of_torah_table",
    contract: "ketiv-only Hebrew letters, final forms normalized but counted one-for-one",
    rows,
    checkpoints,
    differingRows: rows.filter((row) => row.delta !== 0),
    sourceTotal: sourceRunning,
    canonicalTotal: canonicalRunning,
    delta: sourceRunning - canonicalRunning,
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahParashaLetterCounts({
    mamCorpusDir: readFlag("--mam-dir"),
  }), null, 2)}\n`);
}
