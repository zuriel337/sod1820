import test from "node:test";
import assert from "node:assert/strict";

import {
  ZVI_SPATIAL_WORLD,
  buildZviSpatialWorldProjection,
  fetchZviSpatialWorldProjection,
} from "./zviSpatialWorldProjection.js";

test("spatial World projection exposes the six canonical Zvi models", () => {
  assert.equal(ZVI_SPATIAL_WORLD.counts.models, 6);
  assert.equal(ZVI_SPATIAL_WORLD.counts.sourceOccurrences, 12);
  assert.equal(ZVI_SPATIAL_WORLD.counts.exactSourceOccurrences, 11);
  assert.equal(ZVI_SPATIAL_WORLD.counts.historicalSourceOccurrences, 1);
  assert.equal(ZVI_SPATIAL_WORLD.coverage.completeCorpus, false);
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

test("spatial showcase emits the shared public DTO without promoting legacy labels to sources", () => {
  const projection = ZVI_SPATIAL_WORLD.contentProjection;
  assert.equal(projection.contractVersion, "public-world-content-projection/v1");
  assert.equal(projection.seriesCategories[0].key, "spatial-structures");
  assert.equal(projection.compatibility.legacyTopics.length, 0);
  assert.equal(projection.findings.length, 0);
  assert.equal(projection.treeRelations.length, 0);
  assert.equal(projection.coverage.sources.available, false,
    "one legacy-only model reference means the curated showcase is not a complete source corpus");
  assert.equal(projection.metrics.corpusSources, null);
  assert.ok(projection.sources.every((source) => source.sourceRef.startsWith("channel_updates:")));
  assert.ok(projection.occurrences.every((occurrence) => occurrence.sourceRef.startsWith("channel_updates:")));
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

test("spatial media enrichment performs one bounded public read and keeps occurrence identity", async () => {
  const calls = [];
  const imageId = "9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5";
  const client = {
    from(table) {
      const call = { table, fields: null, ids: null };
      calls.push(call);
      const builder = {
        select(fields) { call.fields = fields; return builder; },
        in(column, ids) {
          call.column = column;
          call.ids = ids;
          return Promise.resolve({ data: [{ id: imageId, image_url: "https://example.com/source.jpg", thumb_url: null }], error: null });
        },
      };
      return builder;
    },
  };

  const projection = await fetchZviSpatialWorldProjection({ publicClient: () => client });
  const card = projection.cards.find((item) => item.slug === "keter-esrimon-620");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, "channel_updates");
  assert.equal(calls[0].fields, "id,image_url,thumb_url");
  assert.equal(calls[0].column, "id");
  assert.ok(calls[0].ids.includes(imageId));
  assert.equal(new Set(calls[0].ids).size, calls[0].ids.length);
  assert.equal(card.image, "https://example.com/source.jpg");
  assert.equal(card.imageProvenance, "public_source_occurrence");
  assert.equal(projection.access.sourceMedia, "public_reader");
});

test("a denied public media read preserves all spatial cards without inventing absence", async () => {
  const client = {
    from() {
      const builder = {
        select() { return builder; },
        in() { return Promise.resolve({ data: null, error: { message: "denied" } }); },
      };
      return builder;
    },
  };
  const projection = await fetchZviSpatialWorldProjection({ publicClient: () => client });
  assert.equal(projection.cards.length, 6);
  assert.equal(projection.access.sourceMedia, "unavailable");
  assert.equal(projection.cards.find((item) => item.slug === "keter-esrimon-620").image, null);
});
