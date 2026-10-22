import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const EXPECTED_TORAH_LETTERS = 304_805;
const EXPECTED_TORAH_SHA256 = "9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4";

const BOOKS = [
  { name: "Genesis", korenFile: "text_koren_1genesis.txt" },
  { name: "Exodus", korenFile: "text_koren_2exodus.txt" },
  { name: "Leviticus", korenFile: "text_koren_3leviticus.txt" },
  { name: "Numbers", korenFile: "text_koren_4numbers.txt" },
  { name: "Deuteronomy", korenFile: "text_koren_5deuteronomy.txt" },
];

const FINAL_TO_MEDIAL = new Map([
  ["ך", "כ"],
  ["ם", "מ"],
  ["ן", "נ"],
  ["ף", "פ"],
  ["ץ", "צ"],
]);

const MICHIGAN_TO_HEBREW = new Map(Object.entries({
  ")": "א", B: "ב", G: "ג", D: "ד", H: "ה", W: "ו", Z: "ז", X: "ח", "+": "ט",
  Y: "י", K: "כ", L: "ל", M: "מ", N: "נ", S: "ס", "(": "ע", P: "פ", C: "צ",
  Q: "ק", R: "ר", $: "ש", T: "ת",
}));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeHebrewLetters(value) {
  return [...value]
    .filter((character) => /[א-ת]/u.test(character))
    .map((character) => FINAL_TO_MEDIAL.get(character) ?? character)
    .join("");
}

export function tokenizeKetivVerse(value) {
  return value
    .trim()
    .split(/[\s־]+/u)
    .filter((token) => /[א-ת]/u.test(token))
    .map(normalizeHebrewLetters);
}

export function parseMichiganKorenText(value) {
  return value
    .trim()
    .split(/\r?\n/u)
    .flatMap((line) => line.trim().split(/\s+/u).slice(3))
    .map((token) => [...token].map((character) => {
      const hebrew = MICHIGAN_TO_HEBREW.get(character);
      if (!hebrew) throw new Error(`Unsupported Michigan-Claremont character: ${character}`);
      return hebrew;
    }).join(""));
}

function boundaryMap(words) {
  const boundaries = new Map();
  let position = 0;
  for (let index = 0; index < words.length - 1; index += 1) {
    position += words[index].word.length;
    boundaries.set(position, index);
  }
  return boundaries;
}

function wordContainingPosition(words, position) {
  let start = 0;
  for (let index = 0; index < words.length; index += 1) {
    const end = start + words[index].word.length;
    if (start < position && position < end) return { index, start, end, ...words[index] };
    start = end;
  }
  return null;
}

export function compareWordBoundaries(leftWords, rightWords) {
  const left = boundaryMap(leftWords);
  const right = boundaryMap(rightWords);
  return {
    onlyLeft: [...left.entries()]
      .filter(([position]) => !right.has(position))
      .map(([position, index]) => ({
        afterLetter: position,
        before: leftWords[index],
        after: leftWords[index + 1],
        joinedOnRight: wordContainingPosition(rightWords, position),
      })),
    onlyRight: [...right.entries()]
      .filter(([position]) => !left.has(position))
      .map(([position, index]) => ({
        afterLetter: position,
        before: rightWords[index],
        after: rightWords[index + 1],
        joinedOnLeft: wordContainingPosition(leftWords, position),
      })),
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: actual=${actual} expected=${expected}`);
}

export function auditCleanWordCorpora({ mamCorpusDir, korenCorpusDir, repoRoot = DEFAULT_ROOT }) {
  if (!mamCorpusDir || !korenCorpusDir) {
    throw new Error("Both mamCorpusDir and korenCorpusDir are required; external source files are not vendored");
  }

  const mamWords = [];
  const korenWords = [];
  const books = [];

  for (let bookIndex = 0; bookIndex < BOOKS.length; bookIndex += 1) {
    const book = BOOKS[bookIndex];
    const mamPath = resolve(mamCorpusDir, `${book.name}.json`);
    const mamRaw = readFileSync(mamPath, "utf8");
    const mam = JSON.parse(mamRaw);
    const bookMamWords = [];
    for (let chapterIndex = 0; chapterIndex < mam.he.length; chapterIndex += 1) {
      for (let verseIndex = 0; verseIndex < mam.he[chapterIndex].length; verseIndex += 1) {
        const words = tokenizeKetivVerse(mam.he[chapterIndex][verseIndex]);
        for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
          bookMamWords.push({
            word: words[wordIndex],
            book: book.name,
            chapter: chapterIndex + 1,
            verse: verseIndex + 1,
            wordInVerse: wordIndex + 1,
          });
        }
      }
    }

    const korenPath = resolve(korenCorpusDir, book.korenFile);
    const korenRaw = readFileSync(korenPath, "utf8");
    const bookKorenWords = parseMichiganKorenText(korenRaw).map((word) => ({ word, book: book.name }));
    mamWords.push(...bookMamWords);
    korenWords.push(...bookKorenWords);
    books.push({
      book: book.name,
      mamWords: bookMamWords.length,
      korenWords: bookKorenWords.length,
      mamRawSha256: sha256(mamRaw),
      korenRawSha256: sha256(korenRaw),
    });
  }

  const mamLetters = mamWords.map(({ word }) => word).join("");
  const korenLetters = korenWords.map(({ word }) => word).join("");
  const localLetters = normalizeHebrewLetters(
    readFileSync(resolve(repoRoot, "tools/els/data/tk-letters.txt"), "utf8"),
  ).slice(0, EXPECTED_TORAH_LETTERS);
  const boundaryDifference = compareWordBoundaries(mamWords, korenWords);

  assertEqual(mamLetters.length, EXPECTED_TORAH_LETTERS, "MAM/Koren-aligned letter count");
  assertEqual(korenLetters.length, EXPECTED_TORAH_LETTERS, "Rips/Koren letter count");
  assertEqual(mamLetters, localLetters, "MAM/Koren-aligned stream vs local canonical Torah");
  assertEqual(korenLetters, localLetters, "Rips/Koren stream vs local canonical Torah");
  assertEqual(sha256(localLetters), EXPECTED_TORAH_SHA256, "canonical Torah SHA-256");
  assertEqual(mamWords.length, 79_977, "MAM maqaf-split word count");
  assertEqual(korenWords.length, 79_976, "Rips/Koren word count");
  assertEqual(boundaryDifference.onlyLeft.length, 1, "MAM-only boundary count");
  assertEqual(boundaryDifference.onlyRight.length, 0, "Rips-only boundary count");

  return {
    canonical: {
      letters: EXPECTED_TORAH_LETTERS,
      sha256: EXPECTED_TORAH_SHA256,
      allThreeStreamsEqual: true,
    },
    counts: {
      maqafSplitKetiv: mamWords.length,
      korenRips: korenWords.length,
      delta: mamWords.length - korenWords.length,
    },
    books,
    boundaryDifference,
    contract: {
      maqafSplitKetiv: "split on whitespace or Hebrew maqaf; retain tokens containing Hebrew letters; count ketiv only",
      korenRips: "preserve the spaces in the five Michigan-Claremont Koren book files",
    },
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditCleanWordCorpora({
    mamCorpusDir: readFlag("--mam-dir"),
    korenCorpusDir: readFlag("--koren-dir"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
