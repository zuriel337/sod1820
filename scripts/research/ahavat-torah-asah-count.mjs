import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PARASHOT = [
  { name: "תרומה", start: [25, 1], end: [27, 19], source: 62 },
  { name: "תצוה", start: [27, 20], end: [30, 10], source: 48 },
  { name: "כי תשא", start: [30, 11], end: [34, 35], source: 24 },
  { name: "ויקהל", start: [35, 1], end: [38, 20], source: 84 },
  { name: "פקודי", start: [38, 21], end: [40, 38], source: 36 },
];

const DIVINE_EXCLUSIONS = new Map([
  ["31:17:עשה", 1],
  ["33:5:אעשה", 1],
  ["33:17:אעשה", 1],
  ["34:10:אעשה", 1],
  ["34:10:מעשה", 1],
  ["34:10:עשה", 1],
]);

function consonants(value) {
  return [...value.normalize("NFD")].filter((character) => /[א-ת]/u.test(character)).join("");
}

function isAsahCandidate(word) {
  return word.includes("עש") && !/עשר|עשתי/u.test(word) && word !== "העשיר";
}

function inRange(chapter, verse, { start, end }) {
  return (chapter > start[0] || (chapter === start[0] && verse >= start[1]))
    && (chapter < end[0] || (chapter === end[0] && verse <= end[1]));
}

function isGoldenCalfExclusion({ chapter, verse, word }) {
  return chapter === 32 || (chapter === 34 && verse === 17 && word === "תעשה");
}

export function auditAhavatTorahAsah({ corpusPath }) {
  if (!corpusPath) throw new Error("corpusPath is required; external source files are not vendored");
  const exodus = JSON.parse(readFileSync(corpusPath, "utf8")).he;
  const candidates = [];

  for (let chapter = 25; chapter <= 40; chapter += 1) {
    for (let verse = 1; verse <= exodus[chapter - 1].length; verse += 1) {
      for (const token of exodus[chapter - 1][verse - 1].split(/[\s־]+/u)) {
        const word = consonants(token);
        if (isAsahCandidate(word)) candidates.push({ chapter, verse, word });
      }
    }
  }

  const parashot = PARASHOT.map((parasha) => {
    const raw = candidates.filter((item) => inRange(item.chapter, item.verse, parasha));
    const goldenCalfExcluded = raw.filter(isGoldenCalfExclusion);
    const corpus = raw.length - goldenCalfExcluded.length;
    return {
      parasha: parasha.name,
      source: parasha.source,
      corpus,
      rawRootCandidates: raw.length,
      goldenCalfExcluded: goldenCalfExcluded.length,
      delta: parasha.source - corpus,
    };
  });

  const afterGoldenCalf = candidates.filter((item) => !isGoldenCalfExclusion(item));
  const divineExcluded = [];
  const counted = [];
  const seen = new Map();
  for (const item of afterGoldenCalf) {
    const key = `${item.chapter}:${item.verse}:${item.word}`;
    const ordinal = (seen.get(key) ?? 0) + 1;
    seen.set(key, ordinal);
    if (ordinal <= (DIVINE_EXCLUSIONS.get(key) ?? 0)) divineExcluded.push(item);
    else counted.push(item);
  }

  const forms = Object.fromEntries([...new Set(counted.map(({ word }) => word))]
    .map((word) => [word, counted.filter((item) => item.word === word).length]));

  return {
    source: "book:hebrewbooks:5635#p69-p70:asah_248",
    contract: "count עשה-root word forms from Exodus 25:1 through 40:38; exclude numeric/rich עש״ר lexemes, fourteen Golden-Calf forms, and six explicitly non-human/divine acts",
    rawRootCandidates: candidates.length,
    goldenCalfExcluded: candidates.filter(isGoldenCalfExclusion).length,
    parashot,
    parashaSubtotal: parashot.reduce((sum, row) => sum + row.corpus, 0),
    divineExcluded: divineExcluded.map((item) => `${item.chapter}:${item.verse}:${item.word}`),
    forms,
    total: counted.length,
  };
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.stdout.write(`${JSON.stringify(auditAhavatTorahAsah({
    corpusPath: readFlag("--corpus"),
  }), null, 2)}\n`);
}
