import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PARASHA_WORD_COUNTS } from "./ahavat-torah-parasha-word-count.mjs";

export const PRINTED_GLYPHS = [..."אבגדהוזחטיכךלמםנןסעפףצץקרשת"];

function glyphs(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/[^א-ת]/g, "");
}

function countRange(chapters, startChapter, startVerse, endChapter, endVerse) {
  const counts = Object.fromEntries(PRINTED_GLYPHS.map((glyph) => [glyph, 0]));
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const firstVerse = chapter === startChapter ? startVerse : 1;
    const lastVerse = chapter === endChapter ? endVerse : chapters[chapter - 1].length;
    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      for (const glyph of glyphs(chapters[chapter - 1][verse - 1])) counts[glyph] += 1;
    }
  }
  return counts;
}

export function auditAhavatTorahLetterGlyphCounts({ mamCorpusDir }) {
  if (!mamCorpusDir) throw new Error("mamCorpusDir is required; the external corpus is not vendored");
  const corpusByBook = new Map();
  const rows = PARASHA_WORD_COUNTS.map((definition, index) => {
    const [englishBook, book, parasha, startChapter, startVerse, endChapter, endVerse] = definition;
    if (!corpusByBook.has(englishBook)) {
      corpusByBook.set(
        englishBook,
        JSON.parse(readFileSync(resolve(mamCorpusDir, `${englishBook}.json`), "utf8")).he,
      );
    }
    const counts = countRange(
      corpusByBook.get(englishBook), startChapter, startVerse, endChapter, endVerse,
    );
    return {
      id: `DS-02-P${String(index + 1).padStart(2, "0")}`,
      book,
      parasha,
      start: `${startChapter}:${startVerse}`,
      end: `${endChapter}:${endVerse}`,
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    };
  });

  const glyphTotals = Object.fromEntries(PRINTED_GLYPHS.map((glyph) => [
    glyph,
    rows.reduce((sum, row) => sum + row.counts[glyph], 0),
  ]));
  return {
    source: "book:hebrewbooks:5635#p35-p41:individual_letter_glyph_table",
    contract: "ketiv-only printed Hebrew glyphs; final forms remain separate rows",
    glyphs: PRINTED_GLYPHS,
    rows,
    glyphTotals,
    total: Object.values(glyphTotals).reduce((sum, value) => sum + value, 0),
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahLetterGlyphCounts({
    mamCorpusDir: readFlag("--mam-dir"),
  }), null, 2)}\n`);
}
