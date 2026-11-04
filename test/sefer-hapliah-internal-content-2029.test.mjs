import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));
const PDF_PAGE_COUNT = 327;
const EXPECTED_SHA = "92cb911c36cb1b9c2b3e80607c36455178ae89e3831611bf31da042f5d54bf08";
const readBundle = () => Promise.all([
  readJson("public/book-data/sefer-hapliah.internal-map.json"),
  readJson("public/book-data/sefer-hapliah.commentary.json"),
  readJson("public/book-data/sefer-hapliah.page-text.json"),
]);

test("HaPeli'ah internal depth has stable IDs, legal and exact one-based PDF ranges", async () => {
  const [map, commentary, textIndex] = await readBundle();
  assert.equal(map.schema_version, "sefer-hapliah-internal-map.v1");
  assert.equal(map.book_slug, "sefer-hapliah");
  assert.equal(map.source_identity, "book:hebrewbooks:6355");
  assert.equal(map.source_pdf_sha256, EXPECTED_SHA);
  assert.equal(textIndex.source_pdf_sha256, EXPECTED_SHA);
  assert.equal(commentary.source_pdf_sha256, EXPECTED_SHA);
  assert.equal(map.source_pdf_pages, PDF_PAGE_COUNT);
  assert.equal(map.gates.length, 11);
  assert.ok(map.units.length >= 75, "internal map requires more than generic 11 gates");
  const gateIds = new Set(map.gates.map(gate => gate.id));
  const ids = new Set();
  for (const unit of map.units) {
    const source = unit.source;
    assert.ok(!ids.has(unit.id), `duplicate internal unit ${unit.id}`);
    ids.add(unit.id);
    assert.match(unit.id, /^hapliah\.[a-z-]+\.[a-z0-9-]+$/);
    assert.ok(gateIds.has(unit.gate_id), `unknown gate: ${unit.id}`);
    const gate = map.gates.find(item => item.id === unit.gate_id);
    assert.ok(source.from_pdf_page >= gate.from_pdf_page, unit.id);
    assert.ok(source.to_pdf_page <= gate.to_pdf_page, unit.id);
    assert.ok(source.from_pdf_page <= source.entry_pdf_page, unit.id);
    assert.ok(source.entry_pdf_page <= source.to_pdf_page, unit.id);
    assert.ok(source.from_pdf_page >= 1 && source.to_pdf_page <= PDF_PAGE_COUNT, unit.id);
    assert.equal(source.source_identity, map.source_identity);
    assert.equal(source.entry_pdf_page, source.from_pdf_page, unit.id);
    assert.equal(source.entry_anchor, `#page=${source.entry_pdf_page}&view=FitH`);
    assert.equal(source.range_end_anchor, `#page=${source.to_pdf_page}&view=FitH`);
    assert.equal(source.entry_url, `${map.source_pdf_url}${source.entry_anchor}`);
    assert.equal(unit.source_review_status, "machine_text_located_pending_visual_witness_check");
    assert.equal(unit.engine_verification, "not_tested");
    assert.equal(unit.witness_quote, null);
    assert.equal(unit.printed_commentary_quote, null);
    assert.ok(unit.content.subject.length >= 10);
    assert.ok(unit.content.steps.length >= 2);
    assert.ok(unit.companion_explanation.length >= 70, unit.id);
    assert.ok(unit.layer.startsWith("הסבר נלווה"));
  }
  for (const gate of map.gates) {
    assert.ok(map.units.some(unit => unit.gate_id === gate.id), `unmapped gate ${gate.id}`);
  }
  assert.deepEqual(map.evidence_policy.direct_visual_pdf_pages_verified, []);
  assert.ok(map.evidence_policy.machine_extracted_text_sampled_pages.length >= 80);
  assert.ok(map.evidence_policy.machine_extracted_text_sampled_pages.length < PDF_PAGE_COUNT);
  assert.equal(map.evidence_policy.engine_verification, "not_tested");
  assert.doesNotMatch(JSON.stringify(map), /מאומת במנוע/);
});

test("deep companion can render in existing Preview without erasing the 327-page first pass", async () => {
  const [map, commentary, textIndex] = await readBundle();
  assert.equal(commentary.schema_version, "sefer-hapliah-commentary.v1");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    from_pdf_page: 1,
    to_pdf_page: PDF_PAGE_COUNT,
    status: "complete_first_pass_source_anchored",
  });
  assert.equal(commentary.internal_depth.status, "partial_source_located");
  assert.equal(commentary.internal_depth.source_bound_units, map.units.length);
  assert.equal(commentary.internal_depth.engine_verification, "not_tested");
  assert.equal(commentary.internal_depth.interactive_map_ui, "unwired_shared_manifest_and_reader_intentionally_untouched");
  assert.equal(commentary.pages.length, PDF_PAGE_COUNT);
  assert.deepEqual(commentary.pages.map(p => p.pdf_page), Array.from({ length: PDF_PAGE_COUNT }, (_, i) => i + 1));
  assert.deepEqual(textIndex.pages.filter(p => p.extraction_status !== "machine_candidate").map(p => p.pdf_page), [3]);
  const changed = commentary.pages.filter(page => page.first_pass_snapshot);
  const entryPages = new Set(map.units.map(unit => unit.source.entry_pdf_page));
  assert.equal(changed.length, entryPages.size, "every changed page must represent a real internal map entry");
  for (const page of commentary.pages) {
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
    assert.ok(page.companion_explanation.length >= 120, page.pdf_page);
    assert.ok(page.reading_points.length >= 2, page.pdf_page);
    if (!entryPages.has(page.pdf_page)) {
      assert.equal(page.first_pass_snapshot, undefined, `untouched page mutated: ${page.pdf_page}`);
      continue;
    }
    assert.ok(page.first_pass_snapshot.title.length > 5);
    assert.ok(page.first_pass_snapshot.companion_explanation.length > 100);
    assert.ok(page.first_pass_snapshot.reading_points.length >= 2);
    assert.deepEqual(
      new Set(page.internal_content_unit_ids),
      new Set(map.units.filter(unit => unit.source.entry_pdf_page === page.pdf_page).map(unit => unit.id)),
    );
    assert.ok(page.companion_explanation.includes("PDF"), `page ${page.pdf_page} lacks source range`);
  }
  assert.equal(commentary.pages[2].source_basis, "visual_blank_page");
  assert.equal(commentary.pages[2].first_pass_snapshot, undefined);
  assert.match(commentary.pages.find(page => page.pdf_page === 10).title, /ברא אלהים/);
  assert.match(commentary.pages.find(page => page.pdf_page === 180).title, /אלה תולדות השמים והארץ/);
  assert.match(commentary.pages.find(page => page.pdf_page === 283).title, /הנחש היה ערום/);
  assert.match(commentary.pages.find(page => page.pdf_page === 327).title, /חתימת פרשת בראשית/);
  assert.ok(commentary.printed_commentary_status.includes("לא הוכרעו חזותית"));
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("HaPeli'ah depiction specs have per-element and per-relation provenance without invented geometry", async () => {
  const [map] = await readBundle();
  assert.ok(map.structure_specs.length >= 3);
  const unitIds = new Set(map.units.map(unit => unit.id));
  for (const spec of map.structure_specs) {
    assert.equal(spec.state, "CONTENT_SPEC_ONLY_NOT_IMPLEMENTED");
    assert.equal(spec.engine_status, "not_tested");
    assert.equal(spec.presentation.geometry, null);
    assert.equal(spec.presentation.scale, null);
    assert.equal(spec.presentation.distance, null);
    assert.equal(spec.presentation.coordinates, null);
    assert.equal(spec.presentation.color_encoding, null);
    assert.equal(spec.presentation.height_encoding, null);
    assert.equal(spec.presentation.no_implicit_spatial_edges, true);
    for (const unitId of spec.source_unit_ids) assert.ok(unitIds.has(unitId), unitId);
    const ids = new Set();
    for (const item of spec.components) {
      assert.ok(!ids.has(item.id), `duplicate component ${item.id}`);
      ids.add(item.id);
      assert.ok(item.source.pdf_page >= 1 && item.source.pdf_page <= PDF_PAGE_COUNT);
      assert.equal(item.source.url, `${map.source_pdf_url}#page=${item.source.pdf_page}&view=FitH`);
      assert.equal(item.source.review_status, "machine_locator_pending_visual_verification");
    }
    for (const relation of spec.relations) {
      assert.ok(ids.has(relation.from), relation.id);
      assert.ok(ids.has(relation.to), relation.id);
      assert.notEqual(relation.from, relation.to, relation.id);
      assert.ok(relation.source.pdf_page >= 1 && relation.source.pdf_page <= PDF_PAGE_COUNT);
      assert.equal(relation.source.url, `${map.source_pdf_url}#page=${relation.source.pdf_page}&view=FitH`);
      assert.equal(relation.verification, "machine_located_pending_visual");
    }
  }
  assert.equal(map.structure_specs.find(s => s.id === "hapliah.struct.camp-banners").components.length, 6);
});
