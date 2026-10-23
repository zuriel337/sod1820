import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTOR_SOURCE_CATALOG_STATE,
  CONTRIBUTOR_SOURCE_FORMAT,
  buildContributorSourceCatalogProjection,
  fetchContributorSourceCatalogProjection,
} from "./contributorSourceCatalogProjection.js";
import { CONTRIBUTOR_LOAD_PROFILE } from "./contributorFindingsProjection.js";

const baseProjection = {
  contributor: { id: "zvi", slug: "tzvi-opoc", displayName: "צבי (OPOC)" },
  counts: { sourceRecords: 3 },
  sourceGroups: [
    {
      id: "channel_updates:text",
      sourceRef: "channel_updates:00000000-0000-4000-8000-000000000002",
      title: "כתב מלא",
      createdAt: "2026-10-02T10:00:00Z",
      publicationState: "live",
      source: {
        id: "00000000-0000-4000-8000-000000000002",
        sourceRef: "channel_updates:00000000-0000-4000-8000-000000000002",
        text: "טקסט המקור המלא",
        topics: ["שפה", "אש"],
        status: "live",
      },
    },
    {
      id: "channel_updates:paired-text",
      sourceRef: "channel_updates:00000000-0000-4000-8000-000000000003",
      title: "הסבר לתמונה",
      createdAt: "2026-10-02T10:00:00Z",
      source: {
        id: "00000000-0000-4000-8000-000000000003",
        sourceRef: "channel_updates:00000000-0000-4000-8000-000000000003",
        text: "הסבר לתמונה",
        topics: [],
      },
      mediaSource: {
        id: "00000000-0000-4000-8000-000000000001",
        sourceRef: "channel_updates:00000000-0000-4000-8000-000000000001",
        text: "📷 עדכון",
        imageUrl: "https://example.com/source.jpg",
        topics: [],
      },
      sourceOccurrences: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          sourceRef: "channel_updates:00000000-0000-4000-8000-000000000001",
          text: "📷 עדכון",
          imageUrl: "https://example.com/source.jpg",
          topics: [],
        },
        {
          id: "00000000-0000-4000-8000-000000000003",
          sourceRef: "channel_updates:00000000-0000-4000-8000-000000000003",
          text: "הסבר לתמונה",
          topics: [],
        },
      ],
      sourceRecordCount: 2,
      mediaPair: { basis: "explicit_image_reference" },
    },
  ],
  availability: { sources: "ok", research: "deferred" },
  loadState: { researchObjectsDeferred: true },
};

test("writer catalog exposes 20-recent contract, exact World locators and stable newest ordering", () => {
  const catalog = buildContributorSourceCatalogProjection(baseProjection, { recentLimit: 1 });
  assert.equal(catalog.items.length, 2);
  assert.equal(catalog.recentItems.length, 1);
  assert.equal(catalog.items[0].sourceRef, "channel_updates:00000000-0000-4000-8000-000000000002");
  assert.match(catalog.items[0].href, /^\/world\?view=sources&source=tzvi-opoc&sourceRef=/);
  assert.equal(catalog.items[0].exactLocator, true);
  assert.equal(catalog.researchState, "deferred_until_exact_occurrence");
  assert.equal(catalog.items[0].researchFacets.availability, "deferred");
  assert.equal(catalog.items[0].researchFacets.rowCount, null);
});

test("an exact occurrence carries its structured research facets without a second catalog", () => {
  const exactProjection = {
    ...baseProjection,
    loadState: { researchObjectsDeferred: false },
    sourceGroups: [{
      ...baseProjection.sourceGroups[0],
      rows: [{
        value: 358,
        status: "verified",
        engine_verified: true,
        meta: { ext: { gematria: { method_key: "standard" } } },
      }],
    }],
  };
  const catalog = buildContributorSourceCatalogProjection(exactProjection);

  assert.equal(catalog.items[0].researchFacets.availability, "loaded");
  assert.deepEqual(catalog.items[0].researchFacets.number.values, [358]);
  assert.deepEqual(catalog.items[0].researchFacets.gematria.methodKeys, ["standard"]);
});

test("format, explicit category and catalog state remain separate evidence axes", () => {
  const catalog = buildContributorSourceCatalogProjection(baseProjection);
  const tagged = catalog.items.find((item) => item.title === "כתב מלא");
  const paired = catalog.items.find((item) => item.title === "הסבר לתמונה");

  assert.deepEqual(tagged.sourceTopics, ["שפה", "אש"]);
  assert.equal(tagged.catalogState, CONTRIBUTOR_SOURCE_CATALOG_STATE.EXPLICIT_TOPICS);
  assert.equal(tagged.evidence.categoryBasis, "channel_updates.topics");
  assert.equal(paired.catalogState, CONTRIBUTOR_SOURCE_CATALOG_STATE.UNCATALOGUED);
  assert.ok(paired.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.TEXT));
  assert.ok(paired.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.IMAGE));
  assert.ok(paired.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.PAIRED_MEDIA));
  assert.equal(paired.sourceRecordCount, 2);
  assert.deepEqual(paired.evidence.sourceOccurrenceRefs, [
    "channel_updates:00000000-0000-4000-8000-000000000001",
    "channel_updates:00000000-0000-4000-8000-000000000003",
  ]);
  assert.equal(catalog.counts.sourceRecords, 3);
  assert.equal(catalog.counts.publications, 2);
  assert.equal(catalog.counts.explicitlyTopicTagged, 1);
  assert.equal(catalog.counts.uncatalogued, 1);
});

test("fetch wrapper forces the lightweight source-library reader profile", async () => {
  let received = null;
  const catalog = await fetchContributorSourceCatalogProjection("tzvi-opoc", {
    recentLimit: 1,
    mode: "public",
    findingsReader: async (slug, options) => {
      received = { slug, options };
      return baseProjection;
    },
  });

  assert.equal(received.slug, "tzvi-opoc");
  assert.equal(received.options.mode, "public");
  assert.equal(received.options.loadProfile, CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY);
  assert.equal(catalog.recentItems.length, 1);
});
