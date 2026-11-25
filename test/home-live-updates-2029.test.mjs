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
// ZURIEL 25.11.2026 (D1–D11): "עדכונים אחרונים" opens the Home: desktop two columns, phone one chronological list, from the same rows; no pin; the construction note + sign-up at its foot.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("function useHomeUpdates"), source.indexOf("// \"פוסטים אחרונים\": the newest public Posts"));
assert.ok(["function useHomeUpdates", "function HomeLiveUpdates", "function HomePinnedLead", "function HomeUpdateItem", "function useHomeWide"].every(name => components.includes(name)));
const outfile = resolve(`.test-home-live-updates-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useEffect, useMemo, useState} from 'react';
  import {nowModels, nowPinnedMessage, homeUpdateColumns, HOME_SITE_LIMIT, HOME_SOURCE_LIMIT, HOME_MERGED_LIMIT, seriesLatestFace2029, seriesLatestMember2029} from './src/lib/nowPublications2029.js';
  import BuildingSignupNote2029 from './src/components/experience2029/BuildingSignupNote2029.jsx';
  import {homeMapLeadMember2029, homeMapLeadFace2029} from './src/lib/research/homeMapLead2029.js';
  import {pinCoverSet, PIN_COVER_SIZES} from './src/components/experience2029/homePinnedCover2029.js';
  import NavigationIcon2029 from './src/components/experience2029/NavigationIcon2029.jsx';
  import NowThumb2029 from './src/components/experience2029/NowThumb2029.jsx';
  import SeriesLatestMark2029 from './src/components/experience2029/SeriesLatestMark2029.jsx';
  import {NowPinnedMessage2029} from './src/components/experience2029/NowRoyalCenter2029.jsx';
  import {relativeTimeLabel} from './src/lib/relativeTime2029.js';
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = ({src, className}) => React.createElement('img', {src, alt:'', className});
  ${components}
  export {HomeLiveUpdates, useHomeUpdates, HomeEntryBand, HomePinnedLead, BuildingSignupNote2029};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"], loader: { ".css": "empty", ".js": "jsx" } });
const { HomeLiveUpdates, useHomeUpdates, HomeEntryBand, HomePinnedLead, BuildingSignupNote2029 } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); });

const NOW = Date.now();
const iso = hoursAgo => new Date(NOW - hoursAgo * 3600e3).toISOString();
const post = (id, hours, extra = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null, source: "sod1820", wp_id: 50000 + id, home_hidden: false, date: iso(hours), created_at: iso(hours), modified: iso(hours), ...extra });
const gallery = (n, hours) => publicGalleryToSystemItem({ id: `10000000-0000-4000-8000-00000000000${n}`, image_url: `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/g${n}.jpg`, name: `תמונה מזרם המציאות ${n}`, description: "", source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: iso(hours), created_at: iso(hours), wp_gallery_id: 7 });
const group = hours => groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: "הודעת מקור שטרם נבדקה", created_at: iso(hours), contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
const feedOf = (items, loading = false) => ({ loading, expandedRows: feedRows(items, { now: NOW, limit: 160, caps: { post: 40, group: 40, gallery: 10 } }) });
function Probe({ feed, postsOnly = false, exclude, editorialHref }) {
  const updates = useHomeUpdates(feed, { postsOnly, exclude });
  return React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => {}, editorialHref });
}
// The top of the Home as the composition draws it: the pinned lead (with an owner's pinned message above it), then the short "עכשיו".
function TopProbe({ feed, catalogItems = [] }) {
  const updates = useHomeUpdates(feed, { postsOnly: false });
  return React.createElement(React.Fragment, null,
    React.createElement(HomePinnedLead, { lead: updates.lead, catalogItems, pinned: updates.pinned, onNavigateTo: () => {} }),
    React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => {} }));
}
const render = async props => { let root; await act(async () => { root = Renderer.create(React.createElement(Probe, props)); }); return root; };
const renderTop = async props => { let root; await act(async () => { root = Renderer.create(React.createElement(TopProbe, props)); }); return root; };
const entries = root => root.root.findAll(node => node.type === "li" && node.props["data-home-update-item"]);

test("newest first across kinds: a reality-stream image shows as an image with its relative time; public group messages retain their source label", async () => {
  const items = [postRowToWorldUpdate(post(1, 30)), gallery(1, 2), postRowToWorldUpdate(post(2, 10)), group(1)].filter(Boolean);
  const root = await render({ feed: feedOf(items) });
  const list = entries(root);
  assert.deepEqual(list.map(node => node.props["data-home-update-item"]), ["group:20000000-0000-4000-8000-000000000001", "gallery:10000000-0000-4000-8000-000000000001", "post:2", "post:1"],
    "phone: ONE chronological list, newest first, with no priority by type");
  const [, first] = list;
  assert.ok(first.findAll(node => node.type === "b").some(node => node.children.join("") === "תמונה"), "type label: an image");
  assert.ok(first.findAllByType("img").some(img => /g1\.jpg/.test(img.props.src)), "the image itself is the thumbnail");
  assert.match(first.findAllByType("time")[0].children.join(""), /לפני|שעה/, "relative time on the main Home");
  assert.equal(root.root.findAll(node => node.props["data-home-top-updates"] === "live").length, 1);
  await act(async () => { root.unmount(); });
});

test("bounded rows: the site's own updates (at most 7) and one item per source (at most 7), never the whole history; posts-only while the world is closed", async () => {
  const items = [1, 2, 3, 4, 5, 6, 7].map(n => postRowToWorldUpdate(post(n, n))).concat([gallery(2, 0.5)]).filter(Boolean);
  let root = await render({ feed: feedOf(items) });
  assert.equal(entries(root).length, 8, "seven site updates and the one reality-stream source");
  assert.equal(root.root.findAll(node => node.props.className === "rc29-ex").length, 0, "no excerpts in the short strip");
  assert.equal(root.root.findAll(node => node.type === "button" && node.props["data-home-open-now"] === "true").length, 1, "the whole picture is one tap away");
  await act(async () => { root.unmount(); });
  root = await render({ feed: feedOf(items), postsOnly: true });
  assert.ok(entries(root).every(node => String(node.props["data-home-update-item"]).startsWith("post:")), "no reality-stream item while the world is closed to the public");
  await act(async () => { root.unmount(); });
});

test("the dedicated featured story is not duplicated in Home Now; the next shared entries fill the three slots", async () => {
  const items = [1, 2, 3, 4].map(n => postRowToWorldUpdate(post(n, n))).filter(Boolean);
  const root = await render({ feed: feedOf(items), exclude: new Set([items[0].href]) });
  assert.deepEqual(entries(root).map(node => node.props["data-home-update-item"]), ["post:2", "post:3", "post:4"]);
  await act(async () => { root.unmount(); });
});

test("an editorial lead keeps a different unit from the shared Now feed and omits only an exact duplicate", async () => {
  const slug = "bennett-melach-631-78";
  const id = "bennett-salt-covenant-unity-20261119";
  const path = `/post/${slug}`;
  const items = [postRowToWorldUpdate(post(5113, 1, { slug, date: "2026-10-01", created_at: "2026-10-01",
    modified: "2026-10-01", tags: ["מפת המציאות"] })), postRowToWorldUpdate(post(2, 4))];
  const feed = feedOf(items);
  let root = await render({ feed, editorialHref: `${path}?unit=other-unit#other-unit` });
  const update = entries(root).find(node => node.props["data-home-update-item"] === "post:5113");
  assert.ok(update, "a different unit from the same post is still an update");
  assert.equal(update.findByType("a").props.href, `${path}?unit=${id}#${id}`);
  await act(async () => { root.unmount(); });
  root = await render({ feed, editorialHref: `${path}?unit=${id}#${id}` });
  assert.deepEqual(entries(root).map(node => node.props["data-home-update-item"]), ["post:2"]);
  await act(async () => { root.unmount(); });
});

test("loading reserves exactly the loaded rows on desktop too (7 + 7) so nothing moves when the data arrives", async () => {
  globalThis.window = { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
  try {
    const root = await render({ feed: { loading: true, expandedRows: [] } });
    assert.equal(root.root.findAll(node => node.type === "li" && String(node.props.className).includes("h29-skel")).length, 14);
    assert.equal(root.root.findAll(node => node.props["data-home-updates-loading"] === "true").length > 0, true);
    await act(async () => { root.unmount(); });
  } finally { delete globalThis.window; }
});

test("loading reserves rows; nothing to show or no feed renders nothing: no empty card and no error text", async () => {
  let root = await render({ feed: { loading: true, expandedRows: [] } });
  assert.equal(root.root.findAll(node => node.type === "li" && String(node.props.className).includes("h29-skel")).length, 12, "phone: the skeleton reserves exactly the loaded list's rows (no layout shift when the data arrives)");
  assert.equal(root.root.findAll(node => node.props["data-home-top-updates"] === "live")[0].props["aria-busy"], true);
  assert.match(root.root.findAll(node => node.props.role === "status")[0].children.join(""), /טוען/, "a visible loading line, inside the reserved rows (Operation Visibility Law)");
  await act(async () => { root.unmount(); });
  for (const feed of [null, feedOf([])]) {
    root = await render({ feed });
    assert.equal(root.toJSON(), null);
    await act(async () => { root.unmount(); });
  }
});

test("Home order (ZURIEL 25.11.2026): 'עדכונים אחרונים' first, then the flagship lead, then ELS, latest ciphers, flagship region, entrances, other series; the end is statistics then the newsletter", () => {
  const body = source.slice(source.indexOf(`data-experience-capability="home-composition"`));
  const order = ["<HomeLiveUpdates", "<HomePinnedLead", "elsEntry ? <Reveal", '<Section label="הצפנים האחרונים בתורה">', "<HomeFlagshipRegion", "<HomeEntryBand", "<HomeOtherSeries", "<HomeFeaturedPost2029", '<Reveal id="story"'].map(marker => body.indexOf(marker));
  assert.ok(order.every(index => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), order.join(","));
  assert.ok(body.indexOf('data-home-newsletter="end"') > body.indexOf('aria-label="דופק ומצב בנייה"'), "newsletter after the statistics line, last");
  assert.equal((source.match(/<NewsletterSignup2029 \/>/g) || []).length, 1, "one newsletter component, only at the end");
});

test("the construction note and its sign-up button are ONE shared component with the exact approved wording; entrances: Beit Midrash and the life-journey promo link only while open; a closed gate shows its true state", async () => {
  let root, pressed = 0;
  await act(async () => { root = Renderer.create(React.createElement(BuildingSignupNote2029, { scope: "home", onSignup: () => { pressed += 1; } })); });
  const note = root.root.findAll(node => node.props["data-building-note"] === "home")[0];
  assert.equal(note.props.role, "note");
  const text = note.findAll(node => node.type === "p").map(node => node.children.join("")).join(" ");
  assert.equal(text, "האתר נבנה מבפנים. המערכת מתפתחת ומתחדשת כל הזמן. במהלך הבנייה ייתכנו תקלות זמניות. הצטרפו אלינו וקבלו עדכונים על חידושים ופתיחת אזורים נוספים.");
  const button = note.findAllByType("button");
  assert.equal(button.length, 1); assert.equal(button[0].children.join(""), "הרשמה לעדכונים");
  await act(async () => { button[0].props.onClick(); });
  assert.equal(pressed, 1, "on the Home the button leads to the existing sign-up section; this component subscribes nobody and reports no success");
  await act(async () => { root.unmount(); });
  await act(async () => { root = Renderer.create(React.createElement(HomeEntryBand, { journeyLocked: false, midrashOpen: true })); });
  const link = key => root.root.findAll(node => node.props["data-home-entry"] === key && node.type === "a")[0];
  assert.equal(link("beit-midrash").props.href, "/beit-midrash");
  assert.equal(link("life-journey").props.href, "/2029/journey");
  assert.equal(root.root.findAll(node => node.props["data-home-entry"] === "construction").length, 0, "the construction note is not repeated in the band");
  await act(async () => { root.unmount(); });
  await act(async () => { root = Renderer.create(React.createElement(HomeEntryBand, { journeyLocked: true, midrashOpen: false })); });
  assert.equal(link("beit-midrash"), undefined); assert.equal(link("life-journey"), undefined);
  const closed = root.root.findAll(node => node.props["aria-disabled"] === "true");
  // ZURIEL 18.11.2026: Life Journey appears once on Home; while it is locked only the "כלים וכניסות" tile names it,
  // so the band keeps just the closed Beit Midrash gate.
  assert.equal(closed.length, 1);
  assert.equal(root.root.findAll(node => node.props["data-home-entry"] === "life-journey").length, 0);
  assert.match(closed.map(node => JSON.stringify(node.children.map(child => typeof child === "string" ? child : child.children?.join("")))).join(" "), /בבנייה/);
  await act(async () => { root.unmount(); });
});

// ── "עכשיו · המרכז" (ZURIEL 11.11.2026): the pinned central message and the source picker over the same models ──────────────────────
const pinnedItem = (untilHours, extra = {}) => ({ ...postRowToWorldUpdate(post(5107, 72, { slug: "sharshar" })), pinned: true, pinUntil: new Date(NOW + untilHours * 3600e3).toISOString(),
  central: { title: "ממשלת משיח בן דוד = 1234 · והיום 10.11 = 1011", kicker: "תיעוד אירועים", date: "10.11.2026", postTitle: "פוסט 5107",
    groups: [{ value: 1234, phrases: ["ממשלת משיח בן דוד", "התגלות השכינה"], numberOnly: [] }, { value: 1011, phrases: ["10.11.2026 — יום השבעת הכנסת ה־26", "המשיח פועל במעשים"], numberOnly: ["10.11.2026 — יום השבעת הכנסת ה־26"] }] }, ...extra });

test("no pin priority on the Home (D2, ZURIEL 25.11.2026): a pinned item is no central card on top; it is a regular row at its own time, with no pin badge", async () => {
  let root = await renderTop({ feed: feedOf([pinnedItem(5), postRowToWorldUpdate(post(1, 2))].filter(Boolean)) });
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-message"]).length, 0, "no pinned central card from the public stream");
  const ids = entries(root).map(node => node.props["data-home-update-item"]);
  assert.deepEqual(ids, ["post:1", "post:5107"], "time order: the newer ordinary post first, the old pinned Post at its own time");
  assert.equal(root.root.findAll(node => node.props["data-home-update-pinned"] === "true").length, 0, "no pin badge");
  await act(async () => { root.unmount(); });
});

test("no source picker on the Home (it stays in the full \"עכשיו\" sheet); public group rows keep their displayed source status", async () => {
  const items = [postRowToWorldUpdate(post(1, 3)), group(1)].filter(Boolean);
  const root = await render({ feed: feedOf(items) });
  assert.equal(root.root.findAll(node => node.props["data-now-source"]).length, 0, "no source chips on the Home");
  assert.deepEqual(entries(root).map(node => node.props["data-home-update-item"]), ["group:20000000-0000-4000-8000-000000000001", "post:1"]);
  await act(async () => { root.unmount(); });
});

// ── ZURIEL 17.11.2026: the pinned מפת המציאות lead ("הדבר הנעוץ למעלה ... זה הבשר של האתר שלנו") ─────────────────────────────────────────────
const realityMap = (id, hours) => postRowToWorldUpdate(post(id, hours, { tags: ["מפת המציאות"] }));
test("the pinned lead is the newest מפת המציאות publication: the same model as the first row of \"עכשיו\", linked to its Post, with no time limit (it no longer leads the chronological strip)", async () => {
  const items = [realityMap(9, 200), realityMap(8, 300), postRowToWorldUpdate(post(1, 2)), postRowToWorldUpdate(post(2, 3))].filter(Boolean);
  const root = await renderTop({ feed: feedOf(items) });
  const lead = root.root.findAll(node => node.props["data-home-pinned-lead"])[0];
  assert.equal(lead.props["data-home-pinned-lead"], "feed");
  const link = lead.findAll(node => node.type === "a" && node.props["data-home-pinned-post"])[0];
  assert.equal(link.props["data-home-pinned-post"], "9", "the newest reality-map Post, even 200 hours old: no timer ends the pin");
  assert.equal(link.props.href, "/post/p-9");
  assert.match(link.findAll(node => node.props.className === "h29-pinlead-title")[0].children.join(""), /פוסט 9/);
  assert.equal(link.findAll(node => node.props["data-now-series-latest"] === "reality-map").length, 1, "the same mark as in \"עכשיו\" (blinks until entered)");
  const rows = entries(root).map(node => node.props["data-home-update-item"]);
  assert.deepEqual(rows, ["post:1", "post:2", "post:9", "post:8"], "D6 (25.11.2026): the flagship publications also stand in the chronological strip at their own time; the flagship area stays their dedicated place");
  await act(async () => { root.unmount(); });
});

test("before the shared feed arrives the series catalog's newest member stands in, drawn with its own cover copies; with nothing known yet the card keeps the same boxes", async () => {
  const cover = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/cover-9.jpg";
  const catalogItems = [{ id: "9", title: "פוסט 9", href: "/post/p-9", publishedAt: iso(5), coverUrl: cover, imageUrl: null }, { id: "8", title: "פוסט 8", href: "/post/p-8", publishedAt: iso(50), coverUrl: null, imageUrl: null }];
  let root = await renderTop({ feed: { loading: true, expandedRows: [] }, catalogItems });
  let lead = root.root.findAll(node => node.props["data-home-pinned-lead"])[0];
  assert.equal(lead.props["data-home-pinned-lead"], "catalog");
  const image = lead.findAllByType("img")[0];
  assert.equal(image.props.src, cover); assert.equal(image.props.fetchpriority, "high");
  assert.match(image.props.srcSet, /render\/image\/public\/.*width=480&quality=80&resize=contain 480w, .*width=768&quality=80&resize=contain 768w$/, "two of the Post's own copy widths, at its quality");
  assert.equal(image.props.width, "1280"); assert.equal(image.props.height, "720");
  await act(async () => { root.unmount(); });
  root = await renderTop({ feed: { loading: true, expandedRows: [] }, catalogItems: [] });
  lead = root.root.findAll(node => node.props["data-home-pinned-lead"])[0];
  assert.equal(lead.props["data-home-pinned-lead"], "loading");
  const box = lead.findAll(node => node.props.role === "status")[0];
  for (const part of ["h29-pinlead-media", "h29-pinlead-badge r29-badge is-pinned", "h29-pinlead-title", "h29-pinlead-meta", "h29-pinlead-cta r29-btn is-primary"]) {
    assert.equal(box.findAll(node => node.props.className === part).length, 1, `${part}: the same box while loading`);
  }
  assert.match(box.findAll(node => node.props.className === "h29-pinlead-title")[0].children.join(""), /טוען/);
  await act(async () => { root.unmount(); });
});

test("an owner pin with a central message changes nothing on the Home: no card, no summary layer, and the row is the Post at its own time (D2, 25.11.2026)", async () => {
  const withLead = pinnedItem(5, {});
  withLead.central = { ...withLead.central, kicker: "עדכון חדש בפוסט", lead: "הבורא פועל בהפוך על הפוך דרך כל המציאות" };
  const root = await renderTop({ feed: feedOf([withLead, postRowToWorldUpdate(post(1, 2))].filter(Boolean)) });
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-message"]).length, 0);
  assert.equal(root.root.findAll(node => node.props["data-now-pinned-update"] === "true").length, 0);
  assert.ok(entries(root).some(node => node.props["data-home-update-item"] === "post:5107"), "the Post is still reachable as an ordinary row");
  await act(async () => { root.unmount(); });
});

// ── ZURIEL 12.11.2026: a pinned writer message shows on Home, newest pin first, and is clickable ──────────────────────────────────────────
const levi = hours => groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000009", body: "גילוי של יניב", created_at: iso(hours), contributor_slug: "yaniv-levi", contributor_name: "יניב לוי", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "gilui-yomi" });
test("Home shows a writer's message at its own time, with no pin badge and a link to its source message (D2, 25.11.2026)", async () => {
  const root = await render({ feed: feedOf([postRowToWorldUpdate(post(1, 2)), levi(1), group(3)].filter(Boolean)) });
  const list = entries(root);
  const ids = list.map(node => node.props["data-home-update-item"]);
  assert.equal(ids[0], "group:20000000-0000-4000-8000-000000000009", "newest first (it is the newest, not because it was pinned)");
  assert.ok(ids.includes("group:20000000-0000-4000-8000-000000000001"));
  assert.equal(root.root.findAll(node => node.props["data-home-update-pinned"] === "true").length, 0, "no pin badge anywhere");
  const links = list[0].findAll(node => node.type === "a" && String(node.props.href).startsWith("/world#group-source-20000000-0000-4000-8000-000000000009"));
  assert.equal(links.length, 1, "the row is a link to the source message");
  await act(async () => { root.unmount(); });
});

test("a row without any address still opens the Now sheet (never a dead card)", async () => {
  let opened = 0;
  const noAddress = { ...levi(1), href: null, url: null };
  function OpenProbe({ feed }) {
    const updates = useHomeUpdates(feed, { postsOnly: false });
    const bare = models => models.map(model => ({ ...model, href: null }));
    updates.columns = { site: bare(updates.columns.site), sources: bare(updates.columns.sources), merged: bare(updates.columns.merged) };
    return React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => { opened += 1; } });
  }
  let root;
  await act(async () => { root = Renderer.create(React.createElement(OpenProbe, { feed: feedOf([noAddress].filter(Boolean)) })); });
  const open = root.root.findAll(node => node.type === "button" && node.props["data-home-update-opens-now"] === "true");
  assert.equal(open.length, 1);
  await act(async () => { open[0].props.onClick(); });
  assert.equal(opened, 1);
  await act(async () => { root.unmount(); });
});

test("Home shows ONE item per public source (its latest), keeps the 'מקור · טרם נבדק' label, and reuses the sheet's source logo even without a thumbnail", async () => {
  const first = group(1);
  const next = { ...first, id: "group:20000000-0000-4000-8000-000000000008", at: iso(2) };
  const photo = { ...gallery(1, 4), mediaHref: null };
  const root = await render({ feed: feedOf([first, next, photo]) });
  const [one, image] = entries(root);
  assert.equal(entries(root).length, 2, "the group's two messages are one source: only its latest is shown");
  assert.equal(one.props["data-home-update-item"], first.id);
  assert.match(one.findByType("small").children.map(child => typeof child === "string" ? child : child.children?.join("") || "").join(""), /טרם נבדק/);
  assert.ok(image.findAllByType("img").some(img => img.props.className.includes("is-logo")));
  await act(async () => { root.unmount(); });
});

// ── ZURIEL 25.11.2026: desktop two columns, phone one list, from the SAME rows ───────────────────────────────────────────────────────────────
test("desktop: two columns (the site's own updates | the latest of each source) from the same rows the phone shows as one chronological list", async () => {
  const items = [postRowToWorldUpdate(post(1, 30)), postRowToWorldUpdate(post(2, 10)), gallery(1, 2), group(1, 1)].filter(Boolean);
  const listIds = async () => { const root = await render({ feed: feedOf(items) }); const ids = entries(root).map(node => node.props["data-home-update-item"]); const layout = root.root.findAll(node => node.props["data-home-updates-layout"])[0].props["data-home-updates-layout"]; await act(async () => { root.unmount(); }); return { ids, layout }; };
  const phone = await listIds();
  assert.equal(phone.layout, "list");
  globalThis.window = { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
  try {
    const root = await render({ feed: feedOf(items) });
    assert.equal(root.root.findAll(node => node.props["data-home-updates-layout"])[0].props["data-home-updates-layout"], "columns");
    const col = key => root.root.findAll(node => node.props["data-home-updates-col"] === key)[0];
    const colIds = key => col(key).findAll(node => node.type === "li" && node.props["data-home-update-item"]).map(node => node.props["data-home-update-item"]);
    assert.deepEqual(colIds("site"), ["post:2", "post:1"], "the site's own updates, newest first");
    assert.deepEqual(colIds("sources"), ["group:20000000-0000-4000-8000-000000000001", "gallery:10000000-0000-4000-8000-000000000001"], "the latest of each public source");
    assert.deepEqual([...colIds("site"), ...colIds("sources")].sort(), [...phone.ids].sort(), "the same rows as the phone's list, nothing more and nothing less");
    assert.equal(root.root.findAll(node => node.type === "button" && node.props["data-building-signup"] === "home").length, 1, "the construction note and sign-up button close the region");
    await act(async () => { root.unmount(); });
  } finally { delete globalThis.window; }
});
