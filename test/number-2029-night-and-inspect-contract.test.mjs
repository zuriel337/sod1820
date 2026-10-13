import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const palette = read("src/lib/palette.js");
const contract = read("SOD1820_DESIGN_CONTRACT_V2.md");
const drawerCss = read("src/components/number2029/numberDrawer2029.css");
const numberPage = read("src/pages/Number2029Page.jsx");

const nightStart = palette.indexOf("  dark: Object.freeze({", palette.indexOf("export const DESIGN_V2_PALETTES"));
const nightEnd = palette.indexOf("\n  }),", nightStart);
const night = palette.slice(nightStart, nightEnd);
const cssBlock = (selector) => {
  const start = drawerCss.indexOf(selector + "{");
  assert.ok(start >= 0, `Number quick inspect is missing ${selector}`);
  const end = drawerCss.indexOf("}", start);
  return drawerCss.slice(start, end);
};

test("Night 2029 uses one warm black-brown semantic palette; other presets stay intact", () => {
  assert.ok(nightStart > 0 && nightEnd > nightStart, "must resolve the canonical V2 Night block");
  for (const [token, color] of Object.entries({
    pageBg: "#0D0A09", card: "#1B1512", cardSoft: "#251D18", cardRaised: "#2C221B",
    accent: "#315DD5", accentDiscovery: "#69DED7", brandGold: "#F9BA3F",
  })) {
    assert.ok(night.includes(`${token}: "${color}"`), `Night ${token} must use the single V2 owner`);
  }
  assert.match(night, /cardGrad: "linear-gradient\(145deg, #251D18, #15100E\)"/);
  for (const color of ["#0D0A09", "#1B1512", "#251D18", "#2C221B"]) {
    assert.ok(contract.includes(color), `Design V2 contract must name ${color}`);
  }
  assert.match(palette, /preset: "light"[\s\S]*?pageBg: "#F4F7FC"/);
  assert.match(palette, /preset: "parchment"[\s\S]*?pageBg: "#F4EDDE"/);
  assert.match(contract, /no new 2029 component hard-codes/i);
});

test("Number Quick Inspect uses meaningful >=14px text and 44px controls", () => {
  const literalSizes = [...drawerCss.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
  assert.ok(literalSizes.every((n) => n >= 14), "no 8-12px meaningful labels in Number drawer");
  assert.match(cssBlock(".sod29-number-drawer-mode span"), /font-size:var\(--s29-type-micro,14px\)/);
  assert.match(cssBlock(".sod29-number-drawer-mode small"), /font-size:var\(--s29-type-micro,14px\)/);
  assert.match(cssBlock(".sod29-number-drawer-back"), /min-height:44px/);
  assert.match(cssBlock(".sod29-number-drawer-search input"), /min-height:44px/);
  assert.match(cssBlock(".sod29-number-drawer-empty input"), /min-height:44px/);
  assert.match(cssBlock(".sod29-number-drawer-empty button"), /min-height:44px/);
  assert.doesNotMatch(drawerCss, /#[0-9a-f]{3,8}\b/i, "Number drawer must not own local palette hex colors");
  assert.match(drawerCss, /@media\(max-width:620px\)/, "mobile constraints remain in place");
});

test("Number SEO publication gate remains separate from visual preview work", () => {
  assert.match(numberPage, /noindex: true/, "do not publish preview Number pages by a visual change");
  assert.match(numberPage, /DESIGN PREVIEW/, "do not claim Number public Golden");
});
