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

test("elections regions put 631 first and keep secondary axes navigable", () => {
  assert.deepEqual(I.ELECTIONS_REGIONS.map((r) => r.number), [631, 271, 2701, 1820, 26, 66]);
  assert.equal(I.ELECTIONS_REGIONS[0].hero, true);
});

test("source is preserved; axes tagged; only verified equalities become triggers", () => {
  const all = I.markElectionsChain(SOURCE, verifiedRows(I.ELECTIONS_EQUALITIES.map((e) => e.phrase)));
  assert.equal((all.match(/data-source-heading="true"/g) || []).length, 6);
  assert.match(all, /הבחירות = <button[^>]*data-result="631"/);
  assert.match(all, /בן דוד = <button[^>]*data-region-id="elections-66"/);
  const none = I.markElectionsChain(SOURCE, { verified: false, rows: [] });
  assert.doesNotMatch(none, /data-contextual-number-focus/);
  assert.match(none, /הבחירות = 631/);
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
  assert.match(page, /isElectionsMaster\s*\n?\s*\?\s*\[631, 271, 2701, 1820, 26, 66\]/);
  assert.match(page, /<PostTimeline2029 items=\{visibleTimeline\}/);
  assert.match(css, /sharshar-elections-redemption-hints-draft"\] \.sod29-elections-continuation/);
});
