import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { supabase } from "../src/lib/supabase.js";
import { findNameCross } from "../src/lib/nameCross.js";
import { independentMethods, rankByRarity, scoreCross } from "../src/lib/crossRarity.js";
import { computeEntity, connectToAxis } from "../src/lib/research/coreEngine.js";

const fixture = JSON.parse(fs.readFileSync(
  new URL("./fixtures/legacy-crossing-golden.v1.json", import.meta.url),
  "utf8"
));

function stubGematriaWords(t, rows, { throws = false } = {}) {
  const call = { table: null, select: null, eq: [], limit: null };
  const chain = {
    select(columns) { call.select = columns; return chain; },
    eq(column, value) { call.eq.push([column, value]); return chain; },
    limit(limit) {
      call.limit = limit;
      if (throws) throw new Error("fixture query failed");
      const selected = String(call.select || "").split(",").filter(Boolean);
      const data = rows.map((row) => Object.fromEntries(
        selected.filter((column) => Object.hasOwn(row, column)).map((column) => [column, row[column]])
      ));
      return Promise.resolve({ data });
    },
  };
  t.mock.method(supabase, "from", (table) => {
    call.table = table;
    return chain;
  });
  return call;
}

test("Legacy CrossFinder: frozen Abraham corpus preserves query and rank", async (t) => {
  const golden = fixture.cases["אברהם"];
  const call = stubGematriaWords(t, golden.rows);
  const result = await findNameCross("אברהם");

  assert.equal(call.table, "gematria_words");
  assert.equal(call.select, fixture.columns.join(","));
  assert.deepEqual(call.eq, [["ragil", 248], ["is_verified", true]]);
  assert.equal(call.limit, 250);
  assert.equal(result.partner, golden.expected.primary);
  assert.deepEqual(result.others.map((item) => item.partner), golden.expected.others);
  assert.deepEqual(
    [result, ...result.others].map((item) => item.matchCount),
    golden.expected.match_counts
  );
  assert.deepEqual(result.methods.map((item) => item.label), ["רגיל", "גדול", "סידורי"]);
  const baseDisplayed = [result, ...result.others]
    .map((item) => ({ ...item, rarity: scoreCross(item, fixture.family_sizes) }))
    .filter((item) => !item.rarity.trivial);
  assert.deepEqual(baseDisplayed.map((item) => item.partner), ["חרם", "במדבר", "חמר"]);
  assert.deepEqual(
    rankByRarity(baseDisplayed, fixture.family_sizes).map((item) => item.partner),
    ["במדבר", "חרם", "חמר"],
    "rare-first remains an explicit alternate view, not the default order"
  );
});

test("Legacy CrossFinder maps every one of its 14 selected method columns", async (t) => {
  const input = fixture.cases["אברהם"].rows[0];
  const methodColumns = fixture.columns.slice(1);
  const extraColumns = methodColumns.filter((column) => column !== "ragil");
  const labels = {
    ragil: "רגיל", misratar: "מסתתר", miluy: "מילוי", kadmi: "משולש",
    gadol: "גדול", siduri: "סידורי", atbash: "אתבש", albam: "אלבם",
    ribua: "ריבוע", hakpala: "הכפלה", ribua_gadol: "ריבוע גדול",
    hakpala_gadol: "הכפלה גדולה", miluy_demiluy: "מילוי דמילוי",
    kadmi_gadol: "משולש גדול",
  };
  const rows = extraColumns.map((target, rowIndex) => {
    const row = { phrase: `בדיקת שיטה ${rowIndex + 1}` };
    for (const [columnIndex, column] of methodColumns.entries()) {
      row[column] = column === "ragil"
        ? input.ragil
        : column === target
          ? input[column]
          : -100_000 - (rowIndex * 100) - columnIndex;
    }
    return row;
  });
  stubGematriaWords(t, rows);
  const result = await findNameCross("אברהם");
  const byPartner = new Map([result, ...result.others].map((item) => [item.partner, item]));

  assert.equal(byPartner.size, 13, "regular plus each additional Legacy method is exercised");
  for (const [index, target] of extraColumns.entries()) {
    const match = byPartner.get(`בדיקת שיטה ${index + 1}`);
    assert.deepEqual(match.methods.map((method) => [method.col, method.label]), [
      ["ragil", labels.ragil],
      [target, labels[target]],
    ]);
  }
});

test("Legacy CrossFinder: anagram, self and duplicate filtering stay observable", async (t) => {
  const golden = fixture.cases["משיח"];
  const rows = [...golden.rows, { ...golden.rows.at(-1), id: "duplicate-live-row" }];
  stubGematriaWords(t, rows);
  const result = await findNameCross("משיח");

  assert.equal(result.partner, golden.expected.primary);
  assert.deepEqual(result.others.map((item) => item.partner), golden.expected.others);
  assert.equal([result, ...result.others].some((item) => item.partner === golden.expected.anagram_excluded), false);
  assert.equal([result, ...result.others].filter((item) => item.partner === "שבוים").length, 1);

  const displayed = [result, ...result.others]
    .map((item) => ({ ...item, rarity: scoreCross(item, fixture.family_sizes) }))
    .filter((item) => !item.rarity.trivial);
  assert.deepEqual(displayed.map((item) => item.partner), ["שבוים"],
    "Legacy UI hides the regular/large-only candidate even when the engine ranks it first");
});

test("Legacy CrossFinder: empty, query failure and 13-result output cap stay unchanged", async (t) => {
  stubGematriaWords(t, []);
  assert.equal(await findNameCross("אברהם"), null);

  t.mock.restoreAll();
  stubGematriaWords(t, [], { throws: true });
  assert.equal(await findNameCross("אברהם"), null);

  t.mock.restoreAll();
  const input = fixture.cases["אברהם"].rows[0];
  const many = Array.from({ length: 20 }, (_, index) => ({
    ...input,
    id: `bounded-${index}`,
    phrase: `בדיקה${String.fromCharCode(0x05d0 + index)}`,
  }));
  stubGematriaWords(t, many);
  const bounded = await findNameCross("אברהם");
  assert.equal(1 + bounded.others.length, 13);
});

test("Legacy rarity is an annotation; optional rare-first does not rewrite base order", () => {
  const golden = fixture.cases["אברהם"].expected;
  const crosses = [
    { partner: "חרם", methods: [
      { label: "רגיל", value: 248 }, { label: "גדול", value: 808 }, { label: "סידורי", value: 41 },
    ] },
    { partner: "במדבר", methods: [
      { label: "רגיל", value: 248 }, { label: "סידורי", value: 41 }, { label: "אלבם", value: 151 },
    ] },
  ];
  assert.deepEqual(crosses.map((item) => item.partner), [golden.primary, golden.others[0]]);
  assert.deepEqual(rankByRarity(crosses, fixture.family_sizes).map((item) => item.partner), ["במדבר", "חרם"]);
});

test("Legacy Kadmi display alias bug is characterized, never promoted to canonical truth", () => {
  const methods = [
    { label: "משולש", value: 1331 },
    { label: "משולש גדול", value: 1331 },
  ];
  assert.deepEqual(independentMethods(methods).map((item) => item.label), ["משולש", "משולש גדול"]);
  assert.deepEqual(scoreCross({ methods }, fixture.family_sizes), {
    score: 12,
    indepCount: 2,
    rarestSize: null,
    resonance: 0,
    resoBonus: 0,
    trivial: false,
  });
  assert.equal(fixture.family_sizes["קדמי|1331"], 10);
  assert.equal(fixture.family_sizes["משולש|1331"], undefined);
});

test("Legacy CompareTwo keeps same-method, cross-method and six-link cap semantics", () => {
  const cases = [
    ["אהבה", "אחד", [
      [13, "רגיל", "רגיל", true],
      [13, "גדול", "גדול", true],
      [13, "סידורי", "סידורי", true],
      [13, "רגיל", "סידורי", false],
      [13, "רגיל", "גדול", false],
      [13, "גדול", "רגיל", false],
    ]],
    ["משיח", "אבנה לך מקדש", [
      [552, "מסתתר", "רגיל", false],
      [552, "מסתתר גדול", "רגיל", false],
    ]],
    ["משיח", "מלך ישראל", []],
    ["אברהם", "במדבר", [
      [248, "רגיל", "רגיל", true],
      [41, "סידורי", "סידורי", true],
      [151, "אלבם", "אלבם", true],
      [382, "אטבח", "אטבח", true],
      [361, "אותיות אחרי", "אותיות אחרי", true],
      [248, "רגיל", "גדול", false],
    ]],
    ["משיח", "משיח", [
      [358, "רגיל", "רגיל", true],
      [878, "מילוי", "מילוי", true],
      [552, "מסתתר", "מסתתר", true],
      [1331, "קדמי", "קדמי", true],
      [1088, "ריבוע", "ריבוע", true],
      [358, "גדול", "גדול", true],
    ]],
  ];
  for (const [left, right, expected] of cases) {
    const links = connectToAxis(computeEntity(left), computeEntity(right));
    assert.deepEqual(
      links.map((item) => [item.value, item.axisMethod, item.entMethod, item.same]),
      expected,
      `${left}/${right}: exact Legacy link identity and order`
    );
    assert.ok(links.length <= 6, `${left}/${right}: legacy cap`);
  }
});

test("Kadmi, large Kadmi and word-triangle remain separate method identities", () => {
  const entity = computeEntity("משיח");
  assert.equal(entity.values["קדמי"], 1331);
  assert.equal(entity.values["משולש גדול"], 1331);
  assert.equal(entity.values["משולש מילה"], 1088);
});
