import assert from "node:assert/strict";
import { buildFollowCenterModel, followLifecycle } from "../src/components/followCenter2029/followCenterModel2029.js";

const note = (over = {}) => ({ id: "n1", title: "כותרת", body: "גוף", link: "/post/x", read_at: null, created_at: "2026-10-20T10:00:00Z", source_topic: "author:יניב לוי", ...over });

// A failed or loading read is never an empty list.
for (const state of ["loading", "unavailable", "bogus"]) {
  const model = buildFollowCenterModel({ principal: "registered", notifications: { state, items: [note()] }, follows: { state, topics: ["number:1820"] } });
  assert.equal(model.updates.items.length, 0, state); assert.notEqual(model.updates.state, "ready");
  assert.equal(model.following.count, null, "an unmeasured follow count is not zero");
  assert.equal(model.updates.unread, null, "an unavailable inbox has no measured unread count");
  assert.equal(model.lifecycle[0].state, state === "loading" ? "loading" : "unknown");
  assert.notEqual(model.lifecycle[0].note, "עוד לא בחרת", "failed/loading reads never claim that no follows were selected");
  assert.equal(model.lifecycle[2].state, "unknown");
}
// Known empty is a ready state with zero items.
const empty = buildFollowCenterModel({ principal: "registered", notifications: { state: "ready", items: [] }, follows: { state: "ready", topics: [] } });
assert.equal(empty.updates.state, "ready"); assert.equal(empty.following.state, "ready"); assert.equal(empty.following.count, 0);
assert.equal(empty.updates.unread, 0); assert.equal(empty.lifecycle[0].state, "idle");
assert.equal(buildFollowCenterModel().lifecycle[1].state, "loading", "an unresolved principal is not a known guest");

// Why-received comes only from source_topic; absent means no invented reason; unsafe links are dropped.
const ready = buildFollowCenterModel({ principal: "registered",
  notifications: { state: "ready", items: [note(), note({ id: "n2", source_topic: null, link: "https://evil.example", read_at: "2026-10-21T00:00:00Z" }), note({ id: "n3", link: "//evil.example" })] },
  follows: { state: "ready", topics: ["author:יניב לוי", "author:אנונימי", "number:1820", "cat:פרשת השבוע", "stream:reality"], links: { "author:יניב לוי": "/community/researcher/yaniv-levi", "author:אנונימי": "https://evil.example" } } });
assert.equal(ready.updates.items[0].why.kind, "כתב"); assert.equal(ready.updates.items[1].why, null);
assert.equal(ready.updates.items[1].href, null); assert.equal(ready.updates.items[2].href, null); assert.equal(ready.updates.unread, 2);
assert.match(ready.updates.items[0].time, /·/, "outside Home a record time is the bilingual date, not relative time");
for (const link of ["/\\evil.invalid", "/%5C%5Cevil.invalid", "/%2F%2Fevil.invalid", "/\n/evil.invalid", "/post/%00x"]) {
  const unsafe = buildFollowCenterModel({ notifications: { state: "ready", items: [note({ link })] }, follows: { state: "ready", topics: [] } });
  assert.equal(unsafe.updates.items[0].href, null, "browser-normalized external/control-character links are not internal targets");
}
assert.equal(buildFollowCenterModel({ notifications: { state: "ready", items: [note({ link: "/category/%D7%A9%D7%9D%20%D7%A0%D7%95%D7%A9%D7%90" })] } }).updates.items[0].href,
  "/category/%D7%A9%D7%9D%20%D7%A0%D7%95%D7%A9%D7%90", "valid encoded subject names remain navigable");
assert.deepEqual(ready.following.groups.map((group) => group.key), ["כתב", "מספר", "קטגוריה", "ערוץ"]);
const writers = ready.following.groups[0].items;
assert.equal(writers[0].href, "/community/researcher/yaniv-levi"); assert.equal(writers[1].href, null, "unresolved or unsafe writer links are not guessed");

// 2029 icon names, never the legacy emoji.
assert.deepEqual(ready.following.groups.map((group) => group.items[0].icon), ["personal", "number", "layers", "signal"]);
assert.equal(ready.updates.items[0].why.icon, "personal");
assert.deepEqual(off0().channels.map((channel) => channel.icon), ["posts", "signal", "conversation"]);
function off0() { return buildFollowCenterModel({ principal: "registered" }); }

// An unconfirmed change keeps its marker; nothing is removed locally.
const pending = buildFollowCenterModel({ principal: "registered", follows: { state: "ready", topics: ["number:1820"], pending: { "number:1820": "failed" } } });
assert.equal(pending.following.groups[0].items[0].change, "failed");

// Capabilities: email and WhatsApp are not available; device push only when the device reports it.
const off = buildFollowCenterModel({ principal: "registered" });
assert.deepEqual(off.channels.map((channel) => [channel.key, channel.available, channel.chosen]), [["email", false, false], ["push", false, false], ["whatsapp", false, false]]);
const on = buildFollowCenterModel({ principal: "registered", device: { push: "available", pushSubscribed: true } });
assert.deepEqual(on.channels.filter((channel) => channel.available).map((channel) => channel.key), ["push"]); assert.equal(on.channels[1].chosen, true);

// Four separate states; a guest needs identity and has no chosen channel; delivery is never claimed.
const guest = buildFollowCenterModel({ principal: "guest", follows: { state: "ready", topics: ["number:1820"] }, device: { push: "available", pushSubscribed: true } });
assert.deepEqual(guest.lifecycle.map((step) => step.state), ["done", "needed", "idle", "unavailable"]);
assert.equal(followLifecycle({ principal: "registered", followCount: 0, channels: on.channels }).at(-1).state, "unavailable");
// Relevance and Raziel are labelled inputs that are not active.
assert.deepEqual(off.inputs.map((input) => input.active), [true, false, false]);
console.log("follow center model 2029: PASS");

const unreadChannels = buildFollowCenterModel({ principal: "registered", follows: { state: "ready", topics: ["number:1820"] },
  channelReadState: "unavailable", device: { push: "available", pushSubscribed: true } });
assert.ok(unreadChannels.channels.every(channel => !channel.known && channel.chosen === null && !channel.available));
assert.equal(unreadChannels.lifecycle[2].state, "unknown", "unread channel consent is never a measured opt-out");
assert.equal(unreadChannels.lifecycle[3].state, "unknown", "unread delivery state is never a claim that no delivery exists");
