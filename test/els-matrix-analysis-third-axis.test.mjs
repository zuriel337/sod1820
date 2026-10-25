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
  assert.match(native, /גלה מה יש כאן/);
  assert.match(native, /requestLens\("matrix-discovery", target\)/);
  assert.match(native, /סריקה מילונית רחבה · מתקדם ואיטי/);
  assert.match(native, /אין טעינה של אוצר המילים הגדול/);
  assert.match(engine, /MATRIX_DISCOVERY_CONTRACT="els_matrix_discovery_v1"/);
  assert.match(engine, /MATRIX_DISCOVERY_BUDGET_CONTRACT="els_matrix_discovery_budget_v1"/);
  assert.match(engine, /d\.lens==="matrix-discovery"/);
  assert.match(engine, /strategy:"matrix-first",searchRule:"no-default-broad-lexicon"/);
  assert.match(engine, /defaultLexiconLoaded:false,vocabularyTermsChecked:contextTotal/);
  assert.match(engine, /function discoverMatrixRepeats\(/);
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
  const jerusalem = rows.find((row) => row.term === "ירושלמ");
  assert.ok(jerusalem, "the saved-cipher example is rediscovered from canonical letters, not a saved record");
  assert.equal(jerusalem.matrixStage, "B");
  assert.equal(jerusalem.gapScale, 3);
  assert.ok(jerusalem.occurrenceCount >= 2);
  assert.equal(result.pathsChecked, result.box.rayCount);
  assert.ok(result.pathsChecked < 40000, "the local Stage A+B ray budget remains below a broad vocabulary pass");
  assert.deepEqual(rows.map((row) => row.matrixStage), rows.map((row) => row.matrixStage).toSorted(), "all gapless motifs precede bounded Stage B motifs");
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
