import test from "node:test";
import assert from "node:assert/strict";

import { ZVI_SPATIAL_WORLD, buildZviSpatialWorldProjection } from "./zviSpatialWorldProjection.js";

test("spatial World projection exposes the six canonical Zvi models", () => {
  assert.equal(ZVI_SPATIAL_WORLD.counts.models, 6);
  assert.equal(new Set(ZVI_SPATIAL_WORLD.cards.map((card) => card.slug)).size, 6);
  assert.ok(ZVI_SPATIAL_WORLD.cards.every((card) => card.source.contributor === "צבי"));
});

test("spatial projection keeps truth axes separate and never invents a zero score", () => {
  for (const card of ZVI_SPATIAL_WORLD.cards) {
    assert.equal(card.review.connectionStrength, null);
    assert.notEqual(card.review.evidenceQuality, card.review.publicationState);
    assert.equal(card.source.independentSourceCount, null);
  }
  assert.equal(ZVI_SPATIAL_WORLD.rules.missingStrengthLabel, "טרם דורג");
  assert.equal(ZVI_SPATIAL_WORLD.rules.independentSourcesAreNotInferredFromOccurrences, true);
});

test("3060 remains one model with five independent paths and all source occurrences", () => {
  const card = ZVI_SPATIAL_WORLD.cards.find((item) => item.slug === "yesharim-cube-3060");
  assert.equal(card.pathCount, 5);
  assert.equal(card.operations.length, 5);
  assert.equal(card.source.occurrenceCount, 4);
});

test("source occurrences are deduplicated without claiming source independence", () => {
  const result = buildZviSpatialWorldProjection([{
    slug: "sample",
    title: "sample",
    value: 1,
    form: "shape",
    spatial: {
      operations: [{ expression: "1 × 1", result: 1 }],
      provenance: { contributor: "צבי", refs: ["source:a", "source:a", "source:b"] },
    },
  }]);
  assert.deepEqual(result.cards[0].source.refs, ["source:a", "source:b"]);
  assert.equal(result.cards[0].source.occurrenceCount, 2);
  assert.equal(result.cards[0].source.independentSourceCount, null);
});

test("channel source locators open the exact public occurrence without changing access", () => {
  const card = ZVI_SPATIAL_WORLD.cards.find((item) => item.slug === "raza-deshabbat-910");
  assert.equal(card.source.locators[0].exact, true);
  assert.match(card.source.locators[0].href, /sourceRef=channel_updates%3A/);
  assert.match(card.source.locators[0].href, /#source-occurrence-a6805e30-21e0-4315-8f35-70b1bfdb0d14$/);
  const legacy = ZVI_SPATIAL_WORLD.cards.find((item) => item.slug === "hashgacha-pratit-1020");
  assert.equal(legacy.source.locators[0].exact, false);
});
