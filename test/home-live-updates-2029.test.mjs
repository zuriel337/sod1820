import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";
import { feedRows } from "../src/lib/systemFeed2029.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { publicGalleryToSystemItem } from "../src/lib/research/systemFeedPublicSources2029.js";
import { groupRowToWorldUpdate } from "../src/lib/research/worldGroupSource.js";

// The real Home "עדכונים אחרונים" strip (ZURIEL 6.11.2026): a projection of the Frame's shared feed. No network, no second reader.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("const HOME_UPDATES_LIMIT"), source.indexOf("// \"פוסטים אחרונים\": the newest public Posts"));
assert.ok(components.includes("function useHomeUpdates") && components.includes("function HomeLiveUpdates"));
const outfile = resolve(`.test-home-live-updates-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useMemo} from 'react';
  import {nowModels, buildNowEntries, filterNowBySource, nowPinnedMessage, nowSourceChoices} from './src/lib/nowPublications2029.js';
  import NavigationIcon2029 from './src/components/experience2029/NavigationIcon2029.jsx';
  import {NowPinnedMessage2029, NowSourceEmpty2029, NowSourcePicker2029} from './src/components/experience2029/NowRoyalCenter2029.jsx';
  import {relativeTimeLabel} from './src/lib/relativeTime2029.js';
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = ({src, className}) => React.createElement('img', {src, alt:'', className});
  ${components}
  export {HomeLiveUpdates, useHomeUpdates, HomeEntryBand};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"], loader: { ".css": "empty", ".js": "jsx" } });
const { HomeLiveUpdates, useHomeUpdates, HomeEntryBand } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); });

const NOW = Date.now();
const iso = hoursAgo => new Date(NOW - hoursAgo * 3600e3).toISOString();
const post = (id, hours, extra = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null, source: "sod1820", wp_id: 50000 + id, home_hidden: false, date: iso(hours), created_at: iso(hours), modified: iso(hours), ...extra });
const gallery = (n, hours) => publicGalleryToSystemItem({ id: `10000000-0000-4000-8000-00000000000${n}`, image_url: `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/g${n}.jpg`, name: `תמונה מזרם המציאות ${n}`, description: "", source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: iso(hours), created_at: iso(hours), wp_gallery_id: 7 });
const group = hours => groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: "הודעת מקור שטרם נבדקה", created_at: iso(hours), contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
const feedOf = (items, loading = false) => ({ loading, expandedRows: feedRows(items, { now: NOW, limit: 160, caps: { post: 40, group: 40, gallery: 10 } }) });
function Probe({ feed, exclude = new Set(), postsOnly = false, sourceKey = "" }) {
  const updates = useHomeUpdates(feed, { exclude, postsOnly, sourceKey });
  return React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => {}, sourceKey, onSource: () => {}, onNavigateTo: () => {} });
}
const render = async props => { let root; await act(async () => { root = Renderer.create(React.createElement(Probe, props)); }); return root; };
const entries = root => root.root.findAll(node => node.type === "li" && node.props["data-home-update-item"]);

test("newest first across kinds: a reality-stream image shows as an image with its relative time; unverified source messages never appear", async () => {
  const items = [postRowToWorldUpdate(post(1, 30)), gallery(1, 2), postRowToWorldUpdate(post(2, 10)), group(1)].filter(Boolean);
  const root = await render({ feed: feedOf(items) });
  const list = entries(root);
  assert.deepEqual(list.map(node => node.props["data-home-update-item"]), ["gallery:10000000-0000-4000-8000-000000000001", "post:2", "post:1"]);
  const [first] = list;
  assert.ok(first.findAll(node => node.type === "b").some(node => node.children.join("") === "תמונה"), "type label: an image");
  assert.ok(first.findAllByType("img").some(img => /g1\.jpg/.test(img.props.src)), "the image itself is the thumbnail");
  assert.match(first.findAllByType("time")[0].children.join(""), /לפני|שעה/, "relative time on the main Home");
  assert.equal(root.root.findAll(node => node.props["data-home-top-updates"] === "live").length, 1);
  await act(async () => { root.unmount(); });
});

test("at most six items; anything already shown by the flagship region or ciphers is not repeated; posts-only while the world is closed", async () => {
  const items = [1, 2, 3, 4, 5, 6, 7].map(n => postRowToWorldUpdate(post(n, n))).concat([gallery(2, 0.5)]).filter(Boolean);
  let root = await render({ feed: feedOf(items) });
  assert.equal(entries(root).length, 6);
  await act(async () => { root.unmount(); });
  root = await render({ feed: feedOf(items), exclude: new Set(["/post/p-1"]) });
  assert.equal(entries(root).some(node => node.props["data-home-update-item"] === "post:1"), false);
  await act(async () => { root.unmount(); });
  root = await render({ feed: feedOf(items), postsOnly: true });
  assert.ok(entries(root).every(node => String(node.props["data-home-update-item"]).startsWith("post:")), "no reality-stream item while the world is closed to the public");
  await act(async () => { root.unmount(); });
});

test("loading reserves rows; nothing to show or no feed renders nothing: no empty card and no error text", async () => {
  let root = await render({ feed: { loading: true, expandedRows: [] } });
  assert.equal(root.root.findAll(node => node.type === "li" && String(node.props.className).includes("h29-skel")).length, 6);
  assert.equal(root.root.findAll(node => node.props["data-home-top-updates"] === "live")[0].props["aria-busy"], true);
  await act(async () => { root.unmount(); });
  for (const feed of [null, feedOf([]), feedOf([group(1)].filter(Boolean))]) {
    root = await render({ feed });
    assert.equal(root.toJSON(), null);
    await act(async () => { root.unmount(); });
  }
});

test("Home order (ZURIEL 11.11.2026): 'עכשיו · המרכז' first, then ELS, latest ciphers, flagship region, entrances, other series; the end is statistics then the newsletter", () => {
  const body = source.slice(source.indexOf(`data-experience-capability="home-composition"`));
  const order = ["<HomeLiveUpdates", "elsEntry ? <Reveal", '<Section label="הצפנים האחרונים בתורה">', "<HomeFlagshipRegion", "<HomeEntryBand", "<HomeOtherSeries", "<HomeFeaturedPost2029", '<Reveal id="story"'].map(marker => body.indexOf(marker));
  assert.ok(order.every(index => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), order.join(","));
  assert.ok(body.indexOf('data-home-newsletter="end"') > body.indexOf('aria-label="דופק ומצב בנייה"'), "newsletter after the statistics line, last");
  assert.equal((source.match(/<NewsletterSignup2029 \/>/g) || []).length, 1, "one newsletter component, only at the end");
});

test("entrances: Beit Midrash and the life-journey promo link only while open; a closed gate shows its true state; the build note leads to the sign-up", async () => {
  let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeEntryBand, { journeyLocked: false, midrashOpen: true })); });
  const link = key => root.root.findAll(node => node.props["data-home-entry"] === key && node.type === "a")[0];
  assert.equal(link("beit-midrash").props.href, "/beit-midrash");
  assert.equal(link("life-journey").props.href, "/2029/journey");
  const build = root.root.findAll(node => node.props["data-home-entry"] === "construction")[0];
  assert.match(build.findAll(node => node.type === "b" || node.type === "span").map(node => node.children.join("")).join(" "), /האתר בבנייה/);
  assert.equal(build.findAllByType("button").length, 1, "a button that goes to the sign-up at the end of the page");
  await act(async () => { root.unmount(); });
  await act(async () => { root = Renderer.create(React.createElement(HomeEntryBand, { journeyLocked: true, midrashOpen: false })); });
  assert.equal(link("beit-midrash"), undefined); assert.equal(link("life-journey"), undefined);
  const closed = root.root.findAll(node => node.props["aria-disabled"] === "true");
  assert.equal(closed.length, 2);
  assert.match(closed.map(node => JSON.stringify(node.children.map(child => typeof child === "string" ? child : child.children?.join("")))).join(" "), /בבנייה/);
  await act(async () => { root.unmount(); });
});

// ── "עכשיו · המרכז" (ZURIEL 11.11.2026): the pinned central message and the source picker over the same models ──────────────────────
const pinnedItem = (untilHours, extra = {}) => ({ ...postRowToWorldUpdate(post(5107, 72, { slug: "sharshar" })), pinned: true, pinUntil: new Date(NOW + untilHours * 3600e3).toISOString(),
  central: { title: "ממשלת משיח בן דוד = 1234 · והיום 10.11 = 1011", kicker: "תיעוד אירועים", date: "10.11.2026", postTitle: "פוסט 5107",
    groups: [{ value: 1234, phrases: ["ממשלת משיח בן דוד", "התגלות השכינה"], numberOnly: [] }, { value: 1011, phrases: ["10.11.2026 — יום השבעת הכנסת ה־26", "המשיח פועל במעשים"], numberOnly: ["10.11.2026 — יום השבעת הכנסת ה־26"] }] }, ...extra });

test("the pinned central message is the card on top (once): never repeated as a row, gone by itself after its pin window", async () => {
  let root = await render({ feed: feedOf([pinnedItem(5), postRowToWorldUpdate(post(1, 2))].filter(Boolean)) });
  const card = root.root.findAll(node => node.props["data-now-pinned-message"]);
  assert.equal(card.length, 1);
  assert.equal(card[0].findByType("h3").children.join(""), "פוסט 5107", "the headline is the Post's own title (posts.title), never the update's heading");
  assert.equal(card[0].findAll(node => node.props["data-now-pinned-update"] === "true").length, 1, "the update is a separate layer under the Post title");
  assert.deepEqual(card[0].findAll(node => node.props.className === "rc29-num r29-coin").map(node => node.props["aria-label"]), ["פתח את המספר 1234", "פתח את המספר 1011"]);
  assert.equal(entries(root).some(node => node.props["data-home-update-item"] === "post:5107"), false, "not a second time as a row");
  const toggle = card[0].findAll(node => node.type === "button" && node.props["aria-expanded"] === false)[0];
  await act(async () => { toggle.props.onClick(); });
  const lines = root.root.findAll(node => node.props.className === "rc29-line").map(node => node.findAllByType("span")[0].children.join(""));
  assert.deepEqual(lines, ["ממשלת משיח בן דוד", "התגלות השכינה", "10.11.2026 — יום השבעת הכנסת ה־26", "המשיח פועל במעשים"], "every line opens before entering the Post");
  await act(async () => { root.unmount(); });
  root = await render({ feed: feedOf([pinnedItem(-1), postRowToWorldUpdate(post(1, 2))].filter(Boolean)) });
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-message"]).length, 0, "an expired pin is no longer pinned");
  await act(async () => { root.unmount(); });
});

test("one source picker: 'הכול' by default hides unverified group rows; picking the group shows them with their label; a known group with nothing new shows an honest empty state", async () => {
  const items = [postRowToWorldUpdate(post(1, 3)), group(1)].filter(Boolean);
  let root = await render({ feed: feedOf(items) });
  const chips = root.root.findAll(node => node.props["data-now-source"]).map(node => node.props["data-now-source"]);
  assert.equal(chips[0], "all"); assert.ok(chips.includes("group:ki-la-hamelucha-gematria"), "a known public group is listed even when empty");
  assert.equal(entries(root).length, 1, "only the Post under 'הכול'");
  await act(async () => { root.unmount(); });
  const groupKey = chips.find(id => id.startsWith("group:") && id !== "group:ki-la-hamelucha-gematria" && id !== "group:torat-haremez") || "group:neutral";
  root = await render({ feed: feedOf(items), sourceKey: groupKey });
  assert.equal(entries(root).length, 1); assert.match(JSON.stringify(entries(root)[0].findAllByType("b").map(node => node.children)), /טרם נבדק/);
  await act(async () => { root.unmount(); });
  root = await render({ feed: feedOf(items), sourceKey: "group:ki-la-hamelucha-gematria" });
  assert.equal(entries(root).length, 0);
  assert.match(root.root.findAll(node => node.props.className === "rc29-empty")[0].children.join(""), /אין פרסום חדש/);
  await act(async () => { root.unmount(); });
});

test("the pinned update hierarchy (ZURIEL 11.11.2026, second pass): the Post title stays; '🔔 עדכון חדש בפוסט · date' with a short summary and mini numbers; 'פתיחת העדכון' opens the whole update, 'סגירת העדכון' closes it; 'לפוסט המלא' always separate", async () => {
  const withLead = pinnedItem(5, {});
  withLead.central = { ...withLead.central, kicker: "עדכון חדש בפוסט", lead: "הבורא פועל בהפוך על הפוך דרך כל המציאות", leadSub: "אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.", fullTitle: "היום 10.11 = 1011",
    statement: "מה שאנחנו רואים בעיניים הכול פעולות של הבורא, שפועל בהפוך על הפוך דרך כל המציאות. אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.",
    groups: [...withLead.central.groups].reverse() };
  const root = await render({ feed: feedOf([withLead, postRowToWorldUpdate(post(1, 2))].filter(Boolean)) });
  const card = root.root.findAll(node => node.props["data-now-pinned-message"])[0];
  assert.equal(card.findByType("h3").children.join(""), "פוסט 5107", "the Post's own title, unchanged by the update");
  const update = card.findAll(node => node.props["data-now-pinned-update"] === "true")[0];
  const head = update.findAll(node => node.props.className === "rc29-update-head")[0];
  assert.equal(head.findByType("b").children.join(""), "עדכון חדש בפוסט"); assert.equal(head.findByType("time").children.join(""), "10.11.2026");
  assert.equal(update.findAll(node => node.props["data-now-pinned-summary"] === "true")[0].children.join(""),
    "הבורא פועל בהפוך על הפוך דרך כל המציאות. אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.", "a short summary, the owner's words");
  assert.deepEqual(card.findAll(node => node.props.className === "rc29-num r29-coin").map(node => node.props["aria-label"]), ["פתח את המספר 1011", "פתח את המספר 1234"], "mini numbers, clickable");
  assert.equal(card.findAll(node => node.props["data-now-pinned-full"] === "true").length, 0, "closed: the full update does not take the screen");
  assert.equal(card.findAll(node => node.props.className === "rc29-line").length, 0);
  assert.equal(card.findAll(node => node.props["data-now-pinned-post"] === "true").length, 1, "'לפוסט המלא' always present");
  const toggle = () => root.root.findAll(node => node.props["data-now-pinned-message"])[0].findAll(node => node.type === "button")[0];
  assert.equal(toggle().children.join(""), "פתיחת העדכון"); assert.equal(toggle().props["aria-expanded"], false);
  await act(async () => { toggle().props.onClick(); });
  const full = root.root.findAll(node => node.props["data-now-pinned-full"] === "true")[0];
  assert.equal(full.findAll(node => node.props["data-now-pinned-lead"] === "true")[0].findAll(node => node.props.className === "rc29-lead-text")[0].children.join(""), "הבורא פועל בהפוך על הפוך דרך כל המציאות");
  assert.equal(full.findAll(node => node.props.className === "rc29-full-title")[0].children.join(""), "היום 10.11 = 1011");
  assert.deepEqual(full.findAll(node => node.props.className === "rc29-line").map(node => node.findAllByType("span")[0].children.join("")),
    ["10.11.2026 — יום השבעת הכנסת ה־26", "המשיח פועל במעשים", "ממשלת משיח בן דוד", "התגלות השכינה"], "every phrase of every group");
  assert.match(full.findAll(node => node.props["data-now-pinned-statement"] === "true")[0].children.join(""), /שפועל בהפוך על הפוך/);
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-summary"] === "true").length, 0);
  assert.equal(toggle().children.join(""), "סגירת העדכון"); assert.equal(toggle().props["aria-expanded"], true);
  await act(async () => { toggle().props.onClick(); });
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-full"] === "true").length, 0, "closes back to the summary");
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-post"] === "true").length, 1);
  await act(async () => { root.unmount(); });
});

// ── ZURIEL 12.11.2026: a pinned writer message shows on Home, newest pin first, and is clickable ──────────────────────────────────────────
const levi = hours => groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000009", body: "גילוי של יניב", created_at: iso(hours), contributor_slug: "yaniv-levi", contributor_name: "יניב לוי", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "gilui-yomi" });
test("Home shows a pinned writer message first, with a pin badge and a link to its source message; an unpinned source message stays out", async () => {
  const root = await render({ feed: feedOf([postRowToWorldUpdate(post(1, 2)), levi(1), group(3)].filter(Boolean)) });
  const list = entries(root);
  const ids = list.map(node => node.props["data-home-update-item"]);
  assert.equal(ids[0], "group:20000000-0000-4000-8000-000000000009", "the pinned message leads on Home");
  assert.ok(!ids.includes("group:20000000-0000-4000-8000-000000000001"), "an unpinned source message stays out of Home");
  assert.equal(list[0].findAll(node => node.props["data-home-update-pinned"] === "true").length, 1, "pin badge");
  const links = list[0].findAll(node => node.type === "a" && String(node.props.href).startsWith("/world#group-source-20000000-0000-4000-8000-000000000009"));
  assert.equal(links.length, 1, "the row is a link to the source message");
  await act(async () => { root.unmount(); });
});

test("a pinned row without any address still opens the Now sheet (never a dead card)", async () => {
  let opened = 0;
  const noAddress = { ...levi(1), href: null, url: null };
  function OpenProbe({ feed }) {
    const updates = useHomeUpdates(feed, { exclude: new Set(), postsOnly: false, sourceKey: "" });
    updates.models = updates.models.map(entry => entry.model ? { ...entry, model: { ...entry.model, href: null } } : entry);
    return React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => { opened += 1; }, sourceKey: "", onSource: () => {}, onNavigateTo: () => {} });
  }
  let root;
  await act(async () => { root = Renderer.create(React.createElement(OpenProbe, { feed: feedOf([noAddress].filter(Boolean)) })); });
  const open = root.root.findAll(node => node.type === "button" && node.props["data-home-update-opens-now"] === "true");
  assert.equal(open.length, 1);
  await act(async () => { open[0].props.onClick(); });
  assert.equal(opened, 1);
  await act(async () => { root.unmount(); });
});
