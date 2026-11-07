import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const native = await readFile(new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url), "utf8");

test("a tool opened from the bottom dock brings its panel into view on wide screens too", () => {
  // With the advanced search open the panel sits far below the viewport; on desktop the dock buttons looked dead.
  assert.match(native, /const panelOffScreen = \(\) => \{[\s\S]{0,200}rect\.top > window\.innerHeight - 140 \|\| rect\.bottom < 140/);
  assert.match(native, /window\.matchMedia\("\(max-width:980px\)"\)\.matches \|\| panelOffScreen\(\)\) panelRef\.current\?\.scrollIntoView\(\{ block: "start", behavior: "instant" \}\)/);
});

test("pressing the open tool closes it only when its panel is visible", () => {
  assert.match(native, /activeTool === tool && !classicOpen && window\.matchMedia\("\(min-width:981px\)"\)\.matches && !panelOffScreen\(\) \? closeTool\(\) : openTool\(tool, trigger\)/);
});
