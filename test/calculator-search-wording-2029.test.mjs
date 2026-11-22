import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { CALCULATOR_PRO_SEO } from "../src/lib/research/calculatorProSeo2029.js";
import { COMMUNITY_CALCULATOR_SEO } from "../src/lib/research/communityCalculatorSeo2029.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const SITE = " · SOD1820";

test("both calculators open with the phrase people search, fit a result line, and are told apart by what follows", () => {
  for (const seo of [CALCULATOR_PRO_SEO, COMMUNITY_CALCULATOR_SEO]) {
    assert.ok(seo.title.startsWith("מחשבון גימטריה"), seo.title);
    assert.ok(seo.heading.startsWith("מחשבון גימטריה"), seo.heading);
    assert.ok(seo.description.startsWith("מחשבון גימטריה"), seo.description);
    assert.ok((seo.title + SITE).length <= 70, `${seo.title} (${(seo.title + SITE).length})`);
    assert.ok(seo.description.length >= 110 && seo.description.length <= 160, `${seo.description.length}`);
    assert.doesNotMatch(seo.title + seo.description, /SOD1820/, "the site name is appended once, by the renderer");
    // no internal words, and no feature the page does not have
    assert.doesNotMatch(JSON.stringify(seo), /2029|קנוני|מנוע|פנקס|מצב מורחב|קיר הגימטריה|\bAI\b|בינה מלאכותית|8 שיטות/);
  }
  assert.notEqual(CALCULATOR_PRO_SEO.title, COMMUNITY_CALCULATOR_SEO.title);
  for (const text of [CALCULATOR_PRO_SEO.title, CALCULATOR_PRO_SEO.heading, CALCULATOR_PRO_SEO.description]) {
    assert.match(text, /^מחשבון גימטריה מקצועי/);
  }
  assert.match(COMMUNITY_CALCULATOR_SEO.description, /הקהילה/);
  assert.match(COMMUNITY_CALCULATOR_SEO.title, /לשמות/, "the community calculator owns the names searches");
  assert.doesNotMatch(CALCULATOR_PRO_SEO.title, /לשמות/, "the main calculator owns the general search");
});

test("the main calculator's server, page, shared-result page and first words read the one source", () => {
  const og = read("api/og.js");
  const branch = og.slice(og.indexOf("One wording for the server, the page and the first words"), og.indexOf("} else if (key === '/research')"));
  assert.match(branch, /title = CALCULATOR_PRO_SEO\.title \+ " · " \+ SITE_NAME;/);
  assert.match(branch, /desc = CALCULATOR_PRO_SEO\.description;/);
  for (const page of ["src/pages/CalculatorPro2029Page.jsx", "src/pages/Calculator2029Page.jsx"]) {
    const source = read(page);
    assert.match(source, /title: CALCULATOR_PRO_SEO\.title,/, page);
    assert.match(source, /description: CALCULATOR_PRO_SEO\.description,/, page);
  }
  assert.match(read("src/pages/CalculatorPro2029Page.jsx"), /<h1 className="sod29-calcpro-sr">\{CALCULATOR_PRO_SEO\.heading\}<\/h1>/);
  assert.match(read("public-reading-deploy/first-words.js"), /<h1>\$\{esc\(CALCULATOR_PRO_SEO\.heading\)\}<\/h1><p>\$\{esc\(CALCULATOR_PRO_SEO\.lead\)\}<\/p>/);
});

test("no page hands applySeo a title that already carries the site name (it appends it: \"... · SOD1820 · SOD1820\", live 20.11.2026)", () => {
  const files = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split("\n").filter(file => /\.(jsx?|mjs)$/.test(file));
  const offenders = [];
  for (const file of files) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    for (const match of source.matchAll(/applySeo\(\{[^}]*?\btitle: "([^"]*)"/gs)) if (/· SOD1820$/.test(match[1])) offenders.push(`${file}: ${match[1]}`);
  }
  assert.deepEqual(offenders, []);
});

test("no internal \"2029\" in what Google or a reader sees: titles, descriptions, preview cards, screen-reader labels", () => {
  const files = execFileSync("git", ["ls-files", "src", "api", "public-reading-deploy"], { encoding: "utf8" }).split("\n").filter(file => /\.(jsx?|mjs)$/.test(file) && !/\.test\.|\/dist\//.test(file));
  const offenders = [];
  for (const file of files) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    for (const match of source.matchAll(/(?:title|description|desc|aria-label|w|sub|cap)\s*[:=]\s*(["'`])([^"'`]*?)\1/g)) {
      const text = match[2];
      if (/[\u0590-\u05FF]|SOD1820/.test(text) && /(SOD1820|[\u0590-\u05FF])\s*2029\b|\b2029\s*(—|·)/.test(text)) offenders.push(`${file}: ${text}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the main calculator shows no \"סידורי\" method and has no advanced mode (ZURIEL 21.11.2026)", () => {
  const page = read("src/pages/CalculatorPro2029Page.jsx");
  assert.match(page, /const HIDDEN_METHOD_KEYS = new Set\(\["סידורי"\]\);/);
  assert.match(page, /\.filter\(\(method\) => !HIDDEN_METHOD_KEYS\.has\(method\.methodKey\)\)/, "every view reads the filtered rows");
  assert.doesNotMatch(page, /\badvanced\b|setAdvanced|"מתקדם"|סגור מתקדם|next\.set\("mode", "adv"\)/);
  assert.doesNotMatch(page, /מצב מתקדם/);
  assert.doesNotMatch(read("src/lib/research/communityCalculatorSeo2029.js"), /הסידורי/, "the explanation no longer names it");
});
