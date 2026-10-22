import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SECTION_MARKERS = new Set(["פ", "ס"]);

function locusKey(row) {
  return `${row.bookIndex}:${row.chapter}:${row.verse}:${row.word}`;
}

function summarize(rows) {
  const derashIndex = rows.findIndex((row) => row.word === "דרש");
  return {
    count: rows.length,
    first: rows[0] || null,
    last: rows.at(-1) || null,
    derashOrdinal: derashIndex < 0 ? null : derashIndex + 1,
  };
}

export function scanAhavatTorahDoubledWords({ repoRoot = DEFAULT_ROOT } = {}) {
  const dataRoot = resolve(repoRoot, "tools/els/data");
  const verseText = readFileSync(resolve(dataRoot, "tk-vtext.txt"), "utf8");
  const meta = JSON.parse(readFileSync(resolve(dataRoot, "tk-meta.json"), "utf8"));
  const chapterVerseCounts = readFileSync(resolve(dataRoot, "tk-vchap.txt"), "utf8")
    .trim()
    .split("|")
    .map((book) => book.split(",").map(Number));

  const bookNames = meta.books.slice(0, 5);
  const torahChapterCounts = chapterVerseCounts.slice(0, 5);
  const torahVerseCount = torahChapterCounts.flat().reduce((sum, count) => sum + count, 0);
  const verseLines = verseText.trimEnd().split(/\r?\n/).slice(0, torahVerseCount);

  const refs = [];
  for (let bookIndex = 0; bookIndex < torahChapterCounts.length; bookIndex += 1) {
    for (let chapterIndex = 0; chapterIndex < torahChapterCounts[bookIndex].length; chapterIndex += 1) {
      for (let verse = 1; verse <= torahChapterCounts[bookIndex][chapterIndex]; verse += 1) {
        refs.push({
          book: bookNames[bookIndex],
          bookIndex,
          chapter: chapterIndex + 1,
          verse,
        });
      }
    }
  }

  if (verseLines.length !== torahVerseCount || refs.length !== torahVerseCount) {
    throw new Error(`Torah verse boundary mismatch: text=${verseLines.length} refs=${refs.length} expected=${torahVerseCount}`);
  }

  const doubled = [];
  verseLines.forEach((line, verseIndex) => {
    const tokens = line.trim().split(/\s+/).filter((token) => token && !SECTION_MARKERS.has(token));
    for (let tokenOffset = 0; tokenOffset < tokens.length - 1; tokenOffset += 1) {
      if (tokens[tokenOffset] !== tokens[tokenOffset + 1]) continue;
      doubled.push({
        rawOrdinal: doubled.length + 1,
        ...refs[verseIndex],
        word: tokens[tokenOffset],
        tokenOffset,
      });
    }
  });

  const lekhLekha = "0:12:1:לך";
  const shamSam = "1:15:25:שם";
  const excludingLekhLekha = doubled.filter((row) => locusKey(row) !== lekhLekha);
  const excludingBothStatedLexemeCases = excludingLekhLekha.filter((row) => locusKey(row) !== shamSam);

  return {
    source: {
      file: "tools/els/data/tk-vtext.txt",
      sha256: createHash("sha256").update(verseLines.join("\n")).digest("hex"),
      torahBooks: bookNames,
      torahVerseCount,
      countingContract: "within-verse adjacent tokens with exactly equal unpointed spelling; parasha markers פ/ס excluded",
    },
    raw: summarize(doubled),
    excludingLekhLekha: summarize(excludingLekhLekha),
    excludingBothStatedLexemeCases: summarize(excludingBothStatedLexemeCases),
    exclusions: {
      lekhLekha: doubled.find((row) => locusKey(row) === lekhLekha) || null,
      shamSam: doubled.find((row) => locusKey(row) === shamSam) || null,
    },
    doubled,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(scanAhavatTorahDoubledWords(), null, 2)}\n`);
}

