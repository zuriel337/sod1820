import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = (await readFile(new URL("../src/components/gematria2029/CalculatorEqualsPreview2029.jsx", import.meta.url), "utf8"))
  .replace(/^import[^\n]*\n/gm, "");
const outfile = resolve(`.test-equals-lifecycle-${process.pid}.mjs`);
await build({ stdin: { contents: `
  import React,{useEffect,useMemo,useState} from 'react';
  import {collectVerifiedLookupMatches} from './src/lib/research/methodLensProjection.js';
  import {pickEqualsPreview} from './src/lib/research/equalsPreview.js';
  const useAuth=()=>globalThis.__equalsFixture.auth;
  const getNumberLookup=value=>globalThis.__equalsFixture.read(value);
  ${source}
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile,
external: ["react"], logLevel: "silent" });
const Preview = (await import(pathToFileURL(outfile))).default;
after(async () => { await rm(outfile, { force: true }); delete globalThis.__equalsFixture; });
const selection = value => ({ expression: "ביטוי הבדיקה", methodKey: "רגיל", methodLabel: "רגיל", resultValue: value });
const row = (phrase, value) => ({ phrase, value, method: "רגיל", is_verified: true, method_governed: true, method_active: true });
function fixture(id) {
  const state = { auth: { user: { id }, loading: false }, requests: [], read(value) {
    let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    state.requests.push({ value, resolve, reject }); return promise;
  } };
  globalThis.__equalsFixture = state; return state;
}
const snapshot = root => JSON.stringify(root.toJSON());
async function mount(value, onRender = () => {}) {
  let root;
  const tree = n => React.createElement(React.Profiler, { id: "preview", onRender: () => onRender(root) },
    React.createElement(Preview, { selection: selection(n), onOpenExpression() {}, onOpenAll() {} }));
  await act(async () => { root = Renderer.create(tree(value)); });
  return { root, update: async n => { await act(async () => { root.update(tree(n)); }); } };
}
async function tick(t) { await act(async () => { t.mock.timers.tick(351); }); }
async function settle(request, data) { await act(async () => { request.resolve(data); }); }
async function unmount(root) { await act(async () => { root.unmount(); }); }

test("a newly selected value never commits phrases from the previous value, even before passive cleanup", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture("stale-value-fixture"), commits = [];
  const { root, update } = await mount(358, current => { if (current) commits.push(snapshot(current)); });
  try {
    await tick(t); await settle(f.requests[0], [row("התאמה ישנה", 358)]);
    assert.match(snapshot(root), /התאמה ישנה/);
    commits.length = 0;
    await update(1820);
    assert.ok(commits.every(text => !text.includes("התאמה ישנה")), "old rows must not flash under a new numeric heading");
    await tick(t); await settle(f.requests.at(-1), [row("התאמה חדשה", 1820)]);
    assert.match(snapshot(root), /התאמה חדשה/); assert.ok(!snapshot(root).includes("התאמה ישנה"));
  } finally { await unmount(root); }
});

test("caller switch cancels partial data and never reuses another caller's lookup/cache", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture("caller-A-fixture"), { root, update } = await mount(702);
  try {
    await tick(t); const first = f.requests[0];
    f.auth = { user: { id: "caller-B-fixture" }, loading: false };
    await update(702); await tick(t);
    assert.equal(f.requests.length, 2, "the new caller gets its own authorized read");
    await settle(f.requests[1], [row("מידע של ב", 702)]);
    await settle(first, [row("מידע של א", 702)]);
    assert.match(snapshot(root), /מידע של ב/); assert.ok(!snapshot(root).includes("מידע של א"));
    f.auth = { user: null, loading: true }; await update(702);
    assert.equal(root.toJSON(), null, "pending identity must not expose a partial previous result");
  } finally { await unmount(root); }
});

test("an empty helper response is not retained indefinitely and a later mount can retry", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture("empty-retry-fixture"), first = await mount(12340);
  await tick(t); await settle(f.requests[0], []); await unmount(first.root);
  const second = await mount(12340);
  try {
    await tick(t); assert.equal(f.requests.length, 2);
    await settle(f.requests[1], [row("התאמה שהגיעה", 12340)]);
    assert.match(snapshot(second.root), /התאמה שהגיעה/);
  } finally { await unmount(second.root); }
});
