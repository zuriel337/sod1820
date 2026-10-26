// Source-native reading of PDF pp.35–41, not a Torah corpus or engine result.
// Finals and shin/sin have separate printed paragraphs and must keep their identity.
export const AHAVAT_LETTER_FORMS = Object.freeze([
  ["א", "אלף", [35]], ["ב", "בית", [35]], ["ג", "גימל", [35]], ["ד", "דלת", [35, 36]],
  ["ה", "הא", [36]], ["ו", "וו", [36]], ["ז", "זין", [36]], ["ח", "חית", [36, 37]],
  ["ט", "טית", [37]], ["י", "יוד", [37]], ["כ", "כף", [37]], ["ך", "כף סופית", [37]],
  ["ל", "למד", [37, 38]], ["מ", "מם", [38]], ["ם", "מם סופית", [38]],
  ["נ", "נון", [38]], ["ן", "נון סופית", [38, 39]], ["ס", "סמך", [39]],
  ["ע", "עין", [39]], ["פ", "פא", [39]], ["ף", "פא סופית", [39]],
  ["צ", "צדי", [39, 40]], ["ץ", "צדי סופית", [40]], ["ק", "קוף", [40]],
  ["ר", "ריש", [40]], ["שׁ", "שין", [40, 41]], ["שׂ", "שין שמאלית", [41]], ["ת", "תו", [41]],
].map(([form, name, pages]) => Object.freeze({ form, name, pages: Object.freeze(pages) })));

// Page 35, right column. Each printed subtotal is cumulative through that book.
// Keep the printed numerals beside their decimal reading for direct comparison.
export const AHAVAT_ALEPH_BOOKS = Object.freeze([
  { id: "bereshit", title: "בראשית", cumulative: 7634, printed: "ז׳ אלף תרל״ד", rows: [
    ["בראשית", "תרנ״ג", 653], ["נח", "תקס״ג", 563], ["לך לך", "תרל״ו", 636], ["וירא", "תתל״ו", 836],
    ["חיי שרה", "תק״ס", 560], ["תולדות", "תקכ״ח", 528], ["ויצא", "תשכ״ד", 724], ["וישלח", "תשמ״ג", 743],
    ["וישב", "תקס״ז", 567], ["מקץ", "תת״ז", 807], ["ויגש", "תקע״ט", 579], ["ויחי", "תל״ח", 438],
  ] },
  { id: "shemot", title: "שמות", cumulative: 12894, printed: "י״ב אלף תתצ״ד", rows: [
    ["שמות", "תרנ״א", 651], ["וארא", "תקצ״ח", 598], ["בא", "תקל״ב", 532], ["בשלח", "ת״פ", 480],
    ["יתרו", "שמ״ו", 346], ["משפטים", "תס״ח", 468], ["תרומה", "רפ״ט", 289], ["תצוה", "ת״ט", 409],
    ["כי תשא", "תרס״ט", 669], ["ויקהל", "תפ״ה", 485], ["פקודי", "של״ג", 333],
  ] },
  { id: "vayikra", title: "ויקרא", cumulative: 16949, printed: "ט״ז אלף תתקמ״ט", rows: [
    ["ויקרא", "תקנ״ג", 553], ["צו", "תכ״ז", 427], ["שמיני", "ת״ם", 440], ["תזריע", "שכ״ט", 329],
    ["מצורע", "ש״ע", 370], ["אחרי מות", "תמ״א", 441], ["קדושים", "שע״ה", 375], ["אמור", "תק״ל", 530],
    ["בהר", "רנ״ד", 254], ["בחוקותי", "של״ו", 336],
  ] },
  { id: "bamidbar", title: "במדבר", cumulative: 22173, printed: "כ״ב אלף קע״ג", rows: [
    ["במדבר", "תקנ״ז", 557], ["נשא", "תרצ״ד", 694], ["בהעלותך", "תקע״ה", 575], ["שלח", "תקכ״ח", 528],
    ["קרח", "תס״ד", 464], ["חקת", "תל״ח", 438], ["בלק", "תקל״ז", 537], ["פנחס", "תק״ב", 502],
    ["מטות", "תקמ״ח", 548], ["מסעי", "שפ״א", 381],
  ] },
  { id: "devarim", title: "דברים", cumulative: 27059, printed: "כ״ז אלף נ״ט", rows: [
    ["דברים", "תקכ״א", 521], ["ואתחנן", "תרס״ד", 664], ["עקב", "תר״ז", 607], ["ראה", "תרנ״ו", 656],
    ["שופטים", "תפ״ח", 488], ["כי תצא", "תקנ״ה", 555], ["כי תבוא", "תקפ״ז", 587], ["ניצבים", "רל״ב", 232],
    ["וילך", "רכ״ב", 222], ["האזינו", "ר״ב", 202], ["וזאת הברכה", "קנ״ב", 152],
  ] },
].map((book, index, books) => Object.freeze({
  ...book, count: book.cumulative - (books[index - 1]?.cumulative || 0), page: 35,
  rows: Object.freeze(book.rows.map(([parasha, printed, count]) => Object.freeze({ parasha, printed, count, page: 35 }))),
})));

export function ahavatLetterForm(form) {
  return AHAVAT_LETTER_FORMS.find(item => item.form === form) || AHAVAT_LETTER_FORMS[0];
}

// Bet begins in the right column of PDF 35 and continues at the top of the left.
export const AHAVAT_BET_BOOKS = Object.freeze([
  { id: "bereshit", title: "בראשית", cumulative: 4332, printed: "ד׳ אלף של״ב", rows: [
    ["בראשית", "רע״ח", 278], ["נח", "שע״ב", 372], ["לך לך", "שנ״א", 351], ["וירא", "תמ״ו", 446],
    ["חיי שרה", "ש״י", 310], ["תולדות", "שנ״ז", 357], ["ויצא", "תפ״ג", 483], ["וישלח", "תמ״ג", 443],
    ["וישב", "רע״ד", 274], ["מקץ", "תי״א", 411], ["ויגש", "שכ״ט", 329], ["ויחי", "רע״ח", 278],
  ] },
  { id: "shemot", title: "שמות", cumulative: 7437, printed: "ז׳ אלף תל״ז", rows: [
    ["שמות", "שט״ו", 315], ["וארא", "שמ״ח", 348], ["בא", "שכ״ז", 327], ["בשלח", "שמ״ה", 345],
    ["יתרו", "קע״ה", 175], ["משפטים", "רס״ד", 264], ["תרומה", "ר׳", 200], ["תצוה", "רפ״ה", 285],
    ["כי תשא", "של״ז", 337], ["ויקהל", "שי״ג", 313], ["פקודי", "קצ״ו", 196],
  ] },
  { id: "vayikra", title: "ויקרא", cumulative: 9845, printed: "ט׳ אלף תתמ״ה", rows: [
    ["ויקרא", "ש״ו", 306], ["צו", "ר״צ", 290], ["שמיני", "רי״ד", 214], ["תזריע", "רכ״ח", 228],
    ["מצורע", "ש״ג", 303], ["אחרי מות", "רל״ה", 235], ["קדושים", "קל״א", 131], ["אמור", "שכ״ט", 329],
    ["בהר", "קס״ד", 164], ["בחוקותי", "ר״ח", 208],
  ] },
  { id: "bamidbar", title: "במדבר", cumulative: 13393, printed: "י״ג אלף שצ״ג", rows: [
    ["במדבר", "תל״ב", 432], ["נשא", "תקי״ח", 518], ["בהעלותך", "שמ״ח", 348], ["שלח", "רצ״ו", 296],
    ["קרח", "רס״ב", 262], ["חקת", "רע״ה", 275], ["בלק", "שס״ג", 363], ["פנחס", "תי״ג", 413],
    ["מטות", "רצ״א", 291], ["מסעי", "ש״נ", 350],
  ] },
  { id: "devarim", title: "דברים", cumulative: 16345, printed: "ט״ז אלף שמ״ה", rows: [
    ["דברים", "של״ט", 339], ["ואתחנן", "ש״פ", 380], ["עקב", "שנ״ה", 355], ["ראה", "ת״ט", 409],
    ["שופטים", "רע״ו", 276], ["כי תצא", "ש״ם", 340], ["כי תבוא", "שמ״ג", 343], ["ניצבים", "קס״ד", 164],
    ["וילך", "צ״ב", 92], ["האזינו", "קל״ב", 132], ["וזאת הברכה", "קכ״ב", 122],
  ] },
].map((book, index, books) => Object.freeze({
  ...book, count: book.cumulative - (books[index - 1]?.cumulative || 0), page: 35,
  rows: Object.freeze(book.rows.map(([parasha, printed, count]) => Object.freeze({ parasha, printed, count, page: 35 }))),
})));

// Gimel occupies the left column of PDF 35. Printed checkpoints and row readings
// are separate witnesses: retain the Leviticus/Deuteronomy gaps, never balance by guessing.
export const AHAVAT_GIMEL_BOOKS = Object.freeze([
  { id: "bereshit", title: "בראשית", cumulative: 577, printed: "תקע״ז", rows: [
    ["בראשית", "מ״ג", 43], ["נח", "נ׳", 50], ["לך לך", "נ״ז", 57], ["וירא", "ס״ב", 62],
    ["חיי שרה", "מ״ה", 45], ["תולדות", "מ״ה", 45], ["ויצא", "ס״ז", 67], ["וישלח", "מ״ב", 42],
    ["וישב", "מ״ב", 42], ["מקץ", "מ״א", 41], ["ויגש", "מ״ח", 48], ["ויחי", "ל״ה", 35],
  ] },
  { id: "shemot", title: "שמות", cumulative: 945, printed: "תתקמ״ה", rows: [
    ["שמות", "מ״ה", 45], ["וארא", "כ״ז", 27], ["בא", "נ״ב", 52], ["בשלח", "כ״ד", 24],
    ["יתרו", "כ״ו", 26], ["משפטים", "נ״ח", 58], ["תרומה", "ט״ז", 16], ["תצוה", "כ״ו", 26],
    ["כי תשא", "מ״ו", 46], ["ויקהל", "כ״ו", 26], ["פקודי", "כ״ב", 22],
  ] },
  { id: "vayikra", title: "ויקרא", cumulative: 1332, printed: "אלף של״ב", rows: [
    ["ויקרא", "כ״ד", 24], ["צו", "כ׳", 20], ["שמיני", "ל״א", 31], ["תזריע", "ע״ט", 79],
    ["מצורע", "ס״א", 61], ["אחרי מות", "ל״ח", 38], ["קדושים", "כ״ה", 25], ["אמור", "ל״ד", 34],
    ["בהר", "ל״ב", 32], ["בחוקותי", "ל״ג", 33],
  ] },
  { id: "bamidbar", title: "במדבר", cumulative: 1726, printed: "אלף תשכ״ו", rows: [
    ["במדבר", "נ׳", 50], ["נשא", "כ״ט", 29], ["בהעלותך", "ל״א", 31], ["שלח", "נ״ט", 59],
    ["קרח", "כ״ב", 22], ["חקת", "ל״ו", 36], ["בלק", "מ״א", 41], ["פנחס", "כ״ד", 24],
    ["מטות", "ל״ב", 32], ["מסעי", "ע׳", 70],
  ] },
  { id: "devarim", title: "דברים", cumulative: 2109, printed: "ב׳ אלף ק״ט", rows: [
    ["דברים", "נ״ט", 59], ["ואתחנן", "מ״ג", 43], ["עקב", "מ״ח", 48], ["ראה", "מ״ה", 45],
    ["שופטים", "ל״ו", 36], ["כי תצא", "כ״ט", 29], ["כי תבוא", "ס״ז", 67], ["ניצבים", "י״א", 11],
    ["וילך", "ה׳", 5], ["האזינו", "ח׳", 8], ["וזאת הברכה", "כ״ג", 23],
  ] },
].map((book, index, books) => Object.freeze({
  ...book, count: book.cumulative - (books[index - 1]?.cumulative || 0), page: 35,
  rows: Object.freeze(book.rows.map(([parasha, printed, count]) => Object.freeze({ parasha, printed, count, page: 35 }))),
})));

export const AHAVAT_LETTER_READINGS = Object.freeze({ "א": AHAVAT_ALEPH_BOOKS, "ב": AHAVAT_BET_BOOKS, "ג": AHAVAT_GIMEL_BOOKS });

export const AHAVAT_LETTER_READING_LOCATIONS = Object.freeze({
  "א": "הטור הימני", "ב": "הטור הימני והמשכו בראש הטור השמאלי", "ג": "הטור השמאלי",
});

export function ahavatLetterBalance(book) {
  const rowTotal = book.rows.reduce((sum, row) => sum + row.count, 0);
  return { rowTotal, printedBookCount: book.count, delta: rowTotal - book.count };
}

export function ahavatLetterRows(form, bookId = "all", query = "") {
  const needle = query.normalize("NFKD").replace(/[\u0591-\u05c7]/g, "").replace(/\s/g, "");
  return (AHAVAT_LETTER_READINGS[form] || []).filter(book => bookId === "all" || book.id === bookId)
    .flatMap(book => book.rows.map(row => ({ ...row, book: book.title })))
    .filter(row => !needle || `${row.parasha}${row.book}${row.printed}${row.count}`.normalize("NFKD").replace(/[\u0591-\u05c7\s]/g, "").includes(needle));
}

export function ahavatAlephRows(bookId = "all", query = "") {
  return ahavatLetterRows("א", bookId, query);
}

export function ahavatLetterCsv(form, bookId = "all", query = "", pdfUrl = "") {
  const books = AHAVAT_LETTER_READINGS[form] || [];
  const header = ["זהות מקור", "אות", "פרשה", "חומש", "המניין בדפוס", "קריאת המספר", "עמוד PDF", "קישור למקור", "סיכום מצטבר בדפוס", "חלק החומש לפי הסיכומים", "סכום קריאת שורות החומש", "פער קריאה בחומש"];
  const rows = ahavatLetterRows(form, bookId, query).map(row => {
    const book = books.find(item => item.title === row.book);
    const balance = ahavatLetterBalance(book);
    return ["book:hebrewbooks:5635", form, row.parasha, row.book, row.printed, row.count, row.page,
      pdfUrl ? `${pdfUrl}#page=${row.page}&view=FitH` : "", book.cumulative, book.count, balance.rowTotal, balance.delta];
  });
  const escapeCell = value => `"${String(value).replaceAll('"', '""')}"`;
  return "\uFEFF" + [header, ...rows].map(row => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}
