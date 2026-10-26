import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  WORLD_SOURCE_ITEMS_PAGE_SIZE,
  buildWorldContributorPublicMaterial,
  fetchWorldContributorPublicMaterial,
  filterWorldPeopleAndSources,
  worldCatalogFilterForSourceRef,
} from "../src/lib/research/worldPeopleSourcesProjection.js";
import {
  WORLD_PEOPLE_PAGE_SIZE,
  buildWorldPublicPeopleIndex,
  fetchWorldPublicPeopleIndex,
} from "../src/lib/research/worldPublicPeopleIndex.js";

const source = readFileSync(new URL("../src/lib/research/worldPublicPeopleIndex.js", import.meta.url), "utf8");
const publicPerson = (index, extra = {}) => ({
  id: `id-${index}`,
  slug: `writer-${index}`,
  code: String(100 + index),
  display_name: `כותב ${index}`,
  role: "writer",
  active: true,
  locked: false,
  building: false,
  public_visibility: "public",
  trusted: false,
  created_at: `2026-08-${String((index % 27) + 1).padStart(2, "0")}T00:00:00Z`,
  updated_at: `2026-09-${String((index % 27) + 1).padStart(2, "0")}T00:00:00Z`,
  ...extra,
});
test("public people index follows the writer-page contract and includes non-trusted people", () => {
  const rows = Array.from({ length: 27 }, (_, index) => publicPerson(index));
  rows.push(publicPerson(30, { slug: "private", public_visibility: "private" }));
  rows.push(publicPerson(31, { slug: "locked", locked: true }));
  rows.push(publicPerson(32, { slug: "building", building: true }));
  const index = buildWorldPublicPeopleIndex(rows);
  assert.equal(index.total, 27);
  assert.equal(index.people.some((person) => person.slug === "writer-4" && person.trusted === false), true);
  assert.equal(index.people.some((person) => ["private", "locked", "building"].includes(person.slug)), false);
  assert.equal(index.people[0].href.startsWith("/community/researcher/"), true);
  assert.equal(index.people[0].slug, "writer-26");
  assert.equal(index.people[0].updatedAt, "2026-09-27T00:00:00Z");
  assert.equal(WORLD_PEOPLE_PAGE_SIZE, 20);
  assert.doesNotMatch(JSON.stringify(index), /user_id|email|phone|wa_names/i);
});

test("anonymous index reader is paged, safe-field only and never uses People Directory", async () => {
  const calls = [];
  const rows = Array.from({ length: 101 }, (_, index) => publicPerson(index));
  const client = { from(table) {
    assert.equal(table, "contributors");
    const call = { select: "", ranges: [], filters: [] };
    calls.push(call);
    const builder = {
      select(fields) { call.select = fields; return builder; },
      eq(column, value) { call.filters.push(["eq", column, value]); return builder; },
      or(value) { call.filters.push(["or", value]); return builder; },
      order() { return builder; },
      range(from, to) { call.ranges.push([from, to]); return Promise.resolve({ data: rows.slice(from, to + 1), error: null }); },
    };
    return builder;
  } };
  const index = await fetchWorldPublicPeopleIndex({ client });
  assert.equal(index.total, 101);
  assert.deepEqual(calls.flatMap((call) => call.ranges), [[0, 99], [100, 199]]);
  assert.ok(calls.every((call) => call.select.includes("created_at,updated_at")));
  assert.ok(calls.every((call) => !/user_id|email|phone|wa_names|people_public_rows_v1|person_public_profile_v1/i.test(call.select)));
  assert.doesNotMatch(source, /people_public_rows_v1|person_public_profile_v1|People Directory/i);
});

test("material keeps findings attached to source_ref, deduplicates source-native records and orders updated writings first", () => {
  const identity = { id: "writer", slug: "writer", displayName: "כותב" };
  const findings = { mode: "public_view", availability: { sources: "ok", research: "deferred" }, rows: [{ id: "finding-not-a-source" }] };
  const sourceCatalog = { items: [{ id: "one", sourceRef: "channel_updates:one", title: "מקור", text: "טקסט", createdAt: "2026-10-20", href: "/world?source=writer&sourceRef=one", researchFacets: { count: 1 } }] };
  const publications = {
    posts: { rows: [
      { id: "p1", slug: "post-one", title: "כותרת", date: "2026-10-21", modified: "2026-10-24" },
      { id: "p2", slug: "post-two", title: "כותרת ישנה", date: "2026-10-23" },
    ], complete: true, availability: "ok" },
    ciphers: { rows: [{ id: "e1", slug: "cipher", title: "צופן", status: "published", visibility: "public" }], complete: true, availability: "ok" },
    contributions: { rows: [{ id: "c1", title: "תרומה", status: "approved", projected_insight_id: "i1" }], complete: true, availability: "ok" },
    insights: { rows: [{ id: "i1", title: "כפילות הקרנה", is_active: true }], complete: true, availability: "ok" },
    events: { rows: [{ id: "ev1", label: "אירוע" }], complete: true, availability: "ok" },
    topics: { rows: [{ slug: "topic", title: "נושא", status: "approved" }], complete: true, availability: "ok" },
  };
  const result = buildWorldContributorPublicMaterial({ identity, findings, sourceCatalog, publications });
  assert.deepEqual(new Set(result.items.map((row) => row.type)), new Set(["sources", "writings", "ciphers", "topics"]));
  assert.equal(result.items.some((row) => row.id === "finding-not-a-source"), false);
  assert.equal(result.items.some((row) => row.sourceRef === "insights:i1"), false, "projected insight is not another source");
  assert.deepEqual(result.items.filter((row) => row.type === "writings").map((row) => row.sourceRef), ["posts:p1", "posts:p2"]);
  assert.equal(result.items.find((row) => row.sourceRef === "posts:p1")?.dateKind, "updated");
  assert.equal(result.items.find((row) => row.sourceRef === "channel_updates:one")?.number, null, "missing number stays missing");
  assert.equal(result.partial, false, "intentional source-library research deferral is not a failed reader");
  assert.equal(new Set(result.items.map((row) => row.sourceRef)).size, result.items.length);
});

test("selected contributor reuses all three public readers without N+1", async () => {
  const calls = [];
  const identity = { id: "writer", slug: "writer", displayName: "כותב", code: "101", active: true };
  const findings = { mode: "public_view", availability: { sources: "ok" }, sourceGroups: [] };
  const result = await fetchWorldContributorPublicMaterial(identity, {
    client: {},
    findingsReader: async (slug, options) => { calls.push(["findings", slug, options.mode, options.sourceLimit]); return findings; },
    sourceCatalogReader: async (slug, options) => { calls.push(["sources", slug]); assert.equal(await options.findingsReader(), findings); return { items: [] }; },
    publicationReader: async (person) => { calls.push(["publications", person.slug]); return {}; },
  });
  assert.deepEqual(calls, [
    ["findings", "writer", "public_view", WORLD_SOURCE_ITEMS_PAGE_SIZE + 1],
    ["publications", "writer"],
    ["sources", "writer"],
  ]);
  assert.equal(result.total, 0);
});

test("selected contributor loads only the catalog family chosen by the visitor", async () => {
  const identity = { id: "writer", slug: "writer", displayName: "כותב", code: "101", active: true };
  const sourceCalls = [];
  const publicationCalls = [];
  const readers = {
    client: {},
    findingsReader: async (_slug, options) => {
      sourceCalls.push(["findings", options.sourceLimit, options.sourceRef]);
      return { mode: "public_view", availability: { sources: "ok" }, sourceGroups: [] };
    },
    sourceCatalogReader: async (_slug, options) => {
      sourceCalls.push(["catalog"]);
      return { items: [], loadState: {}, projection: await options.findingsReader() };
    },
    publicationReader: async (_person, options) => {
      publicationCalls.push(options.families);
      return Object.fromEntries(options.families.map((family) => [family, {
        rows: [], complete: true, availability: "ok",
      }]));
    },
  };

  await fetchWorldContributorPublicMaterial(identity, {
    ...readers,
    filter: "sources",
    sourceLimit: 21,
    sourceRef: "channel_updates:exact-source",
  });
  assert.deepEqual(sourceCalls, [["findings", 21, "channel_updates:exact-source"], ["catalog"]]);
  assert.deepEqual(publicationCalls, [], "source view must not preload posts, ciphers or topics");

  sourceCalls.length = 0;
  await fetchWorldContributorPublicMaterial(identity, { ...readers, filter: "writings" });
  assert.deepEqual(sourceCalls, [], "writings view must not preload the source-message library");
  assert.deepEqual(publicationCalls, [["posts", "insights"]]);
});

test("exact writer links select their canonical catalog family without fuzzy guessing", () => {
  assert.equal(worldCatalogFilterForSourceRef("channel_updates:one"), "sources");
  assert.equal(worldCatalogFilterForSourceRef("posts:one"), "writings");
  assert.equal(worldCatalogFilterForSourceRef("insights:one"), "writings");
  assert.equal(worldCatalogFilterForSourceRef("els_records:one"), "ciphers");
  assert.equal(worldCatalogFilterForSourceRef("topic_cards:one"), "topics");
  assert.equal(worldCatalogFilterForSourceRef("unknown:one"), "sources");
});

test("search and filters cover people, titles and numbers with stable pagination inputs", () => {
  const data = {
    people: [{ displayName: "צבי", slug: "tzvi-opoc", code: "227" }, { displayName: "יניב", slug: "yaniv", code: "18" }],
    items: [{ id: "a", type: "writings", title: "מה קורה הבורא", label: "פוסט", number: 1820 }, { id: "b", type: "topics", title: "תעודה", label: "נושא" }],
  };
  assert.deepEqual(filterWorldPeopleAndSources(data, { query: "227", filter: "people" }).people.map((row) => row.slug), ["tzvi-opoc"]);
  assert.deepEqual(filterWorldPeopleAndSources(data, { query: "1820", filter: "writings" }).items.map((row) => row.id), ["a"]);
  assert.deepEqual(filterWorldPeopleAndSources(data, { query: "תעודה", filter: "topics" }).items.map((row) => row.id), ["b"]);
});
