import test from "node:test";
import assert from "node:assert/strict";
import { AHAVAT_MEGILLOT as megillot, AHAVAT_MEGILLAH_LETTER_ROWS as letters, ahavatMegillahRows as rows, ahavatMegillahBars as bars, ahavatMegillahBalance as balance, ahavatMegillahCsv as csv } from "../src/data/ahavatTorahMegillot2029.js";

test("DS-09 preserves 28 printed forms by five scrolls, including finals and distinct shin/sin", () => {
  assert.equal(letters.length, 140);
  assert.equal(new Set(letters.map(row => row.id)).size, 140);
  assert.equal(new Set(letters.map(row => row.form)).size, 28);
  assert.equal(letters.filter(row => row.count !== null).length, 132);
  assert.equal(letters.filter(row => row.count === null).length, 8);
  for (const megillah of megillot) {
    assert.ok(Object.isFrozen(megillah));
    assert.equal(rows("letters", megillah.id).length, 28);
    assert.deepEqual(rows("letters", megillah.id).slice(-3).map(row => row.form), ["שׁ", "שׂ", "ת"]);
    assert.equal(rows("letters", megillah.id).filter(row => row.page === 42).length, 20);
    assert.equal(rows("letters", megillah.id).filter(row => row.page === 43).length, 8);
  }
});
test("overall author totals and five word readings remain separate from matrix sums", () => {
  assert.deepEqual(megillot.map(item => item.letters[1]), [12108, 5162, 4947, 5974, 14968]);
  assert.deepEqual(rows("words").map(row => row.count), [3045, 1400, 1214, 1541, 2986]);
  assert.ok(rows("words").every(row => row.page === 43 && row.form === "תיבות"));
  for (const id of ["esther", "shir", "ruth", "kohelet"]) assert.deepEqual(balance(id), { rowTotal: null, delta: null });
  const eicha = rows("letters", "eicha").reduce((sum, row) => sum + row.count, 0);
  assert.deepEqual(balance("eicha"), { rowTotal: eicha, delta: eicha - 5974 });
  assert.deepEqual(balance("unknown"), { rowTotal: null, delta: null });
});
test("source actions and CSV use row body pages, not the source-summary page", () => {
  assert.equal(rows("letters", "esther").find(row => row.form === "פ").page, 42);
  assert.equal(rows("letters", "esther").find(row => row.form === "ף").page, 43);
  assert.ok(bars("letters").every(row => row.page === 43));
  const data = csv("letters", "esther", "", "https://example.test/book.pdf");
  assert.equal(data.trimEnd().split("\r\n").length, 29);
  assert.match(data, /"DS-09","אסתר","ב","\?","","42"/);
  assert.match(data, /#page=42&view=FitH/);
  assert.match(data, /#page=43&view=FitH/);
  assert.match(csv("words", "ruth"), /"DS-10","רות","תיבות","אלף רי״ד","1214","43"/);
  assert.doesNotMatch(data, /null|NaN|undefined/);
});
test("numeric bars omit ambiguous cells and normalized search never invents new readings", () => {
  assert.equal(bars("letters", "esther").length, 26);
  assert.equal(bars("letters").length, 5);
  assert.equal(bars("words").length, 5);
  assert.equal(rows("letters", "all", "שִׁיר הַשִּׁירִים").length, 28);
  assert.equal(rows("words", "all", "קֹהֶלֶת")[0].count, 2986);
  assert.deepEqual(rows("other"), []);
  assert.deepEqual(bars("letters", "missing"), []);
  assert.ok(letters.every(row => !("engine_verified" in row)));
});
