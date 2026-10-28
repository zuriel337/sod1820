import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const doc = readFileSync(new URL("../docs/reviews/revelation-1237-source-inventory-20261028.md", import.meta.url), "utf8");

test("inventory keeps separate election threshold, source and interpretation", () => {
  assert.match(doc, /1,237 היה סף צירי הוועידה/);
  assert.match(doc, /1,238/);
  assert.match(doc, /1,239/);
  assert.match(doc, /אין לכנות את 1,237 מספר האלקטורים/);
  assert.match(doc, /לא edge שמור/);
});

test("inventory records bounded coverage and public revalidation", () => {
  assert.match(doc, /48 \+ 17 = \*\*65\*\*/);
  assert.match(doc, /109 רשומות מועמדות ב-27 גלריות/);
  assert.match(doc, /לבדוק זכאות מחדש בכל פתיחה/);
  assert.match(doc, /אינו מהווה פריביו/);
  assert.match(doc, /בנט אינו מרכז הטופיק/);
});
