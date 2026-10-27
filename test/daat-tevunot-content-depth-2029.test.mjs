import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const map = await readJson("public/book-data/daat-tevunot.internal-map.json");
const commentary = await readJson("public/book-data/daat-tevunot.commentary.json");
const source = map.units.filter(unit => unit.quote_status === "licensed_source_section");
const section = id => source.find(unit => unit.section_id === id);
const explanation = id => section(id).companion_explanation;

// Approved-base fixtures: 40382ae21b9ca2d6ca38f58c387542b993d18f69.
// Only companion prose is excluded. This guards the full source text, citations,
// identities, PDF anchors, existing related IDs and interpretive status together.
function immutableDigest(data, collection, editable) {
  const copy = {
    ...data,
    [collection]: data[collection].map(item => Object.fromEntries(
      Object.entries(item).filter(([key]) => !editable.includes(key)),
    )),
  };
  return createHash("sha256").update(JSON.stringify(copy)).digest("hex");
}

test("Daat content depth preserves every non-companion field from the approved base", () => {
  assert.equal(immutableDigest(map, "units", ["question", "argument_steps", "conclusion", "companion_explanation"]),
    "78f87d809575b600645d3c205b51ca9e9b66126cd96147fe5454a53cd1bd7dfe");
  assert.equal(immutableDigest(commentary, "pages", ["companion_explanation", "reading_points"]),
    "693e65096de87c78b3997d0bbb4b1e2ab0fc31cc941813d7ab2786c07a4c8d07");
});

test("all 195 sections have differentiated reasoning rather than the mapping template", () => {
  assert.equal(source.length, 195);
  assert.equal(new Set(source.map(unit => unit.question)).size, 195);
  assert.equal(new Set(source.map(unit => unit.conclusion)).size, 195);
  for (const unit of source) {
    const prose = [unit.question, ...unit.argument_steps, unit.conclusion, unit.companion_explanation].join(" ");
    assert.doesNotMatch(prose, /מוקד הסעיף הוא|מפת הקריאה מציבה|בתוך ענף|איזו בקשה, קושיה או הסכמה|המהלך מתקדם מתוך לשון הדיאלוג עצמו/, unit.id);
    assert.ok(unit.argument_steps.length >= 3, unit.id);
    assert.equal(new Set(unit.argument_steps).size, unit.argument_steps.length, unit.id);
    assert.notEqual(unit.conclusion, unit.source_quote, unit.id);
    assert.notEqual(unit.conclusion, unit.source_focus, unit.id);
    // A short assent is explained as an assent, never expanded into invented source speech.
    assert.ok(unit.companion_explanation.includes(unit.conclusion), unit.id);
  }
  assert.match(explanation(17), /הזמנה להמשך ההסבר/);
  assert.match(explanation(99), /אינה מאשרת|אין בתגובתה קביעה/);
});

test("all continuation guides explain their local argument without claiming new quotations", () => {
  const continuation = map.units.filter(unit => unit.kind === "section_continuation_page");
  assert.equal(continuation.length, 31);
  assert.equal(new Set(continuation.map(unit => unit.question)).size, 31);
  for (const unit of continuation) {
    assert.equal(unit.source_quote, null, unit.id);
    assert.equal(unit.quote_status, "not_asserted", unit.id);
    // The existing map links adjacent pages, including continuation -> continuation.
    // Walk that actual lineage instead of inventing a direct edge to the opening.
    let previous = unit;
    while (previous.kind === "section_continuation_page") {
      const before = map.units[map.units.indexOf(previous) - 1];
      assert.ok(before, unit.id);
      assert.equal(before.section_id, unit.section_id, unit.id);
      assert.ok(previous.related_unit_ids.includes(before.id), previous.id);
      previous = before;
    }
    assert.equal(previous.id, `daat-tevunot-section-${String(unit.section_id).padStart(3, "0")}`);
    assert.ok(unit.argument_steps.length >= 3, unit.id);
    assert.doesNotMatch(unit.companion_explanation, /המפה שומרת את רצף הקריאה|מחברים את המשך הדיון לענף/, unit.id);
  }
  const at = page => continuation.find(unit => unit.pdf_page === page).companion_explanation;
  assert.match(at(13), /מום|חיסרון/);
  assert.match(at(14), /אדם הראשון/);
  assert.match(at(15), /כישלון|התאוה/);
  assert.match(at(52), /שלושת מצבי|המצב שקדם/);
  assert.match(at(53), /מה המעשה מוליד/);
  assert.match(at(53), /באיזו צורה הוא נעשה/);
  assert.match(at(54), /עץ החיים/);
});

test("page guides retain edition boundaries and every original PDF and adjacency anchor", () => {
  const ids = new Set(map.units.map(unit => unit.id));
  for (const unit of map.units) {
    assert.equal(unit.source_anchor, `#page=${unit.pdf_page}&view=FitH`, unit.id);
    assert.ok(unit.source_url.endsWith(unit.source_anchor), unit.id);
    for (const related of unit.related_unit_ids) assert.ok(ids.has(related), `${unit.id}: ${related}`);
  }
  for (const page of commentary.pages) {
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
    assert.doesNotMatch(page.companion_explanation, /זהו עמוד \d+ מתוך|במילות המקור של העמוד בולטים|ההסבר מסדר את הצעד/);
  }
  assert.match(commentary.pages[27].companion_explanation, /שורש הנשמה|ממועט/);
  assert.match(commentary.pages[81].companion_explanation, /קדושה|שבת/);
  assert.match(commentary.pages[97].companion_explanation, /סיום|חותמת/);
  assert.equal(map.units.filter(unit => unit.kind === "edition_matter").length, 3);
  assert.equal(map.display_contract.source_text, "דברי הספר");
  assert.equal(map.display_contract.companion, "הסבר נלווה");
});

// These are editorial regression checks on key distinctions, not an engine seal
// or a claim that keyword checks can certify the theological reading of a book.
test("content keeps the distinctions between lack, evil, choice and complete repair", () => {
  assert.match(explanation(18), /קניין|בעלי הטוב/);
  assert.match(explanation(26), /ערך הנפעל/);
  assert.match(explanation(38), /אינה חלק מהגדרת החכמה/);
  assert.match(explanation(114), /ביטול חלקי/);
  assert.match(explanation(118), /חיסרון יחסי אינו בהכרח רע/);
  assert.match(explanation(124), /אינה הפיכת רעתו לטוב עצמי/);
  assert.match(explanation(142), /קיום מצומצם/);
  assert.match(explanation(152), /שינוי מדרגת המציאות/);
});

test("the companion does not turn general providence or prophetic images into private certainty", () => {
  assert.match(explanation(162), /אדם מסוים/);
  assert.match(explanation(166), /שאין בידינו לייחס סיבה זו לאדם מסוים/);
  assert.match(explanation(170), /אין מן המאורע לבדו דרך לקבוע/);
  assert.match(explanation(180), /ריבוי הצורות אינו ריבוי במהות/);
  assert.match(explanation(184), /נבראת לצורך הבנתו ואינה עצמות/);
  assert.match(explanation(188), /אינו עובר את מה שהותר/);
  assert.match(explanation(194), /אינו טענה להבנת המנגנון של יש מאין/);
  assert.match(explanation(195), /גבולות הידיעה/);
  for (const unit of map.units) {
    assert.doesNotMatch(unit.companion_explanation, /מאומת במנוע|אימות מנוע הוכיח|הוכח במנוע/);
  }
});
