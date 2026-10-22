import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SECTION_MARKERS = new Set(["פ", "ס"]);

function countHebrewLetters(value) {
  return [...value].filter((letter) => /[א-תךםןףץ]/u.test(letter)).length;
}

export function auditAhavatTorahWordCount({ repoRoot = DEFAULT_ROOT } = {}) {
  const dataRoot = resolve(repoRoot, "tools/els/data");
  const verseText = readFileSync(resolve(dataRoot, "tk-vtext.txt"), "utf8");
  const canonicalLetters = readFileSync(resolve(dataRoot, "tk-letters.txt"), "utf8");
  const meta = JSON.parse(readFileSync(resolve(dataRoot, "tk-meta.json"), "utf8"));
  const chapterVerseCounts = readFileSync(resolve(dataRoot, "tk-vchap.txt"), "utf8")
    .trim()
    .split("|")
    .map((book) => book.split(",").map(Number));

  const torahBookNames = meta.books.slice(0, 5);
  const torahBookVerseCounts = chapterVerseCounts
    .slice(0, 5)
    .map((chapters) => chapters.reduce((sum, count) => sum + count, 0));
  const torahVerseCount = torahBookVerseCounts.reduce((sum, count) => sum + count, 0);
  const verseLines = verseText.trimEnd().split(/\r?\n/).slice(0, torahVerseCount);

  if (verseLines.length !== torahVerseCount) {
    throw new Error(`Torah verse boundary mismatch: text=${verseLines.length} expected=${torahVerseCount}`);
  }

  let verseOffset = 0;
  const books = torahBookNames.map((book, bookIndex) => {
    const verseCount = torahBookVerseCounts[bookIndex];
    const lines = verseLines.slice(verseOffset, verseOffset + verseCount);
    verseOffset += verseCount;
    const tokens = lines.flatMap((line) => line.trim().split(/\s+/).filter(Boolean));
    const sectionMarkers = tokens.filter((token) => SECTION_MARKERS.has(token)).length;
    return {
      book,
      verseCount,
      displayTokens: tokens.length,
      sectionMarkers,
      displayWords: tokens.length - sectionMarkers,
    };
  });

  const displayTokens = books.reduce((sum, book) => sum + book.displayTokens, 0);
  const sectionMarkers = books.reduce((sum, book) => sum + book.sectionMarkers, 0);
  const displayWords = books.reduce((sum, book) => sum + book.displayWords, 0);
  const displayHebrewLetters = countHebrewLetters(verseLines.join(" ")) - sectionMarkers;
  const authorCount = 79_976;

  return {
    source: {
      displayFile: "tools/els/data/tk-vtext.txt",
      canonicalLetterFile: "tools/els/data/tk-letters.txt",
      torahSliceSha256: createHash("sha256").update(verseLines.join("\n")).digest("hex"),
      torahVerseCount,
      canonicalLetterCount: meta.torahLetters,
      countingContract: "split the display projection on whitespace; exclude only standalone parasha markers פ/ס",
      suitability: "DIAGNOSTIC_ONLY: tk-vtext contains display/editorial and qere/variant material and is not a clean canonical word-boundary corpus",
    },
    author: {
      value: authorCount,
      raw: "ע״ט אלף תתקע״ו",
      visuallyVerifiedPages: [12, 25, 30, 41, 51],
    },
    displayProjection: {
      displayTokens,
      sectionMarkers,
      displayWords,
      deltaFromAuthor: displayWords - authorCount,
      displayHebrewLetters,
      canonicalHebrewLetters: meta.torahLetters,
      letterDelta: displayHebrewLetters - meta.torahLetters,
    },
    books,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahWordCount(), null, 2)}\n`);
}
