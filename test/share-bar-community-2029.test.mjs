import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { communityShareDraft, communityShareOwnWords } from "../src/lib/community/communityShareHandoff.js";
import { loadCommunityDraft, COMMUNITY_DRAFT_CACHE } from "../src/lib/community/communityDraft.js";
import { BAR_SHARE_EVENT, openBarShare } from "../src/lib/share/barShare2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const memory = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map }; };
const user = { loading: false, user: { id: "u1" }, verified: true };
const URL_ = "https://sod1820.co.il/number/358";

test("«שתפו בקהילה» writes the source link into the person's EXISTING draft and keeps their own text", () => {
  const storage = memory(), now = Date.UTC(2026, 10, 19);
  assert.deepEqual(communityShareDraft({ auth: user, href: URL_, storage, now }), { ok: true });
  assert.equal(loadCommunityDraft(storage, "user:u1", now).value.body, URL_);
  // an existing draft is kept; the link is added at its end, once
  storage.setItem(COMMUNITY_DRAFT_CACHE + "user:u1", JSON.stringify({ version: 1, updatedAt: now, body: "מחשבה שלי", reply: null }));
  assert.deepEqual(communityShareDraft({ auth: user, href: URL_, storage, now }), { ok: true });
  assert.equal(loadCommunityDraft(storage, "user:u1", now).value.body, `מחשבה שלי\n${URL_}`);
  assert.deepEqual(communityShareDraft({ auth: user, href: URL_, storage, now }), { ok: true, kept: true });
  // a guest uses the guest draft (the composer then asks them to join before a new message)
  assert.equal(communityShareDraft({ auth: { loading: false }, href: URL_, storage, now }).ok, true);
  assert.equal(loadCommunityDraft(storage, "guest", now).value.body, URL_);
});

test("«שתפו בקהילה» never writes while the account is unknown or the device cannot keep a draft", () => {
  assert.equal(communityShareDraft({ auth: { loading: true }, href: URL_, storage: memory() }).ok, false);
  assert.equal(communityShareDraft({ auth: { loading: false, user: { id: "u2" }, verified: false }, href: URL_, storage: memory() }).ok, false);
  assert.equal(communityShareDraft({ auth: user, href: URL_, storage: null }).ok, false);
  assert.equal(communityShareDraft({ auth: user, href: "", storage: memory() }).ok, false);
});

test("own words (law v8 §2): a site link needs at least two words of the person's own; other messages are unchanged", () => {
  assert.equal(communityShareOwnWords(URL_), false, "a link alone");
  assert.equal(communityShareOwnWords(`🙂 ${URL_}`), false, "a link with an emoji");
  assert.equal(communityShareOwnWords(`וואו ${URL_}`), false, "one word");
  assert.equal(communityShareOwnWords(`תראו את זה ${URL_}`), true);
  assert.equal(communityShareOwnWords("https://example.com/x"), true, "a link elsewhere is not a site share");
  assert.equal(communityShareOwnWords("שלום"), true, "no link: unchanged");
  const composer = read("src/components/community2029/CommunityLive2029.jsx");
  assert.match(composer, /!communityShareOwnWords\(draft\) \|\| sending/, "publish stays closed until the person's own words are there");
  assert.match(composer, /כתבו כמה מילים משלכם/);
});

test("one share window: a page's share opens the bar's window with the same props; without a bar nothing is taken", () => {
  assert.equal(openBarShare({ url: URL_ }), false, "no window / no frame: the page keeps its own share");
  const seen = [];
  globalThis.window = new EventTarget();
  globalThis.CustomEvent ??= class extends Event { constructor(type, init) { super(type, init); this.detail = init?.detail; } };
  window.addEventListener(BAR_SHARE_EVENT, (event) => { seen.push(event.detail); event.preventDefault(); });
  assert.equal(openBarShare({ url: URL_, title: "358", type: "number", label: "המספר" }), true);
  assert.deepEqual(seen, [{ url: URL_, title: "358", type: "number", label: "המספר" }]);
  delete globalThis.window;
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /window\.addEventListener\("sod29:share", take\)/);
  assert.match(frame, /toggleAttribute\("data-share-bar", on\)/);
  const actions = read("src/components/ShareActions.jsx");
  assert.match(actions, /if \(barShare && variant !== "royal"\) return/, "where the bar exists, a page shows one entry");
  assert.match(actions, /if \(!taken\) \{ setBarShare\(false\);/, "and falls back to its own row when the bar does not take it");
  const more = read("src/components/experience2029/MorePanel2029.jsx");
  assert.match(more, /const ShareMore2029 = React\.lazy\(\(\) => import\("\.\/ShareMore2029\.jsx"\)\)/, "community and QR load with the window only");
  const extras = read("src/components/experience2029/ShareMore2029.jsx");
  assert.match(extras, /import\("uqr"\)/, "the QR code is generated on this device, on request");
  assert.match(extras, /attributedShareUrl\(href, "qr"\)/, "arrivals from the QR code are attributed as qr");
  assert.doesNotMatch(extras, /emitShare|logShare/, "opening the community draft or the QR is not a recorded share");
});
