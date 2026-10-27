import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));
const PDF = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Sefer_HaBahir_1883.pdf";
const SID = "book:sefer-habahir-1883";
const CORRECTED = new Set([30, 31, 32, 34, 35, 38]);

test("HaBahir: 48 pages survive with PDF-page anchors and original source layers", async () => {
  const [map, commentary, extracted] = await Promise.all([
    read("public/book-data/sefer-habahir.internal-map.json"),
    read("public/book-data/sefer-habahir.commentary.json"),
    read("public/book-data/sefer-habahir.page-text.json"),
  ]);
  assert.equal(map.schema_version, "sefer-habahir-internal-map.v1");
  assert.equal(map.book_slug, "sefer-habahir");
  assert.equal(map.source_identity, SID);
  assert.equal(map.source_pdf_url, PDF);
  assert.equal(map.source_pdf_sha256, commentary.source_pdf_sha256);
  assert.equal(map.source_pdf_sha256, extracted.source_pdf_sha256);
  assert.equal(map.page_index.length, 48);
  assert.equal(commentary.pages.length, 48);
  assert.equal(extracted.pages.length, 48);
  assert.equal(commentary.coverage.from_pdf_page, 1);
  assert.equal(commentary.coverage.to_pdf_page, 48);
  assert.equal(commentary.coverage.status, "complete_first_pass_source_anchored");
  assert.equal(commentary.source_pdf_url, PDF);
  assert.equal(map.source_layers.book_text, "דברי הספר");
  assert.ok(map.source_layers.printed_commentary.includes("אור הגנוז"));
  for (let page = 1; page <= 48; page++) {
    const p = commentary.pages[page - 1];
    const entry = map.page_index[page - 1];
    assert.equal(p.pdf_page, page);
    assert.equal(entry.pdf_page, page);
    assert.equal(p.source_anchor, "#page=" + page + "&view=FitH");
    assert.equal(entry.source_url, PDF + p.source_anchor);
    assert.equal(entry.title, p.title);
    assert.ok(p.companion_explanation.length > 30);
    assert.ok(p.reading_points.length > 0);
  }
  assert.deepEqual(
    extracted.pages.filter(p => p.extraction_status === "blank_or_image_only").map(p => p.pdf_page),
    [45, 46, 48]
  );
  assert.equal(map.provenance.fresh_visual_pdf_read, "not_performed_access_unavailable");
  assert.equal(map.engine_verification, "not_tested");
});

test("HaBahir: stable unique inner units, source per unit, no invented verbatim quotes", async () => {
  const map = await read("public/book-data/sefer-habahir.internal-map.json");
  const commentary = await read("public/book-data/sefer-habahir.commentary.json");
  assert.ok(map.units.length >= 80);
  const ids = new Set();
  const byPage = new Map();
  const layers = new Set(["book_text", "printed_commentary", "edition"]);
  for (const u of map.units) {
    assert.ok(!ids.has(u.id), "repeated unit id " + u.id);
    ids.add(u.id);
    assert.match(u.id, /^bahir-p\d{2}-[a-z0-9-]+$/);
    assert.ok(u.pdf_page >= 5 && u.pdf_page <= 43);
    assert.ok(layers.has(u.source_layer), u.id);
    assert.equal(u.quote_status, "no_new_direct_quote");
    assert.ok(u.companion_explanation.length > 35);
    assert.equal(u.source_anchor, "#page=" + u.pdf_page + "&view=FitH");
    assert.equal(u.source_url, PDF + u.source_anchor);
    assert.equal(u.source_ref, SID + "#p" + u.pdf_page);
    if (u.block_id) {
      assert.ok(u.pdf_page >= 25, "no invented Scan A block references");
      assert.equal(u.block_source_ref, SID + "#p" + u.pdf_page + ":" + u.block_id);
    }
    byPage.set(u.pdf_page, (byPage.get(u.pdf_page) || 0) + 1);
  }
  for (let page = 5; page <= 43; page++) {
    assert.ok(byPage.get(page) >= 2, "missing depth on page " + page);
    const p = commentary.pages[page - 1];
    assert.match(p.companion_explanation, /להבנת מהלך העמוד/);
    assert.ok(Array.isArray(p.internal_unit_ids));
    assert.deepEqual(p.internal_unit_ids, map.units.filter(u => u.pdf_page === page).map(u => u.id));
    assert.deepEqual(p.internal_unit_ids, map.page_index[page - 1].unit_ids);
  }
  for (const page of [1, 2, 3, 4, 44, 45, 46, 47, 48]) {
    assert.deepEqual(map.page_index[page - 1].unit_ids, []);
    assert.equal(commentary.pages[page - 1].internal_unit_ids, undefined);
    assert.doesNotMatch(commentary.pages[page - 1].companion_explanation, /להבנת מהלך העמוד/);
  }
  assert.ok(ids.has("bahir-p30-princess"));
  assert.ok(ids.has("bahir-p30-garden-field"));
  assert.notEqual("bahir-p30-princess", "bahir-p30-garden-field");
  assert.equal(map.units.find(u => u.id === "bahir-p38-printed-diagram").source_layer, "printed_commentary");
  assert.equal(map.units.find(u => u.id === "bahir-p43-colophon").source_layer, "printed_commentary");
  assert.equal(map.units.find(u => u.id === "bahir-p43-explicit-end").source_layer, "edition");
});

test("HaBahir: named block references resolve only to ACTIVE source pages, never superseded pages", async () => {
  const map = await read("public/book-data/sefer-habahir.internal-map.json");
  assert.deepEqual(map.provenance.prior_corrected_pages, [30, 31, 32, 34, 35, 38]);
  const cache = new Map();
  for (const unit of map.units.filter(u => u.block_id)) {
    const page = unit.pdf_page;
    const path = "research/sefer-habahir-1883/" +
      (CORRECTED.has(page) ? "scan-b-corrective" : "scan-b") +
      "/pages/p" + page + ".json";
    assert.ok(existsSync(new URL(path, ROOT)), path);
    if (!cache.has(path)) cache.set(path, await read(path));
    const witness = cache.get(path);
    assert.equal(witness.pdf_page, page);
    assert.ok(witness.input.blocks.some(b => b.block_id === unit.block_id), unit.id + " => " + unit.block_id);
    assert.equal(witness.source_ref_page, SID + "#p" + page);
  }
});

test("HaBahir: proposed visual structures cite every component and link; no engine claim", async () => {
  const map = await read("public/book-data/sefer-habahir.internal-map.json");
  const ids = new Set(map.units.map(u => u.id));
  assert.ok(map.spatial_specifications.length >= 5);
  for (const spec of map.spatial_specifications) {
    assert.equal(spec.status, "SPECIFICATION_ONLY");
    assert.equal(spec.engine_status, "not_tested");
    assert.ok(spec.components.length > 0);
    for (const u of spec.source_unit_ids) assert.ok(ids.has(u), spec.id);
    const nodes = new Set(spec.components.map(c => c.id));
    assert.equal(nodes.size, spec.components.length);
    for (const c of spec.components) {
      assert.ok(ids.has(c.source_unit_id), spec.id);
      assert.equal(c.source_anchor, map.units.find(u => u.id === c.source_unit_id).source_anchor);
    }
    for (const l of spec.relationships) {
      assert.ok(nodes.has(l.from) && nodes.has(l.to));
      assert.ok(ids.has(l.source_unit_id));
      assert.equal(l.source_anchor, map.units.find(u => u.id === l.source_unit_id).source_anchor);
      if (l.kind === "editorial_layout") assert.equal(l.editorial, true);
    }
  }
  const diagram = map.spatial_specifications.find(s => s.id === "printed-direction-diagram");
  assert.ok(diagram);
  assert.equal(diagram.source_pages.join(","), "38");
  assert.equal(map.publication_state, "source_content_only_preview_no_new_surface");
  assert.equal(map.book_exhaustion, "not_established");
});
