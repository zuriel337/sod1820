import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";

// Real Home series components with a controlled catalog reader. No network, browser timing or product write.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("// Latest published item of a series"), source.indexOf("function AvailabilityItem("));
assert.ok(components.includes("function useHomeSeries") && components.includes("function HomeFlagshipRegion") && components.includes("function HomeOtherSeries") && components.includes("function PrimarySeriesCard"));
const outfile = resolve(`.test-reality-map-home-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useState,useEffect,useMemo} from 'react';
  import {CONTENT_SERIES_2029} from './src/lib/research/contentSeries2029Identity.js';
  import {seriesHomeTeaser2029, seriesHomeFamilies2029, seriesFamilyRows2029} from './src/lib/research/contentSeries2029Projection.js';
  const BRAND_LOCKUP_NAV_2029 = { src: '/brand/2029/canonical-lockup-128.webp', width: 128, height: 128, alt: 'x' };
  const fetchContentSeriesCatalog2029 = options => globalThis.__homeSeries.read(options);
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = ({src, className}) => React.createElement('img', {src, alt:'', className});
  const PublicationTime = () => React.createElement('time');
  const UpdatedTime = () => null;
  const nowModels = () => [];
  const SeriesBell2029 = ({seriesKey}) => React.createElement('i', {'data-bell': seriesKey});
  const relativeTimeLabel = () => '';
  const Section = ({title, link, children, className}) => React.createElement('section', {className, 'aria-label': title}, link, children);
  ${components}
  // The Home composition renders the two areas from one shared read; this wrapper does the same for the test.
  const HomeSeriesCards = () => { const state = useHomeSeries(); return React.createElement(React.Fragment, null, React.createElement(HomeFlagshipRegion, {state}), React.createElement(HomeOtherSeries, {state})); };
  export {HomeSeriesCards, PrimarySeriesCard};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"] });
const { HomeSeriesCards, PrimarySeriesCard } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__homeSeries; });

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() { const f = { calls: [], read(options) { const d = deferred(); f.calls.push({ ...d, ...options }); return d.promise; } }; globalThis.__homeSeries = f; return f; }
const item = (series, id, extra = {}) => ({ id, sourceRef: `posts:${id}`, href: `/post-${id}`, title: `פוסט ${id}`, author: "כותב", imageUrl: null, publishedAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", categories: [], ...extra });
// `members` = the reality-map members the reader returned (true = one member, or an explicit array of items, newest first).
const catalog = (members = false) => { const list = members === true ? [item("reality-map", 77)] : Array.isArray(members) ? members : [];
  return { series: CONTENT_SERIES_2029.map(spec => ({
    key: spec.key, label: spec.label, priorityLane: spec.priorityLane, writerLabel: spec.writerLabel, publisherLabel: spec.publisherLabel, readState: "measured",
    total: spec.key === "reality-map" ? list.length : 1,
    items: spec.key === "reality-map" ? list : [item(spec.key, spec.key.length)], hasApprovedSources: false, sourcesRequested: false })) }; };
const cards = root => root.root.findAll(node => node.type === "article" && node.props["data-home-series"]);
const hrefs = node => node.findAllByType("a").map(link => link.props.href);
const nonFamilyHrefs = node => hrefs(node).filter(href => !href.startsWith("/2029/posts?category=") && !href.startsWith("/post-") && !href.startsWith("/2029/posts?series="));

test("loading: the approved sample card is first and static; no series link and no empty card", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  const [primary, ...rest] = cards(root);
  assert.equal(rest.length, 0, "other series wait for their reader; skeletons only");
  assert.equal(primary.props["data-home-series"], "reality-map");
  assert.equal(primary.props["data-home-series-primary"], "true");
  assert.deepEqual(nonFamilyHrefs(primary), ["/post/chibur-bein-hasafot-mafteach-lagan"], "only the source Post link (besides the family entrances) while the series has no member");
  assert.equal(primary.findAllByType("h3").length, 1, "the series name is not a link to an empty page");
  const skeletons = root.root.findAll(node => node.type === "div" && String(node.props.className).includes("h29-skel"));
  assert.equal(skeletons.length, CONTENT_SERIES_2029.length - 1);
  assert.equal(f.calls[0].homeOnly, true); assert.equal(f.calls[0].homeDisplay, true, "each series shows its own explicit count (identity homeDisplay)");
  await act(async () => { root.unmount(); });
});

test("the sample renders the Post's own letter tiles and total, with an accessible text, and no free text beyond the quote", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  const teaser = cards(root)[0].findAll(node => node.type === "a" && node.props["data-home-series-teaser"])[0];
  const tiles = teaser.findAll(node => node.type === "i");
  assert.deepEqual(tiles.map(node => node.children.map(child => typeof child === "string" ? child : child.children.join("")).join("")), ["B2", "E5", "R18", "E5", "S19", "H8", "I9", "T20"]);
  assert.ok(teaser.findAll(node => node.type === "b").some(node => node.children.join("") === "= 86"));
  assert.match(teaser.props["aria-label"], /Bereshit = 86/); assert.match(teaser.props["aria-label"], /שבילי שפה/);
  assert.equal(teaser.findAll(node => node.props["aria-hidden"] === "true").length >= 1, true, "decorative tiles are hidden from assistive tech");
  await act(async () => { root.unmount(); });
});

test("family rows (option C): three exact category links in the family order and one non-link 'soon'; no member needed", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  const section = cards(root)[0].findAll(node => node.props["data-home-rm-products"] === "true")[0];
  assert.ok(section, "family rows present even before any member exists");
  const rows = section.findAll(node => node.type === "div" && node.props["data-home-family"]);
  assert.deepEqual(rows.map(row => [row.props["data-home-family"], decodeURIComponent(row.findAllByType("a")[0].props.href)]), [
    ["sod-1820", "/2029/posts?category=סוד 1820"], ["movies-cipher", "/2029/posts?category=הצופן בסרטים"], ["language-paths", "/2029/posts?category=שבילי שפה"]]);
  const soon = section.findAll(node => node.type === "span" && node.props["data-home-family"] === "redemption");
  assert.equal(soon.length, 1); assert.match(String(soon[0].props.className), /soon/);
  assert.equal(section.findAll(node => node.type === "a" && node.props["data-home-family"] === "redemption").length, 0);
  await act(async () => { root.unmount(); });
});

test("loaded without a member: primary first, then the other series in their existing order", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  await act(async () => { f.calls[0].resolve(catalog(false)); });
  const found = cards(root);
  assert.deepEqual(found.map(node => node.props["data-home-series"]), CONTENT_SERIES_2029.map(spec => spec.key));
  assert.deepEqual(found.slice(1).map(node => node.props["data-home-series"]), ["mah-kore-habora", "dimension-five", "sod-hashmal", "messages-from-righteous"]);
  assert.deepEqual(nonFamilyHrefs(found[0]), ["/post/chibur-bein-hasafot-mafteach-lagan"]);
  for (const other of found.slice(1)) assert.ok(hrefs(other)[0].startsWith("/2029/posts?series="), "other series keep their own name link");
  assert.equal(root.root.findAll(node => String(node.props.className).includes("h29-skel")).length, 0);
  await act(async () => { root.unmount(); });
});

test("with a member the primary card links the series page, shows the latest item, and keeps the sample", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  await act(async () => { f.calls[0].resolve(catalog(true)); });
  const primary = cards(root)[0];
  const links = hrefs(primary);
  assert.equal(links[0], "/2029/posts?series=reality-map", "series name opens the series page");
  assert.ok(links.includes("/post/chibur-bein-hasafot-mafteach-lagan") && links.includes("/post-77"));
  assert.equal(links.filter(href => href === "/2029/posts?series=reality-map").length, 2, "name and 'to all posts in the series'");
  await act(async () => { root.unmount(); });
});

test("a failed catalog read keeps the static approved sample and reports the failure for the rest", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  await act(async () => { f.calls[0].reject(new Error("offline")); });
  assert.deepEqual(cards(root).map(node => node.props["data-home-series"]), ["reality-map"]);
  assert.ok(root.root.findAll(node => node.props.role === "alert").length >= 1);
  await act(async () => { root.unmount(); });
});

test("a primary card is never empty: no sample and no member renders nothing", async () => {
  const spec = CONTENT_SERIES_2029[0];
  let root;
  await act(async () => { root = Renderer.create(React.createElement(PrimarySeriesCard, { series: null, spec, teaser: null })); });
  assert.equal(root.toJSON(), null);
  await act(async () => { root.update(React.createElement(PrimarySeriesCard, { series: { items: [] }, spec, teaser: null })); });
  assert.equal(root.toJSON(), null);
  await act(async () => { root.unmount(); });
});

test("hierarchy: logo and identity, then the title, then the leading sample, then the flagship products, then the families", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  await act(async () => { f.calls[0].resolve(catalog([item("reality-map", 3, { publishedAt: "2026-11-05T00:00:00Z" }), item("reality-map", 2, { publishedAt: "2026-11-03T00:00:00Z" })])); });
  const article = root.root.findAll(node => node.type === "article" && node.props["data-home-series-primary"] === "true")[0];
  const order = article.findAll(node => node.parent === article && (node.props["data-home-rm-identity"] || node.props["data-home-series-teaser"] || node.props["data-home-rm-products"] || node.props["data-home-series-families"] || /h29-series-head/.test(String(node.props.className))))
    .map(node => node.props["data-home-rm-identity"] ? "identity" : node.props["data-home-series-teaser"] ? "sample" : node.props["data-home-rm-products"] ? "products" : node.props["data-home-series-families"] ? "families" : "title");
  assert.deepEqual(order, ["identity", "title", "sample", "products"]);
  const logo = article.findAll(node => node.type === "img" && /h29-rm-logo/.test(String(node.props.className)))[0];
  assert.ok(logo && /canonical-lockup-128\.webp$/.test(logo.props.src), "the existing approved lockup, not a new mark");
  assert.equal(logo.props.width, 128); assert.equal(logo.props.height, 128);
  assert.match(article.findAll(node => node.props["data-home-rm-identity"])[0].findAll(node => node.type === "b")[0].children.join(""), /כי לה׳ המלוכה/);
  await act(async () => { root.unmount(); });
});

test("family rows: each family shows the newest member of its OWN category, linking to that Post; members outside any family go to a short 'more' list; the sample stays outside", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  const members = [item("reality-map", 9, { title: "מטריקס חדש", categories: ["הצופן בסרטים"], imageUrl: "https://example.test/9.jpg", publishedAt: "2026-11-05T09:00:00Z" }),
    item("reality-map", 8, { title: "דיונון ישן יותר", categories: ["הצופן בסרטים"], publishedAt: "2026-10-20T09:00:00Z" }),
    item("reality-map", 4, { title: "שבילי שפה", categories: ["שבילי שפה", "רמזים חזקים"], publishedAt: "2026-10-01T09:00:00Z" }),
    item("reality-map", 2, { title: "ברכת כהנים", categories: ["גימטריה מרחבית"], publishedAt: "2026-08-01T09:00:00Z" })];
  await act(async () => { f.calls[0].resolve(catalog(members)); });
  assert.equal(f.calls[0].homeDisplay, true); assert.equal(f.calls[0].homeOnly, true);
  const products = root.root.findAll(node => node.props["data-home-rm-products"] === "true")[0];
  const row = key => products.findAll(node => node.type === "div" && node.props["data-home-family"] === key)[0];
  assert.equal(row("sod-1820").findAll(node => node.props["data-home-rm-item"]).length, 0, "no member of that category: the row keeps only its link");
  const cipher = row("movies-cipher").findAll(node => node.type === "a" && node.props["data-home-rm-item"])[0];
  assert.equal(cipher.props["data-home-rm-item"], 9); assert.equal(cipher.props.href, "/post-9", "the newest of the family");
  assert.ok(cipher.findAll(node => node.type === "img" && node.props.src === "https://example.test/9.jpg").length === 1, "thumbnail when the data has one");
  assert.equal(cipher.findAll(node => node.type === "time").length, 1, "publication date");
  assert.equal(row("language-paths").findAll(node => node.type === "a" && node.props["data-home-rm-item"])[0].props.href, "/post-4");
  const rest = products.findAll(node => node.type === "ul")[0];
  assert.deepEqual(rest.findAll(node => node.type === "a" && node.props["data-home-rm-item"]).map(node => node.props["data-home-rm-item"]), [8, 2], "not shown by a row, newest first");
  assert.equal(products.findAll(node => node.props["data-home-series-teaser"]).length, 0, "the sample is not part of the rows");
  assert.equal(products.findAll(node => node.type === "h4")[0].children.some(child => child.type === "small" && child.children.join("") === "4"), true, "member count");
  await act(async () => { root.unmount(); });
});

test("adding the tag adds a Post to the list and removing it removes the Post (membership is read, never remembered)", async () => {
  const mount = async members => { const f = fixture(); let root;
    await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
    await act(async () => { f.calls[0].resolve(catalog(members)); });
    const ids = root.root.findAll(node => node.type === "a" && node.props["data-home-rm-item"]).map(node => node.props["data-home-rm-item"]);
    const hasProducts = root.root.findAll(node => node.props["data-home-rm-products"] === "true").length > 0;
    await act(async () => { root.unmount(); }); return { ids, hasProducts }; };
  assert.deepEqual(await mount([]), { ids: [], hasProducts: true }, "no member: only the family links (no Post, no series link)");
  assert.deepEqual((await mount([item("reality-map", 5)])).ids, [5], "tag added to 5");
  assert.deepEqual((await mount([item("reality-map", 6), item("reality-map", 5)])).ids, [6, 5], "tag added to 6: newest first");
  assert.deepEqual((await mount([item("reality-map", 6)])).ids, [6], "tag removed from 5: it leaves the list");
  assert.deepEqual(await mount([]), { ids: [], hasProducts: true }, "tag removed from the last member: the Post disappears");
});
