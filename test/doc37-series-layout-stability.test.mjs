import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";

// Exercise the real presentation components/effects with a controlled pending
// metadata reader. No browser timings, network, identity or product writes.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = await readFile(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("// The actual messages"), source.indexOf("function PostIndexCard"));
const outfile = resolve(`.test-series-layout-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React, {useState,useEffect} from 'react';
  import {CONTENT_SERIES_2029} from './src/lib/research/contentSeries2029Identity.js';
  const fetchContentSeriesCatalog2029 = options => globalThis.__seriesLayout.read(options);
  const AUTHORS = {}, POST_BACKGROUND_ASSETS_2029 = {};
  const NavigationIcon2029 = () => React.createElement('span', {'aria-hidden':true});
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  ${components}
  export {SeriesEntrances2029,SeriesReadingNotice2029};
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile, external: ["react"] });
const { SeriesEntrances2029, SeriesReadingNotice2029 } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); delete globalThis.__seriesLayout; });

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture() {
  const f = { calls: [], read(options) { const d = deferred(); f.calls.push({ ...d, ...options }); return d.promise; } };
  globalThis.__seriesLayout = f;
  return f;
}
const packet = () => ({ series: CONTENT_SERIES_2029.map(spec => ({ ...spec, items: [{ imageUrl: `https://fixture.invalid/${spec.key}.jpg` }] })) });
const links = root => root.root.findAllByType("a").map(link => ({ href: link.props.href,
  current: link.props["aria-current"], title: link.findByType("h3").children.join("") }));

test("all canonical entrances are usable before metadata, and metadata adds no new navigation cards", async () => {
  const f = fixture(), reads = []; let root;
  await act(async () => { root = Renderer.create(React.createElement(SeriesEntrances2029, {
    activeKey: "messages-from-righteous", onRead: result => reads.push(result),
  })); });
  const initial = links(root);
  assert.equal(initial.length, CONTENT_SERIES_2029.length, "one entrance per canonical series (reality-map is first; the others keep their order)");
  assert.deepEqual(initial.map(link => link.title), CONTENT_SERIES_2029.map(spec => spec.label));
  assert.deepEqual(initial.map(link => link.href), CONTENT_SERIES_2029.map(spec => `/2029/posts?series=${spec.key}`));
  assert.equal(initial.find(link => link.current === "page").title, "מסרים מצדיקים");
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].limitPerSeries, 1);
  assert.equal(f.calls[0].sourceSeriesKey, "messages-from-righteous");
  assert.equal(reads[0].loading, true);
  await act(async () => { f.calls[0].resolve(packet()); });
  assert.deepEqual(links(root), initial);
  assert.equal(root.root.findAllByType("img").length, CONTENT_SERIES_2029.length);
  assert.equal(f.calls.length, 1, "cover update does not start another reader");
  assert.equal(reads.at(-1).loading, false);
  assert.equal(root.root.findByType("button").props.disabled, true, "inactive retry is not focusable");
  await act(async () => { root.unmount(); });
  assert.equal(f.calls[0].signal.aborted, true);
});

test("failure retains canonical links, exposes one retry, and aborts the old reader on retry", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(SeriesEntrances2029, { activeKey: null })); });
  const initial = links(root);
  await act(async () => { f.calls[0].reject(new Error("controlled metadata failure")); });
  assert.deepEqual(links(root), initial);
  const retry = root.root.findByType("button");
  assert.equal(retry.props.disabled, false);
  assert.equal(retry.parent.props["aria-hidden"], false);
  await act(async () => { retry.props.onClick(); });
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0].signal.aborted, true);
  assert.deepEqual(links(root), initial);
  await act(async () => { root.unmount(); });
  assert.equal(f.calls[1].signal.aborted, true);
});

test("known series search is independent of source loading and remains stable after it completes", async () => {
  const f = fixture(); let root;
  await act(async () => { root = Renderer.create(React.createElement(SeriesEntrances2029, { activeKey: null, search: "מימד" })); });
  assert.deepEqual(links(root).map(link => link.title), ["מימד חמש"]);
  await act(async () => { f.calls[0].resolve(packet()); });
  assert.deepEqual(links(root).map(link => link.title), ["מימד חמש"]);
  await act(async () => { root.unmount(); });
});

test("pending, failure and completion retain intrinsic geometry and expose only the meaningful current message/action", async () => {
  const props = { pendingText: "מקור בטעינה", failureText: "המקור לא זמין; הפוסטים נשארים", readyText: "הסדרה מסודרת לפי מועד הפרסום", retryLabel: "ניסיון נוסף", onRetry() {} };
  let root;
  for (const [pending, failed] of [[true, false], [false, true], [false, false]]) {
    await act(async () => {
      const tree = React.createElement(SeriesReadingNotice2029, { ...props, pending, failed });
      if (root) root.update(tree); else root = Renderer.create(tree);
    });
    const notice = root.root.findByProps({ role: "status" });
    assert.equal(notice.children.length, 3, "sizing content is retained in every state");
    assert.deepEqual(notice.findAllByType("p").map(p => p.children.join("")), [props.pendingText, props.failureText, props.readyText]);
    assert.equal(notice.children[0].props["aria-hidden"], !pending || failed);
    assert.equal(notice.children[1].props["aria-hidden"], !failed);
    assert.equal(notice.children[2].props["aria-hidden"], pending || failed);
    assert.equal(notice.findByType("button").props.disabled, !failed);
  }
  await act(async () => { root.unmount(); });
});
