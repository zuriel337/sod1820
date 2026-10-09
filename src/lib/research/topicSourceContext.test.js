import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildTopicSourceContext, INDIA_CAPTAIN_SOURCE, topicSourceContextPatch, TOPIC_SOURCE_LIMIT } from "./topicSourceContext.js";
import { buildMediaEnvelope, dedupeMediaEnvelopes, mediaToLightboxImage } from "./galleryMediaEnvelope.js";
import { fetchTopicSourceContext } from "./entityHubProjection.js";
import { buildTopicGoldenProjection } from "./topicGoldenProjection.js";
import { mergeResearchContext, normalizeResearchContext } from "./researchContext.js";

const fixture = JSON.parse(fs.readFileSync(new URL("../../../test/fixtures/topic-source-context-pilot.json", import.meta.url)));
const topicOf = (slug) => fixture.topics.find((topic) => topic.slug === slug);
const project = (slug, changes = {}) => buildTopicSourceContext({ ...fixture, topic: topicOf(slug), occurrences: fixture.images, ...changes });
const sharedImage = "5579cca1-ff12-4a9a-87ee-e32e89ca9af3";
const railImage = "8940efb2-8423-4a27-a10a-d3fdd07cf595";

test("India pilot: all 13 public memberships + independently labelled public post figure; no graph inference", () => {
  const out = project("india-axis");
  assert.deepEqual([out.coverage.storedMemberships, out.coverage.readableMemberships, out.coverage.sourceCount, out.coverage.occurrenceCount], [15, 13, 14, 15]);
  assert.deepEqual(out.items.slice(0, 13).map((item) => item.galleryImageId), topicOf("india-axis").image_ids.filter((id) => fixture.images.some((row) => row.id === id)));
  assert.ok(out.items.slice(0, 13).every((item) => item.contextRelation.relationKind === "stored_topic_association"));
  for (const item of out.items) {
    assert.doesNotMatch(item.projectionReason, /reality_graph/);
    assert.equal(item.relationType, item.contextRelation.relationType, "legacy aliases cannot mislabel the new relation as graph adjacency");
  }
  const captain = out.items.at(-1);
  assert.equal(captain.contextRelation.relationKind, "documented_source_mention");
  assert.equal(captain.contextRelation.quote, INDIA_CAPTAIN_SOURCE.requiredCaption);
  assert.equal(captain.postPlacement.originalCaption, INDIA_CAPTAIN_SOURCE.requiredCaption);
  assert.equal(captain.nodeId, null);
  assert.equal(captain.galleryImageId, null, "never fabricate a gallery row for a post-native source");
  assert.equal(captain.reopen.postHref, `/post/${INDIA_CAPTAIN_SOURCE.postSlug}#source-region-smit-machchhar`);
  assert.equal(mediaToLightboxImage(captain).image_url, INDIA_CAPTAIN_SOURCE.imageUrl);
  assert.equal(mediaToLightboxImage(captain).description, INDIA_CAPTAIN_SOURCE.requiredCaption);
  assert.doesNotMatch(JSON.stringify(out), /research_objects|public_candidate/);
});

test("Hodu: two historical occurrences, one storage object, both original texts and memberships retained", () => {
  const before = JSON.stringify(fixture);
  const out = project("hodu");
  assert.equal(out.items.length, 1);
  const item = out.items[0];
  assert.equal(item.sourceIdentity.basis, "exact_public_storage_object");
  assert.equal(item.contextRelations.length, 2);
  assert.deepEqual(item.occurrences.map((o) => [o.legacyPlacement.wpGalleryId, o.legacyPlacement.ordering]), [[28, 0], [54, 6]]);
  for (const occurrence of item.occurrences) {
    const row = fixture.images.find((r) => r.id === occurrence.legacyPlacement.galleryImageId);
    assert.equal(occurrence.legacyPlacement.originalCaption, row.description);
    assert.equal(occurrence.legacyPlacement.originalName, row.name);
    assert.equal(occurrence.legacyPlacement.galleryName, fixture.galleries.find((g) => g.id === row.gallery_id).name);
  }
  assert.notEqual(item.occurrences[0].legacyPlacement.originalCaption, item.occurrences[1].legacyPlacement.originalCaption, "escaped historical copies remain verbatim");
  assert.equal(JSON.stringify(fixture), before, "projection never mutates source snapshots");
});

test("same image in India and 1237 retains identical intrinsic/source identity, different documented contexts", () => {
  const india = project("india-axis").items.find((item) => item.galleryImageId === sharedImage);
  const coverage = project("1237");
  const numeric = coverage.items.find((item) => item.galleryImageId === sharedImage);
  assert.equal(coverage.items.length, 6);
  assert.equal(coverage.coverage.occurrenceCount, 8);
  assert.deepEqual(coverage.items[0].occurrences.map((o) => [o.legacyPlacement.wpGalleryId, o.legacyPlacement.ordering]), [[29, 47], [57, 3]]);
  assert.deepEqual(coverage.items[2].occurrences.map((o) => [o.legacyPlacement.wpGalleryId, o.legacyPlacement.ordering]), [[54, 18], [29, 53]]);
  assert.deepEqual(india.intrinsic, numeric.intrinsic);
  assert.deepEqual(india.sourceIdentity, numeric.sourceIdentity);
  assert.notEqual(india.contextRelation.sourceRef, numeric.contextRelation.sourceRef);
  assert.match(india.contextRelation.explanation, /הציר ההודי/);
  assert.match(numeric.contextRelation.explanation, /1237/);
  assert.equal(numeric.contextRelation.state, "stored_association_not_event_identity");
  assert.deepEqual(coverage.items.map((item) => item.galleryImageId), topicOf("1237").image_ids, "keep stored order even when event/ingestion dates differ");
});

test("extra occurrences preserve lineage without acquiring a Topic relation", () => {
  const item = project("india-axis").items.find((row) => row.galleryImageId === railImage);
  assert.equal(item.occurrences.length, 2);
  assert.equal(item.contextRelations.length, 1, "gallery 54 is not silently tagged with India");
  assert.equal(item.contextRelation.galleryImageId, railImage);
});

test("privacy: public-view admission and all image gates also hold against over-permissive rows", () => {
  for (const change of [{ published: 2 }, { published: 0 }, { min_tier: 1 }, { min_tier: null }, { curator_hidden: true }]) {
    const images = fixture.images.map((row) => ({ ...row, ...change }));
    const out = project("hodu", { images, occurrences: images });
    assert.deepEqual(out.items, []);
    assert.equal(out.coverage.occurrenceCount, 0);
  }
  const hiddenCopy = { ...fixture.images.find((r) => r.id === railImage), id: "hidden-alias", curator_hidden: true, description: "PRIVATE_PAYLOAD" };
  assert.doesNotMatch(JSON.stringify(project("hodu", { occurrences: [...fixture.images, hiddenCopy] })), /PRIVATE_PAYLOAD|hidden-alias/);
  assert.equal(project("hodu", { topic: { ...topicOf("hodu"), status: "draft" } }), null);
});

test("captain admission fails closed for changed sources, wrong slug/id, drafts, forum, absent post", () => {
  for (const post of [null, { ...fixture.post, id: 5115 }, { ...fixture.post, slug: "different-post" },
    { ...fixture.post, content: fixture.post.content.replace("אזרח הודי", "אזרח") },
    { ...fixture.post, content: fixture.post.content.replace(INDIA_CAPTAIN_SOURCE.imageUrl, "https://example.invalid/other.jpg") },
    { ...fixture.post, tags: ["טיוטה"] }, { ...fixture.post, tags: ["פורום"] },
    { ...fixture.post, content: `<p>${INDIA_CAPTAIN_SOURCE.requiredCaption}</p><figure><img src="${INDIA_CAPTAIN_SOURCE.imageUrl}"><figcaption>Other</figcaption></figure>` },
  ]) {
    const out = project("india-axis", { post });
    assert.equal(out.items.length, 13);
    assert.equal(out.coverage.captain, "source_unavailable_or_changed");
  }
  assert.equal(project("1237").coverage.captain, "not_requested");
});

test("object equivalence never follows a shared filename, OCR, numbers, a signed URL or transformed image", () => {
  const row = fixture.images.find((r) => r.id === railImage);
  const first = buildMediaEnvelope({ row });
  const otherId = "11111111-1111-4111-8111-111111111111";
  const buildOther = (url) => buildMediaEnvelope({ row: { ...row, id: otherId, image_url: url } });
  for (const url of [row.image_url.replace("/2019/", "/2020/"), row.image_url.replace(".supabase.co", ".example.org"), `${row.image_url}?width=100`, `${row.image_url}?token=signed`]) {
    assert.equal(dedupeMediaEnvelopes([first, buildOther(url)], { bySourceObject: true }).length, 2);
  }
  assert.equal(dedupeMediaEnvelopes([first, buildOther(row.image_url)], { bySourceObject: true }).length, 1);
  assert.equal(dedupeMediaEnvelopes([first, buildOther(row.image_url)]).length, 2, "other surfaces retain existing row-level behavior");
});

test("historical dates retain their basis; Lightbox does not relabel derived/upload dates as events", () => {
  const item = project("1237").items.find((row) => row.galleryImageId === sharedImage);
  assert.equal(item.legacyPlacement.dateProvenance.occurredAt.derivedFrom, "path");
  assert.equal(item.legacyPlacement.dateProvenance.occurredAt.certainty, "stored_date_not_verified_event_date");
  assert.ok(item.legacyPlacement.createdAt);
  const image = mediaToLightboxImage(item);
  assert.equal(image.occurred_at, null);
  assert.equal(image.created_at, null);
});

test("exact source reopen survives the existing context normalization; archive precision is explicit", () => {
  const item = project("hodu").items[0];
  const patch = topicSourceContextPatch(item, topicOf("hodu"));
  const context = normalizeResearchContext({ ...patch, returnTo: { href: item.reopen.topicHref, selection: patch.selection, dimensions: patch.dimensions } });
  assert.equal(context.selection.sourceRef, `gallery_images:${railImage}`);
  assert.equal(context.selection.locator, `#topic-source-${railImage}`);
  assert.equal(context.returnTo.href, `/topic/hodu#topic-source-${railImage}`);
  assert.equal(context.dimensions.surfaceFocus.reference, item.sourceIdentity.ref);
  assert.equal(context.journey, null, "selection alone creates no Journey");
  assert.deepEqual(item.reopen.galleries.map((g) => g.href), ["/archive?tab=galleries&gal=28", "/archive?tab=galleries&gal=54"]);
  assert.ok(item.reopen.galleries.every((g) => g.routePrecision === "gallery_only" && g.selection.galleryImageId));
  const orientation = topicSourceContextPatch(item, { slug: "hodu", title: "הודו", heroNumber: 21 });
  assert.equal(orientation.selection.entityType, "image");
  assert.equal(orientation.dimensions.surfaceFocus.type, "topic");
  assert.equal(orientation.dimensions.surfaceFocus.number, 21, "rail keeps the existing Topic anchor, never invents a media number");
  const transitioned = mergeResearchContext({ dimensions: { readingFocus: { postSlug: "old-post", number: 1073 }, surfaceFindings: [{ id: "old", label: "previous post" }] } }, orientation);
  assert.equal(transitioned.dimensions.readingFocus, undefined);
  assert.deepEqual(transitioned.dimensions.surfaceFindings, []);
});

test("Topic Golden keeps every requested source and complete envelope; empty/error cannot fall back to graph", () => {
  const sourceContext = project("india-axis");
  const projection = { createdBy: null, authoredFactsCount: 1 };
  const golden = buildTopicGoldenProjection(projection, { hub: { sourceContext } });
  assert.equal(golden.media.length, 14, "no old 8/4-card truncation");
  assert.deepEqual(golden.media[0].occurrences, sourceContext.items[0].occurrences);
  assert.deepEqual(golden.media[0].legacyPlacement, sourceContext.items[0].legacyPlacement);
  assert.deepEqual(golden.media[0].reopen, sourceContext.items[0].reopen);
  const failed = buildTopicGoldenProjection(projection, { hub: { sourceContext: { items: [], access: { available: false } }, media: { items: golden.media } } });
  assert.deepEqual(failed.media, []);
});

// The mock records actual reader requests and deliberately ignores publication predicates:
// verifies both server predicates AND the defensive projection against permissive responses.
function readClient({ slug = "india-axis", topic = topicOf(slug), images = fixture.images, post = fixture.post, failTable = null } = {}) {
  const calls = [];
  const client = { from(table) {
    const call = { table, ops: [] }; calls.push(call);
    const query = {};
    for (const method of ["select", "eq", "in", "or", "order", "limit", "maybeSingle"]) query[method] = (...args) => { call.ops.push([method, ...args]); return query; };
    query.then = (resolve, reject) => {
      if (table === failTable) return Promise.resolve({ data: null, error: { message: "unavailable" } }).then(resolve, reject);
      let data = table === "topic_cards_public" ? topic : table === "posts" ? post : table === "galleries" ? fixture.galleries : images;
      for (const [op, key, values] of call.ops) if (op === "in" && Array.isArray(data)) data = data.filter((row) => values.includes(row[key]));
      return Promise.resolve({ data, count: Array.isArray(data) ? data.length : null }).then(resolve, reject);
    };
    return query;
  } };
  return { client, calls };
}

test("actual Entity Hub reader: public Topic view, bounded exact IDs/objects, explicit public gates, no ROs", async () => {
  const { client, calls } = readClient();
  const out = await fetchTopicSourceContext({ topicSlug: "india-axis", client });
  assert.equal(out.items.length, 14);
  assert.deepEqual([...new Set(calls.map((c) => c.table))], ["topic_cards_public", "gallery_images", "posts", "galleries"]);
  for (const call of calls.filter((c) => c.table === "gallery_images")) {
    assert.ok(call.ops.some((op) => JSON.stringify(op) === JSON.stringify(["eq", "published", 1])));
    assert.ok(call.ops.some((op) => JSON.stringify(op) === JSON.stringify(["eq", "min_tier", 0])));
    assert.ok(call.ops.some((op) => op[0] === "or" && op[1] === "curator_hidden.is.null,curator_hidden.eq.false"));
    assert.ok(call.ops.some((op) => op[0] === "limit"));
  }
  const reads = calls.filter((c) => c.table === "gallery_images");
  assert.deepEqual(reads[0].ops.find((op) => op[0] === "in")[2], topicOf("india-axis").image_ids);
  assert.equal(reads[1].ops.find((op) => op[0] === "in")[1], "image_url");
  assert.ok(calls.find((c) => c.table === "posts").ops.some((op) => op[0] === "eq" && op[1] === "id" && op[2] === 5112));
});

test("reader failures are explicit; absent/nonpublic Topic never reads sources; a failed captain read keeps galleries", async () => {
  for (const topic of [null, { ...topicOf("india-axis"), status: "draft" }]) {
    const { client, calls } = readClient({ topic });
    assert.equal(await fetchTopicSourceContext({ topicSlug: "india-axis", client }), null);
    assert.equal(calls.length, 1);
  }
  const failed = readClient({ failTable: "gallery_images" });
  await assert.rejects(fetchTopicSourceContext({ topicSlug: "india-axis", client: failed.client }));
  const postFailed = readClient({ failTable: "posts" });
  const out = await fetchTopicSourceContext({ topicSlug: "india-axis", client: postFailed.client });
  assert.equal(out.coverage.captain, "source_read_failed");
  assert.equal(out.items.length, 13);
});

test("large memberships stay bounded and report incomplete coverage; no Post query for 1237", async () => {
  const topic = { ...topicOf("1237"), image_ids: [...topicOf("1237").image_ids, ...Array.from({ length: 100 }, (_, i) => `extra-${i}`)] };
  const { client, calls } = readClient({ topic });
  const out = await fetchTopicSourceContext({ topicSlug: "1237", client });
  assert.equal(out.coverage.membershipsTruncated, true);
  assert.equal(calls.find((c) => c.table === "gallery_images").ops.find((op) => op[0] === "in")[2].length, TOPIC_SOURCE_LIMIT);
  assert.ok(!calls.some((c) => c.table === "posts"));
});
