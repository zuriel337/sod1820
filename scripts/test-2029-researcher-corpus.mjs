import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterResearcherCorpus,
  fetchResearcherCorpusBySlugWithClient,
  normalizeResearcherCorpusRow,
  researcherCorpusCounts,
  researcherCorpusIndex,
  researcherOperationTags,
  researcherRowTokens,
} from "../src/lib/research/researcherCorpusProjection.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/Researcher2029Page.jsx");
const projection = read("src/lib/research/researcherCorpusProjection.js");

assert.equal(app.includes('path="/researcher/:slug"'), true);
assert.equal(page.includes("if (!isAdmin)"), true);
assert.match(page, /מסך מנהל בלבד/);
assert.equal(page.includes("fetchResearcherCorpusBySlug"), true);
assert.equal(page.includes('shell.go("/world?focus=context", { preserve: false })'), true);
assert.equal(page.includes("returnTo:"), true);
assert.equal(page.includes("ContributorPage"), false);
assert.equal(page.includes("BeitMidrash"), false);
assert.equal(page.includes("בית מדרש"), false);
assert.equal(projection.includes("research_contributions"), false, "v1 corpus must project parsed research_objects, not legacy contribution UI");
assert.equal(projection.includes('.from("research_objects")'), true);
assert.equal(projection.includes('.eq("contributor", contributorName)'), true);
assert.equal(projection.includes('fetchPagedResearchRows(supabase, contributor.display_name'), true);

const registryRows = [
  { method_key: "רגיל", db_column: "ragil", display_label: "רגיל" },
  { method_key: "אתבש", db_column: "atbash", display_label: "אתב״ש" },
];

const multiply = normalizeResearcherCorpusRow({
  id: "m1",
  statement: "6 × טוב(17) = 102",
  value: 102,
  engine_verified: true,
  engine_detail: {
    compound: {
      kind: "quantity-product",
      text: "6 × טוב(17) = 102",
      operand: { phrase: "טוב", value: 17, method: "רגיל", status: "verified" },
      quantity: 6,
      computedTotal: 102,
      status: "ENGINE_VERIFIED_COMPOSITE",
    },
  },
}, { registryRows });
assert.equal(multiply.operationTags.includes("multiplication"), true);
assert.equal(multiply.operationTags.includes("unresolved"), false);
assert.equal(multiply.tokens.some((t) => t.kind === "phrase" && t.label === "טוב"), true);
assert.equal(multiply.tokens.some((t) => t.kind === "number" && t.value === 102), true);

const mixed = normalizeResearcherCorpusRow({
  id: "m2",
  statement: "רזא+שבת=10 ×מלאך",
  value: 910,
  engine_verified: true,
  engine_detail: {
    compound: {
      kind: "general-chain",
      text: "רזא+שבת=10 ×מלאך",
      operands: [
        { phrase: "רזא", value: 208, method: "רגיל" },
        { phrase: "שבת", value: 702, method: "רגיל" },
        { phrase: "מלאך", value: 91, method: "רגיל" },
      ],
      status: "ENGINE_VERIFIED_COMPOSITE",
    },
  },
}, { registryRows });
assert.deepEqual(new Set(mixed.operationTags), new Set(["multiplication", "addition", "chain", "regular"]));

const single = normalizeResearcherCorpusRow({
  id: "s1",
  statement: "בית שלישי = 1062",
  value: 1062,
  engine_verified: true,
  engine_detail: { verification: { phrase: "בית שלישי", claimed: 1062, computed: 1062, method: "רגיל" } },
}, { registryRows });
assert.equal(single.operationTags.includes("single"), true);
assert.equal(single.operationTags.includes("regular"), true);
assert.equal(single.tokens.some((t) => t.label === "בית שלישי"), true);

const spatialNonRegular = normalizeResearcherCorpusRow({
  id: "sp1",
  statement: "מבנה מרחבי באתב״ש",
  engine_verified: true,
  engine_detail: { verification: { method: "atbash", phrase: "מבנה" } },
  meta: { ext: { spatial_research: {
    research_focus_key: "zvi:spatial:test",
    cluster: "אשכול מרחבי",
    role: "STRUCTURAL_3D",
    classification: "DERIVED_RESEARCH_CLASSIFICATION",
  } } },
}, { registryRows });
assert.equal(spatialNonRegular.operationTags.includes("spatial"), true);
assert.equal(spatialNonRegular.operationTags.includes("non_regular"), true);
assert.equal(spatialNonRegular.operationTags.includes("regular"), false);
assert.equal(spatialNonRegular.canonicalMethods[0].methodKey, "אתבש");

const unresolved = normalizeResearcherCorpusRow({
  id: "u1",
  statement: "א = 1000",
  value: 1000,
  engine_verified: false,
  engine_detail: { compound: { kind: "general-chain", text: "א=1000", status: "METHOD_UNRESOLVED", operands: [] } },
});
assert.equal(unresolved.operationTags.includes("unresolved"), true);

const rows = [multiply, mixed, single, spatialNonRegular, unresolved];
const counts = researcherCorpusCounts(rows);
assert.equal(counts.all, 5);
assert.equal(counts.multiplication, 2);
assert.equal(counts.unresolved, 1);
assert.equal(counts.spatial, 1);
assert.equal(counts.regular, 3);
assert.equal(counts.non_regular, 1);
assert.equal(filterResearcherCorpus(rows, { operation: "multiplication" }).length, 2);
assert.deepEqual(filterResearcherCorpus(rows, { operation: "spatial" }).map((r) => r.id), ["sp1"]);
assert.deepEqual(filterResearcherCorpus(rows, { operation: "non_regular" }).map((r) => r.id), ["sp1"]);
assert.equal(filterResearcherCorpus(rows, { query: "מלאך" }).map((r) => r.id).includes("m2"), true);
assert.equal(filterResearcherCorpus(rows, { query: "1062" }).map((r) => r.id).includes("s1"), true);
assert.equal(filterResearcherCorpus(rows, { query: "אשכול מרחבי" }).map((r) => r.id).includes("sp1"), true);
assert.equal(filterResearcherCorpus(rows, { query: "אתב״ש" }).map((r) => r.id).includes("sp1"), true);

const index = researcherCorpusIndex(rows);
assert.deepEqual(index.methods.map((row) => row.key), ["רגיל", "אתבש"]);
assert.equal(index.spatialClusters[0].key, "zvi:spatial:test");
assert.equal(index.coverage.spatialRows, 1);
assert.equal(index.islands.spatialWithoutSourceRef, 1);

function mockSupabase(researchRows) {
  const contributor = {
    id: "c66f0464-0928-490e-be9b-66d8a87e7fc8",
    slug: "zvi-opoc",
    display_name: "צבי (OPOC)",
  };
  return {
    from(table) {
      const state = { from: 0, to: 999 };
      const response = () => {
        if (table === "contributors") return { data: contributor, error: null };
        if (table === "gematria_methods") return { data: registryRows, error: null };
        if (table === "research_objects") return {
          data: researchRows.slice(state.from, state.to + 1),
          count: researchRows.length,
          error: null,
        };
        return { data: [], error: null };
      };
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        range(from, to) { state.from = from; state.to = to; return query; },
        maybeSingle() { return Promise.resolve(response()); },
        then(resolve, reject) { return Promise.resolve(response()).then(resolve, reject); },
      };
      return query;
    },
  };
}

const pagedRows = Array.from({ length: 1443 }, (_, index) => ({
  id: `row-${String(index).padStart(4, "0")}`,
  created_at: "2026-09-01T00:00:00.000Z",
  statement: `ממצא ${index}`,
  contributor: "צבי (OPOC)",
  engine_detail: index === 1200 ? { verification: { method: "רגיל" } } : {},
  meta: {},
}));
const pagedResult = await fetchResearcherCorpusBySlugWithClient(mockSupabase(pagedRows), "zvi-opoc");
assert.equal(pagedResult.rows.length, 1443, "all researcher rows must load beyond Supabase's 1000-row response cap");
assert.deepEqual(pagedResult.coverage, { loaded: 1443, total: 1443, truncated: false });
assert.equal(pagedResult.rows[1200].operationTags.includes("regular"), true);

console.log("2029 researcher corpus acceptance: PASS");
