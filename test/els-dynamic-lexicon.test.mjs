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
  assert.doesNotMatch(template.slice(0, template.indexOf('window.addEventListener("message"')), /dynamicCandidateLexicon\(\)\.then/);
  assert.match(template, /status:"CANDIDATE",provenanceSource:lexicon\.contract/);
  assert.match(template, /adding a term[\s\S]*canonical verification before it becomes a Finding/);
});
