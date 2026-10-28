import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildWorldContributorPublicMaterial,
  fetchWorldContributorPublicMaterial,
  filterWorldPeopleAndSources,
} from "../src/lib/research/worldPeopleSourcesProjection.js";
import {
  WORLD_PEOPLE_PAGE_SIZE,
  buildWorldPublicPeopleIndex,
  fetchWorldPublicPeopleIndex,
} from "../src/lib/research/worldPublicPeopleIndex.js";

const source = readFileSync(new URL("../src/lib/research/worldPublicPeopleIndex.js", import.meta.url), "utf8");
const worldPeopleSurface = readFileSync(new URL("../src/components/research/WorldPeopleSources2029.jsx", import.meta.url), "utf8");
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
  assert.equal(result.contentProjection.metrics.corpusSources, 6, "the approved Topic stays outside the corpus source count");
  assert.equal(result.contentProjection.metrics.legacyTopics, 1);
  assert.deepEqual(result.contentProjection.seriesCategories.map((item) => [item.key, item.kind, item.sourceRefs.length]), [
    ["writings-and-posts", "category", 2],
    ["public-ciphers", "category", 1],
    ["sources-and-updates", "category", 3],
  ]);
  assert.equal(result.contentProjection.seriesCategories.some((item) => item.sourceRefs.includes("topic_cards:topic")), false,
    "a Topic remains compatibility-only and cannot become a system category member");
  assert.equal(result.contentProjection.findings.length, 0, "a deferred Findings reader must not fabricate a zero-grade Finding");
  assert.equal(result.contentProjection.metrics.findings, null, "deferred is unavailable, not an empty Findings collection");
  assert.equal(result.contentProjection.sources.find((row) => row.sourceRef === "posts:p1").contributor.slug, "writer");
  assert.equal(result.contentProjection.occurrences.find((row) => row.sourceRef === "posts:p1").times.updatedAt, "2026-10-24");
});

test("selected contributor reuses all three public readers without N+1", async () => {
  const calls = [];
  const identity = { id: "writer", slug: "writer", displayName: "כותב", code: "101", active: true };
  const findings = { mode: "public_view", availability: { sources: "ok" }, sourceGroups: [] };
  const result = await fetchWorldContributorPublicMaterial(identity, {
    client: {},
    findingsReader: async (slug, options) => { calls.push(["findings", slug, options.mode]); return findings; },
    sourceCatalogReader: async (slug, options) => { calls.push(["sources", slug]); assert.equal(await options.findingsReader(), findings); return { items: [] }; },
    publicationReader: async (person) => { calls.push(["publications", person.slug]); return {}; },
  });
  assert.deepEqual(calls, [
    ["findings", "writer", "public_view"],
    ["publications", "writer"],
    ["sources", "writer"],
  ]);
  assert.equal(result.total, 0);
});

test("public material emits source-first state and later preserves promoted results", async () => {
  const identity = { id: "writer", slug: "writer", displayName: "כותב", code: "101", active: true };
  const partial = { mode: "public_view", availability: { sources: "ok", research: "loading" }, sourceGroups: [] };
  const final = { mode: "public_view", availability: { sources: "ok", research: "ok" }, sourceGroups: [] };
  let finish;
  const delayed = new Promise((resolve) => { finish = resolve; });
  let notify;
  const early = new Promise((resolve) => { notify = resolve; });
  const resultPromise = fetchWorldContributorPublicMaterial(identity, {
    client: {},
    findingsReader: async (_slug, options) => { options.onSourcesReady(partial); return delayed; },
    sourceCatalogReader: async (_slug, options) => { await options.findingsReader(); return { items: [] }; },
    publicationReader: async () => ({}),
    onSourcesReady: notify,
  });
  const first = await early;
  assert.equal(first.researchLoading, true);
  assert.equal(first.findings.availability.research, "loading");
  finish(final);
  const result = await resultPromise;
  assert.equal(result.findings.availability.research, "ok");
  assert.equal(result.researchLoading, undefined);
});

test("sources become readable before delayed publications and research", async () => {
  const identity = { id: "writer", slug: "writer", displayName: "כותב", code: "101", active: true };
  const partial = { mode: "public_view", availability: { sources: "ok", research: "loading" }, sourceGroups: [] };
  const final = { mode: "public_view", availability: { sources: "ok", research: "ok" }, sourceGroups: [] };
  let finishResearch, finishPublications, notify;
  const research = new Promise((resolve) => { finishResearch = resolve; });
  const publications = new Promise((resolve) => { finishPublications = resolve; });
  const early = new Promise((resolve) => { notify = resolve; });
  const resultPromise = fetchWorldContributorPublicMaterial(identity, {
    client: {}, findingsReader: async (_slug, options) => { options.onSourcesReady(partial); return research; },
    sourceCatalogReader: async (_slug, options) => { await options.findingsReader(); return { items: [] }; },
    publicationReader: async () => publications, onSourcesReady: notify,
  });
  const first = await early;
  assert.equal(first.partial, true);
  assert.equal(first.publicationsLoading, true);
  assert.equal(first.contentProjection.coverage.findings.available, false);
  assert.equal(first.contentProjection.metrics.findings, null);
  finishResearch(final);
  finishPublications({});
  const result = await resultPromise;
  assert.equal(result.findings.availability.research, "ok");
  assert.equal(result.publicationsLoading, undefined);
});

test("an already-public Universal Finding keeps its exact source provenance without creating a tree relation", () => {
  const identity = { id: "writer", slug: "writer", displayName: "כותב" };
  const finding = {
    id: "uf1:research-object:public", stage: null, status: "approved",
    identity: { sourceIdentity: { researchObjectId: "research-1" } },
    evidence: { refs: ["channel_updates:one#message"] },
    verification: { verification_state: "match" },
  };
  const result = buildWorldContributorPublicMaterial({
    identity,
    findings: {
      mode: "public_view", availability: { research: "ok" },
      sourceGroups: [{ sourceRef: "channel_updates:one", universalFindings: [finding] }],
    },
    sourceCatalog: { items: [{ id: "one", sourceRef: "channel_updates:one", title: "מקור", createdAt: "2026-10-20", href: "/world?source=writer&sourceRef=channel_updates%3Aone" }] },
    publications: {},
  });
  assert.deepEqual(result.contentProjection.findings, [{
    findingRef: "uf1:research-object:public", sourceRefs: ["channel_updates:one"],
    href: "/world?finding=research-1", stage: null, verificationState: "match", publicationState: "approved",
  }]);
  assert.equal(result.contentProjection.metrics.findings, 1);
  assert.equal(result.contentProjection.treeRelations.length, 0,
    "a public finding does not imply a tree relation without graph/governance provenance");
  assert.equal(result.contentProjection.metrics.treeRelations, null);
});

test("an explicitly linked image/text pair stays two source identities inside one display cluster", () => {
  const result = buildWorldContributorPublicMaterial({
    identity: { id: "writer", slug: "writer", displayName: "כותב" },
    findings: { mode: "public_view", availability: { research: "deferred" } },
    sourceCatalog: { items: [{
      id: "text", sourceRef: "channel_updates:text", title: "הסבר לתמונה", createdAt: "2026-10-20",
      href: "/world?source=writer&sourceRef=channel_updates%3Atext", media: { url: "https://example.com/image.jpg" },
      sourceRecordCount: 2,
      evidence: { sourceOccurrenceRefs: ["channel_updates:image", "channel_updates:text"] },
      mediaPair: { basis: "explicit_image_reference", imageSourceRef: "channel_updates:image" },
    }] },
    publications: {},
  });
  assert.deepEqual(result.contentProjection.sources.map((source) => source.sourceRef), [
    "channel_updates:image", "channel_updates:text",
  ]);
  assert.equal(result.contentProjection.metrics.corpusSources, 2);
  assert.deepEqual(result.contentProjection.clusters, [{
    clusterRef: "world-material-cluster:source:text",
    basis: "linked_source_sequence:explicit_image_reference",
    occurrenceRefs: [
      "world-material:source:text:channel_updates:image",
      "world-material:source:text:channel_updates:text",
    ],
    representativeOccurrenceRef: "world-material:source:text:channel_updates:text",
  }]);
  assert.equal(result.contentProjection.sources.find((source) => source.sourceRef === "channel_updates:image").media.length, 1);
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

test("World presents canonical source identities, exact occurrences and only verified source links", () => {
  assert.match(worldPeopleSurface, /זהויות מקור נפרדות/);
  assert.match(worldPeopleSurface, /הופעות מדויקות/);
  assert.match(worldPeopleSurface, /sourceByRef\.get\(row\.sourceRef\)\?\.sourceHref \|\| row\.href/);
  assert.match(worldPeopleSurface, /loading="lazy"/);
  assert.doesNotMatch(worldPeopleSurface, /localStorage/);
});

test("a source can offer exact documented tree edges only through its promoted node", () => {
  const finding = {
    id: "uf:1", identity: { entityRef: "node:node-1" }, subject: { label: "ממצא" },
    evidence: { refs: ["channel_updates:one"] },
  };
  const result = buildWorldContributorPublicMaterial({
    identity: { id: "writer", slug: "writer", displayName: "כותב" },
    findings: { mode: "public_view", availability: { research: "ok" }, sourceGroups: [{ sourceRef: "channel_updates:one", universalFindings: [finding] }] },
    sourceCatalog: { items: [{ id: "one", sourceRef: "channel_updates:one", title: "מקור", createdAt: "2026-10-20" }] }, publications: {},
  });
  assert.deepEqual(result.treeFindingTargets, [{ findingRef: "uf:1", nodeId: "node-1", sourceRefs: ["channel_updates:one"], label: "ממצא" }]);
  assert.match(worldPeopleSurface, /fetchCanonicalGraphEntityFindings/);
  assert.match(worldPeopleSurface, /identity\?\.relationRef\?\.startsWith\("edge:"\)/);
  assert.match(worldPeopleSurface, /חלון הקשרים שנבדק/);
});
