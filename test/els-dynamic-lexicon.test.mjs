import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const template = readFileSync(new URL("../tools/els/els-code.template.html", import.meta.url), "utf8");

function source(name) {
  const start = template.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in the canonical engine`);
  let depth = 0;
  for (let index = template.indexOf("{", start); index < template.length; index += 1) {
    if (template[index] === "{") depth += 1;
    else if (template[index] === "}" && --depth === 0) return template.slice(start, index + 1);
  }
  throw new Error(`cannot extract ${name}`);
}

const normalization = `const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>{let o="";for(const c of s||"")if(c>="א"&&c<="ת")o+=(FIN[c]||c);return o;};`;

test("dynamic ELS vocabulary derives from canonical language and visible verified research without a new store", () => {
  const context = vm.createContext({
    DICT: ["אליהו", "אמת"],
    _corpusLexiconCache: { torah: null, tanakh: null },
    _corpusAxisWordCache: { torah: null, tanakh: null },
    _corpusPhraseCache: { torah: null, tanakh: null },
    VCHAP: [[1], [1], [1], [1], [1], [1]],
    TORAH_BOOKS: 5,
    HEBNUM: (number) => {
      const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
      const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
      const hundreds = ["", "ק", "ר", "ש", "ת"];
      let value = number;
      const century = Math.floor(value / 100);
      value %= 100;
      let result = century ? (century <= 4 ? hundreds[century] : hundreds[4].repeat(Math.floor(century / 4)) + (hundreds[century % 4] || "")) : "";
      result += value === 15 ? "טו" : value === 16 ? "טז" : tens[Math.floor(value / 10)] + units[value % 10];
      return result;
    },
    st: { scope: "torah", raw: "משיח", words: [{ t: "יבואו" }] },
    CLOUD_MATRICES: [{ term: "תשעו", words: [{ t: "בית" }] }],
  });
  vm.runInContext([
    normalization,
    source("addCandidateLexiconTerm"),
    source("addCorpusMorphology"),
    source("buildCorpusCandidateLexicons"),
    source("addBasicHebrewYears"),
    source("researchCandidateLexicon"),
    "buildCorpusCandidateLexicons(['בא יבואו יבואו אליהו הספינה מחכה','ארבעה','','','','מחוץ']);",
    "this.result=researchCandidateLexicon();",
    "this.focused=researchCandidateLexicon(false,{languageScope:'tanakh',includeMorphology:true});",
  ].join("\n"), context);

  const rows = JSON.parse(JSON.stringify(context.result));
  const byTerm = new Map(rows.map((row) => [row.term, row]));
  const focusedByTerm = new Map(JSON.parse(JSON.stringify(context.focused)).map((row) => [row.term, row]));
  assert.ok(byTerm.get("יבואו").sources.includes("corpus_native"));
  assert.ok(byTerm.get("יבואו").sources.includes("verified_research"));
  assert.ok(byTerm.get("אליהו").sources.includes("governed_core"));
  assert.ok(byTerm.get("תשעו").sources.includes("visible_saved_research"));
  assert.ok(byTerm.get("תשעו").sources.includes("basic_hebrew_year"));
  assert.ok(byTerm.get("תשעו").classifications.some((item) => item.kind === "hebrew-year" && item.value === 5776));
  const phraseCode = vm.runInContext("_corpusPhraseCache.torah.get('באיבואו')", context);
  assert.equal((phraseCode >> 10) & 3, 2, "canonical phrases stay in the compact phrase index");
  assert.equal(phraseCode & 31, 2, "the compact index preserves the first word boundary");
  assert.ok(byTerm.get("בית").sources.includes("visible_saved_research"));
  assert.equal(byTerm.has("מחוצ"), false, "broad Torah discovery keeps its historical scoped vocabulary");
  assert.ok(focusedByTerm.get("מחוצ").sources.includes("corpus_native"), "focused discovery may use canonical Tanakh language while occurrence search remains Torah-scoped");
  assert.equal(byTerm.has("אמת"), true, "the historical governed seed remains available");
  assert.equal(byTerm.has("בא"), false, "short words stay out of broad matrix discovery");
  assert.ok(focusedByTerm.get("ספינת").sources.includes("corpus_morphology"), "construct forms are derived from canonical language rather than a saved cipher");
  assert.ok(focusedByTerm.get("מחכי").sources.includes("corpus_morphology"), "bounded inflection supports a local compound without a curated runtime term");
  const axisRows = JSON.parse(JSON.stringify(vm.runInContext("researchCandidateLexicon(true)", context)));
  assert.ok(axisRows.find((row) => row.term === "בא")?.sources.includes("corpus_native_adjacent"), "a short Torah word is available only to exact axis continuation");
});

test("dynamic vocabulary remains candidate-only and is loaded only by explicit scan lenses", () => {
  assert.match(template, /const DYNAMIC_LEXICON_CONTRACT="els_dynamic_candidate_lexicon_v1"/);
  assert.match(template, /if\(target\.scan===true\)dynamicCandidateLexicon\(\)\.then\(publish\);else publish\(null\)/);
  assert.match(template, /d\.lens==="matrix-candidates"[\s\S]*?dynamicCandidateLexicon\(\)\.then\(async lexicon=>/);
  assert.match(template, /d\.lens==="structure-priority"[\s\S]*?dynamicCandidateLexicon\(\)\.then\(async lexicon=>/);
  assert.match(template, /d\.lens==="structure-priority"[\s\S]*?eligibleLexicon=lexicon\.entries\.filter[\s\S]*?deriveLocalPhraseCandidates\(candidatesBaseRaw,structuralAxis,lexicon\.phraseIndex\)/,
    "the structure tool shares local phrase extension instead of brute-force phrase scanning");
  assert.match(template, /scanCandidatesBatched\([\s\S]*?type:"lens-progress",lens:"structure-priority"/);
  assert.doesNotMatch(template.slice(0, template.indexOf('window.addEventListener("message"')), /dynamicCandidateLexicon\(\)\.then/);
  assert.match(template, /status:"CANDIDATE",provenanceSource:lexicon\.contract/);
  assert.match(template, /adding a term[\s\S]*canonical verification before it becomes a Finding/);
  assert.match(template, /d\.lens==="result-triage"[\s\S]*?dynamicCandidateLexicon\(\)\.then\(async lexicon=>/);
  assert.match(template, /RESULT_TRIAGE_CONTRACT="els_result_triage_v1"/);
});

test("axis-neighborhood discovery is explicit, bounded and independent of a continuation word", () => {
  assert.match(template, /AXIS_NEIGHBORHOOD_CONTRACT="els_axis_neighborhood_bundle_v1"/);
  assert.match(template, /FOCUSED_CORE_CONTRACT="els_focused_core_bundle_v1"/);
  const start = template.indexOf('d.lens==="matrix-candidates"');
  const end = template.indexOf('d.lens==="structure-priority"', start);
  assert.ok(start >= 0 && end > start);
  const block = template.slice(start, end);
  assert.match(block, /compactPool=available\.filter[\s\S]*?slice\(0,96\)/);
  assert.match(block, /spacedPool=available\.filter[\s\S]*?slice\(0,12\)/);
  assert.match(block, /includeOccurrences:true,maxOccurrences:10/);
  assert.match(block, /deriveLocalPhraseCandidates\(availableBaseRaw,structuralAxis,lexicon\.phraseIndex\)/);
  assert.doesNotMatch(block, /scanCandidatesBatched\(lexicon\.phraseIndex/, "the compact phrase index is never brute-force scanned");
  assert.doesNotMatch(block, /if\(!continuation\.words\.length\)return null/);
  assert.match(block, /bundleContract:AXIS_NEIGHBORHOOD_CONTRACT/);
  assert.match(block, /scanMode:"focused"/);
  assert.match(block, /independentOfSavedResearch:true/);
  assert.match(block, /target\.depth==="expanded"/);
  assert.match(block, /axisSuggestion=chooseAxisNeighborhoodSuggestion/);

  const targetStart = template.indexOf('d.lens==="neighborhood-target"');
  const targetEnd = template.indexOf('d.lens==="matrix-candidates"', targetStart);
  const targetBlock = template.slice(targetStart, targetEnd);
  assert.match(targetBlock, /resolveAxisNeighborhoodTarget\(target,lexicon\.entries\)/);
  assert.match(targetBlock, /promoteVerified\([\s\S]*?policy:"AXIS_NEIGHBORHOOD_TARGET_V1"/);
  assert.doesNotMatch(targetBlock, /(?:positions|\bstart\b|\bp0\b|\bp1\b)\s*:/, "the suggested-axis response remains coordinate-free");
});

test("focused core cold Goldens are rediscovered from the canonical corpus without saved-cipher vocabulary", () => {
  const corpus = readFileSync(new URL("../tools/els/data/tk-letters.txt", import.meta.url), "utf8").trim();
  const verses = readFileSync(new URL("../tools/els/data/tk-vtext.txt", import.meta.url), "utf8").trimEnd().split("\n");
  let scopeLength = 304805;
  const hebrewNumber = (number) => {
    const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    let value = number;
    let result = "";
    while (value >= 400) { result += "ת";value -= 400; }
    if (value >= 100) { result += ["", "ק", "ר", "ש"][Math.floor(value / 100)];value %= 100; }
    return result + (value === 15 ? "טו" : value === 16 ? "טז" : tens[Math.floor(value / 10)] + units[value % 10]);
  };
  const context = vm.createContext({
    T: corpus,
    DICT: ["אליהו", "מלך", "שופר", "אמת"],
    _corpusLexiconCache: { torah: null, tanakh: null },
    _corpusAxisWordCache: { torah: null, tanakh: null },
    _corpusPhraseCache: { torah: null, tanakh: null },
    VCHAP: [[5846], [], [], [], []], TORAH_BOOKS: 5, HEBNUM: hebrewNumber,
    st: { scope: "torah", raw: "", words: [] },
    CLOUD_MATRICES: [], scopeN: () => scopeLength, heb: String,
    COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1",
    AXIS_NEIGHBORHOOD_CONTRACT: "els_axis_neighborhood_bundle_v1",
    gridStep: (skip, width) => { const rows = Math.round(skip / width);const columns = skip - rows * width;return Math.max(Math.abs(rows), Math.abs(columns)) || 1; },
  });
  vm.runInContext([
    normalization,
    source("addCandidateLexiconTerm"), source("addCorpusMorphology"), source("buildCorpusCandidateLexicons"),
    source("addBasicHebrewYears"), source("researchCandidateLexicon"), source("compactGeometryMeta"),
    source("axisNeighborhoodMeta"), source("distanceToAnchors"), source("independentCandidateRows"),
    source("focusedPhraseRow"), source("focusedCoreBox"), source("focusedCoreSkipMeta"),
    source("focusedCandidateStrength"), source("focusedCompoundPartsScore"), source("focusedCoreRankScore"),
    source("scanFocusedCoreCandidates"),
    `buildCorpusCandidateLexicons(${JSON.stringify(verses)});`,
  ].join("\n"), context);

  const goldens = [
    { label: "משיח טבת עשירי", skip: 1820, start: 15170, dir: 1, expected: ["יבואו", "אליהו", "ישלחמלאכו", "נשבעתינאמיהוה", "תשעו"] },
    { label: "יום משיח בא", skip: 583, start: 239480, dir: -1, expected: ["ישלח", "מלכ", "מחכיתשפו", "לכפרעליכמ", "הארחשכ", "שופר"] },
    { label: "קולומביה", skip: 4545, start: 248765, dir: 1, expected: ["יכלאש", "ספינת", "אשאכלה"] },
    { label: "תורת הרמז", skip: 21940, start: 43250, dir: 1, scope: "tanakh", expected: ["נשמהללוט", "זרע", "חשמל"] },
  ];
  for (const golden of goldens) {
    scopeLength = golden.scope === "tanakh" ? corpus.length : 304805;
    context.st.scope = golden.scope === "tanakh" ? "tanakh" : "torah";
    context.st.raw = golden.label;
    const axisLength = vm.runInContext(`norm(${JSON.stringify(golden.label)}).length`, context);
    context.axis = { skip: golden.skip, start: golden.start, dir: golden.dir,
      positions: Array.from({ length: axisLength }, (_, index) => golden.start + index * golden.skip * golden.dir) };
    context.axis._structuralCells = new Set(context.axis.positions);
    vm.runInContext("this.result=scanFocusedCoreCandidates(researchCandidateLexicon(false,{languageScope:'tanakh',includeMorphology:true}),researchCandidateLexicon(true,{languageScope:'tanakh',includeMorphology:true}),_corpusPhraseCache.tanakh,axis);", context);
    const found = new Set(context.result.candidates.map((candidate) => vm.runInContext(`norm(${JSON.stringify(candidate.term)})`, context)));
    for (const term of golden.expected) assert.ok(found.has(term), `${golden.label} independently rediscovers ${term}`);
    if (golden.label === "תורת הרמז") {
      const stages = new Map(context.result.candidates.map(candidate => [vm.runInContext(`norm(${JSON.stringify(candidate.term)})`, context), candidate.focusStage]));
      assert.equal(stages.get("חשמל"), "B", "bounded local gaps remain an explicit second-stage candidate");
      assert.equal(stages.get("נשמהללוט"), "A");
      assert.ok(context.result.probes < 8000, "the local-gap stage remains bounded around the axis rows and columns");
    }
    assert.equal(context.result.box.rowPad, 12);
    assert.equal(context.result.box.colRadius, 12);
  }
  assert.equal(context.CLOUD_MATRICES.length, 0, "saved matrices are not runtime discovery input");
});

test("result triage extends a short finding only through immediately adjacent cells on the same path", () => {
  const letters = [..."אבביתישראלגד"];
  const context = vm.createContext({
    norm: value => String(value).replace(/\s+/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]),
    lineContextCells: () => letters.map((letter, index) => ({ letter, main: index >= 2 && index <= 4 })),
    hit: { positions: [2, 3, 4] },
    _lineExtensionIndexCache: new WeakMap(),
    lexicon: [
      { term: "ביתישראל", label: "בית ישראל", sources: ["corpus_native"], support: 3 },
      { term: "ביתדין", label: "בית דין", sources: ["corpus_native"], support: 9 },
      { term: "בית", label: "בית", sources: ["governed_core"], support: 4 },
    ],
  });
  vm.runInContext(`${source("lineExtensionLexiconIndex")}\n${source("lineExtensionCandidates")}\nthis.result=lineExtensionCandidates(hit,"בית",lexicon);`, context);
  const rows = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(rows.map((row) => row.label), ["בית ישראל"]);
  assert.equal(rows[0].direction, "forward");
  assert.equal(rows[0].gain, 5);
});

test("result triage derives exact short Torah words immediately before and after a verified axis", () => {
  const letters = [...("אבמתי" + "יוממשיח" + "באגד")];
  const context = vm.createContext({
    norm: value => String(value).replace(/\s+/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]),
    lineContextCells: () => letters.map((letter, index) => ({ letter, main: index >= 5 && index <= 11 })),
    hit: { positions: [5, 6, 7, 8, 9, 10, 11] },
    _lineExtensionIndexCache: new WeakMap(),
    lexicon: [
      { term: "מתי", label: "מתי", sources: ["corpus_native_adjacent"], support: 12 },
      { term: "בא", label: "בא", sources: ["corpus_native_adjacent"], support: 40 },
      { term: "אב", label: "אב", sources: ["corpus_native_adjacent"], support: 80 },
    ],
  });
  vm.runInContext(`${source("lineExtensionLexiconIndex")}\n${source("lineExtensionCandidates")}\nthis.result=lineExtensionCandidates(hit,"יום משיח",lexicon,8);`, context);
  const rows = JSON.parse(JSON.stringify(context.result));
  assert.ok(rows.some((row) => row.term === "יוממשיחבא" && row.label === "יום משיח בא" && row.direction === "forward"));
  assert.ok(rows.some((row) => row.term === "מתייוממשיח" && row.label === "מתי יום משיח" && row.direction === "backward"));
  assert.ok(rows.some((row) => row.term === "מתייוממשיחבא" && row.direction === "both"));
  assert.ok(rows.every((row) => row.extensionKind.startsWith("adjacent-")));
  assert.ok(rows.every((row) => !row.term.startsWith("אב")), "a known word is ignored when it is not adjacent to the verified axis");
});

test("a triage continuation resolves to one exact internal candidate before canonical verification", () => {
  const targetText = "יוממשיחבא";
  const corpus = Array(60).fill("א");
  [...targetText].forEach((letter, index) => { corpus[10 + index * 2] = letter; });
  const hit = { skip: 2, dir: 1, start: 10, positions: [10, 12, 14, 16, 18, 20, 22], v: "MATCH" };
  const line = [...("אבמתי" + "יוממשיח" + "באגד")];
  const context = vm.createContext({
    norm: value => String(value).replace(/\s+/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]),
    T: corpus,
    scopeN: () => corpus.length,
    st: { raw: "יום משיח", res: { hits: [hit] } },
    isGov: value => value?.v === "MATCH",
    hitKey: value => `${value.skip}_${value.dir}_${value.start}`,
    nativeOccurrenceResults: () => ({ id: "occ-1", page: 0, items: [{ hitId: "2_1_10", index: 0 }] }),
    nativeCrossResults: () => null,
    _lineExtensionIndexCache: new WeakMap(),
    lineContextCells: () => line.map((letter, index) => ({ letter, main: index >= 5 && index <= 11 })),
    lexicon: [{ term: "בא", label: "בא", sources: ["corpus_native_adjacent"], support: 4 }],
    target: { kind: "regular", setId: "occ-1", page: 0, key: "2_1_10", baseTerm: "יוממשיח", term: targetText },
  });
  vm.runInContext(`${source("lineExtensionLexiconIndex")}\n${source("lineExtensionCandidates")}\n${source("resolveResultResearchTarget")}\nthis.result=resolveResultResearchTarget(target,lexicon);`, context);
  const resolved = JSON.parse(JSON.stringify(context.result));
  assert.equal(resolved.term, targetText);
  assert.deepEqual(resolved.hit, { skip: 2, dir: 1, start: 10, positions: [10, 12, 14, 16, 18, 20, 22, 24, 26] });
  assert.doesNotMatch(template, /lens:"research-target"[^\n]+positions/, "candidate coordinates do not cross the lens response");
});

test("bundle comparison verifies two to four existing continuation targets without exporting coordinates", () => {
  assert.match(template, /RESEARCH_BUNDLE_COMPARISON_CONTRACT="els_research_bundle_comparison_v1"/);
  const start = template.indexOf('d.lens==="research-target-compare"');
  const end = template.indexOf('d.lens==="matrix-candidates"', start);
  assert.ok(start >= 0 && end > start, "the comparison is an explicit lens before package scanning");
  const block = template.slice(start, end);
  assert.match(block, /target\.targets\.slice\(0,4\)/, "comparison is capped at four targets");
  assert.match(block, /requested\.length<2/, "a comparison requires at least two targets");
  assert.match(block, /resolveResultResearchTarget\(descriptor/);
  assert.match(block, /promoteVerified\(/, "each row uses canonical occurrence verification");
  assert.match(block, /selectionProvenance:"POST_HOC_EXPLORATORY"/, "comparison cannot present post-hoc selection as a significance claim");
  assert.doesNotMatch(block, /(?:positions|\bstart\b|\bp0\b|\bp1\b)\s*:/, "comparison responses do not export corpus coordinates");
});

test("result triage ranks repeated exact continuation first but keeps every result available", () => {
  const context = vm.createContext({ rows: [
    { key: "a", order: 1, skip: 80, signals: [{ extensions: [{ term: "ביתישראל", label: "בית ישראל", gain: 5 }], nearby: [], notable: null }] },
    { key: "b", order: 2, skip: 120, signals: [{ extensions: [{ term: "ביתישראל", label: "בית ישראל", gain: 5 }], nearby: [{}], notable: null }] },
    { key: "c", order: 3, skip: 7, signals: [{ extensions: [], nearby: [], notable: "מספר מוכר" }] },
    { key: "d", order: 4, skip: 91, signals: [{ extensions: [], nearby: [], notable: null }] },
  ] });
  vm.runInContext(`${source("rankResultTriageItems")}\nthis.result=rankResultTriageItems(rows,"regular");`, context);
  const ranked = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(new Set(ranked.slice(0, 2).map((row) => row.key)), new Set(["a", "b"]));
  assert.ok(ranked.slice(0, 2).every((row) => row.reasons.some((reason) => reason.includes("2 תוצאות"))));
  assert.equal(ranked.length, 4, "rank-don't-hide preserves a low-signal result");
  assert.equal(ranked.at(-1).tier, "available");
  context.rows = [{ key: "only", order: 1, skip: 91, signals: [{ extensions: [], nearby: [], notable: null }] }];
  vm.runInContext("this.weak=rankResultTriageItems(rows,'regular');", context);
  assert.equal(context.weak[0].tier, "available", "a top-three slot alone must not become a recommendation");
});

test("structural Research priority keeps gapless geometry ahead of spaced parallels", () => {
  const context = vm.createContext({
    SIGNIFICANT: new Set([37]),
    STRUCTURAL_PRIORITY_CONTRACT: "els_structural_priority_scan_v1",
    COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1",
    gridStep: (skip, width) => { const rows = Math.round(skip / width), columns = skip - rows * width; return Math.max(Math.abs(rows), Math.abs(columns)) || 1; },
    norm: value => String(value),
    axis: { skip: 100, positions: [1000, 1100, 1200] },
    candidates: [
      { term: "מקבילצמוד", skip: 100, positions: [1002, 1102], distance: 8, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "אלכסוןצמוד", skip: 101, positions: [1003, 1104], distance: 4, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "מקבילעםפער", skip: 200, positions: [2000, 2200], distance: 1, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "אלכסוןעםפער", skip: 202, positions: [2001, 2203], distance: 1, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "חוצה", skip: 37, positions: [963, 1000, 1037], distance: 0, lexiconSources: ["verified_research"], lexiconSupport: 3 },
      { term: "מסודר", skip: 4545, positions: [3000, 7545], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 9 },
      { term: "רגיל", skip: 91, positions: [4000, 4091], distance: 0, lexiconSources: ["verified_research"], lexiconSupport: 20 },
    ],
  });
  vm.runInContext([
    source("notable"),
    source("candidateLexiconPriority"),
    source("compactGeometryMeta"),
    source("classifyStructuralCandidate"),
    source("rankStructuralCandidates"),
    source("preferStructuralCandidate"),
    "this.result=rankStructuralCandidates(candidates,axis);",
    "this.preferred=preferStructuralCandidate(candidates[0],candidates[2],axis);",
  ].join("\n"), context);

  const rows = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(new Set(rows.slice(0, 2).map(row => row.term)), new Set(["מקבילצמוד", "אלכסוןצמוד"]));
  assert.ok(rows.slice(0, 2).every(row => row.geometry.stage === "A" && row.relation.startsWith("parallel-")), "S and S+1 share the gapless top stage");
  assert.ok(rows.find(row => row.term === "מקבילעםפער").geometry.stage === "B", "2S is explicitly demoted to the spaced stage");
  assert.ok(rows.find(row => row.term === "אלכסוןעםפער").geometry.stage === "B", "2S+2 is not presented as a gapless diagonal");
  assert.ok(rows.find(row => row.term === "חוצה").relationTags.some(tag => tag.includes("חצייה")));
  assert.ok(rows.find(row => row.term === "מסודר").relationTags.some(tag => tag.includes("תבנית חוזרת")), "4545 uses the existing notable-number rule");
  assert.ok(rows.every(row => !["start", "rc"].some(key => key in row)), "the classifier does not invent coordinates");
  assert.equal(context.preferred, true, "a parallel occurrence survives even when another occurrence of the term is closer");
});

test("bounded structure plans group repeated motifs, parallels, corridors, intersections and clusters without exposing coordinates", () => {
  const context = vm.createContext({
    SIGNIFICANT: new Set(),
    COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1",
    gridStep: (skip, width) => { const rows = Math.round(skip / width), columns = skip - rows * width; return Math.max(Math.abs(rows), Math.abs(columns)) || 1; },
    STRUCTURE_PLAN_CONTRACT: "els_structure_scan_plan_v1",
    REPEATED_MOTIF_CONTRACT: "els_repeated_motif_projection_v1",
    STRUCTURE_TYPES: ["parallel", "motif", "corridor", "intersection", "cluster"],
    st: { raw: "ציר" },
    norm: value => String(value),
    axis: { skip: 10, positions: [100, 110, 120, 130], _structuralCells: new Set([100, 110, 120, 130]) },
    candidates: [
      { term: "מקבילא", skip: 10, dir: 1, positions: [102, 112, 122, 132], distance: 2, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "מקבילב", skip: 11, dir: 1, positions: [103, 114, 125, 136], distance: 3, lexiconSources: ["verified_research"], lexiconSupport: 3 },
      { term: "באמצע", skip: 10, dir: 1, positions: [101, 111, 121, 131], distance: 1, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "חוצהא", skip: 3, dir: 1, positions: [100, 103, 106, 109], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "חוצהב", skip: 4, dir: 1, positions: [110, 114, 118, 122], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "ומיום", skip: 7, dir: 1, positions: [140, 147, 154, 161, 168], distance: 4, lexiconSources: ["corpus_native"], lexiconSupport: 2,
        occurrences: [
          { skip: 7, dir: 1, start: 140, positions: [140, 147, 154, 161, 168], distance: 4 },
          { skip: 9, dir: -1, start: 190, positions: [190, 181, 172, 163, 154], distance: 6 },
        ] },
    ],
  });
  vm.runInContext([
    source("notable"), source("candidateLexiconPriority"), source("compactGeometryMeta"), source("classifyStructuralCandidate"),
    source("normalizeStructurePlan"), source("structuralCandidateCenter"), source("structuralMember"), source("buildStructuralGroups"),
    "this.result=buildStructuralGroups(candidates,axis,{types:['parallel','motif','corridor','intersection','cluster'],minLength:4,maxLength:10,maxDistance:40,minMembers:2});",
    "this.clamped=normalizeStructurePlan({types:['unknown'],minLength:1,maxLength:99,maxDistance:999,minMembers:9});",
  ].join("\n"), context);

  const result = JSON.parse(JSON.stringify(context.result));
  assert.equal(result.plan.contract, "els_structure_scan_plan_v1");
  const motif = result.groups.find(group => group.kind === "motif");
  assert.equal(motif.contract, "els_repeated_motif_projection_v1");
  assert.deepEqual(motif.members.map(member => member.occurrenceOrdinal), [1, 2]);
  assert.ok(motif.members.every(member => member.term === "ומיום" && member.role === "motif"));
  assert.ok(result.groups.some(group => group.kind === "parallel" && group.members.length >= 2));
  assert.ok(result.groups.some(group => group.kind === "corridor" && group.members.some(member => member.role === "inside")));
  assert.ok(result.groups.some(group => group.kind === "intersection"));
  assert.ok(result.groups.some(group => group.kind === "cluster"));
  assert.ok(result.groups.flatMap(group => group.members).every(member => !["positions", "start", "rc", "_center"].some(key => key in member)));
  assert.deepEqual(JSON.parse(JSON.stringify(context.clamped)), {
    contract: "els_structure_scan_plan_v1", types: ["parallel", "motif", "corridor", "intersection", "cluster"],
    minLength: 3, maxLength: 16, maxDistance: 120, minMembers: 6, maxGroups: 12, maxMembers: 10,
  });
});

test("Research candidate ranking keeps compact geometry first and distance first within a stage", () => {
  const context = vm.createContext({
    CANDIDATE_RANKING_CONTRACT: "els_research_candidate_ranking_v1",
    norm: value => String(value),
    items: [
      { term: "רחוקצמוד", distance: 2, geometry: { compact: true, stage: "A", relationLabel: "אלכסון ללא פער" }, neighborhood: { band: "parallel", priority: 500 }, lexiconSources: ["verified_research"], lexiconSupport: 1, continuations: [{}, {}, {}] },
      { term: "קרובעםפער", distance: 1, geometry: { compact: false, stage: "B", relationLabel: "מבנה עם פערים" }, neighborhood: { band: "spaced", priority: 100 }, lexiconSources: ["corpus_native"], lexiconSupport: 9, continuations: [{}] },
      { term: "קרובצמוד", distance: 1, geometry: { compact: true, stage: "A", relationLabel: "מקבילה אנכית ללא פער" }, neighborhood: { band: "parallel", priority: 500 }, lexiconSources: ["visible_saved_research", "corpus_native"], lexiconSupport: 2, continuations: [{}, {}] },
    ],
  });
  vm.runInContext(`${source("candidateLexiconPriority")}\n${source("rankResearchCandidateItems")}\nthis.result=rankResearchCandidateItems(items);`, context);
  const rows = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(rows.map(row => row.term), ["קרובצמוד", "רחוקצמוד", "קרובעםפער"], "a spaced candidate cannot displace a compact finding even when it is closer");
  assert.equal(rows[0].ranking.contract, "els_research_candidate_ranking_v1");
  assert.deepEqual(rows[0].ranking.reasons, ["שלב א׳ · מקבילה אנכית ללא פער", "מופיע במחקר גלוי", "2 המשכים על הציר"]);
});

test("canonical source phrases extend words already found in the local matrix instead of brute-force rescanning every phrase", () => {
  const letters = Array(40).fill("א");
  [..."ישלחמלאכו"].forEach((letter, index) => { letters[10 + index] = letter; });
  const axis = { skip: 10, positions: [1, 11, 21], _structuralCells: new Set([1, 11, 21]) };
  const occurrence = { term: "ישלח", skip: 1, dir: 1, start: 10, positions: [10, 11, 12, 13], distance: 0 };
  const context = vm.createContext({
    T: letters,
    norm: value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]),
    scopeN: () => letters.length,
    blockOf: () => ({ S: 10, c0: 0, cw: 10, r0: 0, r1: 3 }),
    gridStep: (skip, width) => { const rows = Math.round(skip / width); return Math.max(Math.abs(rows), Math.abs(skip - rows * width)) || 1; },
    COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1",
    AXIS_NEIGHBORHOOD_CONTRACT: "els_axis_neighborhood_bundle_v1",
    candidates: [{ ...occurrence, occurrences: [occurrence] }],
    axis,
  });
  vm.runInContext([
    source("distanceToAnchors"), source("compactGeometryMeta"), source("axisNeighborhoodMeta"), source("deriveLocalPhraseCandidates"),
    "this.phraseIndex=new Map([['ישלחמלאכו',(2<<10)|(5<<5)|4]]);",
    "this.result=deriveLocalPhraseCandidates(candidates,axis,phraseIndex);",
  ].join("\n"), context);
  const [phrase] = JSON.parse(JSON.stringify(context.result));
  assert.equal(phrase.term, "ישלח מלאכו");
  assert.equal(phrase.distance, 0);
  assert.ok(phrase.lexiconSources.includes("corpus_native_phrase"));
});

test("יום משיח בא is a six-of-six compact public research bundle", () => {
  const context = vm.createContext({
    COMPACT_GEOMETRY_CONTRACT: "els_compact_geometry_priority_v1",
    RESEARCH_BUNDLE_CONTRACT: "els_research_bundle_v1",
    st: { scope: "torah" },
    CLOUD_MATRICES: [{ id: "public-fixture", slug: "יום-משיח-בא-583", name: "יום משיח בא", term: "יום משיח בא", scope: "torah", skip: 583, words: [
      { t: "ישלח", sh: ["583_-1_233650"] }, { t: "מלכ", sh: ["1_1_232483"] },
      { t: "מחכיתשפו", sh: ["583_1_233063"] }, { t: "לכפרעליכמ", sh: ["1_1_236559"] },
      { t: "הארחשכ", sh: ["584_1_232474"] }, { t: "שופר", sh: ["583_-1_235391"] },
    ] }],
    norm: value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, letter => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[letter])),
    gridStep: (skip, width) => { const rows = Math.round(skip / width), columns = skip - rows * width; return Math.max(Math.abs(rows), Math.abs(columns)) || 1; },
  });
  vm.runInContext([source("compactGeometryMeta"), source("parseSavedHitKey"), source("visibleSavedResearchBundles"), "this.result=visibleSavedResearchBundles('יום משיח');"].join("\n"), context);
  const [bundle] = JSON.parse(JSON.stringify(context.result));
  assert.equal(bundle.contract, "els_research_bundle_v1");
  assert.equal(bundle.compactFindings, 6);
  assert.equal(bundle.selectedFindings, 6);
  assert.equal(bundle.spacedFindings, 0);
  assert.deepEqual(bundle.relationCounts, { vertical: 3, horizontal: 2, diagonal: 1 });
  assert.equal(bundle.researchReady, true);
  assert.equal(bundle.href, "/code?cipher=%D7%99%D7%95%D7%9D-%D7%9E%D7%A9%D7%99%D7%97-%D7%91%D7%90-583");
});
