import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

// Load the actual JSX through Vite rather than testing a duplicate of the UI.
const server = await createServer({ logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
const { default: NumberZviPublicResearch2029, validFindingHref, validSourceHref } =
  await server.ssrLoadModule("/src/components/number2029/NumberZviPublicResearch2029.jsx");
const { default: NumberLivingWorld2029 } =
  await server.ssrLoadModule("/src/components/number2029/NumberLivingWorld2029.jsx");
after(async () => server.close());

const id = "00edc0d8-b792-45d9-aa86-d04b44600a3f";
const other = "a1e00000-0000-4000-8000-000000000001";
const sourceId = "e720a119-00e7-4e27-8c8a-d8671ae7b474";
const source = `/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A${sourceId}#source-occurrence-${sourceId}`;

test("public finding links bind the exact row and do not accept other targets", () => {
  assert.equal(validFindingHref(`/world?finding=${id}`, id), true);
  for (const href of [
    `/world?finding=${other}`, `https://outside.example/world?finding=${id}`,
    `/world?finding=${id}&finding=${other}`, `/world?finding=${id}&next=/private`,
    `/world?finding=${id}#unexpected`, "/world?finding=missing",
  ]) assert.equal(validFindingHref(href, id), false, href);
});

test("source links require the exact public source location, not a guessed or external URL", () => {
  assert.equal(validSourceHref(source), true);
  for (const href of [
    source.replace(sourceId, other),
    source.replace("tzvi-opoc", "other"),
    source + "&private=1",
    "https://outside.example/world?view=sources",
    "/world?view=sources&source=tzvi-opoc&sourceRef=missing",
  ]) assert.equal(validSourceHref(href), false, href);
});

test("an explicit numeric zero is accepted and initial render makes no request", () => {
  let calls = 0;
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(NumberZviPublicResearch2029, {
      value: 0,
      reader: () => { calls += 1; throw new Error("unexpected request"); },
      clientFactory: () => { calls += 1; throw new Error("unexpected client"); },
    })));
  assert.match(markup, /הצגת ממצאים למספר/);
  assert.equal(calls, 0);
  const invalid = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(NumberZviPublicResearch2029, { value: null })));
  assert.equal(invalid, "");
});

test("all-source navigation accepts exact native gallery and public Post paths only", () => {
  assert.equal(validSourceHref(`/world?view=gallery&gallery=29&image=${id}#gallery-source-${id}`), true);
  assert.equal(validSourceHref("/post/public-source"), true);
  for (const href of ["/post/public-source?private=1", "/post/%2fprivate", "//outside.test/post/name",
    `/world?view=gallery&gallery=29&image=${id}#gallery-source-${other}`,
    `/world?view=gallery&gallery=29&image=${id}&image=${other}#gallery-source-${id}`]) {
    assert.equal(validSourceHref(href), false);
  }
});

test("the real number page places the entry inside the existing source section", () => {
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(NumberLivingWorld2029, { root: 224 })));
  const sourceSection = markup.indexOf('id="number-content-live"');
  const zvi = markup.indexOf('aria-label="ממצאים ציבוריים למספר"');
  const depthGates = markup.indexOf('class="sod29-lw-depth-gates"');
  assert.ok(sourceSection >= 0 && zvi > sourceSection && depthGates > zvi);
  assert.match(markup.slice(zvi, depthGates), /הצגת ממצאים למספר/);
});
