import test from "node:test";
import assert from "node:assert/strict";
import { isNowBadgeEligible, nowBadgeRows } from "../src/lib/research/orGeulaNowBadgePolicy2029.js";
import { feedRows } from "../src/lib/systemFeed2029.js";

const publicMedia = ext =>
  "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/2029/test." + ext;
const item = (id, channel, mediaHref = null) => ({
  id, kind: "source", sourceKind: "channel_update", label: "הודעה ציבורית",
  channel, at: "2026-11-05T10:00:00Z", mediaHref,
});

test("Or HaGeula plain text and missing media never create new Now numeral", () => {
  const source = item("channel:text", "or-geula", null);
  assert.equal(isNowBadgeEligible(source), false);
  assert.equal(isNowBadgeEligible({ ...source, thumbUrl: publicMedia("jpg") }), false);
  assert.equal(isNowBadgeEligible({ ...source, mediaHref: "" }), false);
  assert.equal(isNowBadgeEligible({ ...source, mediaHref: publicMedia("mp3") }), false);
  assert.equal(isNowBadgeEligible({ ...source, mediaHref: publicMedia("ogg") }), false);
});

test("only public real images/videos from Or HaGeula qualify", () => {
  for (const ext of ["jpg", "jpeg", "png", "webp", "avif", "gif", "mp4", "mov", "webm", "m4v"]) {
    assert.equal(isNowBadgeEligible(item("channel:" + ext, "or-geula", publicMedia(ext))), true, ext);
  }
  for (const media of [
    "https://example.com/clip.mp4",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/sign/submission-inbox/clip.mp4",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/v.mp4?token=abc",
    "storage-object:opaque",
    "data:image/png;base64,iVBORw",
    "http://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/p.jpg",
    "https://user:pw@linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/p.jpg",
  ]) assert.equal(isNowBadgeEligible(item("channel:bad", "or-geula", media)), false, media);
});

test("all other channels and source kinds retain their existing badge behavior", () => {
  for (const channel of [undefined, "gilui-yomi", "site-news", "reality-code", "torat-haremez"]) {
    assert.equal(isNowBadgeEligible(item("post:1", channel, null)), true);
  }
  assert.equal(isNowBadgeEligible({ id: "group:z", sourceKind: "group_message" }), true);
});

test("only the badge is filtered: the original feed rows, texts, see-state and labels are unchanged", () => {
  const texts = [
    item("channel:text", "or-geula"),
    item("channel:pic", "or-geula", publicMedia("jpg")),
    item("channel:vid", "or-geula", publicMedia("mp4")),
    item("channel:other", "site-news"),
  ];
  const rows = feedRows(texts, {
    now: Date.parse("2026-11-05T11:00:00Z"),
    seen: {}, limit: 12, caps: { "channel:or-geula": 12, "channel:site-news": 12 },
  });
  const eligible = nowBadgeRows(rows);
  assert.equal(rows.length, 4, "all four source publications still exist");
  assert.equal(eligible.length, 3, "text-only Or HaGeula excluded from numeral only");
  assert.equal(rows.find(row => row.id === "channel:text").isNew, true, "existing seen semantics intact");
  assert.equal(rows.find(row => row.id === "channel:text").title, "הודעה ציבורית");
  assert.equal(eligible.some(row => row.id === "channel:text"), false);
  assert.equal(eligible.some(row => row.id === "channel:pic"), true);
  assert.equal(eligible.some(row => row.id === "channel:vid"), true);
  assert.equal(eligible.some(row => row.id === "channel:other"), true);
});

test("seen media and old media do not increase badge; do not invent sitewide count", () => {
  const rows = [
    { item: item("channel:pic", "or-geula", publicMedia("jpg")), isNew: false },
    { item: item("channel:older", "or-geula", publicMedia("mp4")), isNew: false },
    { item: item("channel:text", "or-geula"), isNew: true },
    { item: item("channel:new", "or-geula", publicMedia("png")), isNew: true },
  ];
  assert.equal(nowBadgeRows(rows).length, 1);
  assert.deepEqual(nowBadgeRows(null), []);
});
