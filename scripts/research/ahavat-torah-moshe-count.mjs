import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PARASHA_WORD_COUNTS } from "./ahavat-torah-parasha-word-count.mjs";

const SOURCE_BOOK_TOTALS = new Map([
  ["שמות", 290],
  ["ויקרא", 86],
  ["במדבר", 233],
  ["דברים", 38],
]);

const NON_NAME_HOMOGRAPHS = new Set([
  "Exodus:12:4:משה", // מִשֶּׂה — “from a lamb”
  "Deuteronomy:15:2:משה", // מַשֵּׁה — a loan/creditor form
]);

function consonants(value) {
  return [...value.normalize("NFD")].filter((character) => /[א-ת]/u.test(character)).join("");
}

function inRange(chapter, verse, startChapter, startVerse, endChapter, endVerse) {
  return (chapter > startChapter || (chapter === startChapter && verse >= startVerse))
    && (chapter < endChapter || (chapter === endChapter && verse <= endVerse));
}

export function auditAhavatTorahMoshe({ corpusDir }) {
  if (!corpusDir) throw new Error("corpusDir is required; external source files are not vendored");
  const corpora = new Map();
  const forms = {};
  const homographs = [];
  const rows = PARASHA_WORD_COUNTS.filter(([englishBook]) => englishBook !== "Genesis").map((definition) => {
    const [englishBook, book, parasha, startChapter, startVerse, endChapter, endVerse] = definition;
    if (!corpora.has(englishBook)) {
      corpora.set(englishBook, JSON.parse(readFileSync(resolve(corpusDir, `${englishBook}.json`), "utf8")).he);
    }
    const chapters = corpora.get(englishBook);
    let count = 0;
    for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
      for (let verse = 1; verse <= chapters[chapter - 1].length; verse += 1) {
        if (!inRange(chapter, verse, startChapter, startVerse, endChapter, endVerse)) continue;
        for (const token of chapters[chapter - 1][verse - 1].split(/[\s־]+/u)) {
          const word = consonants(token);
          if (!/^(?:משה|למשה|ומשה|במשה|ובמשה|כמשה)$/u.test(word)) continue;
          const locus = `${englishBook}:${chapter}:${verse}:${word}`;
          if (NON_NAME_HOMOGRAPHS.has(locus)) {
            homographs.push({ locus, token });
            continue;
          }
          count += 1;
          forms[word] = (forms[word] ?? 0) + 1;
        }
      }
    }
    return { book, parasha, count };
  });

  const books = [...SOURCE_BOOK_TOTALS].map(([book, source]) => {
    const corpus = rows.filter((row) => row.book === book).reduce((sum, row) => sum + row.count, 0);
    return { book, source, corpus, delta: source - corpus };
  });

  return {
    source: "book:hebrewbooks:5635#p70:moshe_647",
    contract: "count the proper name משה with the six printed prefix forms; exclude two same-consonant non-name homographs",
    rows,
    books,
    homographs,
    forms,
    total: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahMoshe({
    corpusDir: readFlag("--corpus-dir"),
  }), null, 2)}\n`);
}
