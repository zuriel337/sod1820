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
assert.ok(components.includes("function HomeSeriesCards") && components.includes("function PrimarySeriesCard"));
const outfile = resolve(`.test-reality-map-home-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useState,useEffect} from 'react';
  import {CONTENT_SERIES_2029} from './src/lib/research/contentSeries2029Identity.js';
  import {seriesHomeTeaser2029} from './src/lib/research/contentSeries2029Projection.js';
  const fetchContentSeriesCatalog2029 = options => globalThis.__homeSeries.read(options);
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  const Media = ({src}) => React.createElement('img', {src, alt:''});
  const PublicationTime = () => React.createElement('time');
  const UpdatedTime = () => null;
  const Section = ({title, link, children, className}) => React.createElement('section', {className, 'aria-label': title}, link, children);
  ${components}
  export {HomeSeriesCards, PrimarySeriesCard};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"] });
const { HomeSeriesCards, PrimarySeriesCard } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__homeSeries; });

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() { const f = { calls: [], read(options) { const d = deferred(); f.calls.push({ ...d, ...options }); return d.promise; } }; globalThis.__homeSeries = f; return f; }
const item = (series, id) => ({ id, href: `/post-${id}`, title: `פוסט ${id}`, author: "כותב", imageUrl: null, publishedAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" });
const catalog = (withMember = false) => ({ series: CONTENT_SERIES_2029.map(spec => ({
  key: spec.key, label: spec.label, priorityLane: spec.priorityLane, writerLabel: spec.writerLabel, publisherLabel: spec.publisherLabel, readState: "measured",
  items: spec.key === "reality-map" ? (withMember ? [item(spec.key, 77)] : []) : [item(spec.key, spec.key.length)], hasApprovedSources: false, sourcesRequested: false })) });
const cards = root => root.root.findAll(node => node.type === "article" && node.props["data-home-series"]);
const hrefs = node => node.findAllByType("a").map(link => link.props.href);

test("loading: the approved sample card is first and static; no series link and no empty card", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  const [primary, ...rest] = cards(root);
  assert.equal(rest.length, 0, "other series wait for their reader; skeletons only");
  assert.equal(primary.props["data-home-series"], "reality-map");
  assert.equal(primary.props["data-home-series-primary"], "true");
  assert.deepEqual(hrefs(primary), ["/post/chibur-bein-hasafot-mafteach-lagan"], "only the source Post link while the series has no member");
  assert.equal(primary.findAllByType("h3").length, 1, "the series name is not a link to an empty page");
  const skeletons = root.root.findAll(node => node.type === "div" && String(node.props.className).includes("h29-skel"));
  assert.equal(skeletons.length, CONTENT_SERIES_2029.length - 1);
  assert.equal(f.calls[0].homeOnly, true); assert.equal(f.calls[0].limitPerSeries, 1);
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

test("loaded without a member: primary first, then the other series in their existing order", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(HomeSeriesCards)); });
  await act(async () => { f.calls[0].resolve(catalog(false)); });
  const found = cards(root);
  assert.deepEqual(found.map(node => node.props["data-home-series"]), CONTENT_SERIES_2029.map(spec => spec.key));
  assert.deepEqual(found.slice(1).map(node => node.props["data-home-series"]), ["mah-kore-habora", "dimension-five", "sod-hashmal", "messages-from-righteous"]);
  assert.deepEqual(hrefs(found[0]), ["/post/chibur-bein-hasafot-mafteach-lagan"]);
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
  assert.equal(links.filter(href => href === "/2029/posts?series=reality-map").length, 2, "name and 'open the series'");
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
