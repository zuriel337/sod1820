import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterResearcherCorpus,
  normalizeResearcherCorpusRow,
  researcherCorpusCounts,
  researcherOperationTags,
  researcherRowTokens,
} from "../src/lib/research/researcherCorpusProjection.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/Researcher2029Page.jsx");
const projection = read("src/lib/research/researcherCorpusProjection.js");

assert.match(app, /path="\\/researcher\\/:slug"/);
assert.match(page, /if \\(!isAdmin\\)/);
assert.match(page, /מסך מנהל בלבד/);
assert.match(page, /fetchResearcherCorpusBySlug/);
assert.match(page, /shell\\.go\\("\\/world", \\{ preserve: false \\}\\)/);
assert.match(page, /returnTo:/);
assert.equal(page.includes("ContributorPage"), false);
assert.equal(page.includes("BeitMidrash"), false);
assert.equal(page.includes("בית מדרש"), false);
assert.equal(projection.includes("research_contributions"), false, "v1 corpus must project parsed research_objects, not legacy contribution UI");
assert.match(projection, /\\.from\\("research_objects"\\)/);
assert.match(projection, /\\.eq\\("contributor", contributor\\.display_name\\)/);

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
});
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
});
assert.deepEqual(new Set(researcherOperationTags(mixed)), new Set(["multiplication", "addition", "chain"]));

const single = normalizeResearcherCorpusRow({
  id: "s1",
  statement: "בית שלישי = 1062",
  value: 1062,
  engine_verified: true,
  engine_detail: { verification: { phrase: "בית שלישי", claimed: 1062, computed: 1062, method: "רגיל" } },
});
assert.equal(single.operationTags.includes("single"), true);
assert.equal(researcherRowTokens(single).some((t) => t.label === "בית שלישי"), true);

const unresolved = normalizeResearcherCorpusRow({
  id: "u1",
  statement: "א = 1000",
  value: 1000,
  engine_verified: false,
  engine_detail: { compound: { kind: "general-chain", text: "א=1000", status: "METHOD_UNRESOLVED", operands: [] } },
});
assert.equal(unresolved.operationTags.includes("unresolved"), true);

const rows = [multiply, mixed, single, unresolved];
const counts = researcherCorpusCounts(rows);
assert.equal(counts.all, 4);
assert.equal(counts.multiplication, 2);
assert.equal(counts.unresolved, 1);
assert.equal(filterResearcherCorpus(rows, { operation: "multiplication" }).length, 2);
assert.equal(filterResearcherCorpus(rows, { query: "מלאך" }).map((r) => r.id).includes("m2"), true);
assert.equal(filterResearcherCorpus(rows, { query: "1062" }).map((r) => r.id).includes("s1"), true);

console.log("2029 researcher corpus acceptance: PASS");
