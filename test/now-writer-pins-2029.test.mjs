// Writer pins in "עכשיו" (ZURIEL 11.11.2026): «הגילוי היומי» enters like Or HaGeula, and the messages of the writers whose WhatsApp
// number is listed in the source registry (שחר יצחק קנדרו, יניב לוי) are pinned at the top — under the owner's own pin — until pinned_until.
import test from "node:test";
import assert from "node:assert/strict";
import { fetchSystemFeedPublicSources2029, publicChannelToSystemItem, NOW_PIN_READ_LIMIT_2029 } from "../src/lib/research/systemFeedPublicSources2029.js";
import { feedRows } from "../src/lib/systemFeed2029.js";
import { nowModels, nowPinnedMessage, buildNowEntries } from "../src/lib/nowPublications2029.js";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const uuid = n => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hours = h => new Date(NOW + h * 3600000).toISOString();
const row = (n, extra = {}) => ({ id: uuid(n), channel: "gilui-yomi", status: "live", page_only: false, expires_at: null,
  created_at: hours(-n), text: `גילוי ${n}`, link_url: null, priority: 55, ...extra });

test("a row pinned by the ingest is pinned while pinned_until is ahead, and names its proven writer (redacted)", () => {
  const live = publicChannelToSystemItem(row(1, { pinned_until: hours(20), credit: "יצחק שחר קנדרו" }), { now: NOW });
  assert.equal(live.pinned, true);
  assert.equal(live.pinKind, "writer");
  assert.equal(live.pinUntil, hours(20));
  assert.equal(live.writer, "יצחק שחר קנדרו");
  assert.equal(live.creator, "הגילוי היומי", "the source stays the channel");
  assert.equal("credit" in live, false, "the raw credit never enters the DTO");
  const expired = publicChannelToSystemItem(row(2, { pinned_until: hours(-1), credit: "יניב לוי" }), { now: NOW });
  assert.equal(expired.pinned, undefined, "an expired pin is not a pin");
  assert.equal(expired.writer, "יניב לוי", "a row proved by the number keeps its writer when it carries pinned_until (in Now only the pin read selects it)");
  const phone = publicChannelToSystemItem(row(3, { pinned_until: hours(5), credit: "+972 50-123-4567" }), { now: NOW });
  assert.ok(!phone.writer.includes("972") && !phone.writer.includes("4567"), "a phone-like display name is redacted");
});

test("an unpinned channel row never shows a writer name, even when the row carries a credit", () => {
  const plain = publicChannelToSystemItem(row(4, { credit: "חבר בקבוצה" }), { now: NOW });
  assert.equal(plain.pinned, undefined);
  assert.equal(plain.writer, undefined);
  assert.equal("credit" in plain, false);
});

const owner = { id: "post:5107", kind: "source", sourceKind: "post", label: "הודעת הבעלים", at: hours(-30), pinned: true, pinUntil: hours(40),
  central: { groups: [{ value: 1820, phrases: ["סוד הוי״ה"] }] } };
const models = items => nowModels(feedRows(items, { now: NOW, limit: 160, caps: { post: 40, "channel:gilui-yomi": 12 } }), NOW);

test("order: the owner's pin leads, writer pins follow newest first, then everything else by time", () => {
  const items = [
    owner,
    publicChannelToSystemItem(row(1), { now: NOW }),
    publicChannelToSystemItem(row(9, { pinned_until: hours(15), credit: "יצחק שחר קנדרו" }), { now: NOW }),
    publicChannelToSystemItem(row(5, { pinned_until: hours(19), credit: "יניב לוי" }), { now: NOW }),
    publicChannelToSystemItem(row(2), { now: NOW }),
  ];
  const all = models(items);
  assert.deepEqual(all.map(m => m.id), ["post:5107", `channel:${uuid(5)}`, `channel:${uuid(9)}`, `channel:${uuid(1)}`, `channel:${uuid(2)}`]);
  assert.deepEqual(all.map(m => m.pinKind), ["owner", "writer", "writer", null, null]);
  const levi = all[1];
  assert.ok(levi.byline.includes("יניב לוי") && levi.byline.includes("הגילוי היומי"), "writer and channel are both in the byline");
  assert.equal(levi.updated, false, "a writer pin is not an update of the publication");
  assert.equal(all[0].updated, true, "the owner's pin keeps its existing meaning");
  assert.equal(nowPinnedMessage(all, NOW).model.id, "post:5107", "the central pinned message is still only the owner's");
  assert.equal(all[3].byline.includes("יניב לוי"), false);
});

test("a writer pin ends by itself at pinUntil and falls back into the time order", () => {
  const pinned = publicChannelToSystemItem(row(9, { pinned_until: hours(1), credit: "יצחק שחר קנדרו" }), { now: NOW });
  const later = NOW + 2 * 3600000;
  const all = nowModels(feedRows([pinned, publicChannelToSystemItem(row(1), { now: NOW })], { now: later, limit: 20, caps: { "channel:gilui-yomi": 12 } }), later);
  assert.deepEqual(all.map(m => [m.id, m.pinned, m.pinKind]), [[`channel:${uuid(1)}`, false, null], [`channel:${uuid(9)}`, false, null]]);
});

test("a pinned row is never dropped by a bucket cap or the limit; an expired pin gets no exemption", () => {
  const items = [1, 2, 3, 4].map(n => publicChannelToSystemItem(row(n), { now: NOW }))
    .concat(publicChannelToSystemItem(row(30, { pinned_until: hours(10), credit: "יניב לוי" }), { now: NOW }));
  const compact = feedRows(items, { now: NOW, limit: 3 });
  assert.ok(compact.some(r => r.id === `channel:${uuid(30)}`), "kept despite the default cap of 2 per channel and the limit of 3");
  assert.equal(compact.length, 3);
  assert.deepEqual(compact.map(r => r.id), [`channel:${uuid(1)}`, `channel:${uuid(2)}`, `channel:${uuid(30)}`], "output order stays chronological");
  const afterPin = feedRows(items, { now: NOW + 11 * 3600000, limit: 3 });
  assert.equal(afterPin.some(r => r.id === `channel:${uuid(30)}`), false);
});

test("writer pins come before the Or HaGeula box in the window entries", () => {
  const box = { id: `channel:${uuid(40)}`, kind: "source", sourceKind: "channel_update", channel: "or-geula", label: "שיעור", at: hours(-0.5) };
  const pin = publicChannelToSystemItem(row(8, { pinned_until: hours(16), credit: "יניב לוי" }), { now: NOW });
  const entries = buildNowEntries(models([box, pin]));
  assert.equal(entries[0].kind, "row");
  assert.equal(entries[0].model.id, `channel:${uuid(8)}`);
  assert.equal(entries[1].kind, "box");
});

function fakeClient(results) {
  const calls = [];
  return { calls, from(table) {
    const ops = [], q = {};
    for (const name of ["select", "eq", "in", "gt", "or", "not", "order", "limit", "abortSignal"]) q[name] = (...args) => { ops.push([name, ...args]); return q; };
    q.then = (resolve, reject) => {
      calls.push({ table, ops });
      const channel = ops.find(x => x[0] === "eq" && x[1] === "channel")?.[2];
      const key = channel || (table === "channel_updates" && ops.some(x => x[0] === "gt" && x[1] === "pinned_until") ? "pins" : table);
      return Promise.resolve(results[key] || { data: [], error: null }).then(resolve, reject);
    };
    return q;
  } };
}

test("the pin read is one bounded live read across the public channels; it brings back pins that fell out of the newest 12", async () => {
  const newest = Array.from({ length: 12 }, (_, i) => row(i + 1));
  const old = row(20, { pinned_until: new Date(Date.now() + 10 * 3600000).toISOString(), credit: "יצחק שחר קנדרו" });
  const inWindow = { ...newest[0], pinned_until: new Date(Date.now() + 5 * 3600000).toISOString(), credit: "יניב לוי" };
  const api = fakeClient({ "gilui-yomi": { data: newest, error: null }, pins: { data: [old, inWindow], error: null } });
  const result = await fetchSystemFeedPublicSources2029({ client: api });
  const pinCall = api.calls.find(c => c.ops.some(x => x[0] === "gt" && x[1] === "pinned_until"));
  assert.ok(pinCall, "one pin read");
  assert.equal(api.calls.filter(c => c.ops.some(x => x[0] === "gt" && x[1] === "pinned_until")).length, 1);
  assert.ok(pinCall.ops.some(x => x[0] === "eq" && x[1] === "status" && x[2] === "live"));
  assert.ok(pinCall.ops.some(x => x[0] === "eq" && x[1] === "page_only" && x[2] === false));
  assert.ok(pinCall.ops.some(x => x[0] === "in" && x[1] === "channel" && x[2].includes("gilui-yomi") && !x[2].includes("torat-haremez")));
  assert.ok(pinCall.ops.some(x => x[0] === "limit" && x[1] === NOW_PIN_READ_LIMIT_2029 && x[1] <= 12));
  assert.ok(pinCall.ops.some(x => x[0] === "or" && /expires_at\.is\.null/.test(x[1])));
  const perChannel = api.calls.filter(c => c !== pinCall && c.table === "channel_updates" && c.ops.some(x => x[0] === "eq" && x[1] === "channel")
    && c.ops.some(x => x[0] === "limit" && x[1] === 12) && c.ops.some(x => x[0] === "eq" && x[1] === "page_only"));
  assert.equal(perChannel.length, 5, "the five per-channel reads are unchanged");
  for (const c of perChannel) {
    assert.doesNotMatch(c.ops[0][1], /pinned_until|credit/, "the per-channel reads do not depend on the new column and never read the credit");
  }
  const gilui = result.items.filter(item => item.channel === "gilui-yomi");
  assert.equal(gilui.length, 13, "12 newest + the older pinned row, each once");
  assert.equal(new Set(gilui.map(item => item.id)).size, 13);
  assert.equal(gilui.find(item => item.id === `channel:${uuid(20)}`).pinned, true);
  assert.equal(gilui.find(item => item.id === `channel:${uuid(1)}`).pinned, true, "the pinned representation replaces the plain one");
  assert.equal(result.sourceStates.find(s => s.source === "pins").status, "read");
});

test("a failed pin read leaves every channel row in place and is reported, never shown as an empty success", async () => {
  const api = fakeClient({ "gilui-yomi": { data: [row(1), row(2)], error: null }, pins: { data: null, error: { code: "42703", message: "column does not exist" } } });
  const result = await fetchSystemFeedPublicSources2029({ client: api });
  assert.equal(result.items.filter(item => item.channel === "gilui-yomi").length, 2);
  assert.equal(result.sourceStates.find(s => s.source === "pins").status, "failed");
  assert.equal(result.sourceStates.find(s => s.source === "gilui-yomi").status, "read");
});
