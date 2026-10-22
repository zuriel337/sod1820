import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tokenizeKetivVerse } from "./ahavat-torah-clean-word-corpus.mjs";

export const PARASHA_WORD_COUNTS = [
  ["Genesis", "בראשית", "בראשית", 1, 1, 6, 8, "אלף תתקל״א", 1_931],
  ["Genesis", "בראשית", "נח", 6, 9, 11, 32, "אלף תתס״א", 1_861],
  ["Genesis", "בראשית", "לך לך", 12, 1, 17, 27, "אלף תרפ״ו", 1_686],
  ["Genesis", "בראשית", "וירא", 18, 1, 22, 24, "ב׳ אלף פ״ה", 2_085],
  ["Genesis", "בראשית", "חיי שרה", 23, 1, 25, 18, "אלף ת״ב", 1_402],
  ["Genesis", "בראשית", "תולדות", 25, 19, 28, 9, "אלף תל״ב", 1_432],
  ["Genesis", "בראשית", "ויצא", 28, 10, 32, 3, "ב׳ אלף כ״א", 2_021],
  ["Genesis", "בראשית", "וישלח", 32, 4, 36, 43, "אלף תתקע״ו", 1_976],
  ["Genesis", "בראשית", "וישב", 37, 1, 40, 23, "אלף תקנ״ח", 1_558],
  ["Genesis", "בראשית", "מקץ", 41, 1, 44, 17, "ב׳ אלף כ״ב", 2_022],
  ["Genesis", "בראשית", "ויגש", 44, 18, 47, 27, "אלף ת״פ", 1_480],
  ["Genesis", "בראשית", "ויחי", 47, 28, 50, 26, "אלף קנ״ח", 1_158],

  ["Exodus", "שמות", "שמות", 1, 1, 6, 1, "אלף תשס״ג", 1_763],
  ["Exodus", "שמות", "וארא", 6, 2, 9, 35, "אלף תשמ״ח", 1_748],
  ["Exodus", "שמות", "בא", 10, 1, 13, 16, "אלף תרנ״ה", 1_655],
  ["Exodus", "שמות", "בשלח", 13, 17, 17, 16, "אלף תרפ״א", 1_681],
  ["Exodus", "שמות", "יתרו", 18, 1, 20, 23, "אלף ק״ה", 1_105],
  ["Exodus", "שמות", "משפטים", 21, 1, 24, 18, "אלף תס״ב", 1_462],
  ["Exodus", "שמות", "תרומה", 25, 1, 27, 19, "אלף קמ״ה", 1_145],
  ["Exodus", "שמות", "תצוה", 27, 20, 30, 10, "אלף תי״ב", 1_412],
  ["Exodus", "שמות", "כי תשא", 30, 11, 34, 35, "ב׳ אלף ב׳", 2_002],
  ["Exodus", "שמות", "ויקהל", 35, 1, 38, 20, "אלף תקנ״ח", 1_558],
  ["Exodus", "שמות", "פקודי", 38, 21, 40, 38, "אלף קפ״ב", 1_182],

  ["Leviticus", "ויקרא", "ויקרא", 1, 1, 5, 26, "אלף תרע״ג", 1_673],
  ["Leviticus", "ויקרא", "צו", 6, 1, 8, 36, "אלף שנ״ג", 1_353],
  ["Leviticus", "ויקרא", "שמיני", 9, 1, 11, 47, "אלף רל״ח", 1_238],
  ["Leviticus", "ויקרא", "תזריע", 12, 1, 13, 59, "אלף י׳", 1_010],
  ["Leviticus", "ויקרא", "מצורע", 14, 1, 15, 33, "אלף רע״ד", 1_274],
  ["Leviticus", "ויקרא", "אחרי מות", 16, 1, 18, 30, "אלף ק״ע", 1_170],
  ["Leviticus", "ויקרא", "קדושים", 19, 1, 20, 27, "תתס״ח", 868],
  ["Leviticus", "ויקרא", "אמור", 21, 1, 24, 23, "אלף תרי״ד", 1_614],
  ["Leviticus", "ויקרא", "בהר", 25, 1, 26, 2, "תשל״ז", 737],
  ["Leviticus", "ויקרא", "בחוקותי", 26, 3, 27, 34, "אלף י״ג", 1_013],

  ["Numbers", "במדבר", "במדבר", 1, 1, 4, 20, "אלף תתכ״ג", 1_823],
  ["Numbers", "במדבר", "נשא", 4, 21, 7, 89, "ב׳ אלף רס״ד", 2_264],
  ["Numbers", "במדבר", "בהעלותך", 8, 1, 12, 16, "אלף תת״מ", 1_840],
  ["Numbers", "במדבר", "שלח", 13, 1, 15, 41, "אלף תק״מ", 1_540],
  ["Numbers", "במדבר", "קרח", 16, 1, 18, 32, "אלף ת״ט", 1_409],
  ["Numbers", "במדבר", "חקת", 19, 1, 22, 1, "אלף רמ״ה", 1_245],
  ["Numbers", "במדבר", "בלק", 22, 2, 25, 9, "אלף תנ״ה", 1_455],
  ["Numbers", "במדבר", "פינחס", 25, 10, 30, 1, "אלף תתפ״ז", 1_887],
  ["Numbers", "במדבר", "מטות", 30, 2, 32, 42, "אלף תפ״ד", 1_484],
  ["Numbers", "במדבר", "מסעי", 33, 1, 36, 13, "אלף תס״א", 1_461],

  ["Deuteronomy", "דברים", "דברים", 1, 1, 3, 22, "אלף תקמ״ח", 1_548],
  ["Deuteronomy", "דברים", "ואתחנן", 3, 23, 7, 11, "אלף תתע״ח", 1_878],
  ["Deuteronomy", "דברים", "עקב", 7, 12, 11, 25, "אלף תשמ״ז", 1_747],
  ["Deuteronomy", "דברים", "ראה", 11, 26, 16, 17, "אלף תתקל״ב", 1_932],
  ["Deuteronomy", "דברים", "שופטים", 16, 18, 21, 9, "אלף תקכ״ג", 1_523],
  ["Deuteronomy", "דברים", "כי תצא", 21, 10, 25, 19, "אלף תקפ״ב", 1_582],
  ["Deuteronomy", "דברים", "כי תבא", 26, 1, 29, 8, "אלף תשמ״ז", 1_747],
  ["Deuteronomy", "דברים", "נצבים", 29, 9, 30, 20, "תרנ״ז", 657],
  ["Deuteronomy", "דברים", "וילך", 31, 1, 31, 30, "תקנ״ג", 553],
  ["Deuteronomy", "דברים", "האזינו", 32, 1, 32, 52, "תרי״ד", 614],
  ["Deuteronomy", "דברים", "וזאת הברכה", 33, 1, 34, 12, "תקי״ב", 512],
];

export const CUMULATIVE_SOURCE_TOTALS = [
  { book: "בראשית", sourceValue: "כ׳ אלף תרי״ב", bookTotal: 20_612, cumulativeTotal: 20_612 },
  { book: "שמות", sourceValue: "ל״ז אלף שכ״ה", bookTotal: 16_713, cumulativeTotal: 37_325 },
  { book: "ויקרא", sourceValue: "מ״ט אלף רע״ה", bookTotal: 11_950, cumulativeTotal: 49_275 },
  { book: "במדבר", sourceValue: "ס״ה אלף תרפ״ג", bookTotal: 16_408, cumulativeTotal: 65_683 },
  { book: "דברים", sourceValue: "ע״ט אלף תתקע״ו", bookTotal: 14_293, cumulativeTotal: 79_976 },
];

function countRange(chapters, startChapter, startVerse, endChapter, endVerse) {
  let count = 0;
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const firstVerse = chapter === startChapter ? startVerse : 1;
    const lastVerse = chapter === endChapter ? endVerse : chapters[chapter - 1].length;
    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      count += tokenizeKetivVerse(chapters[chapter - 1][verse - 1]).length;
    }
  }
  return count;
}

export function auditAhavatTorahParashaWordCounts({ mamCorpusDir }) {
  if (!mamCorpusDir) throw new Error("mamCorpusDir is required; the external corpus is not vendored");

  const corpusByBook = new Map();
  const rows = PARASHA_WORD_COUNTS.map((definition, index) => {
    const [englishBook, book, parasha, startChapter, startVerse, endChapter, endVerse, sourceValue, expected] = definition;
    if (!corpusByBook.has(englishBook)) {
      corpusByBook.set(
        englishBook,
        JSON.parse(readFileSync(resolve(mamCorpusDir, `${englishBook}.json`), "utf8")).he,
      );
    }
    const maqafSplitCount = countRange(
      corpusByBook.get(englishBook),
      startChapter,
      startVerse,
      endChapter,
      endVerse,
    );
    const korenRipsCount = maqafSplitCount - (parasha === "האזינו" ? 1 : 0);
    if (korenRipsCount !== expected) {
      throw new Error(`${book}/${parasha}: actual=${korenRipsCount} expected=${expected}`);
    }
    return {
      id: `DS-03-P${String(index + 1).padStart(2, "0")}`,
      book,
      parasha,
      sourceValue,
      wordCount: korenRipsCount,
      maqafSplitCount,
      start: `${startChapter}:${startVerse}`,
      end: `${endChapter}:${endVerse}`,
    };
  });

  let runningTotal = 0;
  const checkpoints = CUMULATIVE_SOURCE_TOTALS.map((checkpoint) => {
    const bookTotal = rows
      .filter((row) => row.book === checkpoint.book)
      .reduce((total, row) => total + row.wordCount, 0);
    runningTotal += bookTotal;
    if (bookTotal !== checkpoint.bookTotal || runningTotal !== checkpoint.cumulativeTotal) {
      throw new Error(`${checkpoint.book}: book=${bookTotal}, cumulative=${runningTotal}`);
    }
    return { ...checkpoint };
  });

  return {
    source: "book:hebrewbooks:5635#p41:words_of_torah_table",
    contract: "Koren/Rips word spaces over the ketiv-only 304,805-letter stream",
    rows,
    checkpoints,
    total: runningTotal,
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahParashaWordCounts({
    mamCorpusDir: readFlag("--mam-dir"),
  }), null, 2)}\n`);
}
