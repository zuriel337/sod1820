import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectEls2029Representation } from "../src/lib/research/els2029Representation.js";

const layers = {
  contract: "els_2029_layers_v1",
  status: "OK",
  corpusId: "torah:v1",
  corpusVersion: "mt-text-v1",
  axisOccurrenceId: "occ-axis",
  layers: [
    {
      layerId: "els-layer:occ-axis",
      occurrenceId: "occ-axis",
      role: "axis",
      corpusId: "torah:v1",
      corpusVersion: "mt-text-v1",
      dependencyGroup: "window:1",
      skip: 7,
      dir: 1,
      start: 100,
      end: 114,
      coordinateConvention: "zero_based_character_index",
      positions: [100, 107, 114],
      cells: [
        { corpusIndex: 100, occurrenceId: "occ-axis", role: "axis", characterIdentityRef: "corpus-index:100", glyphIdentity: null, renderingInstance: null },
        { corpusIndex: 107, occurrenceId: "occ-axis", role: "axis", characterIdentityRef: "corpus-index:107", glyphIdentity: null, renderingInstance: null },
        { corpusIndex: 114, occurrenceId: "occ-axis", role: "axis", characterIdentityRef: "corpus-index:114", glyphIdentity: null, renderingInstance: null },
      ],
    },
    {
      layerId: "els-layer:occ-2",
      occurrenceId: "occ-2",
      role: "occurrence",
      corpusId: "torah:v1",
      corpusVersion: "mt-text-v1",
      dependencyGroup: "window:1",
      skip: 3,
      dir: -1,
      start: 112,
      end: 106,
      coordinateConvention: "zero_based_character_index",
      positions: [112, 109, 106],
      cells: [
        { corpusIndex: 112, occurrenceId: "occ-2", role: "occurrence", characterIdentityRef: "corpus-index:112", glyphIdentity: null, renderingInstance: null },
        { corpusIndex: 109, occurrenceId: "occ-2", role: "occurrence", characterIdentityRef: "corpus-index:109", glyphIdentity: null, renderingInstance: null },
        { corpusIndex: 106, occurrenceId: "occ-2", role: "occurrence", characterIdentityRef: "corpus-index:106", glyphIdentity: null, renderingInstance: null },
      ],
    },
  ],
};

test("2D/2.5D representation preserves semantic identity and only maps coordinates", () => {
  const out = projectEls2029Representation(layers);
  assert.equal(out.contract, "els_2029_representation_v1");
  assert.equal(out.sourceContract, "els_2029_layers_v1");
  assert.equal(out.status, "READY");
  assert.equal(out.corpusVersion, "mt-text-v1");
  assert.equal(out.axisOccurrenceId, "occ-axis");
  assert.equal(out.extent.minCorpusIndex, 100);
  assert.equal(out.extent.maxCorpusIndex, 114);
  assert.equal(out.bands[0].occurrenceId, "occ-axis");
  assert.equal(out.bands[0].corpusVersion, "mt-text-v1");
  assert.equal(out.bands[0].dependencyGroup, "window:1");
  assert.equal(out.bands[0].start, 100);
  assert.equal(out.bands[0].end, 114);
  assert.equal(out.bands[0].coordinateConvention, "zero_based_character_index");
  assert.deepEqual(out.bands[0].positions, [100, 107, 114]);
  assert.equal(out.bands[0].cells[0].characterIdentityRef, "corpus-index:100");
  assert.equal(out.bands[0].cells[0].xRatio, 0);
  assert.equal(out.bands[0].cells[2].xRatio, 1);
});

test("representation never promotes visual proximity, glyph identity, font outline or render instance into truth", () => {
  const out = projectEls2029Representation(layers);
  assert.equal(out.semantics.visualProximityIsEvidence, false);
  assert.equal(out.semantics.axisIsProjectionRole, true);
  assert.equal(out.semantics.glyphIdentityCanonicalized, false);
  assert.equal(out.semantics.fontOutlineOwned, false);
  assert.equal(out.semantics.renderingInstanceCanonicalized, false);
  for (const band of out.bands) {
    assert.equal(band.evidenceWeight, null);
    assert.equal(band.proximityStrength, null);
    assert.equal(band.truthPromotion, false);
    for (const cell of band.cells) {
      assert.equal(cell.fontOutline, null);
      assert.equal(cell.renderingInstance, null);
    }
  }
});

test("representation fails closed when layered projection is absent", () => {
  const out = projectEls2029Representation(null);
  assert.equal(out.status, "CONTEXT_REQUIRED");
  assert.deepEqual(out.bands, []);
  assert.equal(out.projectionOnly, true);
});

test("DOM renderer exposes semantic acceptance and accessible fallback without Canvas/WebGL/engine code", () => {
  const src = readFileSync(new URL("../src/components/experience2029/Els2029Representation.jsx", import.meta.url), "utf8");
  assert.match(src, /data-experience-capability="els-2d-2_5d-representation"/);
  assert.match(src, /פירוט DOM נגיש \/ סטטי/);
  assert.match(src, /Corpus \/ version/);
  assert.match(src, /Start \/ end/);
  assert.match(src, /Coordinate convention/);
  assert.match(src, /קרבה חזותית אינה חוזק ראיה/);
  assert.doesNotMatch(src, /canvas|webgl|webgpu|TzofenEmbed|tzofen\.html|findAllAdaptive|els_search_core_v1/i);
});


test("/els composes only canonical replay projection/layers before rendering", () => {
  const src = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
  assert.match(src, /verifyEls2029Selection/);
  assert.match(src, /supabase\.functions\.invoke\("els-search-bridge"/);
  assert.match(src, /projectEls2029Result\(replay\.result\)/);
  assert.match(src, /projectEls2029Layers\(replayProjection\)/);
  assert.match(src, /<Els2029Representation layers=\{replayLayers\} \/>/);
  assert.doesNotMatch(src, /layeredProjection|effectiveLayers/);
  assert.doesNotMatch(src, /TzofenEmbed|tzofen\.html|findAllAdaptive|function\s+findAll|els_search_core_v1/);
});

console.log("ELS 2029 visual representation V1 contract: PASS");
