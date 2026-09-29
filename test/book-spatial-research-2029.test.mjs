import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compileBookResearchScene,
  hasBookSpatialProjection,
} from "../src/lib/spatial/bookResearchScene.js";

const book = {
  id: "book-node",
  identity_key: "book:test",
  label: "ספר מבחן",
  metadata: {
    slug: "test",
    projection: { spatial_golden: { scene_key: "test-scene" } },
  },
};

const rows = [
  {
    id: "r1",
    kind: "relation",
    statement: "מסלול א",
    status: "candidate",
    source_ref: "book:test#p10",
    engine_verified: false,
    meta: { ext: {
      bentov_book2: { finding_key: "a" },
      spatial_projection: { enabled: true, layer: "origin", sort_order: 10, label: "א", summary: "מסלול א", lenses: ["overview","deep"], links: ["b"], visual_hint: "spine" },
    } },
  },
  {
    id: "r2",
    kind: "fact",
    statement: "מסלול ב",
    status: "candidate",
    source_ref: "book:test#p11",
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    meta: { ext: {
      bentov_book2: { finding_key: "b" },
      spatial_projection: { enabled: true, layer: "language", sort_order: 20, label: "ב", summary: "מסלול ב", lenses: ["overview","deep"], links: [], visual_hint: "ring22" },
    } },
  },
  {
    id: "r3",
    kind: "hypothesis",
    statement: "ביקורת",
    status: "candidate",
    source_ref: "book:test#p12",
    engine_verified: false,
    meta: { ext: {
      bentov_book2: { finding_key: "c" },
      spatial_projection: { enabled: true, layer: "challenge", sort_order: 30, label: "Challenge", summary: "ביקורת", lenses: ["challenge","deep"], links: ["a"], visual_hint: "control" },
    } },
  },
];

test("Book spatial adapter projects existing research objects without minting truth", () => {
  assert.equal(hasBookSpatialProjection(rows), true);
  const before = JSON.stringify(rows);
  const out = compileBookResearchScene(book, rows, { lens: "overview" });
  assert.equal(out.contract, "book_research_scene_v1");
  assert.equal(out.sourceContract, "research_objects.meta.ext.spatial_projection");
  assert.equal(out.projectionOnly, true);
  assert.equal(out.coordinatesCanonical, false);
  assert.equal(out.visualProximityIsEvidence, false);
  assert.equal(out.accessPolicy, "inherit_research_object");
  assert.equal(out.sceneKey, "test-scene");
  assert.equal(out.sceneNodes.length, 3);
  assert.equal(out.sceneNodes.find((n) => n.ref?.researchObjectId === "r2")?.truthTier, "FACT");
  assert.equal(out.sceneNodes.find((n) => n.ref?.researchObjectId === "r1")?.ref?.sourceRef, "book:test#p10");
  assert.equal(out.sceneRelations.some((r) => r.from === "research:r1" && r.to === "research:r2"), true);
  assert.equal(JSON.stringify(rows), before);
});

test("Lens filtering is bounded and challenge does not leak into overview", () => {
  const overview = compileBookResearchScene(book, rows, { lens: "overview" });
  assert.equal(overview.sceneNodes.some((n) => n.ref?.researchObjectId === "r3"), false);
  const challenge = compileBookResearchScene(book, rows, { lens: "challenge" });
  assert.equal(challenge.sceneNodes.some((n) => n.ref?.researchObjectId === "r3"), true);
  assert.equal(challenge.sceneNodes.some((n) => n.ref?.researchObjectId === "r1"), false);
});

test("Books consumer reuses existing rows and DOM/CSS renderer has accessible fallback", () => {
  const page = readFileSync(new URL("../src/pages/Books2029Page.jsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../src/components/spatial/BookSpatialResearch2029.jsx", import.meta.url), "utf8");
  assert.match(page, /<BookSpatialResearch2029 book=\{book\} rows=\{rows\} \/>/);
  assert.match(component, /data-experience-capability="book-spatial-research-2_5d"/);
  assert.match(component, /פירוט נגיש \/ סטטי/);
  assert.match(component, /לא מרחיבים RLS/);
  assert.doesNotMatch(component, /<canvas|webgl|webgpu|three\.js/i);
});
