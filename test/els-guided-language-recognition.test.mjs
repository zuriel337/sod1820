import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { loadRouter } from "../tools/els/router-harness.mjs";

const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);
const BUILT_ENGINE = new URL("../public/tzofen.html", import.meta.url);
const DYNAMIC_LEXICON_ASSET = new URL("../public/els-dynamic-lexicon-v1.gz64.txt", import.meta.url);
const CORPUS = new URL("../tools/els/data/tk-letters.txt", import.meta.url);
const CORE_LEXICON = new URL("../tools/els/data/maftech-core-lexicon.txt", import.meta.url);
const builtEngine = await readFile(BUILT_ENGINE, "utf8");
const profileMatch = builtEngine.match(/const TORAH_LANGUAGE_PROFILE=JSON\.parse\(atob\("([A-Za-z0-9+/=]+)"\)\);/);
assert.ok(profileMatch, "the built canonical engine embeds one compact Torah-language profile");
const TORAH_LANGUAGE_PROFILE = JSON.parse(Buffer.from(profileMatch[1], "base64").toString("utf8"));
const dynamicLexiconPayload = (await readFile(DYNAMIC_LEXICON_ASSET, "utf8")).trim();
const DYNAMIC_LEXICON_PROFILE = JSON.parse(gunzipSync(Buffer.from(dynamicLexiconPayload, "base64")).toString("utf8"));

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
    `const DYNAMIC_LEXICON_PROFILE=${JSON.stringify(DYNAMIC_LEXICON_PROFILE)};`,
    `const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;`,
    `const replayCalls=[];let replayMode="match";async function verifyBatch(term,hits,strategy,operation,scope){const hit=hits[0];replayCalls.push({term,hit,strategy,scope});const matched=replayMode==="match"||replayMode==="second-mismatch"&&replayCalls.length!==2;return {ok:true,verified:new Set(matched?[hitKey(hit)]:[]),traces:["trace-"+replayCalls.length],corpus_id:"wlc-torah-consonantal-v1"};}`,
    functionSource(engine, "guidedMatrixBox"),
    functionSource(engine, "guidedMatrixDisplayTerm"),
    functionSource(engine, "guidedDynamicLexiconSkeleton"),
    functionSource(engine, "guidedLanguageReadings"),
    functionSource(engine, "guidedLanguageReading"),
    functionSource(engine, "guidedLanguageRelations"),
    functionSource(engine, "guidedLanguageBoundaryScore"),
    functionSource(engine, "guidedLanguageBoundaryHypotheses"),
    functionSource(engine, "guidedMatrixLanguageInspection"),
    functionSource(engine, "guidedVerifyLanguageRelations"),
    `const dynamicWords=new Map(),dynamicSkeletons=new Map();for(const row of DYNAMIC_LEXICON_PROFILE.entries){const [term,label,mask,frequency]=row,source=mask===3?"tanakh-core-lexicon":mask===2?"maftech-core":"tanakh-lexicon",lexiconSources=[...(mask&1?["canonical_tanakh_words"]:[]),...(mask&2?["maftech_core_snapshot"]:[])],sourceConfidence=(mask===3?88:mask===2?82:76)+Math.min(8,term.length),hint={term,label,source,lexiconSources,lexiconFrequency:frequency,sourceConfidence,selectionProtocol:"DYNAMIC_LEXICON_LOOKUP_V1"};dynamicWords.set(term,hint);const skeleton=guidedDynamicLexiconSkeleton(term);if(mask&2&&term.length>=4&&skeleton.length>=3&&skeleton!==term){if(!dynamicSkeletons.has(skeleton))dynamicSkeletons.set(skeleton,[]);dynamicSkeletons.get(skeleton).push(hint);}}for(const [key,rows] of dynamicSkeletons)dynamicSkeletons.set(key,rows.sort((a,b)=>b.sourceConfidence-a.sourceConfidence||b.term.length-a.term.length||a.term.localeCompare(b.term,"he")).slice(0,4));const dynamicLexicon={profile:{contract:DYNAMIC_LEXICON_PROFILE.contract,sources:DYNAMIC_LEXICON_PROFILE.sources,matchingAlgorithm:DYNAMIC_LEXICON_PROFILE.matchingAlgorithm,entryCount:dynamicWords.size,tanakhEntryCount:DYNAMIC_LEXICON_PROFILE.tanakhEntryCount,coreEntryCount:DYNAMIC_LEXICON_PROFILE.coreEntryCount,coreFingerprint:DYNAMIC_LEXICON_PROFILE.coreFingerprint},words:dynamicWords,skeletons:dynamicSkeletons};`,
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
  return JSON.parse(JSON.stringify(vm.runInContext("guidedMatrixLanguageInspection(axis,guidedMatrixBox(axis),new Map(hintEntries),dynamicLexicon)", context)));
}

function recognizeSurface(context, surface) {
  context.surfaceInput = surface;
  return JSON.parse(JSON.stringify(vm.runInContext("guidedLanguageReadings(norm(surfaceInput),new Map(),dynamicLexicon,{count:0,max:4096,exhausted:false})", context)));
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
  assert.deepEqual(result.authority, { letters: "CANONICAL", segmentation: "DETERMINISTIC_CANDIDATE", boundarySegmentation: "DETERMINISTIC_CANDIDATE", lexicalRecognition: "DETERMINISTIC_CANDIDATE", meaning: "UNVERIFIED", canonicalReplayRequired: true });
  assert.ok(recognizeSurface(context, "אטמ").some(reading => reading.baseTerm === "אטומ" && reading.relation === "mater-omission"));
  assert.ok(result.readings.some(reading => reading.baseTerm === "רומי"), JSON.stringify(result.readings));
  assert.ok(result.readings.every(reading => reading.status === "UNVERIFIED_READING" && reading.truthPromotion === false));
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
  assert.ok(result.readings.some(reading => reading.baseTerm === "ספינה" && reading.relation === "construct-form"), JSON.stringify(result.readings));
  const context = languageContext(engine, corpus, "קולומביה");
  assert.ok(recognizeSurface(context, "יכל").some(reading => reading.baseTerm === "יכל" && reading.relation === "exact-lexicon-match"));
  assert.ok(recognizeSurface(context, "אש").some(reading => reading.baseTerm === "אש" && reading.relation === "exact-lexicon-match"));
  assert.ok(recognizeSurface(context, "אכלה").some(reading => reading.baseTerm === "אכלה" && reading.relation === "exact-lexicon-match"));
  assert.ok(result.segmentations.length <= 24 && result.segmentations.every(segmentation => segmentation.status === "UNVERIFIED_READING" && segmentation.truthPromotion === false));
  assert.ok(result.readings.every(reading => reading.selectionProtocol !== "CONTEXT_PRE_REGISTERED"), "the held-out words came from declared lexicon sources, not the story input");
  assert.ok(result.boundaries.some(boundary => boundary.leftContext.endsWith("יכל") && boundary.rightContext.startsWith("אש")), "the compact profile retains the possible יכל|אש boundary without knowing either word");
  assert.ok(result.boundaries.some(boundary => boundary.leftContext.endsWith("אש") && boundary.rightContext.startsWith("אכלה")), "a second possible division remains an unverified alternative");
  assert.ok(result.boundaries.every(boundary => boundary.status === "UNVERIFIED_BOUNDARY" && boundary.interpretationRequired === true && boundary.truthPromotion === false));
  assert.equal(TORAH_LANGUAGE_PROFILE.contract, "torah_language_boundary_profile_v1");
  assert.equal(TORAH_LANGUAGE_PROFILE.vocabularyRetained, false);
  assert.equal(TORAH_LANGUAGE_PROFILE.boundaryScores.length, 22 * 22);
  assert.equal(JSON.stringify(TORAH_LANGUAGE_PROFILE).includes("ספינת"), false, "the language profile retains no holdout vocabulary");
  assert.equal(DYNAMIC_LEXICON_PROFILE.contract, "els_dynamic_lexicon_profile_v1");
  assert.ok(DYNAMIC_LEXICON_PROFILE.entryCount > 40000);
  assert.ok(DYNAMIC_LEXICON_PROFILE.coreEntryCount > 4000);
  assert.equal(DYNAMIC_LEXICON_PROFILE.entries.some(entry => entry[0] === "ספינת"), false, "the exact Golden surface was not inserted as a special-case word");
});

test("Colombia: actual bounded router and local language inspection report the held-out discovery coverage", async (t) => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const router = loadRouter(undefined, { scopeLen: 304805, scope: "torah" });
  const search = await router.routedDiscover("קולומביה", 4000);
  const eligible = search.hits.filter(hit => hit.skip >= 2);
  const goldenIndex = eligible.findIndex(hit => hit.skip === 4545 && hit.dir === 1 && hit.start === 248765);
  assert.ok(goldenIndex >= 0, "the local router returns the exact test occurrence");
  const result = inspectAxis(languageContext(engine, corpus, "קולומביה"), { ...eligible[goldenIndex], length: 8 });
  const readings = result.readings.filter(row => row.baseTerm === "ספינה");
  const segmentations = result.segmentations.filter(row => row.canonicalLetters.includes("יכלאש"));
  const relations = result.relations.filter(row => row.tokens.map(token => token.canonicalLetters).join("").includes("יכלאש"));
  assert.ok(readings.some(row => row.relation === "construct-form"));
  assert.ok(result.boundaries.some(row => row.leftContext.endsWith("יכל") && row.rightContext.startsWith("אש")));
  t.diagnostic(JSON.stringify({ eligible: eligible.length, capped: search.capped, goldenIndex,
    candidateReadings: readings.length, matchingSegmentations: segmentations.length, matchingRelations: relations.length,
    limitations: "local router and unverified linguistic candidates; no server replay or live model" }));
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
  assert.ok(result.relations.length <= 3);
  assert.ok(result.relations.every(relation => relation.status === "UNVERIFIED_RELATION" && relation.truthPromotion === false), "broad lexical candidates remain unverified and never become findings");
  assert.ok(result.coverage.candidatesExamined <= 9216);
  assert.equal(result.modelCallsTriggered, 0);
});

test("generic Hebrew affixes create only an unverified reading candidate", async () => {
  const engine = await readFile(ENGINE, "utf8");
  const context = vm.createContext({});
  vm.runInContext([
    NORMALIZER,
    `const guidedMatrixDisplayTerm=term=>term;`,
    functionSource(engine, "guidedDynamicLexiconSkeleton"),
    functionSource(engine, "guidedLanguageReadings"),
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

test("the broad lookup recognizes general construct, prefix and mater-omission forms without Golden rules", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const context = languageContext(engine, corpus, "בדיקת לשון");
  assert.ok(recognizeSurface(context, "ספינת").some(reading => reading.baseTerm === "ספינה" && reading.relation === "construct-form"));
  assert.ok(recognizeSurface(context, "באש").some(reading => reading.baseTerm === "אש" && reading.relation === "prefixed-form"));
  assert.ok(recognizeSurface(context, "אטמ").some(reading => reading.baseTerm === "אטומ" && reading.relation === "mater-omission"));
  const runtime = [functionSource(engine, "guidedLanguageReadings"), functionSource(engine, "guidedMatrixLanguageInspection")].join("\n");
  assert.doesNotMatch(runtime, /ספינת|באש|אטמ|קולומביה|טראמפ/);
});

test("the lazy dynamic profile is a deterministic sanitized asset, not a Golden patch", async () => {
  const words = (await readFile(CORE_LEXICON, "utf8")).trim().split(/\n+/);
  assert.equal(words.length, 4529);
  assert.equal(new Set(words).size, words.length);
  assert.ok(words.every(word => /^[א-ת]{2,12}$/.test(word)));
  const normalized = words.map(word => word.replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]));
  const fingerprint = createHash("sha256").update(`${[...new Set(normalized)].sort().join("\n")}\n`).digest("hex");
  const assetFingerprint = createHash("sha256").update(dynamicLexiconPayload).digest("hex");
  assert.equal(DYNAMIC_LEXICON_PROFILE.coreFingerprint, fingerprint);
  assert.equal(DYNAMIC_LEXICON_PROFILE.coreEntryCount, 4529);
  assert.ok(DYNAMIC_LEXICON_PROFILE.entryCount > 40000 && DYNAMIC_LEXICON_PROFILE.entryCount < 50000);
  assert.equal(DYNAMIC_LEXICON_PROFILE.entries.some(entry => entry[0] === "ספינת"), false);
  assert.match(builtEngine, new RegExp(`GUIDED_DYNAMIC_LEXICON_ASSET_SHA256="${assetFingerprint}"`));
  assert.match(builtEngine, new RegExp(`GUIDED_DYNAMIC_LEXICON_ASSET_BYTES=${dynamicLexiconPayload.length}`));
  assert.ok(Buffer.byteLength(builtEngine) < 2_600_000, "the broad profile is not embedded in the default ELS document");
  assert.equal(builtEngine.includes(dynamicLexiconPayload.slice(0, 1000)), false);
});

test("language-pair ranking is geometry and context based, never skip based", async () => {
  const engine = await readFile(ENGINE, "utf8");
  const source = functionSource(engine, "guidedLanguageRelations");
  assert.match(source, /contextMatches\*100/);
  assert.match(source, /gap>8/);
  assert.match(source, /PARALLEL_AXIS_RAY/);
  assert.doesNotMatch(source, /axis|skip|10101|4545/);
});
