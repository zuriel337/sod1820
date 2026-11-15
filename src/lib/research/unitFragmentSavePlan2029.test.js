import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planUnitFragmentUpdate, locateUnitFragment, allSections, contentSha256 } from "./unitFragmentSavePlan2029.js";

// the real, byte-exact body of Post 5107 (revision 266)
const body = readFileSync(new URL("../../../docs/reviews/elections-5107-unit-inventory-20261114/SOURCE_posts5107_rev266_22010.html", import.meta.url), "utf8");
const UNIT = "sharshar-shoes-66";
const located = locateUnitFragment(body, UNIT);
const edit = (html) => html.replace("שרשר מציג נעליים", "שרשר מציג נעליים ✦");

test("the six published units are sections of the body (five nested in the main section, one top-level); the Preview-only unit is not in the body", () => {
  const ids = allSections(body).sections.map((s) => s.id);
  for (const id of ["knesset-sworn-1234-1011", "election-turnout-777-news-signal", "sharshar-shoes-66", "sharshar-knesset-source", "sharshar-monthly-help-requests", "netanyahu-77-mazal"]) assert.ok(ids.includes(id), id);
  assert.equal(allSections(body).sections.find((s) => s.id === "knesset-sworn-1234-1011").depth, 0);
  assert.equal(allSections(body).sections.find((s) => s.id === UNIT).depth, 1);
  assert.equal(locateUnitFragment(body, "yamin-smol-2026-5787-1237-1158").code, "unit_not_published");
});

test("a valid edit replaces exactly that unit; every other byte and every other unit is untouched", async () => {
  const plan = await planUnitFragmentUpdate({ snapshot: { content: body }, latest: { content: body }, unitId: UNIT, newFragmentHtml: edit(located.html) });
  assert.equal(plan.ok, true, JSON.stringify(plan));
  assert.equal(plan.newContent.slice(0, located.start), body.slice(0, located.start));
  assert.equal(plan.newContent.slice(plan.newContent.length - (body.length - located.end)), body.slice(located.end));
  assert.equal(plan.previous.content, body, "the previous body is handed back for independent storage");
  assert.equal(plan.atomic, false, "it says plainly that it is advisory, not atomic");
  assert.equal(plan.expectedSha256, await contentSha256(body));
  const others = allSections(plan.newContent).sections.filter((s) => s.id && s.id !== UNIT).map((s) => plan.newContent.slice(s.start, s.end));
  const before = allSections(body).sections.filter((s) => s.id && s.id !== UNIT).map((s) => body.slice(s.start, s.end));
  assert.deepEqual(others, before);
});

test("a concurrent edit is a CONFLICT: nothing is produced, nothing is overwritten", async () => {
  const other = body.replace("הבחירות", "הבחירות ");
  const plan = await planUnitFragmentUpdate({ snapshot: { content: body }, latest: { content: other }, unitId: UNIT, newFragmentHtml: edit(located.html) });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, "conflict");
  assert.equal(plan.newContent, undefined);
});

test("the unit id, anchors, links and media cannot be dropped; markup cannot be executable", async () => {
  const run = (html) => planUnitFragmentUpdate({ snapshot: { content: body }, latest: { content: body }, unitId: UNIT, newFragmentHtml: html });
  assert.equal((await run(located.html.replace('id="sharshar-shoes-66"', 'id="renamed"'))).code, "fragment_not_the_unit");
  assert.equal((await run(located.html.replace('id="sharshar-shoes-title"', ""))).code, "dropped_identity");
  const link = located.html.match(/href="([^"]+)"/);
  assert.ok(link, "the unit has a link to preserve");
  assert.equal((await run(located.html.replace(new RegExp(`href="${link[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), 'href="#"'))).code, "dropped_identity");
  const media = located.html.match(/src="([^"]+)"/);
  if (media) assert.equal((await run(located.html.replace(`src="${media[1]}"`, 'src="/x.png"'))).code, "dropped_identity");
  assert.equal((await run(located.html.replace("</section>", "<script>alert(1)</script></section>"))).code, "unsafe_markup");
  assert.equal((await run(located.html.replace("<h2", '<h2 onclick="x()"'))).code, "unsafe_markup");
  assert.equal((await run(`${located.html}<section id="second"></section>`)).code, "fragment_not_one_section");
  assert.equal((await run("<p>just text</p>")).code, "fragment_not_the_unit");
});

test("bad input and an unknown unit fail closed", async () => {
  assert.equal((await planUnitFragmentUpdate({})).code, "bad_input");
  assert.equal((await planUnitFragmentUpdate({ snapshot: { content: body }, latest: { content: body }, unitId: "../x", newFragmentHtml: "" })).code, "bad_input");
  assert.equal((await planUnitFragmentUpdate({ snapshot: { content: body }, latest: { content: body }, unitId: "nope", newFragmentHtml: located.html })).code, "unit_not_published");
});
