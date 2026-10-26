import test from "node:test";
import assert from "node:assert/strict";

import { fetchWorldPublicFindingById } from "../src/lib/research/worldPublicFindingReader.js";

function clientFor(tables) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, select: null, filters: [], limit: null };
      calls.push(call);
      const result = tables[table] ?? { data: null, error: null };
      const builder = {
        select(fields) { call.select = fields; return builder; },
        eq(column, value) { call.filters.push(["eq", column, value]); return builder; },
        in(column, value) { call.filters.push(["in", column, value]); return builder; },
        or(value) { call.filters.push(["or", value]); return builder; },
        limit(value) { call.limit = value; return builder; },
        maybeSingle() { return Promise.resolve(result); },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return builder;
    },
  };
  return { client, calls };
}

function finding(extra = {}) {
  return {
    id: "finding-1",
    created_at: "2026-10-23T10:00:00Z",
    kind: "observation",
    statement: "ממצא ציבורי מדויק",
    source: "wa_channel",
    source_ref: "channel_updates:source-1",
    contributor: "צבי",
    status: "approved",
    privacy_scope: "public",
    meta: { ext: { wa_channel_intake: { tree_matches: [{ type: "topic", key: "documented-topic" }] } } },
    ...extra,
  };
}

test("exact public finding reader uses one row and at most two bounded enrichments", async () => {
  const { client, calls } = clientFor({
    research_objects: { data: finding(), error: null },
    channel_updates: { data: { id: "source-1", channel: "tzvi", status: "live", link_url: "https://example.com/exact" }, error: null },
    topic_cards: { data: [{ id: "topic-1", slug: "documented-topic", title: "יעד מתועד", status: "approved", meter_score: 82 }], error: null },
  });
  const row = await fetchWorldPublicFindingById("finding-1", { publicClient: () => client, cache: false });
  assert.equal(row?.sourceId, "finding-1");
  assert.equal(row?.canonicalFindingHref, "/world?finding=finding-1#finding-finding-1");
  assert.equal(row?.sourceHref, "https://example.com/exact");
  assert.equal(row?.linkedTopicRating?.slug, "documented-topic");
  assert.deepEqual(calls.map((call) => call.table), ["research_objects", "channel_updates", "topic_cards"]);
  assert.deepEqual(calls[0].filters, [
    ["eq", "id", "finding-1"],
    ["eq", "privacy_scope", "public"],
    ["in", "status", ["approved", "canonical"]],
  ]);
  assert.equal(calls[2].limit, 24);
  assert.match(calls[2].filters.find(([kind]) => kind === "or")[1], /slug\.in\.\("documented-topic"\)/);
  assert.match(calls[0].select, /\bevidence\b/);
  assert.doesNotMatch(calls[0].select, /source_contributor_id/);
  assert.equal(calls.some((call) => /range/i.test(JSON.stringify(call))), false);
});
test("reader fails closed for person-only, old-chat and Or Geula material", async () => {
  for (const [row, source] of [
    [finding({ meta: { ext: { personal_scope: { scope: "person_only" } } } }), { id: "source-1", channel: "tzvi", status: "live" }],
    [finding({ source: "openweb_legacy", source_ref: "openweb_message:1" }), null],
    [finding(), { id: "source-1", channel: "or-geula", status: "live" }],
  ]) {
    const { client } = clientFor({
      research_objects: { data: row, error: null },
      channel_updates: { data: source, error: null },
    });
    assert.equal(await fetchWorldPublicFindingById("finding-1", { publicClient: () => client, cache: false }), null);
  }
});

test("reader performs no fuzzy fallback and a rejected cached read can retry", async () => {
  let attempts = 0;
  const publicClient = () => ({
    from(table) {
      assert.equal(table, "research_objects");
      const builder = {
        select() { return builder; }, eq() { return builder; }, in() { return builder; },
        maybeSingle() {
          attempts += 1;
          return attempts === 1
            ? Promise.resolve({ data: null, error: new Error("temporary") })
            : Promise.resolve({ data: null, error: null });
        },
      };
      return builder;
    },
  });
  await assert.rejects(fetchWorldPublicFindingById("missing-exact", { publicClient, cache: true }), /temporary/);
  assert.equal(await fetchWorldPublicFindingById("missing-exact", { publicClient, cache: true }), null);
  assert.equal(attempts, 2);
});
