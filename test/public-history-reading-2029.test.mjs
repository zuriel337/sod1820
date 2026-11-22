import test from "node:test";
import assert from "node:assert/strict";
import { readPublicHistory2029 } from "../src/lib/publicHistoryReading2029.js";
import { firstWordsHtml2029 } from "../public-reading-deploy/first-words.js";

const id = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const event = { id, origin: "auto_from_post", occurred: "2024-01-05", docs: [{ article: { wp: "431" } }] };
const article = { wp_id: "431", id: 43, slug: "historic-test", title: "אירוע ציבורי", source: "sod1820", date: "2019-03-11" };
const topic = { title: "נושא לקריאה", slug: "topic-name", status: "approved", occurred_at: "2002-03-01" };
const update = { id, channel: "gilui-yomi", status: "live", page_only: false, text: "חידוש ליום זה", created_at: "2024-05-21" };
const sources = tables => async path => tables[path.split("?")[0]] || [];

test("timeline reads the documenting public post and distinguishes its date from the event", async () => {
  const result = await readPublicHistory2029(sources({ nodes: [event], posts: [article], topic_cards_public: [topic] }), "/timeline");
  assert.equal(result.sections[0].items[0].detail, "פורסם 11.03.2019");
  assert.equal(result.sections[1].items[0].detail, "תאריך האירוע 01.03.2002");
  const doc = firstWordsHtml2029({ kind: "timeline", ...result });
  assert.match(doc, /href="\/historic-test"/);
  assert.match(doc, /href="\/topic\/topic-name"/);
  const cancelled = await readPublicHistory2029(sources({ nodes: [event], posts: [{ ...article, tags: ["טיוטה"] }] }),
    "/timeline", "", "#ev-" + id);
  assert.equal(cancelled.sections.length, 0);
  assert.ok(cancelled.notice);
  const exact = await readPublicHistory2029(sources({ nodes: [event], posts: [article] }), "/timeline", "", "#ev-" + id);
  assert.equal(exact.focusedId, "ev-" + id);
});

test("broadcast deep links retain the original channel and ID, with publication, expiry and page scope checked", async () => {
  const route = row => readPublicHistory2029(sources({ channel_updates: [row] }), "/broadcasts", "?c=gilui-yomi&u=" + id);
  const exact = await route(update);
  assert.equal(exact.focusedId, id);
  assert.match(exact.sections[0].items[0].detail, /חידוש ליום זה/);
  for (const row of [{ ...update, status: "off" }, { ...update, page_only: true },
    { ...update, expires_at: "2011-01-01" }, { ...update, channel: "another-channel" }]) {
    const result = await route(row);
    assert.deepEqual(result.sections, []);
    assert.ok(result.notice);
  }
  const bad = await readPublicHistory2029(() => { throw new Error("unexpected data read"); }, "/broadcasts", "?u=invalid");
  assert.ok(bad.notice);
});

test("channel listing pages preserve reading position and use the original Or Geula item URL", async () => {
  let params;
  const rows = Array.from({ length: 19 }, (_, i) => ({ ...update, channel: "or-geula", id: id.slice(0, -6) + String(i).padStart(6, "0") }));
  const result = await readPublicHistory2029(async path => { params = new URLSearchParams(path.split("?")[1]); return rows; }, "/broadcasts", "?c=or-geula&page=2");
  assert.equal(params.get("offset"), "18");
  assert.equal(result.sections[0].items[0].href, "/or-geula/video/" + rows[0].id);
  assert.equal(result.sections[0].items.length, 18);
  assert.equal(result.previousHref, "/broadcasts?c=or-geula");
  assert.equal(result.nextHref, "/broadcasts?c=or-geula&page=3");
});
