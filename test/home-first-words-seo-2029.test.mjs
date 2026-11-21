import test from "node:test";
import assert from "node:assert/strict";
import { firstWordsFacts2029, firstWordsHtml2029, firstWordsStaticFacts2029, withFirstWords2029, _resetFirstWordsForTests } from "../public-reading-deploy/first-words.js";
import { HOME_FIRST_WORDS } from "../src/lib/homePublicWords2029.js";
import { PUBLIC_HOME_SEO } from "../src/lib/seo.js";
import { publicReadingPath, publicReadingContinuation } from "../src/lib/publicReadingRelease2029.js";

// #1470 "SEO · דף הבית — נוסח מדויק" (ZURIEL 21.11.2026). The approved wording is used verbatim: these literals are copied from the issue.
const ISSUE_TITLE = "כי לה׳ המלוכה | רמזי הגאולה, גימטריה וצפנים בתורה";
const ISSUE_DESCRIPTION = "סוד 1820 — תיעוד אירועים ורמזי הגאולה דרך מספרים, מילים ופסוקים. גלו את אוצר המלוכה, חקרו במחשבון הגימטריה ובצופן התנ״כי, ועיינו במקורות ובמחקרים.";
const ISSUE_PAGE_TEXT = [
  "כי לה׳ המלוכה",
  "רמזי הגאולה בשפת המספרים",
  "אירועים, פסוקים ומספרים מתחברים כאן למחקרים ולתיעודים. גלו את הרמזים, בדקו את המקורות וחקרו בעצמכם באמצעות הגימטריה והצופן התנ״כי.",
  "אוצר המלוכה — מחקרי הדגל והקשרים בין האירועים.",
  "התחילו לחקור: תיעוד אירועים · מחשבון גימטריה · הצופן התנ״כי · פוסטים ומחקרים.",
];
const plain = html => html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, "").replace(/<\/(?:h1|p)>/g, "\n").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").split("\n").map(line => line.trim()).filter(Boolean);

test("the search title and description are the approved wording", () => {
  assert.equal(PUBLIC_HOME_SEO.fullTitle, ISSUE_TITLE);
  assert.equal(PUBLIC_HOME_SEO.description, ISSUE_DESCRIPTION);
  assert.equal(PUBLIC_HOME_SEO.path, "/");
});

test("the home document carries the approved words, one h1 and real links, with no read and no user-agent branch", async () => {
  _resetFirstWordsForTests();
  const facts = await firstWordsFacts2029("/", { fetchImpl: () => { throw new Error("the home words read nothing"); } });
  assert.deepEqual(facts, { kind: "home" });
  assert.deepEqual(firstWordsStaticFacts2029("/"), { kind: "home" });
  const html = firstWordsHtml2029(facts);
  assert.deepEqual(plain(html), ISSUE_PAGE_TEXT);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replace(/&amp;/g, "&"));
  assert.deepEqual(hrefs, [HOME_FIRST_WORDS.series.href, ...HOME_FIRST_WORDS.start.map(item => item.href)]);
  for (const href of hrefs) {
    const url = new URL(href, "https://sod1820.co.il");
    assert.equal(publicReadingContinuation(url.pathname, url.search.replace(/^\?/, "")), null, `${href} is its own address, not a redirect`);
    assert.equal(publicReadingPath(url.pathname, { search: url.search.replace(/^\?/, "") }), "public", `${href} is a public page`);
  }
  // A query string on the home address (a short link, a campaign) keeps today's document.
  assert.equal(await firstWordsFacts2029("/", { search: "p=4243" }), null);
});

test("the words go inside the opening shell, once", () => {
  const shell = '<div id="root"><div class="sod29-opening"><span class="sod29-opening-status" role="status">פותח את העמוד</span>\n    </div></div>';
  const once = withFirstWords2029(shell, firstWordsHtml2029({ kind: "home" }));
  assert.equal(once.state, "served");
  assert.equal(withFirstWords2029(once.html, firstWordsHtml2029({ kind: "home" })).state, "no-slot");
});
