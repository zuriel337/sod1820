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
    VCHAP: [[1], [1], [1], [1], [1], [1]],
    TORAH_BOOKS: 5,
    st: { scope: "torah", raw: "משיח", words: [{ t: "יבואו" }] },
    CLOUD_MATRICES: [{ term: "תשעו", words: [{ t: "בית" }] }],
  });
  vm.runInContext([
    normalization,
    source("addCandidateLexiconTerm"),
    source("buildCorpusCandidateLexicons"),
    source("researchCandidateLexicon"),
    "buildCorpusCandidateLexicons(['יבואו יבואו אליהו','ארבעה','','','','מחוץ']);",
    "this.result=researchCandidateLexicon();",
  ].join("\n"), context);

  const rows = JSON.parse(JSON.stringify(context.result));
  const byTerm = new Map(rows.map((row) => [row.term, row]));
  assert.ok(byTerm.get("יבואו").sources.includes("corpus_native"));
  assert.ok(byTerm.get("יבואו").sources.includes("verified_research"));
  assert.ok(byTerm.get("אליהו").sources.includes("governed_core"));
  assert.ok(byTerm.get("תשעו").sources.includes("visible_saved_research"));
  assert.ok(byTerm.get("בית").sources.includes("visible_saved_research"));
  assert.equal(byTerm.has("מחוצ"), false, "Torah scope excludes words that occur only after the five Torah books");
  assert.equal(byTerm.has("אמת"), true, "the historical governed seed remains available");
});

test("dynamic vocabulary remains candidate-only and is loaded only by explicit scan lenses", () => {
  assert.match(template, /const DYNAMIC_LEXICON_CONTRACT="els_dynamic_candidate_lexicon_v1"/);
  assert.match(template, /if\(target\.scan===true\)dynamicCandidateLexicon\(\)\.then\(publish\);else publish\(null\)/);
  assert.match(template, /d\.lens==="matrix-candidates"[\s\S]*?dynamicCandidateLexicon\(\)\.then\(lexicon=>/);
  assert.match(template, /d\.lens==="structure-priority"[\s\S]*?dynamicCandidateLexicon\(\)\.then\(lexicon=>/);
  assert.doesNotMatch(template.slice(0, template.indexOf('window.addEventListener("message"')), /dynamicCandidateLexicon\(\)\.then/);
  assert.match(template, /status:"CANDIDATE",provenanceSource:lexicon\.contract/);
  assert.match(template, /adding a term[\s\S]*canonical verification before it becomes a Finding/);
});

test("structural Research priority puts parallels before intersections and existing notable skips", () => {
  const context = vm.createContext({
    SIGNIFICANT: new Set([37]),
    STRUCTURAL_PRIORITY_CONTRACT: "els_structural_priority_scan_v1",
    norm: value => String(value),
    axis: { skip: 100, positions: [1000, 1100, 1200] },
    candidates: [
      { term: "מקבילמדויק", skip: 200, positions: [2000, 2200], distance: 8, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "מקבילאלכסוני", skip: 202, positions: [2001, 2203], distance: 1, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "חוצה", skip: 37, positions: [963, 1000, 1037], distance: 0, lexiconSources: ["verified_research"], lexiconSupport: 3 },
      { term: "מסודר", skip: 4545, positions: [3000, 7545], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 9 },
      { term: "רגיל", skip: 91, positions: [4000, 4091], distance: 0, lexiconSources: ["verified_research"], lexiconSupport: 20 },
    ],
  });
  vm.runInContext([
    source("notable"),
    source("candidateLexiconPriority"),
    source("classifyStructuralCandidate"),
    source("rankStructuralCandidates"),
    source("preferStructuralCandidate"),
    "this.result=rankStructuralCandidates(candidates,axis);",
    "this.preferred=preferStructuralCandidate(candidates[1],candidates[4],axis);",
  ].join("\n"), context);

  const rows = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(new Set(rows.slice(0, 2).map(row => row.term)), new Set(["מקבילמדויק", "מקבילאלכסוני"]));
  assert.ok(rows.slice(0, 2).every(row => row.relation.startsWith("parallel-")), "exact and diagonal parallels share the top structural class");
  assert.ok(rows[2].relationTags.some(tag => tag.includes("חוצה")));
  assert.ok(rows[3].relationTags.some(tag => tag.includes("תבנית חוזרת")), "4545 uses the existing notable-number rule");
  assert.ok(rows.every(row => !["start", "rc"].some(key => key in row)), "the classifier does not invent coordinates");
  assert.equal(context.preferred, true, "a parallel occurrence survives even when another occurrence of the term is closer");
});

test("bounded structure plans group parallels, corridors, intersections and clusters without exposing coordinates", () => {
  const context = vm.createContext({
    SIGNIFICANT: new Set(),
    STRUCTURE_PLAN_CONTRACT: "els_structure_scan_plan_v1",
    STRUCTURE_TYPES: ["parallel", "corridor", "intersection", "cluster"],
    st: { raw: "ציר" },
    norm: value => String(value),
    axis: { skip: 10, positions: [100, 110, 120, 130], _structuralCells: new Set([100, 110, 120, 130]) },
    candidates: [
      { term: "מקבילא", skip: 10, dir: 1, positions: [102, 112, 122, 132], distance: 2, lexiconSources: ["visible_saved_research"], lexiconSupport: 2 },
      { term: "מקבילב", skip: 11, dir: 1, positions: [103, 114, 125, 136], distance: 3, lexiconSources: ["verified_research"], lexiconSupport: 3 },
      { term: "באמצע", skip: 10, dir: 1, positions: [101, 111, 121, 131], distance: 1, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "חוצהא", skip: 3, dir: 1, positions: [100, 103, 106, 109], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
      { term: "חוצהב", skip: 4, dir: 1, positions: [110, 114, 118, 122], distance: 0, lexiconSources: ["corpus_native"], lexiconSupport: 1 },
    ],
  });
  vm.runInContext([
    source("notable"), source("candidateLexiconPriority"), source("classifyStructuralCandidate"),
    source("normalizeStructurePlan"), source("structuralCandidateCenter"), source("structuralMember"), source("buildStructuralGroups"),
    "this.result=buildStructuralGroups(candidates,axis,{types:['parallel','corridor','intersection','cluster'],minLength:4,maxLength:10,maxDistance:40,minMembers:2});",
    "this.clamped=normalizeStructurePlan({types:['unknown'],minLength:1,maxLength:99,maxDistance:999,minMembers:9});",
  ].join("\n"), context);

  const result = JSON.parse(JSON.stringify(context.result));
  assert.equal(result.plan.contract, "els_structure_scan_plan_v1");
  assert.ok(result.groups.some(group => group.kind === "parallel" && group.members.length >= 2));
  assert.ok(result.groups.some(group => group.kind === "corridor" && group.members.some(member => member.role === "inside")));
  assert.ok(result.groups.some(group => group.kind === "intersection"));
  assert.ok(result.groups.some(group => group.kind === "cluster"));
  assert.ok(result.groups.flatMap(group => group.members).every(member => !["positions", "start", "rc", "_center"].some(key => key in member)));
  assert.deepEqual(JSON.parse(JSON.stringify(context.clamped)), {
    contract: "els_structure_scan_plan_v1", types: ["parallel", "corridor", "intersection", "cluster"],
    minLength: 3, maxLength: 16, maxDistance: 120, minMembers: 6, maxGroups: 12, maxMembers: 10,
  });
});

test("Research candidate ranking keeps distance primary and explains deterministic tie-breaks", () => {
  const context = vm.createContext({
    CANDIDATE_RANKING_CONTRACT: "els_research_candidate_ranking_v1",
    norm: value => String(value),
    items: [
      { term: "רחוק", distance: 2, lexiconSources: ["verified_research"], lexiconSupport: 1, continuations: [{}, {}, {}] },
      { term: "קרוברגיל", distance: 1, lexiconSources: ["corpus_native"], lexiconSupport: 9, continuations: [{}] },
      { term: "קרובמחקר", distance: 1, lexiconSources: ["visible_saved_research", "corpus_native"], lexiconSupport: 2, continuations: [{}, {}] },
    ],
  });
  vm.runInContext(`${source("candidateLexiconPriority")}\n${source("rankResearchCandidateItems")}\nthis.result=rankResearchCandidateItems(items);`, context);
  const rows = JSON.parse(JSON.stringify(context.result));
  assert.deepEqual(rows.map(row => row.term), ["קרובמחקר", "קרוברגיל", "רחוק"], "no strength signal may outrank a closer candidate");
  assert.equal(rows[0].ranking.contract, "els_research_candidate_ranking_v1");
  assert.deepEqual(rows[0].ranking.reasons, ["מופיע במחקר גלוי", "2 המשכים על הציר"]);
});
