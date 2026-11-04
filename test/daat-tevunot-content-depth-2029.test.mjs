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

// The first depth pass froze every field except companion prose. This continuation
// deliberately adds source-bound relationship/specification data and makes two
// witnessed transcription corrections below; the digest locks their reviewed state.
function immutableDigest(data, collection, editable) {
  const copy = {
    ...data,
    [collection]: data[collection].map(item => Object.fromEntries(
      Object.entries(item).filter(([key]) => !editable.includes(key)),
    )),
  };
  return createHash("sha256").update(JSON.stringify(copy)).digest("hex");
}

test("Daat content depth preserves every reviewed non-companion field", () => {
  assert.equal(immutableDigest(map, "units", ["question", "argument_steps", "conclusion", "companion_explanation"]),
    "0ebc60e7bdf5fc7b29bedfa61dabf37cfd2128bc6ddd0f877eeef76970c78795");
  assert.equal(immutableDigest(commentary, "pages", ["companion_explanation", "reading_points"]),
    "693e65096de87c78b3997d0bbb4b1e2ab0fc31cc941813d7ab2786c07a4c8d07");
});

test("source relationships extend the existing map with exact unit and PDF witnesses", () => {
  assert.equal(map.source_relationships.length, 12);
  assert.equal(new Set(map.source_relationships.map(item => item.id)).size, map.source_relationships.length);
  for (const relation of map.source_relationships) {
    assert.ok(["source_explicit", "structural_map"].includes(relation.status), relation.id);
    assert.ok(relation.explanation.length > 30, relation.id);
    for (const endpoint of [relation.from, relation.to]) {
      const unit = map.units.find(candidate => candidate.id === endpoint.unit_id);
      assert.ok(unit, `${relation.id}: ${endpoint.id}`);
      assert.equal(endpoint.pdf_page, unit.pdf_page, `${relation.id}: ${endpoint.id}`);
      assert.equal(endpoint.source_anchor, unit.source_anchor, `${relation.id}: ${endpoint.id}`);
      assert.ok(endpoint.explanation.length > 20, `${relation.id}: ${endpoint.id}`);
    }
  }
  assert.ok(map.source_relationships.some(item => item.id === "daat-tevunot-relation:unity-to-two-governances"));
  assert.ok(map.source_relationships.some(item => item.id === "daat-tevunot-relation:judgment-to-no-private-inference"));
  assert.ok(map.source_relationships.some(item => item.id === "daat-tevunot-relation:prophetic-images-to-knowledge-boundary"));
});

test("structure specifications remain source-only illustrations with anchored components and links", () => {
  assert.equal(map.structure_specifications.length, 6);
  assert.equal(new Set(map.structure_specifications.map(item => item.id)).size, map.structure_specifications.length);
  for (const structure of map.structure_specifications) {
    assert.equal(structure.layer, "המחשה נלווית", structure.id);
    assert.equal(structure.status, "source_specification_only", structure.id);
    assert.equal(structure.engine_verification, "not_applicable", structure.id);
    const components = new Map(structure.components.map(item => [item.id, item]));
    assert.equal(components.size, structure.components.length, structure.id);
    for (const component of components.values()) {
      const unit = map.units.find(candidate => candidate.id === component.unit_id);
      assert.ok(unit, `${structure.id}: ${component.id}`);
      assert.equal(component.pdf_page, unit.pdf_page, `${structure.id}: ${component.id}`);
      assert.equal(component.source_anchor, unit.source_anchor, `${structure.id}: ${component.id}`);
      assert.ok(component.explanation.length > 20, `${structure.id}: ${component.id}`);
    }
    assert.equal(new Set(structure.relations.map(item => item.id)).size, structure.relations.length, structure.id);
    for (const relation of structure.relations) {
      assert.ok(components.has(relation.from_id), `${structure.id}: ${relation.id}`);
      assert.ok(components.has(relation.to_id), `${structure.id}: ${relation.id}`);
      const unit = map.units.find(candidate => candidate.id === relation.unit_id);
      assert.ok(unit, `${structure.id}: ${relation.id}`);
      assert.equal(relation.pdf_page, unit.pdf_page, `${structure.id}: ${relation.id}`);
      assert.equal(relation.source_anchor, unit.source_anchor, `${structure.id}: ${relation.id}`);
      assert.ok(relation.explanation.length > 20, `${structure.id}: ${relation.id}`);
    }
  }
  assert.ok(map.structure_specifications.some(item => item.id === "daat-tevunot-structure:two-governances"));
  assert.ok(map.structure_specifications.some(item => item.id === "daat-tevunot-structure:judgment-measure-and-disclosure"));
});

test("the two reported witness anomalies are corrected without inventing text", () => {
  const fixes = map.source_witness_reconciliation;
  assert.equal(fixes.id, "daat-tevunot-witness-reconciliation:20261027");
  assert.equal(fixes.corrections.length, 2);
  const section48 = section(48);
  const section167 = section(167);
  assert.doesNotMatch(section48.source_quote, /mw-parser-output|psuq2|font-family/);
  assert.match(section48.source_quote, /תנו עוז לאלהים/);
  assert.equal(section167.source_quote, "אמנם לפי הדרך הזה היה ראוי שכל הצדיקים לא יהיו אלא מיוסרים, והרי המציאות אינו כן.");
  assert.equal(section167.source_focus, section167.source_quote);
  assert.equal(section167.extraction_anchor, section167.source_quote);
  assert.doesNotMatch(section167.source_quote, /השפעB|טעמי הנהגתו הנעלמים/);
  assert.match(fixes.corrections[1].resolution, /לא הושלם|לא תוקן|לא יוחס/);
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
