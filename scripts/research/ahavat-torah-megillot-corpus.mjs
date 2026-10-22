import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tokenizeKetivVerse } from "./ahavat-torah-clean-word-corpus.mjs";

const LETTERS = [..."אבגדהוזחטיכךלמםנןסעפףצץקרשת"];
const MEGILLOT = [
  ["Esther", "אסתר", 12_108, 3_045],
  ["SongOfSongs", "שיר השירים", 5_142, 1_250],
  ["Ruth", "רות", 4_945, 1_294],
  ["Lamentations", "איכה", 5_974, 1_541],
  ["Ecclesiastes", "קהלת", 10_968, 2_987],
];

// Direct high-resolution transcription of the eleven source cells that differ
// from the clean ketiv corpus. Every other one of the 135 printed cells matches.
const SOURCE_CELL_OVERRIDES = {
  ב: { קהלת: 581 },
  ה: { קהלת: 981 },
  ו: { "שיר השירים": 477, רות: 493, איכה: 638 },
  י: { אסתר: 1_176, קהלת: 1_178 },
  כ: { קהלת: 420 },
  ך: { איכה: 56 },
  נ: { רות: 154 },
  ע: { רות: 198 },
};

function hebrewLetterStream(value) {
  return [...value].filter((character) => /[א-ת]/u.test(character)).join("");
}

export function auditLamentationsBoundaryWitness({ morphhbPath }) {
  if (!morphhbPath) throw new Error("morphhbPath is required; external source files are not vendored");
  const xml = readFileSync(morphhbPath, "utf8");
  const withoutQere = xml.replace(/<rdg type="x-qere">[\s\S]*?<\/rdg>/gu, "");
  const ketivWords = (withoutQere.match(/<w(?:\s|>)/gu) ?? []).length;
  const twoKetivToOneQere = [...xml.matchAll(
    /<w type="x-ketiv"[^>]*>[^<]*<\/w>(?:<seg[^>]*>[^<]*<\/seg>)?<w type="x-ketiv"[^>]*>[^<]*<\/w><note type="variant">[\s\S]*?<rdg type="x-qere"><w[^>]*>[^<]*<\/w><\/rdg><\/note>/gu,
  )];
  const boundary = twoKetivToOneQere[0]?.[0] ?? "";
  if (ketivWords !== 1_542 || twoKetivToOneQere.length !== 1 || !boundary.includes("מן") || !boundary.includes("בת")) {
    throw new Error("unexpected MorphHB Lamentations boundary witness");
  }
  return {
    witness: "Open Scriptures MorphHB / Westminster Leningrad Codex",
    ketivWords,
    sourceWords: 1_541,
    localizedBoundary: "Lamentations 1:6 מן־בת (two ketiv word elements) / qere מִבַּת (one read word)",
    uniqueTwoKetivToOneQereVariant: true,
  };
}

export function auditAhavatTorahMegillot({ corpusDir }) {
  if (!corpusDir) throw new Error("corpusDir is required; external source files are not vendored");
  const books = MEGILLOT.map(([file, book, sourceLetters, sourceWords]) => {
    const he = JSON.parse(readFileSync(resolve(corpusDir, `${file}.json`), "utf8")).he;
    const verses = he.flat();
    const letterStream = hebrewLetterStream(verses.join(" "));
    const corpusWords = verses.reduce((sum, verse) => sum + tokenizeKetivVerse(verse).length, 0);
    const counts = Object.fromEntries(LETTERS.map((letter) => [
      letter, [...letterStream].filter((candidate) => candidate === letter).length,
    ]));
    return {
      book,
      sourceLetters,
      corpusLetters: letterStream.length,
      letterDelta: sourceLetters - letterStream.length,
      sourceWords,
      corpusWords,
      wordDelta: sourceWords - corpusWords,
      letterCounts: counts,
    };
  });
  return {
    source: "book:hebrewbooks:5635#p42-p43:five_megillot",
    rowMeaning: "each row is one of the 27 printed Hebrew glyphs, including ךםןףץ separately",
    books,
    letterMatrix: LETTERS.map((letter) => ({
      letter,
      sourceValues: Object.fromEntries(books.map((book) => [
        book.book, SOURCE_CELL_OVERRIDES[letter]?.[book.book] ?? book.letterCounts[letter],
      ])),
      corpusValues: Object.fromEntries(books.map((book) => [book.book, book.letterCounts[letter]])),
      deltas: Object.fromEntries(books.map((book) => {
        const source = SOURCE_CELL_OVERRIDES[letter]?.[book.book] ?? book.letterCounts[letter];
        return [book.book, source - book.letterCounts[letter]];
      })),
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
