import test from "node:test";
import assert from "node:assert/strict";
import { fetchWorldPublicFindingsPage, fetchWorldPublicFindingById } from "../src/lib/research/worldPublicFindingReader.js";
import { ZVI_SOURCE_CONTRIBUTOR_ID } from "../src/lib/research/worldZviApprovedFindings2029.js";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sourceId = id(900);
const finding = (n, changes = {}) => ({ id: id(n), created_at: "2026-10-30T12:00:00Z",
  statement: `מחקר ${n}`, kind: "observation", source_ref: `channel_updates:${sourceId}#${n}`,
  source_contributor_id: n % 2 ? ZVI_SOURCE_CONTRIBUTOR_ID : id(500), contributor: "חוקר לדוגמה",
  privacy_scope: "public", status: "approved", value: 1118,
  meta: { ext: { presentation: { statement_role: "research_statement" } } }, ...changes });

function backend(rows, { sources = [{ id: sourceId, status: "live", channel: "public" }],
  media = [], galleries = [], posts = [], faulty = false, errorTable = null } = {}) {
  const calls = [];
  const client = { from(table) {
    const filters = []; let cap = Infinity;
    const call = { table, filters }; calls.push(call);
    const request = {
      select(fields) { call.fields = fields; return this; },
      eq(key, value) { filters.push(["eq", key, value]); return this; },
      in(key, values) { filters.push(["in", key, values]); return this; },
      ilike(key, value) { filters.push(["ilike", key, value]); return this; },
      or(value) { filters.push(["or", value]); return this; },
      order() { return this; }, limit(value) { cap = value; call.limit = value; return this; },
      maybeSingle() { call.single = true; return this; },
      then(resolve, reject) {
        let result = [...({ world_contributor_research_v1: rows, research_objects: rows, channel_updates: sources,
          gallery_images: media, galleries, posts }[table] || [])];
        if (!faulty || table !== "world_contributor_research_v1") for (const [operation, key, value] of filters) {
          if (operation === "eq") result = result.filter((row) => row[key] === value);
          if (operation === "in") result = result.filter((row) => value.includes(row[key]));
          if (operation === "ilike") {
            const literal = value.slice(1, -1).replace(/\\([\\%_*])/g, "$1");
            result = result.filter((row) => String(row[key] || "").toLowerCase().includes(literal.toLowerCase()));
          }
          if (operation === "or" && key.startsWith("created_at.lt.")) {
            const [, at, cursorId] = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."[^"]+",id\.lt\.([0-9a-f-]+)\)$/.exec(key);
            result = result.filter((row) => row.created_at < at || (row.created_at === at && row.id < cursorId));
          }
          if (operation === "or" && key.startsWith("source_ref.eq.")) {
            const ref = key.slice(14).split(",")[0];
            result = result.filter((row) => row.source_ref === ref || row.source_ref?.startsWith(`${ref}#`));
          }
        }
        if (table === "world_contributor_research_v1") result.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        result = result.slice(0, cap);
        return Promise.resolve({ data: call.single ? result[0] || null : result, count: result.length,
          error: table === errorTable ? new Error("offline") : null }).then(resolve, reject);
      },
    };
    return request;
  } };
  return { client, calls };
}

test("a later admitted finding appears through number and exact source on re-read without editing a contributor list", async () => {
  const rows = [], sources = [{ id: sourceId, status: "live", channel: "public" }];
  const { client } = backend(rows, { sources });
  const byNumber = () => fetchWorldPublicFindingsPage({ client, value: 0 });
  const bySource = () => fetchWorldPublicFindingsPage({ client, sourceRef: `channel_updates:${sourceId}` });
  assert.equal((await byNumber()).rows.length, 0);
  assert.equal((await bySource()).rows.length, 0);
  rows.push(finding(24, { value: 0, source_contributor_id: null }));
  const number = (await byNumber()).rows[0], source = (await bySource()).rows[0];
  assert.equal(number.id, rows[0].id);
  assert.equal(number.findingRef, source.findingRef);
  assert.equal(number.sourceOccurrenceRef, source.sourceOccurrenceRef);
  assert.equal(number.claimedNumber, 0);
  assert.equal(number.discoveryPath, 'via-stored-number-not-direct-topic-edge');
  sources[0].status = 'off';
  for (const read of [byNumber, bySource]) {
    const hidden = await read();
    assert.equal(hidden.rows.length, 0);
    assert.equal(hidden.omittedUnavailable, true);
  }
  sources[0].status = 'live';
  rows[0].privacy_scope = 'private';
  assert.equal((await byNumber()).rows.length, 0);
  assert.equal((await bySource()).rows.length, 0);
  rows[0].privacy_scope = 'public_candidate';
  assert.equal((await bySource()).rows.length, 0);
  rows[0].privacy_scope = 'public';
  rows[0].value = null;
  assert.equal((await byNumber()).rows.length, 0, 'missing value never inherits zero');
});

test("all-source number lookup admits different and unassigned contributors without changing identity", async () => {
  const { client, calls } = backend([finding(1), finding(2), finding(3, { source_contributor_id: null })]);
  const page = await fetchWorldPublicFindingsPage({ client, value: 1118 });
  assert.equal(page.rows.length, 3);
  assert.equal(new Set(page.rows.map((row) => row.findingRef)).size, 3);
  assert.ok(page.rows.every((row) => row.claimedNumber === 1118 && row.discoveryPath === "via-stored-number-not-direct-topic-edge"));
  assert.equal(calls[0].filters.some((f) => f[1] === "source_contributor_id"), false);
  assert.equal(page.rows.find((row) => row.id === id(2)).sourceHref, null, "never assign a non-Zvi source to Zvi's home");
  assert.equal(page.coverage.exhaustiveCorpus, false);
  assert.ok(page.rows.every((row) => row.sourceOccurrenceRef.startsWith(row.sourceRef + "#")));
  assert.equal(page.hasMore, false);
});

test("untrusted upstream cannot bypass privacy, review, exact value or contact guards", async () => {
  const rows = [finding(1), finding(2, { privacy_scope: "private" }), finding(3, { status: "candidate" }),
    finding(4, { meta: { personal_scope: "person_only" } }), finding(5, { meta: {} }),
    finding(6, { statement: "צרו קשר hello@example.test" }), finding(7, { value: 9 }), finding(8, { value: null }),
    finding(9, { statement: "צוריאל בבית" }), finding(10, { source: "openweb_legacy" })];
  const page = await fetchWorldPublicFindingsPage({ client: backend(rows, { faulty: true }).client, value: 1118 });
  assert.deepEqual(page.rows.map((row) => row.id), [id(1)]);
  assert.equal(page.omittedForReview, true);
  assert.ok(!("engineVerified" in page.rows[0]));
});

test("an unavailable, excluded or unsupported source never becomes public through an approved finding", async () => {
  for (const options of [{ sources: [] }, { sources: [{ id: sourceId, status: "off" }] },
    { sources: [{ id: sourceId, status: "live", channel: "or-geula" }] }]) {
    const page = await fetchWorldPublicFindingsPage({ client: backend([finding(1)], options).client });
    assert.equal(page.rows.length, 0); assert.equal(page.omittedUnavailable, true);
  }
  const unsupported = await fetchWorldPublicFindingsPage({ client: backend([finding(1, { source_ref: `wa_bot_log:${id(8)}` })]).client });
  assert.equal(unsupported.rows.length, 0); assert.equal(unsupported.omittedUnavailable, true);
});

test("keyset pagination survives empty review pages, has no duplicates and binds filters", async () => {
  const rows = [finding(5, { meta: {} }), finding(4, { meta: {} }), finding(3), finding(2), finding(1)];
  const { client } = backend(rows);
  const first = await fetchWorldPublicFindingsPage({ client, value: 1118, pageSize: 2 });
  assert.equal(first.rows.length, 0); assert.equal(first.hasMore, true); assert.equal(first.omittedForReview, true);
  const second = await fetchWorldPublicFindingsPage({ client, value: 1118, pageSize: 2, cursor: first.nextCursor });
  const third = await fetchWorldPublicFindingsPage({ client, value: 1118, pageSize: 2, cursor: second.nextCursor });
  assert.deepEqual([...second.rows, ...third.rows].map((row) => row.id), [id(3), id(2), id(1)]);
  assert.equal(third.hasMore, false);
  await assert.rejects(fetchWorldPublicFindingsPage({ client, value: 14, cursor: first.nextCursor }), /invalid_public_discovery_page/);
  await assert.rejects(fetchWorldPublicFindingsPage({ client, value: 1118, query: "אחר", cursor: first.nextCursor }), /invalid_public_discovery_page/);
  rows.push(finding(99, { created_at: "2026-10-31T12:00:00Z" }));
  assert.equal((await fetchWorldPublicFindingsPage({ client, value: 1118 })).rows[0].id, id(99), "new eligible intake appears on a fresh read without manual page lists");
});

test("literal text search cannot inject PostgREST selectors or broaden wildcards", async () => {
  const query = '50%_*,or(status.eq.private)';
  const { client, calls } = backend([finding(1, { statement: `יש ${query} כאן` }), finding(2)]);
  const page = await fetchWorldPublicFindingsPage({ client, query });
  assert.deepEqual(page.rows.map((row) => row.id), [id(1)]);
  assert.equal(calls[0].filters.some((f) => f[0] === "or"), false);
  assert.deepEqual(calls[0].filters.find((f) => f[0] === "ilike"), ["ilike", "statement", '%50\\%\\_\\*,or(status.eq.private)%']);
});

test("exact source and explicit contributor filters remain narrow", async () => {
  const { client } = backend([finding(1), finding(2), finding(3, { source_ref: `channel_updates:${id(901)}` })]);
  const page = await fetchWorldPublicFindingsPage({ client, sourceRef: `channel_updates:${sourceId}`, contributorId: ZVI_SOURCE_CONTRIBUTOR_ID });
  assert.deepEqual(page.rows.map((row) => row.id), [id(1)]);
  await assert.rejects(fetchWorldPublicFindingsPage({ client, sourceRef: `channel_updates:${sourceId}#fragment` }), /invalid_public_discovery_page/);
  await assert.rejects(fetchWorldPublicFindingsPage({ client, sourceRef: 'posts:1,privacy_scope.eq.private' }), /invalid_public_discovery_page/);
});

test("zero is explicit, inputs bounded and unavailable readers do not claim an empty corpus", async () => {
  const { client } = backend([finding(1, { value: 0 }), finding(2, { value: null }), finding(3, { value: false })], { faulty: true });
  assert.deepEqual((await fetchWorldPublicFindingsPage({ client, value: 0 })).rows.map((row) => row.id), [id(1)]);
  for (const options of [{ value: -1 }, { value: '14' }, { pageSize: 51 }, { query: 'a'.repeat(161) }, { contributorId: 'x' }]) {
    await assert.rejects(fetchWorldPublicFindingsPage({ client, ...options }), /invalid_public_discovery_page/);
  }
  await assert.rejects(fetchWorldPublicFindingsPage({ client: backend([finding(1)], { errorTable: "channel_updates" }).client }), /offline/);
});

test("public gallery and post findings reuse exact source owners, never another occurrence or draft", async () => {
  const media = [{ id: id(700), gallery_id: id(750), wp_gallery_id: 29, ordering: 1,
    published: 1, min_tier: 0, image_url: "https://example.test/storage/v1/object/public/media/source.jpg", description: "מקור" }];
  const posts = [{ id: 15, slug: "public-post", title: "מקור פוסט", tags: [], source: "ai" },
    { id: 16, slug: "draft-post", title: "טיוטה", tags: ["טיוטה"] }];
  const { client, calls } = backend([finding(1, { source_ref: `gallery_images:${id(700)}#ocr/1` }),
    finding(2, { source_ref: "posts:15#paragraph-1" }), finding(3, { source_ref: "posts:16" })],
  { media, galleries: [{ id: id(750), wp_gallery_id: 29, name: "מקור היסטורי" }], posts });
  const page = await fetchWorldPublicFindingsPage({ client });
  assert.equal(page.rows.length, 2);
  assert.equal(page.rows.find((row) => row.id === id(1)).sourceHref, `/world?view=gallery&gallery=29&image=${id(700)}#gallery-source-${id(700)}`);
  assert.equal(page.rows.find((row) => row.id === id(2)).sourceHref, "/post/public-post");
  assert.equal(page.rows.find((row) => row.id === id(1)).sourceRoutePrecision, "exact_gallery_occurrence");
  assert.equal(page.rows.find((row) => row.id === id(2)).sourceRoutePrecision, "post_only_with_stored_source_locator");
  assert.equal(page.omittedUnavailable, true);
  assert.ok(calls.filter((call) => call.table === "posts").every((call) => !call.fields.split(",").includes("content")));
  assert.ok(await fetchWorldPublicFindingById(id(1), { publicClient: () => client, cache: false }));
  media[0].curator_hidden = true;
  const hidden = await fetchWorldPublicFindingsPage({ client });
  assert.equal(hidden.rows.some((row) => row.id === id(1)), false);
  await assert.rejects(fetchWorldPublicFindingById(id(1), { publicClient: () => client, cache: false }), /public_finding_source_unavailable/);
  posts[0].home_hidden = true;
  await assert.rejects(fetchWorldPublicFindingById(id(2), { publicClient: () => client, cache: false }), /public_finding_source_unavailable/);
});
