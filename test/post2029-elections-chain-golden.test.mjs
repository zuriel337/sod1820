import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { post2029ReadingInternals as I } from "../src/lib/research/post2029ReadingProjection.js";

const SOURCE = `<section>
<p style="a">631</p>
<p style="b">הבחירות = 631</p>
<p style="b">נס נתניהו = 631</p>
<p style="a">271</p>
<p style="b">הריון = 271</p>
<p style="a">2701</p><p style="a">1820</p><p style="a">26</p><p style="a">66</p>
<p style="b">בן דוד = 66</p></section>`;
const verifiedRows = (phrases) => ({ verified: true, rows: phrases.map((phrase) => ({ phrase, verified: true })) });

test("elections regions open with יהוה = 26 and the date, then 631, and keep secondary axes navigable", () => {
  assert.deepEqual(I.ELECTIONS_REGIONS.map((r) => r.number), [26, 271, 2701, 1820, 631, 66, 77]);
  assert.equal(I.ELECTIONS_REGIONS.find((r) => r.number === 631).hero, true);
  assert.equal(I.ELECTIONS_REGIONS.find((r) => r.number === 66).label, "שרשר · נעליים · בן דוד = 66");
});

test("source is preserved; axes tagged; only verified equalities become triggers", () => {
  const all = I.markElectionsChain(SOURCE, verifiedRows(I.ELECTIONS_EQUALITIES.map((e) => e.phrase)));
  assert.equal((all.match(/data-source-heading="true"/g) || []).length, 6);
  assert.match(all, /data-focus-part="expression"[^>]*data-expression="הבחירות"[^>]*data-result="631"[^>]*>הבחירות<\/button> = <button/);
  assert.match(all, /data-focus-part="expression"[^>]*data-region-id="elections-66"[^>]*>בן דוד<\/button> = <button/);
  const none = I.markElectionsChain(SOURCE, { verified: false, rows: [] });
  assert.doesNotMatch(none, /data-contextual-number-focus/);
  assert.match(none.replace(/<[^>]+>/g, ""), /הבחירות = 631/);
  assert.match(none, /data-gem="הבחירות"/);
  assert.match(none, /data-gem="631"/);
});

test("reading order stays authored (26 before 631); secondary source text and links survive", () => {
  const source = `<section><h1>הבחירות</h1><p>26</p><p>יהוה = 26</p><p>631</p><p>הבחירות = 631</p><p>נס נתניהו = 631</p><p>66</p><p>בן דוד = 66</p><a href="https://example.com/evidence">מקור</a></section>`;
  const html = I.markElectionsChain(source, verifiedRows(["הבחירות", "נס נתניהו"]));
  assert.ok(html.indexOf('data-gem="26"') < html.indexOf('data-gem="631"'));
  assert.equal((html.match(/data-elections-continuation="true"/g) || []).length, 1);
  assert.equal((html.match(/data-expression="הבחירות"/g) || []).length, 2);
  assert.match(html, /<a href="https:\/\/example.com\/evidence">מקור<\/a>/);
  assert.match(html, />בן דוד<\/button> = <button[^>]*data-gem="66"/);
  assert.equal(I.markElectionsChain(html, null), html);
});

test("an authored linked equality gains two verified operands without nesting links", () => {
  const html = I.markElectionsChain('<section><h2>נתניהו בן 77 — מזל ופרשת בראשית</h2><p><a href="/number/77">מזל = 77</a></p><p><a href="/number/77">77</a></p></section>', verifiedRows(["מזל"]));
  assert.match(html, /data-focus-part="expression"[^>]*data-expression="מזל"/);
  assert.match(html, /data-focus-part="result"[^>]*data-result="77"/);
  assert.doesNotMatch(html, /<a[^>]*><button/);
  assert.match(html, /data-source-heading="true">נתניהו בן 77/);
  assert.match(html, /<a href="\/number\/77">77<\/a>/);
});

test("631 exposes the Bennett continuation by link, without copying Bennett", () => {
  const html = I.markElectionsChain(SOURCE, verifiedRows(["נס נתניהו"]));
  assert.match(html, /data-elections-continuation="true" href="\/post\/bennett-melach-631-78"/);
  assert.ok(html.indexOf("נס נתניהו") < html.indexOf("data-elections-continuation"));
  assert.doesNotMatch(html, /ים המלח|מלח/);
  assert.equal(I.markElectionsChain(html, null), html);
});

test("experience reuses existing identities; timeline stays canonical (no new store)", () => {
  const ex = I.buildElectionsExperience({ date: "2026-09-30T08:55:06Z" });
  assert.equal(ex.connections[0].href, "/post/bennett-melach-631-78");
  assert.deepEqual(ex.trail.map((t) => t.label), ["פוסט הבחירות", "631", "בנט"]);
  assert.ok(ex.timeline.every((t) => ["published", "occurred", "discovered", "admitted"].includes(t.temporalRole)));
  assert.equal(ex.timeline[0].date, "2026-09-30");
});

test("page and css wire the elections golden", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/pages/post2029-reading.css", import.meta.url), "utf8");
  assert.match(page, /isElectionsMaster\s*\n?\s*\?\s*\[26, 271, 2701, 1820, 631, 66\]/);
  assert.match(page, /<PostTimeline2029 items=\{visibleTimeline\}/);
  assert.match(css, /sharshar-elections-redemption-hints-draft"\] \.sod29-elections-continuation/);
});

test("colour marks the date -> 2710 -> 271 relation and the 631 axis only; other numbers stay unmarked", () => {
  const source = `<section><h1>הבחירות</h1><p>26</p><p>יהוה = 26</p><p>27.10.2026</p><p>2710</p><p>271</p><p>הריון = 271</p><p>חכמה = 271</p><p>2701</p><p>631</p><p>הבחירות = 631</p></section>`;
  const html = I.markElectionsChain(source, verifiedRows(["הריון", "חכמה", "הבחירות", "יהוה"]));
  assert.match(html, /<span data-link-group="a">27\.10<\/span>\.2026/);
  assert.match(html, /<p data-link-group="a">2710<\/p>/);
  assert.match(html, /data-gem="271"[^>]*data-link-group="a"|data-link-group="a"[^>]*data-gem="271"/);
  assert.equal((html.match(/class="sod29-gematria-expression" data-link-group="a"/g) || []).length, 2);
  assert.match(html, /class="sod29-gematria-value" data-link-group="b"[^>]*>631</);
  assert.doesNotMatch(html, /data-gem="26"[^>]*data-link-group|data-gem="2701"[^>]*data-link-group/);
  assert.doesNotMatch(html, /expression"[^>]*data-expression="יהוה"[^>]*data-link-group|data-link-group[^>]*data-expression="יהוה"/);
});
