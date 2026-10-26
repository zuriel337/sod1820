import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_ALEPH_BOOKS, AHAVAT_BET_BOOKS, AHAVAT_GIMEL_BOOKS, AHAVAT_DALET_BOOKS, AHAVAT_LETTER_READINGS, AHAVAT_LETTER_READING_LOCATIONS, ahavatLetterForm, ahavatAlephRows, ahavatLetterRows, ahavatLetterBalance, ahavatLetterCsv, ahavatLetterSourcePage } from "../src/data/ahavatTorahLetters2029.js";

test("the printed letter sequence preserves finals, shin/sin and exact page boundaries", () => {
  assert.equal(AHAVAT_LETTER_FORMS.length, 28);
  assert.equal(new Set(AHAVAT_LETTER_FORMS.map(item => item.form)).size, 28);
  for (const [base, final] of [["כ", "ך"], ["מ", "ם"], ["נ", "ן"], ["פ", "ף"], ["צ", "ץ"], ["שׁ", "שׂ"]]) {
    assert.notEqual(ahavatLetterForm(base), ahavatLetterForm(final));
  }
  assert.deepEqual(ahavatLetterForm("ד").pages, [35, 36]);
  assert.deepEqual(ahavatLetterForm("ך").pages, [37]);
  assert.deepEqual(ahavatLetterForm("ם").pages, [38]);
  assert.deepEqual(ahavatLetterForm("שׂ").pages, [41]);
  for (const item of AHAVAT_LETTER_FORMS) assert.ok(item.pages.every(page => page >= 35 && page <= 41));
});

test("all 54 Aleph rows reproduce five cumulative printed checkpoints, not five independent totals", () => {
  assert.deepEqual(AHAVAT_ALEPH_BOOKS.map(book => book.cumulative), [7634, 12894, 16949, 22173, 27059]);
  assert.deepEqual(AHAVAT_ALEPH_BOOKS.map(book => book.count), [7634, 5260, 4055, 5224, 4886]);
  assert.equal(ahavatAlephRows().length, 54);
  let cumulative = 0;
  for (const book of AHAVAT_ALEPH_BOOKS) {
    const sum = book.rows.reduce((total, row) => total + row.count, 0);
    assert.equal(sum, book.count, book.title);
    cumulative += sum;
    assert.equal(cumulative, book.cumulative, book.title);
    assert.ok(book.rows.every(row => row.printed && row.page === 35 && Number.isSafeInteger(row.count)));
  }
});

test("letter search filters by book and parasha while retaining the printed numeral and PDF page", () => {
  assert.equal(ahavatAlephRows("shemot").length, 11);
  assert.deepEqual(ahavatAlephRows("all", "וַיַּקְהֵל").map(row => [row.parasha, row.count, row.printed, row.page]), [["ויקהל", 485, "תפ״ה", 35]]);
  assert.equal(ahavatAlephRows("bereshit", "ויקהל").length, 0);
});

test("Bet closes all five source checkpoints and switching letters cannot reuse Aleph rows", () => {
  assert.deepEqual(AHAVAT_BET_BOOKS.map(book => book.cumulative), [4332, 7437, 9845, 13393, 16345]);
  assert.deepEqual(AHAVAT_BET_BOOKS.map(book => book.count), [4332, 3105, 2408, 3548, 2952]);
  const closedReadings = [AHAVAT_ALEPH_BOOKS, AHAVAT_BET_BOOKS];
  assert.equal(closedReadings.flatMap(books => books.flatMap(book => book.rows)).length, 108);
  for (const books of closedReadings) {
    let total = 0;
    assert.equal(new Set(books.flatMap(book => book.rows.map(row => row.parasha))).size, 54);
    for (const book of books) {
      const sum = book.rows.reduce((value, row) => value + row.count, 0);
      assert.equal(sum, book.count);
      total += sum;
      assert.equal(total, book.cumulative);
    }
  }
  assert.equal(ahavatLetterRows("ב", "shemot", "שט״ו")[0].count, 315);
  assert.equal(ahavatLetterRows("א", "shemot", "שט״ו").length, 0);
  assert.deepEqual(ahavatLetterRows("ך"), []);
});

test("Gimel retains all source rows and printed totals without concealing or balancing reading gaps", () => {
  assert.equal(Object.values(AHAVAT_LETTER_READINGS).flatMap(books => books.flatMap(book => book.rows)).length, 216);
  assert.equal(ahavatLetterRows("ג").length, 54);
  assert.equal(new Set(ahavatLetterRows("ג").map(row => row.parasha)).size, 54);
  assert.equal(AHAVAT_LETTER_READING_LOCATIONS["ג"], "הטור השמאלי");
  assert.deepEqual(AHAVAT_GIMEL_BOOKS.map(book => book.cumulative), [577, 945, 1332, 1726, 2109]);
  assert.deepEqual(AHAVAT_GIMEL_BOOKS.map(ahavatLetterBalance), [
    { rowTotal: 577, printedBookCount: 577, delta: 0 },
    { rowTotal: 368, printedBookCount: 368, delta: 0 },
    { rowTotal: 377, printedBookCount: 387, delta: -10 },
    { rowTotal: 394, printedBookCount: 394, delta: 0 },
    { rowTotal: 374, printedBookCount: 383, delta: -9 },
  ]);
  assert.equal(ahavatLetterRows("ג").reduce((sum, row) => sum + row.count, 0), 2090);
  assert.deepEqual(ahavatLetterRows("ג", "all", "ויקהל").map(row => [row.count, row.printed, row.page]), [[26, "כ״ו", 35]]);
  for (const books of [AHAVAT_ALEPH_BOOKS, AHAVAT_BET_BOOKS]) assert.ok(books.every(book => ahavatLetterBalance(book).delta === 0));
});

test("research CSV exports the selected source rows with Hebrew encoding, exact PDF anchors and both sides of a gap", () => {
  const csv = ahavatLetterCsv("ג", "vayikra", "", "https://example.test/book.pdf");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(csv.trimEnd().split("\r\n").length, 11);
  assert.match(csv, /"סיכום מצטבר בדפוס"/);
  assert.match(csv, /"book:hebrewbooks:5635","ג","ויקרא","ויקרא","כ״ד","24","35"/);
  assert.match(csv, /https:\/\/example\.test\/book\.pdf#page=35&view=FitH/);
  assert.match(csv, /"1332","387","377","-10"/);
  const filtered = ahavatLetterCsv("ג", "all", "ויקהל");
  assert.equal(filtered.trimEnd().split("\r\n").length, 2);
  assert.match(filtered, /"ג","ויקהל","שמות","כ״ו","26"/);
  assert.equal(ahavatLetterCsv("ך").trimEnd().split("\r\n").length, 1);
});

test("Dalet closes 54 directly read rows while preserving a page break inside Vayikra", () => {
  const rows = ahavatLetterRows("ד");
  assert.equal(rows.length, 54);
  assert.equal(new Set(rows.map(row => row.parasha)).size, 54);
  assert.deepEqual(AHAVAT_DALET_BOOKS.map(book => book.cumulative), [1848, 3312, 4228, 5851, 7036]);
  assert.deepEqual(AHAVAT_DALET_BOOKS.map(book => book.count), [1848, 1464, 916, 1623, 1185]);
  assert.ok(AHAVAT_DALET_BOOKS.every(book => ahavatLetterBalance(book).delta === 0));
  assert.deepEqual(AHAVAT_DALET_BOOKS.map(book => book.pages), [[35], [35], [35, 36], [36], [36]]);
  assert.equal(rows.filter(row => row.page === 35).length, 24);
  assert.equal(rows.filter(row => row.page === 36).length, 30);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 7036);
  for (const [parasha, numeral, count] of [["תרומה", "ק״ב", 102], ["קרח", "ק״נ", 150], ["מטות", "קכ״א", 121], ["מסעי", "קמ״ג", 143], ["דברים", "קמ״ט", 149], ["ראה", "קכ״ז", 127], ["האזינו", "ס״ה", 65]]) {
    assert.deepEqual(rows.filter(row => row.parasha === parasha).map(row => [row.printed, row.count]), [[numeral, count]]);
  }
});

test("Dalet book checkpoints, row actions and exports resolve their own source page", () => {
  assert.equal(ahavatLetterSourcePage("ד"), 35);
  assert.equal(ahavatLetterSourcePage("ד", "shemot"), 35);
  assert.equal(ahavatLetterSourcePage("ד", "vayikra"), 36);
  assert.equal(ahavatLetterSourcePage("ד", "vayikra", "ויקרא"), 35);
  assert.equal(ahavatLetterSourcePage("ד", "vayikra", "צו"), 36);
  assert.equal(ahavatLetterSourcePage("ד", "devarim", "האזינו"), 36);
  assert.equal(ahavatLetterSourcePage("ך"), 37);
  const csv = ahavatLetterCsv("ד", "vayikra", "", "https://example.test/book.pdf");
  assert.equal(csv.trimEnd().split("\r\n").length, 11);
  assert.match(csv, /"ד","ויקרא","ויקרא","קי״ב","112","35","https:\/\/example.test\/book.pdf#page=35&view=FitH"/);
  assert.match(csv, /"ד","צו","ויקרא","ק״ט","109","36","https:\/\/example.test\/book.pdf#page=36&view=FitH"/);
  assert.match(csv, /"4228","916","916","0"/);
});
