import test from "node:test";
import assert from "node:assert/strict";
import { feedRows, mergeNowDiscussionItems } from "../src/lib/systemFeed2029.js";
import { nowRowModel } from "../src/lib/nowPublications2029.js";
import { fetchSystemFeedPublicSources2029 } from "../src/lib/research/systemFeedPublicSources2029.js";

const at = "2026-11-13T06:00:00Z";
const gilui = { key: "gilui-yomi", label: "הגילוי היומי" };
const group = (id, sourceRefs, sourceGroup = gilui) => ({
  id, sourceRefs, sourceGroup, kind: "source", sourceKind: "group_message",
  label: id, at, pinned: true, pinKind: "writer", pinUntil: "2026-11-14T06:00:00Z",
});
const discussion = {
  id: "community:root", kind: "source", sourceKind: "community_thread", channel: "gilui-yomi",
  sourceGroup: gilui, sourceRefs: ["channel_updates:card", "channel_updates:a", "channel_updates:b"],
  sourceRef: "channel_updates:card", label: "ימין ושמאל תפרוצי", summary: "תקציר הדיון",
  at, href: "/community/chat?thread=2c22eafe-5847-4c31-a510-2abfd1fa3291",
};

test("the available discussion replaces covered occurrences and the group's automatic pins", () => {
  const imported = group("a", ["channel_updates:a"]);
  const mixed = group("mixed", ["channel_updates:b", "channel_updates:c"]);
  const different = group("other", ["channel_updates:d"], { key: "torat-haremez" });
  const owner = { id: "owner", kind: "source", sourceKind: "post", label: "מסר מרכזי", at, pinned: true };
  const stream = [imported, mixed, different, owner];

  assert.equal(mergeNowDiscussionItems(stream, [])[0].pinned, true);
  const merged = mergeNowDiscussionItems(stream, [discussion]);
  assert.deepEqual(merged.map(item => item.id), ["community:root", "mixed", "other", "owner"]);
  assert.equal(merged[1].pinned, false);
  assert.equal(merged[2].pinned, true);
  assert.equal(merged[3].pinned, true);
  assert.equal(mixed.pinned, true, "the World source projection remains unchanged");
});

test("the card links directly to Community and uses the existing group filter", () => {
  const model = nowRowModel(feedRows([discussion], { now: Date.parse(at) })[0]);
  assert.equal(model.sourceKey, "group:gilui-yomi");
  assert.equal(model.href, discussion.href);
  assert.equal(model.typeLabel, "לדיון בקהילה");
  assert.equal(model.summary, "תקציר הדיון");
  assert.equal(model.canExpand, false);
  assert.equal(model.unverified, false);
});

const rootId = "2c22eafe-5847-4c31-a510-2abfd1fa3291";
const root = {
  id: rootId, parent_id: null, origin: "community_2029", is_deleted: false,
  author_name: "ציון", title: "ימין ושמאל תפרוצי", body: "פתיחת הדיון", created_at: at,
};
const card = {
  id: "ad270354-41ab-4d4d-8bf5-030e0452406d", channel: "gilui-yomi", status: "live",
  page_only: false, expires_at: null, created_at: at, text: "תקציר הדיון",
  link_url: `/community/chat?thread=${rootId}`,
};
const otherUpdate = { ...card, id: "10000000-0000-4000-8000-000000000001", link_url: null, text: "מקור נוסף" };

// Exercise the real Community reader with the injected public client. All other
// existing Now sources are empty, except an independent update that must survive.
function publicClient({ context = { data: [root], error: null }, fallback = null, onContext } = {}) {
  const calls = [];
  function query(kind, name, args) {
    const ops = [];
    const q = {};
    for (const method of ["select", "eq", "in", "is", "or", "not", "order", "limit", "maybeSingle", "abortSignal"]) {
      q[method] = (...values) => { ops.push([method, ...values]); return q; };
    }
    q.then = (resolve, reject) => Promise.resolve().then(() => {
      calls.push({ kind, name, args, ops });
      if (kind === "rpc") {
        assert.equal(name, "community_message_context");
        assert.deepEqual(args, { p_id: rootId });
        onContext?.();
        return context;
      }
      if (name === "research_contributions") return { data: fallback, error: null };
      const channel = ops.find(op => op[0] === "eq" && op[1] === "channel")?.[2];
      return { data: channel === "gilui-yomi" ? [card, otherUpdate] : [], error: null };
    }).then(resolve, reject);
    return q;
  }
  return { calls, from: name => query("table", name), rpc: (name, args) => query("rpc", name, args) };
}

test("Now resolves one discussion through the public Community reader and retains independent updates", async () => {
  const client = publicClient();
  const result = await fetchSystemFeedPublicSources2029({ client });
  const threads = result.items.filter(item => item.sourceKind === "community_thread");
  assert.equal(threads.length, 1);
  assert.equal(threads[0].id, `community:${rootId}`);
  assert.equal(threads[0].label, root.title);
  assert.equal(threads[0].href, card.link_url);
  assert.equal(threads[0].summary, card.text);
  assert.equal(threads[0].sourceRefs.length, 7);
  assert.ok(result.items.some(item => item.id === `channel:${otherUpdate.id}`));
  assert.equal(client.calls.filter(call => call.kind === "rpc").length, 1);
  assert.equal(client.calls.some(call => call.name === "research_contributions"), false);
});

test("an unavailable, deleted or non-root discussion cannot replace the existing source or its pin", async () => {
  for (const data of [
    [], // The public RPC returns no rows for a hidden/unapproved discussion.
    [{ ...root, is_deleted: true }],
    [{ ...root, parent_id: otherUpdate.id }],
    [{ ...root, origin: "private_intake" }],
    [{ ...root, title: " " }],
    [{ ...root, body: " " }],
  ]) {
    const client = publicClient({ context: { data, error: null } });
    const result = await fetchSystemFeedPublicSources2029({ client });
    assert.equal(result.items.some(item => item.sourceKind === "community_thread"), false);
    assert.ok(result.items.some(item => item.id === `channel:${otherUpdate.id}`));
    assert.equal(client.calls.some(call => call.name === "research_contributions"), false,
      "an empty public context is final; do not fall back to a broader read");
    const existing = group("covered-source", ["channel_updates:60ee7dd1-f2c2-42b0-8a36-89a4fa9190e4"]);
    assert.equal(mergeNowDiscussionItems([existing], result.items).find(item => item.id === existing.id).pinned, true);
  }
});

test("a Community error withholds the discussion and preserves other Now sources", async () => {
  for (const error of [{ code: "42501" }, { message: "offline" }]) {
    const client = publicClient({ context: { data: null, error } });
    const result = await fetchSystemFeedPublicSources2029({ client });
    assert.equal(result.items.some(item => item.sourceKind === "community_thread"), false);
    assert.ok(result.items.some(item => item.id === `channel:${otherUpdate.id}`));
    assert.equal(result.sourceStates.find(state => state.source === "gilui-yomi").status, "failed");
    assert.equal(client.calls.some(call => call.name === "research_contributions"), false);
  }
});

test("an absent RPC uses the existing approved-public-root fallback, including cancellation", async () => {
  for (const fallback of [root, null]) {
    const controller = new AbortController();
    const client = publicClient({ context: { data: null, error: { code: "PGRST202" } }, fallback });
    const result = await fetchSystemFeedPublicSources2029({ client, signal: controller.signal });
    assert.equal(result.items.some(item => item.sourceKind === "community_thread"), fallback !== null);
    const read = client.calls.find(call => call.name === "research_contributions");
    for (const expected of [
      ["eq", "id", rootId], ["eq", "status", "approved"],
      ["in", "origin", ["openweb", "community_2029"]], ["is", "parent_id", null],
      ["maybeSingle"], ["abortSignal", controller.signal],
    ]) assert.ok(read.ops.some(op => JSON.stringify(op) === JSON.stringify(expected)), JSON.stringify(expected));
    assert.equal(read.ops.find(op => op[0] === "abortSignal")[1], controller.signal);
  }
});

test("canceling while the thread is read aborts the shared RPC and discards partial Now results", async () => {
  const controller = new AbortController();
  const client = publicClient({ onContext: () => controller.abort() });
  await assert.rejects(fetchSystemFeedPublicSources2029({ client, signal: controller.signal }), { name: "AbortError" });
  const read = client.calls.find(call => call.kind === "rpc");
  assert.equal(read.ops.find(op => op[0] === "abortSignal")[1], controller.signal);
});
