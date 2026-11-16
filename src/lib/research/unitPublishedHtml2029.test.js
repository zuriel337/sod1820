import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { unitToPublishedHtml, insertUnitAtTop } from "./unitPublishedHtml2029.js";
import { YAMIN_SMOL_APPROVED_TEXT, YAMIN_SMOL_UNIT_ID } from "./postPreviewUnits2029.js";
import { allSections, contentSha256, inspectFragment } from "./unitFragmentSavePlan2029.js";

// byte-exact body of post 5107 as read live (revision 266, md5 a10ea4de…): the dry run never touches the database
const LIVE = readFileSync(new URL("../../../docs/reviews/elections-5107-unit-inventory-20261114/SOURCE_posts5107_rev266_22010.html", import.meta.url), "utf8");
const unit = { id: YAMIN_SMOL_UNIT_ID };

test("the fixture is the live body (22,010 chars, md5 a10ea4de…) with the six known units", () => {
  assert.equal(LIVE.length, 22010);
  assert.equal(createHash("md5").update(LIVE).digest("hex"), "a10ea4de28ac262ec5d14e0262db9b13");
  const ids = allSections(LIVE).sections.map((s) => s.id).filter(Boolean);
  for (const id of ["sharshar-shoes-66", "sharshar-knesset-source", "sharshar-monthly-help-requests", "election-turnout-777-news-signal", "netanyahu-77-mazal", "knesset-sworn-1234-1011"]) assert.ok(ids.includes(id), id);
});

test("the published form: one section with the unit id, escaped text, clickable numbers, linked by-lines, the table, no markup from the words", () => {
  const html = unitToPublishedHtml(unit, YAMIN_SMOL_APPROVED_TEXT);
  assert.match(html, /^<section id="yamin-smol-2026-5787-1237-1158" aria-labelledby="yamin-smol-2026-5787-1237-1158-title"/);
  assert.match(html, /<h2 id="yamin-smol-2026-5787-1237-1158-title"[^>]*>ימין ושמאול תפרצי מדהים!!! רמזים חזקים ביותר<\/h2>/);
  assert.match(html, /מאת: <a href="\/community\/researcher\/yaniv-levi">יניב לוי<\/a>/);
  assert.match(html, /מאת: <a href="\/community\/researcher\/shachar-kandro">יצחק שחר קנדרו<\/a>/);
  assert.match(html, /<span data-gem="2026">2026<\/span>/);
  assert.match(html, /<th [^>]*>ראשי תיבות<\/th><th [^>]*>ערך<\/th>/);
  assert.match(html, /✦ אנחנו רואים שהמציאות מדברת ✦/);
  assert.equal((html.match(/<section\b/g) || []).length, 1);
  assert.deepEqual(inspectFragment(html).unsafe, []);
  assert.deepEqual(inspectFragment(html).duplicateIds, []);
  // the words can never become markup
  const hostile = unitToPublishedHtml(unit, "כותרת <script>x</script>\n\n2026 · 5787\n\nשורה <img src=x onerror=1> & \"ציטוט\"");
  assert.doesNotMatch(hostile, /<script|<img/);
  assert.match(hostile, /&lt;script&gt;/);
  assert.throws(() => unitToPublishedHtml({ id: "x y" }, "a"), /bad_unit_id/);
});

test("the gematria breakdowns are kept in the published unit: an empty engine host after each big result number (2026 and 5787), safe markup, unique", () => {
  const html = unitToPublishedHtml(unit, YAMIN_SMOL_APPROVED_TEXT);
  assert.equal((html.match(/<div data-pu-trace="c2026" data-pu-published="true" class="sod29-pu-host sod29-pu-trace-host"><\/div>/g) || []).length, 1);
  assert.equal((html.match(/<div data-pu-trace="c5787" data-pu-published="true" class="sod29-pu-host sod29-pu-trace-host"><\/div>/g) || []).length, 1);
  assert.match(html, /<span data-gem="2026">2026<\/span><\/p>\n<div data-pu-trace="c2026"/);
  assert.match(html, /<span data-gem="5787">5787<\/span><\/p>\n<div data-pu-trace="c5787"/);
  assert.deepEqual(inspectFragment(html).unsafe, []);
});

test("dry run on the live body: the unit goes on top, the six units and everything outside the insertion point stay byte-identical", async () => {
  const html = unitToPublishedHtml(unit, YAMIN_SMOL_APPROVED_TEXT);
  const expected = await contentSha256(LIVE);
  const result = await insertUnitAtTop({ content: LIVE, expectedSha256: expected, fragmentHtml: html, unitId: unit.id });
  assert.equal(result.ok, true, JSON.stringify(result));
  const before = allSections(LIVE).sections.map((s) => s.id);
  const after = allSections(result.content).sections.map((s) => s.id);
  assert.deepEqual(after, [unit.id, ...before]);
  const at = '<div dir="rtl" style="text-align:center;">'.length;
  assert.equal(result.content.slice(0, at), LIVE.slice(0, at));
  assert.equal(result.content.slice(result.content.length - (LIVE.length - at)), LIVE.slice(at));
  assert.equal(result.addedChars, html.length + 1);
  assert.equal(result.previousSha256, expected);
  assert.equal(result.newSha256, await contentSha256(result.content));
});

test("the insertion refuses: a changed body (conflict), the unit already there, an unknown wrapper, unsafe markup, a duplicate id", async () => {
  const html = unitToPublishedHtml(unit, YAMIN_SMOL_APPROVED_TEXT);
  const sha = await contentSha256(LIVE);
  assert.equal((await insertUnitAtTop({ content: LIVE + " ", expectedSha256: sha, fragmentHtml: html, unitId: unit.id })).code, "conflict");
  const once = await insertUnitAtTop({ content: LIVE, expectedSha256: sha, fragmentHtml: html, unitId: unit.id });
  assert.equal((await insertUnitAtTop({ content: once.content, expectedSha256: once.newSha256, fragmentHtml: html, unitId: unit.id })).code, "unit_already_present");
  const other = "<p>x</p>" + LIVE;
  assert.equal((await insertUnitAtTop({ content: other, expectedSha256: await contentSha256(other), fragmentHtml: html, unitId: unit.id })).code, "unknown_wrapper");
  assert.equal((await insertUnitAtTop({ content: LIVE, expectedSha256: sha, fragmentHtml: html.replace("</section>", '<a href="javascript:1">x</a></section>'), unitId: unit.id })).code, "unsafe_markup");
  assert.equal((await insertUnitAtTop({ content: LIVE, expectedSha256: sha, fragmentHtml: html.replace("</section>", '<p id="d">1</p><p id="d">2</p></section>'), unitId: unit.id })).code, "duplicate_ids");
  assert.equal((await insertUnitAtTop({ content: LIVE, expectedSha256: "nope", fragmentHtml: html, unitId: unit.id })).code, "bad_input");
});
