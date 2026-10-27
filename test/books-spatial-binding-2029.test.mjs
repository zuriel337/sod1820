import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_TORAH_DATASETS, AHAVAT_TORAH_SOURCE } from "../src/data/ahavatTorahSystem2029.js";
import { SEFER_YETZIRAH_READING_GATES, SEFER_YETZIRAH_SCENE_MODES, SEFER_YETZIRAH_SOURCE } from "../src/data/seferYetzirahWorld2029.js";
import { classifyModelEvidence, engineClaimHasRequiredAuditFields, inspectStructureBindings } from "./fixtures/books-spatial-contract-acceptance.mjs";

const unit = { id: "unit:voice-a:chapter-one", pdf_page: 53, source_ref: "book:example#p53:voice-a" };
const source = { unit_id: unit.id, pdf_page: unit.pdf_page, source_ref: unit.source_ref };
const specification = () => ({
  id: "structure:paired-directions", sources: [{ ...source }],
  components: [{ id: "north", source: { ...source } }, { id: "south", source: { ...source } }],
  source_relations: [{ type: "paired_in_source", from_id: "north", to_id: "south", source: { ...source } }],
});

test("existing reading gates/datasets retain distinct bounded source locators", () => {
  for (const [rows, pages] of [[AHAVAT_TORAH_DATASETS, AHAVAT_TORAH_SOURCE.pdfPages], [SEFER_YETZIRAH_READING_GATES, SEFER_YETZIRAH_SOURCE.pdfPages]]) {
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    for (const row of rows) for (const page of row.pages || [row.page]) assert.ok(Number.isInteger(page) && page >= 1 && page <= pages, `${row.id}: ${page}`);
  }
  assert.equal(new Set(SEFER_YETZIRAH_SCENE_MODES.map(row => row.id)).size, 5);
});

test("an existing_scene or suggested_mode never promotes a specification to an implementation", () => {
  const spec = { ...specification(), illustration: { existing_scene: "existing.jsx", suggested_mode: "sefirot" } };
  assert.equal(classifyModelEvidence({ specification: spec }), "SPECIFICATION_ONLY");
  assert.equal(classifyModelEvidence({ specification: spec, binding: { renderer: "existing.jsx", structureId: "other-voice" }, browser: { sourceSelection: true, fallback: true, nineViewportPresets: true } }), "SPECIFICATION_ONLY");
  assert.equal(classifyModelEvidence({ specification: spec, binding: { renderer: "existing.jsx", structureId: spec.id } }), "IMPLEMENTED_ACCEPTANCE_INCOMPLETE");
  assert.equal(classifyModelEvidence({ specification: spec, binding: { renderer: "existing.jsx", structureId: spec.id }, browser: { sourceSelection: true, fallback: true, nineViewportPresets: true } }), "SOURCE_BOUND_BROWSER_CHECKED");
});

test("every component/relation must bind its own exact unit and source page", () => {
  assert.deepEqual(inspectStructureBindings(specification(), [unit], 220), []);
  for (const mutate of [
    spec => { spec.components[0].source.pdf_page = 54; },
    spec => { spec.components[0].source.source_ref = "book:other-edition#p53"; },
    spec => { spec.source_relations[0].source.unit_id = "unit:other-commentator"; },
    spec => { delete spec.components[1].source; },
    spec => { spec.components[1].id = "north"; },
    spec => { spec.source_relations[0].to_id = "invented-middle"; },
  ]) {
    const candidate = specification(); mutate(candidate);
    assert.ok(inspectStructureBindings(candidate, [unit], 220).length > 0);
  }
});

test("multi-page structures preserve distinct component pages rather than one book-level anchor", () => {
  const other = { id: "unit:voice-a:chapter-two", pdf_page: 76, source_ref: "book:example#p76:voice-a" };
  const spec = specification();
  spec.components[1].source = { unit_id: other.id, pdf_page: other.pdf_page, source_ref: other.source_ref };
  const before = structuredClone(spec);
  assert.deepEqual(inspectStructureBindings(spec, [unit, other], 220), []);
  assert.deepEqual(spec, before, "acceptance inspection must not normalize or fill source values");
});

test("source-only/hash/unknown evidence cannot satisfy even the necessary engine-claim audit fields", () => {
  for (const candidate of [
    { verification: "source_verified", canonicalMethod: "regular", traceId: "pdf-hash", inputMatches: true },
    { verification: "not_tested", value: null },
    { verification: "match", canonicalMethod: "regular", traceId: "trace", inputMatches: false },
    { verification: "match", canonicalMethod: "regular", inputMatches: true },
    { verification: "match", canonicalMethod: "regular", traceId: "trace", inputMatches: true, sourceOnly: true },
  ]) assert.equal(engineClaimHasRequiredAuditFields(candidate), false);
  assert.equal(engineClaimHasRequiredAuditFields({ verification: "match", canonicalMethod: "regular", traceId: "canonical-result", inputMatches: true }), true, "field presence is necessary, not proof of execution");
});
