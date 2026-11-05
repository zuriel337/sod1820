// Contract: every global navigation destination owns one picture, and that picture is a real, catalogued shape.
//
// Why this exists (5.11.2026, live scan of the rail at 1440px): the calculator and the Number page both showed "123", Books and
// Beit Midrash both showed the open book, the World and the site map both showed the globe, and Community, "Updates by mail" and
// "Privacy" all showed the generic tools grid, because their text glyphs were shared or missing from the glyph table and the
// component falls back to the tools grid without anyone noticing. Nothing checked that destinations look different.
//
// The check reads the four navigation lists exactly as SystemFrame2029.jsx defines them, renders every item through the REAL
// NavigationIcon2029 (bundled with esbuild, server-rendered with react-dom) and fails on what a visitor would see, not on what a
// table claims. No browser, no network, no react-test-renderer.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "nav-symbols-"));
after(() => rm(scratch, { recursive: true, force: true }));

const outfile = join(scratch, "navigation-icon.mjs");
await build({
  stdin: {
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import Icon, { ICON_CATALOG, NAVIGATION_ICON_NAMES } from "./src/components/experience2029/NavigationIcon2029.jsx";
      export const render = (props) => renderToStaticMarkup(React.createElement(Icon, props));
      export { ICON_CATALOG, NAVIGATION_ICON_NAMES };
    `,
    loader: "jsx",
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "silent",
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"' },
  // react-dom/server is CommonJS and asks for Node built-ins; give the bundle a real require.
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
});
const { render, ICON_CATALOG, NAVIGATION_ICON_NAMES } = await import(pathToFileURL(outfile));

const frameSource = await readFile(join(root, "src/components/experience2029/SystemFrame2029.jsx"), "utf8");
const LIST_NAMES = ["HOME_NAV", "DIRECT_NAV", "CORE_HOME_NAV", "CORE_DIRECT_NAV"];

/** The text of `const NAME = [ ... ];` as written in the frame (each list ends on a line that is just `];`). */
function listLiteral(name) {
  const header = `const ${name} = [`;
  const start = frameSource.indexOf(header);
  assert.notEqual(start, -1, `${name} is defined in SystemFrame2029.jsx`);
  assert.equal(frameSource.indexOf(header, start + 1), -1, `${name} is defined once`);
  const end = frameSource.indexOf("\n];", start);
  assert.notEqual(end, -1, `${name} ends with a line that is just "];"`);
  return frameSource.slice(start + `const ${name} = `.length, end + 3);
}

/** Evaluates the real lists. `publicFoundationPreview` is the only switch they read. */
function navigationLists(publicFoundationPreview) {
  const body = LIST_NAMES.map((name) => `const ${name} = ${listLiteral(name)};`).join("\n");
  return new Function("publicFoundationPreview", `${body}\nreturn { ${LIST_NAMES.join(", ")} };`)(publicFoundationPreview);
}

const innerGeometry = (markup) => markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const catalogued = new Set(ICON_CATALOG.map((icon) => icon.name));

/** Returns a list of human-readable problems; empty means the rails are sound. */
function auditRails(rails) {
  const problems = [];
  for (const [railName, items] of Object.entries(rails)) {
    const bySymbol = new Map();
    const byGeometry = new Map();
    for (const item of items) {
      const where = `${railName} · "${item.label}"`;
      if (typeof item.symbol !== "string" || item.symbol === "") { problems.push(`${where}: no symbol is named`); continue; }
      if (!catalogued.has(item.symbol)) problems.push(`${where}: "${item.symbol}" is not in the icon catalogue`);
      const markup = render({ name: item.symbol });
      if (markup.includes("data-icon-fallback")) problems.push(`${where}: "${item.symbol}" falls back to the generic tools grid`);
      if (!markup.includes(`data-icon-name="${item.symbol}"`)) problems.push(`${where}: "${item.symbol}" is an alias and renders another picture`);
      if (bySymbol.has(item.symbol)) problems.push(`${where}: shares the symbol "${item.symbol}" with "${bySymbol.get(item.symbol)}"`);
      else bySymbol.set(item.symbol, item.label);
      const geometry = innerGeometry(markup);
      if (byGeometry.has(geometry) && byGeometry.get(geometry).symbol !== item.symbol) {
        problems.push(`${where}: draws the same picture as "${byGeometry.get(geometry).label}"`);
      } else if (!byGeometry.has(geometry)) byGeometry.set(geometry, { symbol: item.symbol, label: item.label });
    }
  }
  return problems;
}

/** Every rail a visitor can be shown: the public-foundation build and the default build, each in its normal and core-public variant. */
function realRails() {
  const rails = {};
  for (const publicFoundationPreview of [true, false]) {
    const lists = navigationLists(publicFoundationPreview);
    const tag = publicFoundationPreview ? "public foundation" : "default";
    rails[`${tag} rail`] = [...lists.HOME_NAV, ...lists.DIRECT_NAV];
    rails[`${tag} core rail`] = [...lists.CORE_HOME_NAV, ...lists.CORE_DIRECT_NAV];
  }
  return rails;
}

test("every navigation destination names a catalogued symbol, none is shared and none falls back", () => {
  const rails = realRails();
  assert.ok(Object.values(rails).every((items) => items.length >= 11), "the rails were read in full, not an empty or partial list");
  assert.deepEqual(auditRails(rails), []);
});

test("the destinations that used to look alike each have their own picture", () => {
  const { HOME_NAV, DIRECT_NAV } = navigationLists(true);
  const symbolOf = (label) => [...HOME_NAV, ...DIRECT_NAV].find((item) => item.label === label)?.symbol;
  assert.notEqual(symbolOf("מחשבון גימטריה"), symbolOf("דף המספר"), "calculator and Number page");
  assert.notEqual(symbolOf("ספרים ומקורות"), symbolOf("בית המדרש"), "Books and Beit Midrash");
  assert.notEqual(symbolOf("העולם"), symbolOf("מפת האתר"), "World and site map");
  assert.equal(new Set([symbolOf("קהילה"), symbolOf("עדכונים במייל"), symbolOf("פרטיות")]).size, 3, "Community, updates and privacy");
  assert.equal(symbolOf("קהילה"), "community", "Community is the people symbol, not the tools grid");
  assert.equal(symbolOf("דף המספר"), "number");
  assert.equal(symbolOf("ספרים ומקורות"), "books");
});

test("one destination keeps one symbol in every rail variant", () => {
  const labelToSymbol = new Map();
  const symbolToLabel = new Map();
  for (const items of Object.values(realRails())) {
    for (const { label, symbol } of items) {
      assert.equal(labelToSymbol.get(label) ?? symbol, symbol, `"${label}" must not change picture between rails`);
      assert.equal(symbolToLabel.get(symbol) ?? label, label, `"${symbol}" must not be reused by another destination`);
      labelToSymbol.set(label, symbol);
      symbolToLabel.set(symbol, label);
    }
  }
});

test("the audit really catches the failures that shipped (negative controls)", () => {
  const rail = (...items) => ({ rail: items });
  // Missing symbol: the old shape of the data, where only a text glyph was given.
  assert.match(auditRails(rail({ label: "מחשבון גימטריה", icon: "123" })).join("\n"), /no symbol is named/);
  // Two destinations sharing one picture (calculator and Number page both "123").
  assert.match(auditRails(rail({ label: "א", symbol: "number" }, { label: "ב", symbol: "number" })).join("\n"), /shares the symbol "number"/);
  // A name that is not a shape falls back to the generic tools grid without any error.
  const unknown = auditRails(rail({ label: "קהילה", symbol: "people-group" })).join("\n");
  assert.match(unknown, /not in the icon catalogue/);
  assert.match(unknown, /falls back to the generic tools grid/);
  // An alias renders another destination's picture.
  assert.match(auditRails(rail({ label: "מחשבון", symbol: "gematria" }, { label: "דף המספר", symbol: "number" })).join("\n"), /alias and renders another picture/);
  // The old glyph path really did produce the reported duplicates and the silent fallback.
  assert.equal(innerGeometry(render({ glyph: "123", label: "מחשבון גימטריה" })), innerGeometry(render({ glyph: "123", label: "דף המספר" })), "the old glyph gave both the same picture");
  assert.equal(innerGeometry(render({ glyph: "▤", label: "ספרים ומקורות" })), innerGeometry(render({ glyph: "▤", label: "בית המדרש" })));
  assert.equal(innerGeometry(render({ glyph: "◌", label: "העולם" })), innerGeometry(render({ glyph: "◌", label: "מפת האתר" })));
  assert.ok(render({ glyph: "☆", label: "קהילה" }).includes("data-icon-fallback"), "an unmapped glyph falls back and says so");
});

test("the whole icon family stays distinct, on the 24px grid and in theme colour only", () => {
  assert.equal(new Set(NAVIGATION_ICON_NAMES).size, NAVIGATION_ICON_NAMES.length, "no duplicate shape name");
  const seen = new Map();
  for (const name of NAVIGATION_ICON_NAMES) {
    const markup = render({ name });
    assert.ok(markup.includes('viewBox="0 0 24 24"') && markup.includes('stroke-width="1.8"') && markup.includes('stroke="currentColor"'), `${name}: 24×24 grid, 1.8px stroke, currentColor`);
    assert.ok(!/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(markup), `${name}: no hard-coded colour`);
    assert.ok(!markup.includes("data-icon-fallback"), `${name}: a catalogued shape is never a fallback`);
    const geometry = innerGeometry(markup);
    assert.ok(!seen.has(geometry), `${name} draws the same picture as ${seen.get(geometry)}`);
    seen.set(geometry, name);
  }
  for (const icon of ICON_CATALOG) assert.ok(NAVIGATION_ICON_NAMES.includes(icon.name), `catalogue entry ${icon.name} has a shape`);
  assert.equal(new Set(ICON_CATALOG.map((icon) => icon.name)).size, ICON_CATALOG.length, "no duplicate catalogue entry");
});

test("the frame draws the named symbol and keeps it when a destination is shown as under construction", () => {
  for (const name of LIST_NAMES) assert.ok(!/\bicon:\s*"/.test(listLiteral(name)), `${name}: no item picks its picture from a text glyph any more`);
  assert.equal((frameSource.match(/<NavigationIcon2029 name=\{item\.symbol\} \/>/g) || []).length, 4, "locked, link, action and pending rows draw item.symbol");
  assert.ok(!/<NavigationIcon2029 glyph=\{item\.icon\}/.test(frameSource), "no row picks its picture from a text glyph");
  assert.match(frameSource, /\{ label: item\.label, symbol: item\.symbol, status: "בבנייה" \}/, "the under-construction state keeps the symbol");
});
