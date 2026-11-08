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
  import {nowModels} from './src/lib/nowPublications2029.js';
  import {relativeTimeLabel} from './src/lib/relativeTime2029.js';
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = ({src, className}) => React.createElement('img', {src, alt:'', className});
  ${components}
  export {HomeLiveUpdates, useHomeUpdates, HomeEntryBand};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"] });
const { HomeLiveUpdates, useHomeUpdates, HomeEntryBand } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); });

const NOW = Date.now();
const iso = hoursAgo => new Date(NOW - hoursAgo * 3600e3).toISOString();
const post = (id, hours, extra = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null, source: "sod1820", wp_id: 50000 + id, home_hidden: false, date: iso(hours), created_at: iso(hours), modified: iso(hours), ...extra });
const gallery = (n, hours) => publicGalleryToSystemItem({ id: `10000000-0000-4000-8000-00000000000${n}`, image_url: `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/g${n}.jpg`, name: `תמונה מזרם המציאות ${n}`, description: "", source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: iso(hours), created_at: iso(hours), wp_gallery_id: 7 });
const group = hours => groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: "הודעת מקור שטרם נבדקה", created_at: iso(hours), contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
const feedOf = (items, loading = false) => ({ loading, expandedRows: feedRows(items, { now: NOW, limit: 160, caps: { post: 40, group: 40, gallery: 10 } }) });
function Probe({ feed, exclude = new Set(), postsOnly = false }) {
  const updates = useHomeUpdates(feed, { exclude, postsOnly });
  return React.createElement(HomeLiveUpdates, { updates, onOpenNow: () => {} });
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

test("at most four items; anything already shown by the flagship region or ciphers is not repeated; posts-only while the world is closed", async () => {
  const items = [1, 2, 3, 4, 5].map(n => postRowToWorldUpdate(post(n, n))).concat([gallery(2, 0.5)]).filter(Boolean);
  let root = await render({ feed: feedOf(items) });
  assert.equal(entries(root).length, 4);
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
  assert.equal(root.root.findAll(node => node.type === "li" && String(node.props.className).includes("h29-skel")).length, 4);
  assert.equal(root.root.findAll(node => node.props["data-home-top-updates"] === "live")[0].props["aria-busy"], true);
  await act(async () => { root.unmount(); });
  for (const feed of [null, feedOf([]), feedOf([group(1)].filter(Boolean))]) {
    root = await render({ feed });
    assert.equal(root.toJSON(), null);
    await act(async () => { root.unmount(); });
  }
});

test("Home order: ELS, latest ciphers, live updates, flagship region, entrances, other series; the end is statistics then the newsletter", () => {
  const body = source.slice(source.indexOf(`data-experience-capability="home-composition"`));
  const order = ["elsEntry ? <Reveal", '<Section label="הצפנים האחרונים בתורה">', "<HomeLiveUpdates", "<HomeFlagshipRegion", "<HomeEntryBand", "<HomeOtherSeries"].map(marker => body.indexOf(marker));
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
