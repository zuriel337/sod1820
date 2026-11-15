import test from "node:test";
import assert from "node:assert/strict";
import { buildPostOutline, outlineLabel, visibleOutlineRows, outlineActiveParent, OUTLINE_MAX_CHILDREN, OUTLINE_MAX_LEVEL1 } from "./postOutline2029.js";

const e = (kind, id, text) => ({ kind, id, text });

test("headings become level 1; sub-headings become level 2 under their section", () => {
  const items = buildPostOutline({ entries: [e("h2", "a", "1073"), e("h3", "a1", "תת כותרת"), e("h3", "a2", "עוד אחת"), e("h2", "b", "ציר 718")] });
  assert.deepEqual(items.map((i) => [i.id, i.level, i.parentId]), [["a", 1, null], ["a1", 2, "a"], ["a2", 2, "a"], ["b", 1, null]]);
});

test("a Post with proven updates: 'מה התחדש' is one section and the units are its children, in order", () => {
  const items = buildPostOutline({ entries: [e("updates", "upd", "x"), e("unit", "u1", "ממשלת משיח בן דוד = 1234"), e("unit", "u2", "ציר השבע"), e("h2", "h", "רמזי הבחירות")], fixed: [{ id: "post-sources", label: "מקורות" }] });
  assert.deepEqual(items.map((i) => [i.label, i.level, i.parentId]), [["מה התחדש", 1, null], ["ממשלת משיח בן דוד = 1234", 2, "upd"], ["ציר השבע", 2, "upd"], ["רמזי הבחירות", 1, null], ["מקורות", 1, null]]);
});

test("a sub-heading never hangs under 'מה התחדש', a lone section is not a tree, an empty Post gives nothing", () => {
  assert.deepEqual(buildPostOutline({ entries: [e("updates", "upd", "x"), e("h3", "h3", "ביניים"), e("h2", "h", "כותרת")] }).map((i) => [i.id, i.level]), [["upd", 1], ["h", 1]]);
  assert.deepEqual(buildPostOutline({ entries: [e("h2", "only", "כותרת יחידה")] }), []);
  assert.deepEqual(buildPostOutline({}), []);
  assert.deepEqual(buildPostOutline({ entries: [e("h2", "only", "כותרת יחידה")], fixed: [{ id: "post-sources", label: "מקורות" }] }).map((i) => i.id), ["only", "post-sources"], "one section plus the fixed 'מקורות' is two stations");
});

test("labels are cleaned and bounded; duplicates and empty headings are dropped", () => {
  assert.equal(outlineLabel("✨ 1237 — המספר שחוזר מכמה כיוונים ועוד ועוד ועוד ועוד"), "1237 — המספר שחוזר מכמה כיוונים ועוד…");
  assert.equal(outlineLabel("  | נושא |  "), "נושא");
  const items = buildPostOutline({ entries: [e("h2", "a", "אחת"), e("h2", "a", "שוב אותו מזהה"), e("h2", "b", "   "), e("h2", "c", "שתיים")] });
  assert.deepEqual(items.map((i) => i.id), ["a", "c"]);
});

test("caps: at most 12 sections and 8 children each; the fixed items are not counted twice", () => {
  const entries = []; for (let i = 0; i < 20; i += 1) { entries.push(e("h2", `s${i}`, `סעיף ${i}`)); for (let j = 0; j < 12; j += 1) entries.push(e("h3", `s${i}-${j}`, `תת ${i}-${j}`)); }
  const items = buildPostOutline({ entries, fixed: [{ id: "post-sources", label: "מקורות" }, { id: "dup", label: "סעיף 1" }] });
  assert.equal(items.filter((i) => i.level === 1 && i.id.startsWith("s")).length, OUTLINE_MAX_LEVEL1);
  assert.ok(items.filter((i) => i.parentId === "s0").length === OUTLINE_MAX_CHILDREN);
  assert.ok(!items.some((i) => i.id === "dup"), "a fixed item whose label already exists is not repeated");
  assert.ok(items.some((i) => i.id === "post-sources"));
});

test("children are drawn only under the active parent", () => {
  const items = buildPostOutline({ entries: [e("updates", "upd", "x"), e("unit", "u1", "אחת"), e("unit", "u2", "שתיים"), e("h2", "h", "כותרת"), e("h3", "h1", "ילד")] });
  assert.deepEqual(visibleOutlineRows(items, "h").map((i) => i.id), ["upd", "h", "h1"]);
  assert.deepEqual(visibleOutlineRows(items, "u2").map((i) => i.id), ["upd", "u1", "u2", "h"]);
  assert.equal(outlineActiveParent(items, "u2"), "upd");
  assert.equal(outlineActiveParent(items, "nope"), null);
});
