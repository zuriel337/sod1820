import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);
const BUILT_ENGINE = new URL("../public/tzofen.html", import.meta.url);
const CORPUS = new URL("../tools/els/data/tk-letters.txt", import.meta.url);
const builtEngine = await readFile(BUILT_ENGINE, "utf8");
const profileMatch = builtEngine.match(/const TORAH_LANGUAGE_PROFILE=JSON\.parse\(atob\("([A-Za-z0-9+/=]+)"\)\);/);
assert.ok(profileMatch, "the built canonical engine embeds one compact Torah-language profile");
const TORAH_LANGUAGE_PROFILE = JSON.parse(Buffer.from(profileMatch[1], "base64").toString("utf8"));

function functionSource(template, name) {
  let start = template.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in the canonical engine`);
  if (template.slice(Math.max(0, start - 6), start) === "async ") start -= 6;
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
    `const GUIDED_MATRIX_LANGUAGE_CONTRACT="els_matrix_language_inspection_v1",GUIDED_LANGUAGE_READING_CONTRACT="els_torah_language_reading_v1",GUIDED_LANGUAGE_RELATION_CONTRACT="els_torah_language_relation_v1",GUIDED_LANGUAGE_REPLAY_CONTRACT="els_language_relation_replay_v1",GUIDED_LANGUAGE_BOUNDARY_CONTRACT="els_torah_language_boundary_v1";`,
    `const TORAH_LANGUAGE_PROFILE=${JSON.stringify(TORAH_LANGUAGE_PROFILE)};`,
    `const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;`,
    `const replayCalls=[];let replayMode="match";async function verifyBatch(term,hits,strategy,operation,scope){const hit=hits[0];replayCalls.push({term,hit,strategy,scope});const matched=replayMode==="match"||replayMode==="second-mismatch"&&replayCalls.length!==2;return {ok:true,verified:new Set(matched?[hitKey(hit)]:[]),traces:["trace-"+replayCalls.length],corpus_id:"wlc-torah-consonantal-v1"};}`,
    functionSource(engine, "guidedMatrixBox"),
    functionSource(engine, "guidedMatrixDisplayTerm"),
    functionSource(engine, "guidedLanguageReading"),
    functionSource(engine, "guidedLanguageRelations"),
    functionSource(engine, "guidedLanguageBoundaryScore"),
    functionSource(engine, "guidedLanguageBoundaryHypotheses"),
    functionSource(engine, "guidedMatrixLanguageInspection"),
    functionSource(engine, "guidedVerifyLanguageRelations"),
  ].join("\n"), context);
  return context;
}

async function replayInspection(context, inspection, mode = "match") {
  context.inspection = inspection;
  context.replayModeInput = mode;
  vm.runInContext("replayMode=replayModeInput;replayCalls.length=0", context);
  const result = await vm.runInContext("guidedVerifyLanguageRelations(inspection,()=>false)", context);
  return {
    result: JSON.parse(JSON.stringify(result)),
    calls: JSON.parse(JSON.stringify(vm.runInContext("replayCalls", context))),
  };
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
  assert.deepEqual(result.authority, { letters: "CANONICAL", segmentation: "UNRESOLVED", boundarySegmentation: "DETERMINISTIC_CANDIDATE", meaning: "UNVERIFIED", canonicalReplayRequired: true });
  assert.equal(result.readings.length, 0);
  assert.equal(result.segmentations.length, 0);
  assert.equal(result.relations.length, 0);
  assert.ok(result.boundaries.some(boundary => boundary.readingDirection === "forward" && boundary.leftContext.endsWith("באש") && boundary.rightContext.startsWith("אטמינ")));
  assert.ok(result.boundaries.some(boundary => boundary.readingDirection === "reverse" && boundary.leftContext.endsWith("שבר") && boundary.rightContext.startsWith("רומי")));
  assert.equal(result.boundaryProfile.vocabularyRetained, false);
  assert.equal(result.boundaryProfile.modelCallsTriggered, 0);
  assert.ok(result.coverage.returnedBoundaries <= result.coverage.boundaryCap);
  assert.ok(result.coverage.boundaryProfileComparisons <= 816);
  assert.doesNotMatch(functionSource(engine, "guidedMatrixLanguageInspection"), /באשאטמינ|שבררומי|ד\. טראמפ/, "runtime logic contains no Golden phrase or cipher special case");
  assert.doesNotMatch(functionSource(engine, "guidedLanguageBoundaryHypotheses"), /באשאטמינ|שבררומי|ד\. טראמפ/, "boundary selection contains no Golden answer");
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
  assert.equal(result.relations.length, 0, "unrecognized holdout letters do not become a semantic relation");
  assert.ok(result.boundaries.some(boundary => boundary.leftContext.endsWith("יכל") && boundary.rightContext.startsWith("אש")), "the compact profile retains the possible יכל|אש boundary without knowing either word");
  assert.ok(result.boundaries.some(boundary => boundary.leftContext.endsWith("אש") && boundary.rightContext.startsWith("אכלה")), "a second possible division remains an unverified alternative");
  assert.ok(result.boundaries.every(boundary => boundary.status === "UNVERIFIED_BOUNDARY" && boundary.interpretationRequired === true && boundary.truthPromotion === false));
  assert.equal(TORAH_LANGUAGE_PROFILE.contract, "torah_language_boundary_profile_v1");
  assert.equal(TORAH_LANGUAGE_PROFILE.vocabularyRetained, false);
  assert.equal(TORAH_LANGUAGE_PROFILE.boundaryScores.length, 22 * 22);
  assert.equal(JSON.stringify(TORAH_LANGUAGE_PROFILE).includes("ספינת"), false, "the language profile retains no holdout vocabulary");
});

test("Uranium geometry candidates survive independently of the memorable skip", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const context = languageContext(engine, corpus, "אורניום");
  const result = inspectAxis(context, { skip: 10101, dir: 1, start: 81020, length: 7 }, [
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
  assert.equal(result.relations[0].contract, "els_torah_language_relation_v1");
  assert.equal(result.relations[0].status, "UNVERIFIED_RELATION");
  assert.equal(result.relations[0].geometry, "PARALLEL_AXIS_RAY");
  assert.deepEqual(result.relations[0].tokens.map(token => token.baseTerm), ["אירנ", "ארהב"]);
  assert.equal(result.relations[0].contextMatches, 2);
  assert.equal(result.relations[0].canonicalReplayRequired, true);
  assert.equal(result.relations[0].truthPromotion, false);
  assert.equal(result.coverage.rayCap, 24);
  assert.ok(result.coverage.hintComparisons <= result.coverage.maxHintComparisons);
  assert.equal(result.axis.skip, 10101);
  assert.equal(result.truthPromotion, false);
  assert.doesNotMatch(functionSource(engine, "guidedMatrixLanguageInspection"), /אירנ|ארהב|10101/, "the runtime rule contains no Golden terms or skip");

  const verified = await replayInspection(context, result);
  assert.equal(verified.calls.length, 2, "only the two tokens in the top relation reach the canonical verifier");
  assert.deepEqual(verified.calls.map(call => call.term), result.relations[0].tokens.map(token => token.canonicalLetters));
  assert.ok(verified.calls.every((call, index) => call.hit.start === result.relations[0].tokens[index].start
    && call.hit.skip === Math.abs(result.relations[0].tokens[index].step)));
  assert.equal(verified.result.relations[0].status, "VERIFIED_RELATION");
  assert.equal(verified.result.relations[0].verification.contract, "els_language_relation_replay_v1");
  assert.equal(verified.result.relations[0].verification.status, "MATCH");
  assert.equal(verified.result.relations[0].canonicalReplayRequired, false);
  assert.equal(verified.result.relations[0].truthPromotion, false, "letter replay never verifies meaning");
  assert.equal(verified.result.coverage.relationReplayCalls, 2);
  assert.equal(verified.result.canonicalReplayCalls, 2);
  assert.equal(verified.result.modelCallsTriggered, 0);

  const mismatch = await replayInspection(context, result, "second-mismatch");
  assert.equal(mismatch.calls.length, 2);
  assert.equal(mismatch.result.relations[0].status, "UNVERIFIED_RELATION");
  assert.equal(mismatch.result.relations[0].verification.status, "MISMATCH");
  assert.equal(mismatch.result.relations[0].canonicalReplayRequired, true);

  const sourceInspection = JSON.parse(JSON.stringify(result));
  sourceInspection.relations = [sourceInspection.relations[0]];
  sourceInspection.relations[0].tokens.forEach((token, index) => { token.step = 1;token.start = 200 + index * 10; });
  const sourceSequence = await replayInspection(context, sourceInspection);
  assert.equal(sourceSequence.calls.length, 0, "skip 1 remains source sequence and never reaches ELS verification");
  assert.equal(sourceSequence.result.relations[0].status, "UNVERIFIED_RELATION");
  assert.equal(sourceSequence.result.relations[0].verification.status, "SOURCE_SEQUENCE");
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
  assert.equal(result.relations.length, 0, "one recognized word cannot create a pair");
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

test("language-pair ranking is geometry and context based, never skip based", async () => {
  const engine = await readFile(ENGINE, "utf8");
  const source = functionSource(engine, "guidedLanguageRelations");
  assert.match(source, /contextMatches\*100/);
  assert.match(source, /gap>8/);
  assert.match(source, /PARALLEL_AXIS_RAY/);
  assert.doesNotMatch(source, /axis|skip|10101|4545/);
});
