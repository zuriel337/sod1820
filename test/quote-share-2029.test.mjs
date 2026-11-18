// Share a selected sentence of a post (ZURIEL 18.11.2026): the link opens the post at that sentence through the browsers' text fragment.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeQuote, quoteLink, quoteMessage, shareableQuote } from "../src/lib/quoteShareLink2029.js";

test("a short quote becomes one text directive; the post's own address is kept and its old fragment dropped", () => {
  assert.equal(quoteLink("https://sod1820.co.il/post/abc#source", "משיח בן דוד"), "https://sod1820.co.il/post/abc#q=" + encodeURIComponent("משיח בן דוד") + ":~:text=" + encodeURIComponent("משיח בן דוד"));
});

test("a long quote uses its first and last five words; commas, dashes and ampersands are encoded so they cannot split the directive", () => {
  const q = "אחת שתיים שלוש ארבע חמש, שש-שבע & שמונה תשע עשר אחת-עשרה שתים-עשרה שלוש-עשרה";
  const link = quoteLink("https://sod1820.co.il/post/abc", q);
  const directive = link.split(":~:text=")[1];
  assert.equal(decodeURIComponent(link.split("#q=")[1].split(":~:")[0]), q.split(" ").slice(0, 8).join(" "), "#q= carries the first eight words for the site's own landing");
  const [start, end] = directive.split(",");
  assert.equal(decodeURIComponent(start), "אחת שתיים שלוש ארבע חמש,");
  assert.equal(decodeURIComponent(end), "שמונה תשע עשר אחת-עשרה שתים-עשרה שלוש-עשרה".split(" ").slice(-5).join(" "));
  assert.equal(directive.split(",").length, 2, "only the separator comma is raw");
  assert.doesNotMatch(directive, /-|&/);
});

test("only real text is shareable (12–320 characters, whitespace normalized); the message quotes it with the post title", () => {
  assert.equal(shareableQuote("קצר"), "");
  assert.equal(shareableQuote("א".repeat(321)), "");
  assert.equal(normalizeQuote("  שורה\n  שנייה  "), "שורה שנייה");
  assert.equal(quoteMessage("משפט  חשוב מאוד כאן", "כותרת"), "«משפט חשוב מאוד כאן» — כותרת");
});

test("speed law: the post loads the sentence share only after a selection inside the article", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /const QuoteShare2029 = toolOnOpen2029\(\(\) => import\("\.\.\/components\/experience2029\/QuoteShare2029\.jsx"\)\);/);
  assert.match(page, /\{quoteArmed && !projection\.draft/);
  assert.doesNotMatch(page, /^import .*QuoteShare2029/m);
  const part = readFileSync(new URL("../src/components/experience2029/QuoteShare2029.jsx", import.meta.url), "utf8");
  assert.match(part, /const ShareActions = React\.lazy\(\(\) => import\("\.\.\/ShareActions\.jsx"\)\)/);
  assert.match(part, /יישלח: המשפט שסימנת וקישור שפותח את הפוסט בדיוק במשפט הזה/);
});

test("the site lands on a shared sentence itself (#q=), loaded only for such links, without changing the article's DOM", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /if \(!state\.projection \|\| !\/\^#q=\/\.test\(location\.hash\)/);
  assert.match(page, /import\("\.\.\/components\/experience2029\/quoteJump2029\.js"\)/);
  const jump = readFileSync(new URL("../src/components/experience2029/quoteJump2029.js", import.meta.url), "utf8");
  assert.match(jump, /CSS\.highlights\.set\("sod-quote", new Highlight\(range\)\)/);
  assert.doesNotMatch(jump, /innerHTML|insertBefore|appendChild|surroundContents/, "no DOM change in the article");
});
