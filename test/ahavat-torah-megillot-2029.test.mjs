import test from "node:test";
import assert from "node:assert/strict";
import { AHAVAT_MEGILLOT as megillot, AHAVAT_MEGILLAH_LETTER_ROWS as letters, AHAVAT_MEGILLOT_REVIEWED_READINGS as reviewed, ahavatMegillahRows as rows, ahavatMegillahBars as bars, ahavatMegillahBalance as balance, ahavatMegillahCsv as csv } from "../src/data/ahavatTorahMegillot2029.js";

test("DS-09 preserves 28 printed forms by five scrolls, including finals and distinct shin/sin", () => {
  assert.equal(letters.length, 140);
  assert.equal(new Set(letters.map(row => row.id)).size, 140);
  assert.equal(new Set(letters.map(row => row.form)).size, 28);
  assert.equal(letters.filter(row => row.count !== null).length, 137);
  assert.deepEqual(letters.filter(row => row.count === null).map(row => row.id), ["kohelet:א", "esther:ב", "esther:ד"]);
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
  for (const id of ["esther", "kohelet"]) assert.deepEqual(balance(id), { rowTotal: null, delta: null });
  for (const id of ["shir", "ruth"]) {
    const total = rows("letters", id).reduce((sum, row) => sum + row.count, 0);
    assert.deepEqual(balance(id), { rowTotal: total, delta: total - megillot.find(item => item.id === id).letters[1] });
  }
  const eicha = rows("letters", "eicha").reduce((sum, row) => sum + row.count, 0);
  assert.deepEqual(balance("eicha"), { rowTotal: eicha, delta: eicha - 5974 });
  assert.deepEqual(balance("unknown"), { rowTotal: null, delta: null });
});
test("five new source readings retain their previous nulls, exact anchors and untested engine status", () => {
  assert.deepEqual(reviewed.map(row => [row.id, row.printed, row.count, row.page]), [["ruth:ו", "תרצ״ג", 693, 42], ["kohelet:ם", "תכ״ב", 422, 42], ["shir:ע", "קפ״ד", 184, 42], ["ruth:ף", "ג׳", 3, 43], ["kohelet:ף", "כ״ב", 22, 43]]);
  for (const reading of reviewed) {
    assert.equal(reading.previousCount, null);
    assert.equal(reading.previousPrinted, "?");
    assert.equal(reading.sourceAnchor, `#page=${reading.page}&view=FitH`);
    assert.equal(reading.engineVerification, "not_tested");
    assert.equal(letters.find(row => row.id === reading.id).count, reading.count);
    assert.ok(Object.isFrozen(reading));
  }
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
