import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { AHAVAT_LETTER_FORMS, AHAVAT_ALEPH_BOOKS, AHAVAT_BET_BOOKS, AHAVAT_GIMEL_BOOKS, AHAVAT_DALET_BOOKS, AHAVAT_LETTER_READINGS, AHAVAT_LETTER_COVERAGE, AHAVAT_LETTER_READING_LOCATIONS, ahavatLetterForm, ahavatAlephRows, ahavatLetterRows, ahavatLetterBalance, ahavatLetterCsv, ahavatLetterSourcePage, ahavatLetterSourceFragments, ahavatLetterBars, ahavatLetterNumber } from "../src/data/ahavatTorahLetters2029.js";
import { LETTER_SOURCE_REGIONS } from "../scripts/build-ahavat-letter-sections-2029.mjs";

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
  assert.equal(ahavatLetterRows("ך").length, 54);
  assert.notDeepEqual(ahavatLetterRows("ך"), ahavatLetterRows("ב"));
});

test("Gimel retains all source rows and printed totals without concealing or balancing reading gaps", () => {
  assert.equal(Object.values(AHAVAT_LETTER_READINGS).flatMap(books => books.flatMap(book => book.rows)).length, 1512);
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

test("Heh and Vav preserve 108 explicit source numerals and close ten cumulative checkpoints", () => {
  for (const [form, totals] of [["ה", [6283, 12403, 17069, 22757, 28055]], ["ו", [8449, 14630, 19138, 25133, 30516]]]) {
    const books = AHAVAT_LETTER_READINGS[form];
    assert.equal(ahavatLetterRows(form).length, 54);
    assert.deepEqual(books.map(book => book.cumulative), totals);
    assert.ok(books.every(book => ahavatLetterBalance(book).delta === 0));
    assert.ok(books.flatMap(book => book.rows).every(row => row.page === 36 && row.printed.length > 0 && Number.isSafeInteger(row.count)));
    assert.equal(ahavatLetterSourcePage(form, "devarim"), 36);
    assert.match(ahavatLetterCsv(form, "shemot", "", "https://example.test/source.pdf"), /#page=36&view=FitH/);
  }
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
  assert.equal(ahavatLetterCsv("ך").trimEnd().split("\r\n").length, 55);
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

test("all 28 printed forms have source material, without treating OCR sections as verified numerical rows", async () => {
  const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.letter-sections.json", import.meta.url), "utf8"));
  assert.equal(bundle.sections.length, 22);
  assert.equal(bundle.sections.reduce((sum, section) => sum + section.fragments.length, 0), 32);
  const materialForms = [...Object.keys(AHAVAT_LETTER_READINGS), ...bundle.sections.map(section => section.form)];
  assert.equal(new Set(materialForms).size, 28);
  assert.equal(Object.keys(AHAVAT_LETTER_READINGS).length, 28);
  for (const section of bundle.sections) {
    const fragments = ahavatLetterSourceFragments(bundle, section.form);
    assert.deepEqual(fragments.map(item => item.pdf_page), LETTER_SOURCE_REGIONS[section.form].map(item => item[0]));
    assert.equal("count" in section, false, "OCR must not invent structured numbers");
    for (const fragment of fragments) {
      assert.ok(fragment.text.length > 25);
      assert.ok(fragment.region.y + fragment.region.height <= 473, "exclude catchwords/page footers");
      assert.equal(fragment.source_anchor, `#page=${fragment.pdf_page}&view=FitH`);
      assert.equal("count" in fragment, false);
      assert.equal("engine_verified" in fragment, false);
    }
  }
  assert.deepEqual(ahavatLetterSourceFragments(bundle, "י").map(item => [item.pdf_page, item.column]), [[37, "right"], [37, "left"]]);
  assert.deepEqual(ahavatLetterSourceFragments(bundle, "שׂ").map(item => [item.pdf_page, item.column]), [[41, "right"], [41, "left"]]);
  for (const key of ["שׂ", "ת"]) assert.ok(ahavatLetterSourceFragments(bundle, key).every(fragment => !fragment.text.includes("תיבות התורה")));
  assert.deepEqual(ahavatLetterSourceFragments({ ...bundle, source_identity: "foreign" }, "ח"), []);
  assert.deepEqual(ahavatLetterSourceFragments({ ...bundle, source_pdf_sha256: "wrong" }, "ח"), []);
  assert.deepEqual(ahavatLetterSourceFragments({ ...bundle, fidelity_status: "verified" }, "ח"), []);
  assert.deepEqual(ahavatLetterSourceFragments(bundle, "unknown"), []);
  const invalidAnchor = structuredClone(bundle);
  invalidAnchor.sections[0].fragments[0].source_anchor = "#page=99&view=FitH";
  assert.deepEqual(ahavatLetterSourceFragments(invalidAnchor, "ז"), []);
});

test("Chet closes all source checkpoints while Bamidbar's rows and checkpoint span different pages", () => {
  const books = AHAVAT_LETTER_READINGS["ח"];
  assert.equal(ahavatLetterRows("ח").length, 54);
  assert.deepEqual(books.map(book => book.cumulative), [1844, 3361, 4481, 6180, 7189]);
  assert.deepEqual(books.map(book => book.count), [1844, 1517, 1120, 1699, 1009]);
  assert.ok(books.every(book => ahavatLetterBalance(book).delta === 0));
  assert.deepEqual(books.map(book => book.pages), [[36], [36], [36], [36, 37], [37]]);
  assert.equal(ahavatLetterSourcePage("ח", "bamidbar"), 37);
  assert.equal(ahavatLetterSourcePage("ח", "bamidbar", "במדבר"), 36);
  assert.equal(ahavatLetterSourcePage("ח", "bamidbar", "מסעי"), 37);
  assert.equal(ahavatLetterRows("ח").filter(row => row.page === 36).length, 42);
  assert.equal(ahavatLetterRows("ח").filter(row => row.page === 37).length, 12);
  const csv = ahavatLetterCsv("ח", "bamidbar", "", "https://example.test/book.pdf");
  assert.match(csv, /"ח","במדבר","במדבר","קע״ו","176","36"/);
  assert.match(csv, /"ח","מסעי","במדבר","קע״ג","173","37"/);
  assert.match(csv, /"6180","1699","1699","0"/);
});

test("Tet preserves a one-unit Vayikra reading gap instead of silently balancing the row", () => {
  const books = AHAVAT_LETTER_READINGS["ט"];
  assert.equal(ahavatLetterRows("ט").length, 54);
  assert.deepEqual(books.map(book => book.cumulative), [308, 656, 1148, 1545, 1804]);
  assert.deepEqual(books.map(book => ahavatLetterBalance(book).delta), [0, 0, -1, 0, 0]);
  assert.equal(ahavatLetterRows("ט", "all", "תזריע")[0].count, 56);
  assert.equal(ahavatLetterRows("ט").reduce((sum, row) => sum + row.count, 0), 1803);
  assert.ok(ahavatLetterRows("ט").every(row => row.page === 37));
  const csv = ahavatLetterCsv("ט", "vayikra");
  assert.match(csv, /"נ״ו","56","37"/);
  assert.match(csv, /"1148","492","491","-1"/);
});

test("Kaf keeps its own 54 source readings and is never merged with final Kaf", () => {
  const books = AHAVAT_LETTER_READINGS["כ"];
  assert.deepEqual(books.map(book => book.cumulative), [1909, 3683, 5255, 6833, 8612]);
  assert.ok(books.every(book => ahavatLetterBalance(book).delta === 0));
  assert.equal(ahavatLetterRows("כ").length, 54);
  assert.equal(ahavatLetterRows("ך").length, 54);
  assert.equal(AHAVAT_LETTER_READINGS["ך"].at(-1).cumulative, 3358);
  for (const [parasha, printed, count] of [["ויחי", "קי״א", 111], ["תרומה", "ק״כ", 120], ["אחרי מות", "קמ״ו", 146], ["מסעי", "ק״י", 110], ["עקב", "רי״ד", 214]]) {
    assert.deepEqual(ahavatLetterRows("כ").filter(row => row.parasha === parasha).map(row => [row.printed, row.count, row.page]), [[printed, count, 37]]);
  }
  assert.equal(AHAVAT_LETTER_READINGS["י"][3].cumulative, null, "uncertain Yod checkpoint is not inferred");
  assert.equal(ahavatLetterRows("ז").find(row => row.parasha === "האזינו").count, null, "uncertain Zayin numeral is not inferred");
});

test("Lamed keeps a split label/numeral source boundary and both unbalanced printed checkpoints", () => {
  const books = AHAVAT_LETTER_READINGS["ל"];
  const rows = ahavatLetterRows("ל");
  assert.equal(rows.length, 54);
  assert.equal(new Set(rows.map(row => row.parasha)).size, 54);
  assert.deepEqual(books.map(book => book.cumulative), [5275, 9566, 12654, 17482, 21570]);
  assert.deepEqual(books.map(book => ahavatLetterBalance(book).delta), [0, 0, -1, 0, -1]);
  assert.deepEqual(books.map(book => book.pages), [[37, 38], [38], [38], [38], [38]]);
  assert.equal(rows.filter(row => row.page === 37).length, 7);
  assert.equal(rows.filter(row => row.page === 38).length, 47);
  assert.equal(ahavatLetterSourcePage("ל"), 37);
  assert.equal(ahavatLetterSourcePage("ל", "bereshit"), 38);
  assert.equal(ahavatLetterSourcePage("ל", "bereshit", "ויצא"), 37);
  assert.equal(ahavatLetterSourcePage("ל", "bereshit", "וישלח"), 38);
  assert.match(AHAVAT_LETTER_READING_LOCATIONS["ל"], /המספר של וישלח מופיע ב־PDF 38/);
  for (const [parasha, printed, count] of [["ויקרא", "ת״ע", 470], ["אחרי מות", "של״ז", 337], ["דברים", "ת״ו", 406]]) {
    assert.deepEqual(rows.filter(row => row.parasha === parasha).map(row => [row.printed, row.count]), [[printed, count]]);
  }
});

test("Lamed research export retains each row's PDF and does not hide one-unit reading deltas", () => {
  const csv = ahavatLetterCsv("ל", "bereshit", "", "https://example.test/book.pdf");
  assert.equal(csv.trimEnd().split("\r\n").length, 13);
  assert.match(csv, /"ל","ויצא","בראשית","תר״ט","609","37","https:\/\/example.test\/book.pdf#page=37&view=FitH"/);
  assert.match(csv, /"ל","וישלח","בראשית","תקמ״ח","548","38","https:\/\/example.test\/book.pdf#page=38&view=FitH"/);
  assert.match(ahavatLetterCsv("ל", "vayikra"), /"12654","3088","3087","-1"/);
  assert.match(ahavatLetterCsv("ל", "devarim"), /"21570","4088","4087","-1"/);
});

test("Mem reproduces all 54 source rows and five closed checkpoints without inheriting final Mem", () => {
  const books = AHAVAT_LETTER_READINGS["מ"];
  assert.deepEqual(books.map(book => book.cumulative), [3421, 6728, 8762, 12143, 14465]);
  assert.deepEqual(books.map(book => book.count), [3421, 3307, 2034, 3381, 2322]);
  assert.equal(ahavatLetterRows("מ").length, 54);
  assert.ok(books.every(book => ahavatLetterBalance(book).delta === 0));
  assert.ok(ahavatLetterRows("מ").every(row => row.page === 38));
  assert.deepEqual(ahavatLetterRows("מ", "all", "וישב").map(row => [row.printed, row.count]), [["רע״א", 271]]);
  assert.equal(ahavatLetterSourcePage("מ", "devarim"), 38);
  assert.equal(ahavatLetterRows("ם").length, 54);
  assert.equal(ahavatLetterRows("ם").filter(row => row.count === null).length, 5);
  assert.match(ahavatLetterCsv("מ", "bamidbar"), /"12143","3381","3381","0"/);
});

test("all 28 source forms have 54 distinct source positions, not 1512 claims of settled numerals", () => {
  assert.deepEqual(AHAVAT_LETTER_COVERAGE, { forms: 28, rows: 1512, numericRows: 1492, unresolvedRows: 20, unresolvedCheckpoints: 2 });
  for (const { form, pages } of AHAVAT_LETTER_FORMS) {
    const books = AHAVAT_LETTER_READINGS[form];
    const rows = ahavatLetterRows(form);
    assert.equal(books.length, 5, form);
    assert.equal(rows.length, 54, form);
    assert.equal(new Set(rows.map(row => row.parasha)).size, 54, form);
    assert.deepEqual(books.map(book => book.rows.length), [12, 11, 10, 10, 11]);
    assert.ok(AHAVAT_LETTER_READING_LOCATIONS[form]);
    for (const book of books) {
      assert.ok(pages.includes(book.page));
      for (const row of book.rows) {
        assert.ok(pages.includes(row.page), `${form}/${row.parasha}`);
        assert.ok(row.count === null || Number.isSafeInteger(row.count) && row.count >= 0);
        assert.equal("engine_verified" in row, false);
      }
    }
    assert.equal(ahavatLetterCsv(form).trimEnd().split("\r\n").length, 55);
  }
  for (const [regular, final] of [["כ", "ך"], ["מ", "ם"], ["נ", "ן"], ["פ", "ף"], ["צ", "ץ"], ["שׁ", "שׂ"]]) {
    assert.notEqual(AHAVAT_LETTER_READINGS[regular], AHAVAT_LETTER_READINGS[final]);
    assert.notDeepEqual(ahavatLetterRows(regular), ahavatLetterRows(final));
  }
});

test("unknown source cells remain null through sums, bars, search and Hebrew CSV instead of becoming zero", () => {
  const book = AHAVAT_LETTER_READINGS["ם"][0];
  assert.deepEqual(ahavatLetterBalance(book), { rowTotal: null, printedBookCount: 2689, delta: null });
  assert.equal(ahavatLetterRows("ם", "bereshit").filter(row => row.count === null).length, 2);
  assert.equal(ahavatLetterBars("ם", "bereshit").length, 10);
  assert.equal(ahavatLetterRows("ם", "all", "null").length, 0);
  assert.equal(ahavatLetterNumber(null), "—");
  assert.equal(ahavatLetterNumber(undefined), "—");
  assert.equal(ahavatLetterNumber(0), "0");
  assert.deepEqual(ahavatLetterBalance({ count: 0, rows: [{ count: 0 }] }), { rowTotal: 0, printedBookCount: 0, delta: 0 });
  const csv = ahavatLetterCsv("ם", "bereshit", "ויצא", "https://example.test/book.pdf");
  assert.match(csv, /"ם","ויצא","בראשית","\?","","38"/);
  assert.match(csv, /#page=38&view=FitH/);
  assert.match(csv, /"2689","2689","",""/);
  assert.doesNotMatch(csv, /null|undefined|NaN/);
});

test("unknown cumulative checkpoints never turn into a negative/zero book contribution or a false closed delta", () => {
  const yod = AHAVAT_LETTER_READINGS["י"];
  assert.equal(yod[3].cumulative, null);
  assert.equal(yod[3].count, null);
  assert.equal(yod[4].count, null);
  assert.equal(ahavatLetterBalance(yod[3]).delta, null);
  assert.deepEqual(ahavatLetterBars("י").map(bar => bar.id), ["bereshit", "shemot", "vayikra"]);
  assert.equal(ahavatLetterBars("ת").length, 4);
  assert.doesNotMatch(ahavatLetterCsv("י", "bamidbar"), /null|undefined|NaN/);
});

test("newly structured source boundaries and final-form checkpoints retain their own PDF witnesses", () => {
  assert.equal(ahavatLetterSourcePage("ן", "vayikra", "שמיני"), 38);
  assert.equal(ahavatLetterSourcePage("ן", "vayikra", "תזריע"), 39);
  assert.equal(ahavatLetterSourcePage("ן", "vayikra"), 39);
  assert.equal(ahavatLetterSourcePage("צ", "bereshit"), 39);
  assert.equal(ahavatLetterSourcePage("צ", "shemot"), 40);
  assert.equal(ahavatLetterSourcePage("שׁ", "bamidbar", "מסעי"), 40);
  assert.equal(ahavatLetterSourcePage("שׁ", "bamidbar"), 41);
  assert.equal(ahavatLetterSourcePage("שׁ", "devarim", "דברים"), 41);
  assert.equal(ahavatLetterSourcePage("י", "devarim", "כי תבוא"), 37);
  for (const [form, totals] of [["ך", [865, 1413, 1651, 1975, 3358]], ["ץ", [351, 511, 675, 828, 1035]]]) {
    assert.deepEqual(AHAVAT_LETTER_READINGS[form].map(book => book.cumulative), totals);
    assert.ok(AHAVAT_LETTER_READINGS[form].every(book => ahavatLetterBalance(book).delta === 0));
  }
  assert.deepEqual(AHAVAT_LETTER_READINGS["ן"].map(book => ahavatLetterBalance(book).delta), [0, 0, 0, -50, 0]);
  assert.deepEqual(AHAVAT_LETTER_READINGS["פ"].map(book => ahavatLetterBalance(book).delta), [0, -1, 0, 0, -1]);
});
