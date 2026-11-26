import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cssDeviations, jsxDeviations, scanButtonFamily } from "../scripts/lib/buttonFamilyScan2029.mjs";

const baseline = JSON.parse(readFileSync(new URL("../scripts/button-family-baseline-2029.json", import.meta.url), "utf8")).files;

test("button family guard (Design V2 §14.4, ZURIEL 25.11.2026): no new button look outside royal2029.css, and the existing exceptions only go down", () => {
  const scan = scanButtonFamily();
  const grown = [], fresh = [];
  for (const [file, items] of Object.entries(scan)) {
    if (baseline[file] == null) fresh.push(`${file} (${items.length}): ${items[0]}`);
    else if (items.length > baseline[file]) grown.push(`${file}: ${baseline[file]} -> ${items.length}`);
  }
  assert.deepEqual(fresh, [], "a new file draws its own button look. Use .r29-btn / .r29-check / .r29-btn-group from royal2029.css; raising the baseline is a ZURIEL decision");
  assert.deepEqual(grown, [], "a file added button looks beyond the baseline. Use the Royal family; do not copy its rules into a page stylesheet");
});

test("the guard really detects a parallel button design and lets the family pass", () => {
  assert.equal(cssDeviations(".my-btn{padding:0 14px;border-radius:999px;background:#315dd5}").length, 1);
  assert.equal(cssDeviations("button.save{min-height:44px;border:1px solid red;border-radius:8px}").length, 1);
  assert.equal(cssDeviations(".card{padding:8px;border-radius:12px;background:#000}").length, 0, "a card is not a button");
  assert.equal(cssDeviations(".x-btn{margin:0}").length, 0, "layout only is fine");
  assert.equal(jsxDeviations('<button onClick={f} style={{ borderRadius: 999, padding: 8 }}>x</button>').length, 1);
  assert.equal(jsxDeviations('<button className="r29-btn is-primary" onClick={f}>x</button>').length, 0);
});

test("the follow panel and the Post action row use only the Royal family", () => {
  for (const file of ["PostFollowDialog2029.jsx", "PostFollowInvite2029.jsx", "PostActionBar2029.jsx", "PostCommentComposer2029.jsx"]) {
    const text = readFileSync(new URL(`../src/components/experience2029/${file}`, import.meta.url), "utf8");
    assert.equal(jsxDeviations(text).length, 0, `${file}: no inline button look`);
  }
  const css = readFileSync(new URL("../src/components/experience2029/postFollowDialog2029.css", import.meta.url), "utf8");
  assert.equal(cssDeviations(css).length, 0, "the panel stylesheet lays out only");
  const dialog = readFileSync(new URL("../src/components/experience2029/PostFollowDialog2029.jsx", import.meta.url), "utf8");
  assert.match(dialog, /variant="check2029"/, "a multiple choice is checkbox rows, not large buttons");
  assert.match(dialog, /r29-btn-group/);
  assert.match(dialog, /r29-btn is-primary/);
});
