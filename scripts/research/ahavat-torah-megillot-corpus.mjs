import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeHebrewLetters, tokenizeKetivVerse } from "./ahavat-torah-clean-word-corpus.mjs";

const LETTERS = [..."אבגדהוזחטיכלמנסעפצקרשת"];
const MEGILLOT = [
  ["Esther", "אסתר", 12_110, 3_045],
  ["SongOfSongs", "שיר השירים", 5_141, 1_250],
  ["Ruth", "רות", 4_949, 1_294],
  ["Lamentations", "איכה", 5_974, 1_541],
  ["Ecclesiastes", "קהלת", 10_968, 2_987],
];

export function auditAhavatTorahMegillot({ corpusDir }) {
  if (!corpusDir) throw new Error("corpusDir is required; external source files are not vendored");
  const books = MEGILLOT.map(([file, book, sourceLetters, sourceWords]) => {
    const he = JSON.parse(readFileSync(resolve(corpusDir, `${file}.json`), "utf8")).he;
    const verses = he.flat();
    const letterStream = normalizeHebrewLetters(verses.join(" "));
    const corpusWords = verses.reduce((sum, verse) => sum + tokenizeKetivVerse(verse).length, 0);
    const counts = Object.fromEntries(LETTERS.map((letter) => [
      letter, [...letterStream].filter((candidate) => candidate === letter).length,
    ]));
    return {
      book,
      sourceLetters,
      corpusLetters: letterStream.length,
      sourceWords,
      corpusWords,
      wordDelta: sourceWords - corpusWords,
      letterCounts: counts,
    };
  });
  return {
    source: "book:hebrewbooks:5635#p42-p43:five_megillot",
    rowMeaning: "each א–ת row is the counted Hebrew letter, not a row ordinal",
    books,
    letterMatrix: LETTERS.map((letter) => ({
      letter,
      values: Object.fromEntries(books.map((book) => [book.book, book.letterCounts[letter]])),
    })),
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahMegillot({
    corpusDir: readFlag("--corpus-dir"),
  }), null, 2)}\n`);
}
