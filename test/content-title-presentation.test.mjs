import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { humanContentTitle } from "../src/lib/presentation/contentTitle.js";

test("humanContentTitle decodes legacy entities and removes display-only post suffixes", () => {
  const raw = 'סיום המבצע באיראן ובאר שבע | צופן התורה שמראה שכוח צה&quot;ל זה כוח המשיח | חדש! גלרית דוד המלך מספר 23 | פוסט אין #3';
  const out = humanContentTitle(raw, { max: 200 });
  assert.equal(out.includes("&quot;"), false);
  assert.match(out, /צה"ל/);
  assert.equal(out.includes("פוסט אין #3"), false);
  assert.match(out, /גלרית דוד המלך מספר 23/);
});

test("humanContentTitle unwraps stored escaped quotes and bounds long card labels", () => {
  const raw = 'מפלגה חדשה נכנסה לזירה: \\"עמך ישראל\\" בראשות עופר וינטר | רמזים חזקים ביותר לגאולת ישראל';
  const out = humanContentTitle(raw, { max: 54 });
  assert.equal(out.includes('\\"'), false);
  assert.ok(out.length <= 55);
  assert.ok(out.endsWith("…"));
});

test("2029 post-title surfaces use the shared presentation sanitizer and bounded typography", () => {
  const number = readFileSync(new URL("../src/components/number2029/NumberLivingWorld2029.jsx", import.meta.url), "utf8");
  const world = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  const posts = readFileSync(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8");
  const numberCss = readFileSync(new URL("../src/components/number2029/numberLivingWorld2029.css", import.meta.url), "utf8");
  const worldCss = readFileSync(new URL("../src/pages/world2029-human.css", import.meta.url), "utf8");
  const postsCss = readFileSync(new URL("../src/pages/posts2029.css", import.meta.url), "utf8");

  assert.match(number, /humanContentTitle/);
  assert.match(world, /humanContentTitle/);
  assert.match(posts, /humanContentTitle/);
  assert.match(numberCss, /-webkit-line-clamp:3/);
  assert.match(worldCss, /-webkit-line-clamp:3/);
  assert.match(postsCss, /-webkit-line-clamp:3/);
  assert.match(numberCss, /font-size:28px/);
  assert.match(postsCss, /font-size:22px/);
});
