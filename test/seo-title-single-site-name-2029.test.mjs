// ZURIEL 27.11.2026: "העולם · SOD1820 · SOD1820" (read live). One place adds the site name; a title that already carries it is not suffixed again.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composeSeoTitle } from "../src/lib/seo.js";

test("the site name appears once in every page title", () => {
  assert.equal(composeSeoTitle("העולם"), "העולם · SOD1820");
  assert.equal(composeSeoTitle("העולם · SOD1820"), "העולם · SOD1820", "the /world title that doubled");
  assert.equal(composeSeoTitle("ספר · SOD1820"), "ספר · SOD1820");
  assert.equal(composeSeoTitle("מחשבון גימטריה מקצועי"), "מחשבון גימטריה מקצועי · SOD1820");
  assert.equal(composeSeoTitle(""), "SOD1820");
  assert.equal(composeSeoTitle(undefined), "SOD1820");
  assert.equal(composeSeoTitle("SOD1820"), "SOD1820");
  assert.equal(composeSeoTitle("SOD1820 מחקר"), "SOD1820 מחקר · SOD1820", "only a trailing site name counts");
  assert.ok(!/SOD1820 · SOD1820/.test(composeSeoTitle("x · SOD1820")));
});

test("applySeo composes the title through that one function and the world page relies on it", () => {
  const seo = readFileSync(new URL("../src/lib/seo.js", import.meta.url), "utf8");
  assert.match(seo, /o\.fullTitle \? o\.fullTitle : composeSeoTitle\(o\.title\)/);
  assert.doesNotMatch(seo, /`\$\{o\.title\} · \$\{SITE_NAME\}`/, "no second place appends the site name");
});

// ZURIEL 27.11.2026: one canonical address for the community. /community and /community/chat open the same page and both declare /community/chat as canonical;
// the sitemap lists only that address (it listed the non-canonical /community, the opposite signal).
test("the sitemap lists the community once, at its canonical address", () => {
  const sitemap = readFileSync(new URL("../api/sitemap.js", import.meta.url), "utf8");
  assert.match(sitemap, /\{ loc: '\/community\/chat', priority:/);
  assert.doesNotMatch(sitemap, /\{ loc: '\/community',\s+priority:/, "the non-canonical address is not listed");
  assert.equal([...sitemap.matchAll(/loc: '\/community\/chat'/g)].length, 1);
  const chat = readFileSync(new URL("../src/pages/CommunityChatTransition2029Page.jsx", import.meta.url), "utf8");
  assert.match(chat, /canonicalPath="\/community\/chat"/);
});
