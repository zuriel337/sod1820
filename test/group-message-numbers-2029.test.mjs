// Numbers in public group messages link to their Number page (ZURIEL 12.11.2026). Display only; branch-only, not deployed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import renderer, { act } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mount = (element) => { let tree; act(() => { tree = renderer.create(element); }); return tree; };
import { MemoryRouter } from "react-router-dom";
import { numberHref, splitGroupMessageNumbers } from "../src/lib/research/groupMessageNumbers2029.js";

// The real component, bundled the way the other mounted tests do it (JSX is not loadable by node directly).
const outfile = resolve(`.test-group-message-numbers-${process.pid}.mjs`);
await build({ entryPoints: [new URL("../src/components/research/GroupSourceMeta2029.jsx", import.meta.url).pathname], bundle: true, platform: "node", format: "esm", outfile,
  external: ["react", "react-router-dom"], loader: { ".css": "empty", ".js": "jsx" }, logLevel: "silent" });
const { GroupMessageText } = await import(pathToFileURL(outfile).href);
test.after(() => rm(outfile, { force: true }));

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const numbers = (text) => splitGroupMessageNumbers(text).filter((part) => part.number != null).map((part) => part.number);

test("standalone integers of 2-5 digits are links; the text is returned unchanged when joined", () => {
  assert.deepEqual(numbers("גימטריה 1237 ו־358 וגם ב-1820."), [1237, 358, 1820]);
  assert.deepEqual(numbers("ב־1237, ל-358: זה 26!"), [1237, 358, 26]);
  assert.deepEqual(numbers("[מספר] ו-1237."), [1237]);
  for (const text of ["גימטריה 1237 ו־358 וגם ב-1820.", "10.11.2026 22:41", "", "ללא מספרים"]) {
    assert.equal(splitGroupMessageNumbers(text).map((part) => part.text).join(""), text);
  }
  assert.deepEqual(splitGroupMessageNumbers(null), []);
});

test("not numbers: dates, times, decimals, ranges, phone-like runs, ids, web addresses, single digits, leading zeros, six digits", () => {
  for (const text of ["10.11.2026 בשעה 22:41", "3.14", "050-0000000", "12-14", "abc123", "123abc", "7", "00123", "123456", "1,237",
    "https://youtu.be/dQw4w9WgXcQ?t=123", "www.example.org/123", "youtube.com/watch?v=abc12345678&t=99", "50%"]) {
    assert.deepEqual(numbers(text), [], text);
  }
  assert.deepEqual(numbers("ראו https://youtu.be/dQw4w9WgXcQ?t=123 והמספר 358"), [358], "a number outside the address still links");
});

test("link target: the canonical Number page, nothing else", () => {
  assert.equal(numberHref(1237), "/number/1237");
  assert.equal(numberHref("12 3"), "/number/12%203");
});

const text = (tree) => JSON.stringify(tree);
test("GroupMessageText renders Router links, or self-navigating anchors without a Router; a modified click keeps the plain link", () => {
  const withRouter = mount(React.createElement(MemoryRouter, null, React.createElement("p", null, React.createElement(GroupMessageText, { text: "ב־1237 ו־358" }))));
  const links = withRouter.root.findAllByType("a");
  assert.deepEqual(links.map((node) => node.props.href), ["/number/1237", "/number/358"]);
  assert.deepEqual(links.map((node) => node.props["aria-label"]), ["למספר 1237", "למספר 358"]);
  assert.match(text(withRouter.toJSON()), /ב־/);
  const opened = [];
  const bare = mount(React.createElement("p", null, React.createElement(GroupMessageText, { text: "ראו 1237", onNumber: (href) => opened.push(href) })));
  const [anchor] = bare.root.findAllByType("a");
  let prevented = 0;
  anchor.props.onClick({ preventDefault() { prevented++; }, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 });
  assert.deepEqual(opened, ["/number/1237"]);
  assert.equal(prevented, 1);
  anchor.props.onClick({ preventDefault() { prevented++; }, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, button: 0 });
  assert.deepEqual(opened, ["/number/1237"], "cmd/ctrl click is left to the browser");
  assert.equal(prevented, 1);
});

test("the four group-message surfaces use it, and only for a group message", () => {
  assert.match(read("src/components/research/SourceArrivalList2029.jsx"), /<GroupMessageText text=\{item\.fullText\} \/>/);
  assert.match(read("src/components/research/ZviGroupTimeline2029.jsx"), /<GroupMessageText text=\{item\.fullText\} \/>/);
  assert.match(read("src/components/research/WorldPublicUpdates2029.jsx"), /<GroupMessageText text=\{item\.fullText\} \/>/);
  const now = read("src/components/experience2029/NowPublications2029.jsx");
  assert.match(now, /model\.item\?\.sourceKind === "group_message" \? <GroupMessageText text=\{model\.fullText\} onNumber=\{\(href\) => onOpen\?\.\(href\)\} \/> : model\.fullText/);
  assert.doesNotMatch(read("src/lib/research/groupMessageNumbers2029.js"), /fetch|rpc|supabase|import /, "pure: no network, no store, no import");
});
