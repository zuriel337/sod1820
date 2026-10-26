import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);
const EMBED = new URL("../src/components/TzofenEmbed.jsx", import.meta.url);
const CORPUS = new URL("../tools/els/data/tk-letters.txt", import.meta.url);

function functionSource(template, name) {
  const asyncStart = template.indexOf(`async function ${name}(`);
  const plainStart = template.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 && (plainStart < 0 || asyncStart <= plainStart) ? asyncStart : plainStart;
  assert.ok(start >= 0, `${name} exists in the canonical engine`);
  let depth = 0;
  for (let index = template.indexOf("{", start); index < template.length; index += 1) {
    if (template[index] === "{") depth += 1;
    else if (template[index] === "}" && --depth === 0) return template.slice(start, index + 1);
  }
  throw new Error(`cannot extract ${name}`);
}

test("the open Research matrix defaults to bounded matrix-first discovery", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /requestLens\("matrix-discovery", \{ hitId: engineState\.axis\.hitId, surface: "results"/);
  assert.match(native, /סריקה מילונית רחבה · מתקדם ואיטי/);
  assert.match(native, /אוצר המילים הגדול לא נטען/);
  assert.match(engine, /MATRIX_DISCOVERY_CONTRACT="els_matrix_discovery_v1"/);
  assert.match(engine, /MATRIX_DISCOVERY_BUDGET_CONTRACT="els_matrix_discovery_budget_v1"/);
  assert.match(engine, /d\.lens==="matrix-discovery"/);
  assert.match(engine, /strategy:"matrix-first",searchRule:"no-default-broad-lexicon"/);
  assert.match(engine, /defaultLexiconLoaded:false,vocabularyTermsChecked:contextTotal/);
  assert.match(engine, /function discoverMatrixRepeats\(/);
  assert.match(engine, /rawPatterns:rawPatternItems/);
  assert.match(native, /דפוסים גולמיים חוזרים/);
  const advancedRail = native.slice(native.indexOf("function StructuralPriorityRail"), native.indexOf("function SearchProgress"));
  assert.doesNotMatch(advancedRail, /onDiscoverMatrix|<MatrixDiscoveryResults|גלה מה יש כאן/);
  const defaultHandler = engine.slice(engine.indexOf('d.lens==="matrix-discovery"'), engine.indexOf('d.lens==="cross-third-axis"'));
  assert.doesNotMatch(defaultHandler, /dynamicCandidateLexicon\(/);
  assert.match(engine.slice(engine.indexOf('d.lens==="structure-priority"')), /dynamicCandidateLexicon\(\)/);
  assert.doesNotMatch(native.slice(native.indexOf("function StructuralPriorityRail"), native.indexOf("function SearchProgress")), /localStorage|sessionStorage|supabase|fetch\(/);
});

test("matrix-first Stage B rediscovers the two ירושלם paths around מקדש ירד without the broad vocabulary", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const context = vm.createContext({
    T: corpus.trim(),
    st: { raw: "מקדש ירד" },
    DICT: ["ירושלים"],
    MATRIX_DISCOVERY_BUDGET_CONTRACT: "els_matrix_discovery_budget_v1",
  });
  context.scopeN = () => 304805;
  context.paintOperation = async () => {};
  vm.runInContext([
    `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};const norm=s=>{let out="";for(const ch of s||"")if(ch>="א"&&ch<="ת")out+=FIN[ch]||ch;return out;};`,
    functionSource(engine, "distanceToAnchors"),
    functionSource(engine, "focusedCoreBox"),
    functionSource(engine, "matrixDiscoveryBox"),
    functionSource(engine, "plausibleMatrixSequence"),
    functionSource(engine, "matrixDiscoveryDisplayLabel"),
    functionSource(engine, "discoverMatrixRepeats"),
  ].join("\n"), context);
  const axis = { skip: 8780, dir: -1, start: 233549,
    positions: Array.from({ length: 7 }, (_, index) => 233549 - 8780 * index) };
  context.axis = axis;
  const result = await vm.runInContext("discoverMatrixRepeats(axis,{minLength:4,maxLength:10},null,()=>false)", context);
  const rows = JSON.parse(JSON.stringify(result.items));
  const rawRows = JSON.parse(JSON.stringify(result.rawItems));
  const jerusalem = rows.find((row) => row.term === "ירושלמ");
  assert.ok(jerusalem, "the saved-cipher example is rediscovered from canonical letters, not a saved record");
  assert.equal(rows[0].term, "ירושלמ", "supported language is visible before raw geometric patterns");
  assert.ok(rawRows.length > 0, "unknown repeated strings remain available only in the advanced raw-pattern section");
  assert.ok(rawRows.every((row) => row.languageHint === 0));
  assert.equal(jerusalem.matrixStage, "B");
  assert.equal(jerusalem.gapScale, 3);
  assert.ok(jerusalem.occurrenceCount >= 2);
  assert.equal(result.pathsChecked, result.box.rayCount);
  assert.ok(result.pathsChecked < 40000, "the local Stage A+B ray budget remains below a broad vocabulary pass");
  assert.doesNotMatch(engine, /if\s*\([^)]*מקדש ירד|מקדש ירד[^\n]*(?:return|push|unshift)/, "the runtime contains no saved-cipher special case");
});

test("the bounded language map preserves nearby canonical rays for later interpretation without segmenting them", async () => {
  const [engine, corpus] = await Promise.all([readFile(ENGINE, "utf8"), readFile(CORPUS, "utf8")]);
  const context = vm.createContext({
    T: corpus.trim(),
    st: { raw: "ד. טראמפ", scope: "tanakh" },
    MATRIX_DISCOVERY_BUDGET_CONTRACT: "els_matrix_discovery_budget_v1",
    MATRIX_LANGUAGE_INSPECTION_CONTRACT: "els_matrix_language_inspection_v1",
  });
  context.scopeN = () => context.T.length;
  vm.runInContext([
    `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};const norm=s=>{let out="";for(const ch of s||"")if(ch>="א"&&ch<="ת")out+=FIN[ch]||ch;return out;};`,
    functionSource(engine, "focusedCoreBox"),
    functionSource(engine, "matrixDiscoveryBox"),
    functionSource(engine, "matrixLanguageInspection"),
  ].join("\n"), context);
  const axis = {
    skip: 41865,
    dir: -1,
    start: 244509,
    positions: [244509, 202644, 160779, 118914, 77049, 35184],
  };
  context.axis = axis;
  const result = JSON.parse(JSON.stringify(vm.runInContext("matrixLanguageInspection(axis,matrixDiscoveryBox(axis))", context)));
  assert.equal(result.contract, "els_matrix_language_inspection_v1");
  assert.equal(result.status, "CANDIDATE_INPUT");
  assert.equal(result.modelCallsTriggered, 0);
  assert.equal(result.coverage.rayCap, 24);
  assert.ok(result.rays.length <= 24);
  assert.ok(result.rays.every((ray) => ray.text.length <= 24 && [...ray.text].reverse().join("") === ray.reverseText));
  assert.ok(result.rays.some((ray) => ray.text.includes("באשאטמינ") || ray.reverseText.includes("באשאטמינ")), "the intersecting phrase remains in the bounded exact-letter map");
  assert.ok(result.rays.some((ray) => ray.text.includes("שבררומי") || ray.reverseText.includes("שבררומי")), "the nearest parallel reverse phrase remains in the same bounded map");
  assert.deepEqual(result.authority, { letters: "CANONICAL", segmentation: "UNVERIFIED", meaning: "UNVERIFIED", canonicalReplayRequired: true });
  assert.doesNotMatch(functionSource(engine, "matrixLanguageInspection"), /באשאטמינ|שבררומי|ד\. טראמפ/, "the runtime receives no Golden phrase or cipher special case");
});

test("pair-first discovery ranks verified story geometry without numeric-skip favoritism", async () => {
  const engine = await readFile(ENGINE, "utf8");
  const context = vm.createContext({ st: { raw: "אורניום" }, COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1" });
  vm.runInContext([
    `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};const norm=s=>{let out="";for(const ch of s||"")if(ch>="א"&&ch<="ת")out+=FIN[ch]||ch;return out;};`,
    `const gridStep=(sk,S)=>{const rs=Math.round(sk/S),co=sk-rs*S;return Math.max(Math.abs(rs),Math.abs(co))||1;};`,
    functionSource(engine, "compactGeometryMeta"),
    functionSource(engine, "discoveryPairRelation"),
    functionSource(engine, "discoveryPairCandidates"),
  ].join("\n"), context);
  context.axis = { skip: 10101, positions: [100000, 110101, 120202, 130303], _structuralCells: new Set([100000, 110101, 120202, 130303]) };
  context.candidates = [
    { term: "אירנ", label: "איראן", skip: 10101, dir: 1, start: 100001, positions: [100001, 110102, 120203, 130304], distance: 1, matrixStage: "A", occurrenceCount: 1 },
    { term: "ארהב", label: "ארה״ב", skip: 10101, dir: 1, start: 100003, positions: [100003, 110104, 120205, 130306], distance: 3, matrixStage: "A", occurrenceCount: 1 },
    { term: "ישראל", label: "ישראל", skip: 10100, dir: 1, start: 99980, positions: [99980, 110080, 120180, 130280, 140380], distance: 20, matrixStage: "A", occurrenceCount: 4 },
  ];
  context.groups = [{ kind: "parallel", label: "משפחת מקבילות", stage: "A", members: context.candidates.map(candidate => ({ term: candidate.term })) }];
  context.requested = [{ term: "אירנ" }, { term: "ארהב" }];
  const pairs = JSON.parse(JSON.stringify(vm.runInContext("discoveryPairCandidates(candidates,groups,axis,requested,24)", context)));
  assert.deepEqual(pairs[0].terms, ["אירנ", "ארהב"]);
  assert.equal(pairs[0].relation.code, "SHARED_PARALLEL");
  assert.equal(pairs[0].storyMatches, 2);
  assert.doesNotMatch(functionSource(engine, "discoveryPairCandidates"), /notable|10101|primary_number|anchor_numbers/, "numeric resonance is not a pair-ranking input");
  assert.doesNotMatch(engine, /if\s*\([^)]*(?:אורניום|אירנ|ארהב)|(?:אורניום|אירנ|ארהב)[^\n]*(?:return|push|unshift)/, "the runtime has no Uranium-specific branch");
});

test("Cipher Discovery goal reaches only the bounded lens and exposes one verified-pair surface", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /const safeDiscoveryGoal/);
  assert.match(native, /discoveryGoal: _discoveryGoal/);
  assert.match(native, /activeResearchContext\?\.discoveryGoal \? \{ discoveryGoal: activeResearchContext\.discoveryGoal \}/);
  assert.match(native, /data-els-discovery-bundle="verified-pair"/);
  assert.match(native, /מתקדם · כל הממצאים באזור/);
  assert.match(engine, /policy:"MATRIX_DISCOVERY_PAIR_V1"/);
  assert.match(engine, /maxAttempts=12/);
  assert.match(engine, /findingMutation:false/);
  assert.doesNotMatch(engine.slice(engine.indexOf('d.lens==="matrix-discovery"'), engine.indexOf('d.lens==="cross-third-axis"')), /dynamicCandidateLexicon\(/);
});

test("regular results separate exact axes from automatic bounded matrix discovery", async () => {
  const native = await readFile(NATIVE, "utf8");
  const rail = native.slice(native.indexOf("function RegularResultsRail"), native.indexOf("function CrossThirdAxisResearch"));
  assert.match(rail, /מופעים מדויקים של הציר/);
  assert.match(rail, /מילים והקשרים סביב המופע הנבחר/);
  assert.match(native, /requestLens\("matrix-discovery", \{ hitId: engineState\.axis\.hitId, surface: "results"/);
  assert.doesNotMatch(rail, /הושלמה סריקה בשני הכיוונים בדילוגים/);
  assert.doesNotMatch(rail, /completeThrough/);
  assert.ok(rail.indexOf('className="els29-native-result-list"') < rail.indexOf("<MatrixDiscoveryResults"));
  assert.ok(rail.indexOf('className="els29-native-result-list"') < rail.indexOf("<SavedResearchBundles"));
  assert.ok(rail.indexOf('className="els29-native-result-list"') < rail.indexOf("<ResultResearchTargets"));
});

test("guided occurrence coverage reuses matrix-discovery for exact off-screen hits without moving the selected matrix", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /projectElsGuidedOccurrenceCoverage/);
  assert.match(native, /guidedOccurrenceCoverage: true/);
  assert.match(native, /setId: resultView\.id/);
  assert.match(native, /page: resultView\.page/);
  assert.match(native, /בדוק עוד עד 4 מופעים/);
  assert.match(native, /מספר דילוג בולט/);
  const handler = engine.slice(engine.indexOf('d.lens==="matrix-discovery"'), engine.indexOf('d.lens==="cross-third-axis"'));
  assert.match(handler, /guided=target\.guidedOccurrenceCoverage===true/);
  assert.match(handler, /guided\?nativeOccurrenceResults\(\):null/);
  assert.match(handler, /occurrences\.items\.find\(row=>row\.hitId===target\.hitId\)/);
  assert.match(handler, /st\.res!==sourceResult/);
  assert.equal((engine.match(/d\.lens==="matrix-discovery"/g) || []).length, 1, "the runner adds no second discovery lens");
  assert.equal((native.match(/<TzofenEmbed/g) || []).length, 1, "the runner adds no second engine surface");
  assert.doesNotMatch(handler, /openNativeOccurrence|st\.occ\s*=/, "background inspection never selects or moves the visible occurrence");
});

test("the screen exposes one ordered workflow without creating another engine surface", async () => {
  const native = await readFile(NATIVE, "utf8");
  const tools = native.slice(native.indexOf('[["results", "ציר ומופעים"'), native.indexOf("].map(([tool, label"));
  assert.match(native, /חיפוש חדש/);
  assert.match(native, /"ציר ומופעים"/);
  assert.match(native, /"חבילת מחקר"/);
  assert.match(native, /"מתקדם"/);
  assert.match(native, /מצב קלאסי/);
  assert.ok(tools.indexOf('"results"') < tools.indexOf('"findings"'));
  assert.ok(tools.indexOf('"findings"') < tools.indexOf('"structures"'));
  assert.ok(tools.indexOf('"structures"') < tools.indexOf('"research"'));
  assert.equal((native.match(/<TzofenEmbed/g) || []).length, 1);
  assert.doesNotMatch(native, /showResearchBusWhenHiddenBridge/);
});

test("a third term is searched only inside the selected or verified cross meetings", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /מצא ציר שלישי/);
  assert.match(native, /meetingScope === "selected"/);
  assert.match(native, /meetingScope === "all"/);
  assert.match(native, /requestLens\("cross-third-axis", target\)/);
  assert.match(engine, /CROSS_THIRD_AXIS_CONTRACT="els_cross_third_axis_v1"/);
  assert.match(engine, /d\.lens==="cross-third-axis"/);
  assert.match(engine, /target\.setId!==results\.id/);
  assert.match(engine, /crossThirdAxisCandidates\(zone,target\.term,maxDistance,window,2\)/);
  assert.match(engine, /axisDistance>bound\|\|companionDistances\.some\(companion=>companion\.distance>bound\)/);
  assert.match(engine, /policy:"CROSS_THIRD_AXIS_V1"/);
  assert.doesNotMatch(native.slice(native.indexOf("function CrossThirdAxisResearch"), native.indexOf("function CrossResultsRail")), /localStorage|sessionStorage|supabase|fetch\(/);
});

test("both research programs reuse the sole mounted canonical ELS engine", async () => {
  const [native, embed] = await Promise.all([readFile(NATIVE, "utf8"), readFile(EMBED, "utf8")]);
  assert.equal((native.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(embed, /type: "request-lens"/);
  assert.match(embed, /d\.type === "lens" \|\| d\.type === "lens-progress"/);
  assert.doesNotMatch(native, /createStore\(|new .*Engine|new ResearchProvider/);
});
