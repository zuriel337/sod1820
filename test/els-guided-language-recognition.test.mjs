import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);
const CORPUS = new URL("../tools/els/data/tk-letters.txt", import.meta.url);

function functionSource(template, name) {
  const start = template.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in the canonical engine`);
  let depth = 0;
  for (let index = template.indexOf("{", start); index < template.length; index += 1) {
    if (template[index] === "{") depth += 1;
    else if (template[index] === "}" && --depth === 0) return template.slice(start, index + 1);
  }
  throw new Error(`cannot extract ${name}`);
}

const NORMALIZER = `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};const norm=s=>{let out="";for(const ch of s||"")if(ch>="א"&&ch<="ת")out+=FIN[ch]||ch;return out;};`;

function languageContext(engine, corpus, raw, scope = "torah") {
  const context = vm.createContext({ T: corpus.trim(), st: { raw, scope } });
  context.scopeN = () => scope === "tanakh" ? context.T.length : 304805;
  vm.runInContext([
    NORMALIZER,
    `const GUIDED_MATRIX_LANGUAGE_CONTRACT="els_matrix_language_inspection_v1",GUIDED_LANGUAGE_READING_CONTRACT="els_torah_language_reading_v1";`,
    `const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;`,
    functionSource(engine, "guidedMatrixBox"),
    functionSource(engine, "guidedMatrixDisplayTerm"),
    functionSource(engine, "guidedLanguageReading"),
    functionSource(engine, "guidedMatrixLanguageInspection"),
  ].join("\n"), context);
  return context;
}

function inspectAxis(context, { skip, dir, start, length }, hints = []) {
  context.axis = { skip, dir, start, positions: Array.from({ length }, (_, index) => start + dir * skip * index) };
  context.hintEntries = hints.map(({ term, source = "story" }) => [term, { term, label: term, source }]);
  return JSON.parse(JSON.stringify(vm.runInContext("guidedMatrixLanguageInspection(axis,guidedMatrixBox(axis),new Map(hintEntries))", context)));
}

test("bounded local rays preserve unseen exact letters without a cipher-specific rule", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const context = languageContext(engine, corpus, "ד. טראמפ", "tanakh");
  const result = inspectAxis(context, { skip: 41865, dir: -1, start: 244509, length: 6 });
  assert.equal(result.contract, "els_matrix_language_inspection_v1");
  assert.equal(result.stage, "S3_OPEN_SEQUENCE_SEGMENTATION");
  assert.equal(result.modelCallsTriggered, 0);
  assert.equal(result.coverage.rayCap, 24);
  assert.equal(result.coverage.maxLetters, 24);
  assert.ok(result.rays.length <= 24);
  assert.ok(result.rays.every(ray => ray.text.length <= 24 && [...ray.text].reverse().join("") === ray.reverseText));
  assert.ok(result.rays.some(ray => ray.text.includes("באשאטמינ") || ray.reverseText.includes("באשאטמינ")), "the intersecting exact-letter sequence survives the bounded map");
  assert.ok(result.rays.some(ray => ray.text.includes("שבררומי") || ray.reverseText.includes("שבררומי")), "the nearby reverse sequence survives the same bounded map");
  assert.deepEqual(result.authority, { letters: "CANONICAL", segmentation: "UNRESOLVED", meaning: "UNVERIFIED", canonicalReplayRequired: true });
  assert.equal(result.readings.length, 0);
  assert.equal(result.segmentations.length, 0);
  assert.doesNotMatch(functionSource(engine, "guidedMatrixLanguageInspection"), /באשאטמינ|שבררומי|ד\. טראמפ/, "runtime logic contains no Golden phrase or cipher special case");
});

test("Colombia holdout letters are inside the same bounded map without supplying its findings", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const result = inspectAxis(languageContext(engine, corpus, "קולומביה"), { skip: 4545, dir: 1, start: 248765, length: 8 });
  const rayText = result.rays.flatMap(ray => [ray.text, ray.reverseText]).join("|");
  assert.match(rayText, /יכלאש/, "the exact local letters for יכל אש survive without a vocabulary hint");
  assert.match(rayText, /ספינת/, "the exact local letters for ספינת survive without a vocabulary hint");
  assert.match(rayText, /אשאכלה/, "the source-line phrase survives in the same bounded map");
  assert.equal(result.modelCallsTriggered, 0);
  assert.equal(result.readings.length, 0, "withheld words are not silently inserted into the controlled lexicon");
});

test("Uranium geometry candidates survive independently of the memorable skip", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const result = inspectAxis(languageContext(engine, corpus, "אורניום"), { skip: 10101, dir: 1, start: 81020, length: 7 }, [
    { term: "אירנ" }, { term: "ארהב" },
  ]);
  const rayText = result.rays.flatMap(ray => [ray.text, ray.reverseText]).join("|");
  assert.match(rayText, /אירנ/, "Iran's exact local letters survive the bounded map");
  assert.match(rayText, /ארהב/, "USA's exact local letters survive the bounded map");
  const iran = result.readings.find(reading => reading.baseTerm === "אירנ" && reading.relation === "exact-lexicon-match");
  const usa = result.readings.find(reading => reading.baseTerm === "ארהב" && reading.relation === "exact-lexicon-match");
  assert.ok(iran && usa, "both pre-registered context terms receive bounded reading candidates");
  assert.equal(iran.rayId, usa.rayId, "the parallel pair is preserved as one exact geometric ray");
  assert.equal(iran.status, "UNVERIFIED_READING");
  assert.equal(result.coverage.rayCap, 24);
  assert.ok(result.coverage.hintComparisons <= result.coverage.maxHintComparisons);
  assert.equal(result.axis.skip, 10101);
  assert.equal(result.truthPromotion, false);
  assert.doesNotMatch(functionSource(engine, "guidedMatrixLanguageInspection"), /אירנ|ארהב|10101/, "the runtime rule contains no Golden terms or skip");
});

test("the 1820 Golden keeps its local source language in a bounded deterministic map", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const result = inspectAxis(languageContext(engine, corpus, "משיח טבת עשירי"), { skip: 1820, dir: 1, start: 15170, length: 12 }, [
    { term: "אליהו", source: "bounded-dictionary" },
  ]);
  const rayText = result.rays.flatMap(ray => [ray.text, ray.reverseText]).join("|");
  assert.match(rayText, /אליהו/);
  assert.match(rayText, /יבואו/);
  assert.ok(result.readings.some(reading => reading.baseTerm === "אליהו" && reading.source === "bounded-dictionary"));
  assert.ok(result.coverage.candidatesExamined <= 8192);
  assert.equal(result.modelCallsTriggered, 0);
});

test("generic Hebrew affixes create only an unverified reading candidate", async () => {
  const engine = await readFile(ENGINE, "utf8");
  const context = vm.createContext({});
  vm.runInContext([
    NORMALIZER,
    `const guidedMatrixDisplayTerm=term=>term;`,
    functionSource(engine, "guidedLanguageReading"),
    `const hints=new Map([["מלכ",{term:"מלכ",label:"מלך",source:"bounded-dictionary"}]]);`,
  ].join("\n"), context);
  const reading = JSON.parse(JSON.stringify(vm.runInContext("guidedLanguageReading(norm('במלכים'),hints)", context)));
  assert.equal(reading.baseTerm, "מלכ");
  assert.equal(reading.label, "מלך");
  assert.equal(reading.relation, "prefixed-suffixed-form");
  assert.equal(reading.prefix, "ב");
  assert.equal(reading.suffix, "ימ");
  assert.equal(reading.source, "bounded-dictionary");
  assert.equal(reading.selectionProtocol, "GOVERNED_CORE");
});
