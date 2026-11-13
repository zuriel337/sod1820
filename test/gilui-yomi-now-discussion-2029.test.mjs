import test from "node:test";
import assert from "node:assert/strict";
import { feedRows, mergeNowDiscussionItems } from "../src/lib/systemFeed2029.js";
import { nowRowModel } from "../src/lib/nowPublications2029.js";

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
