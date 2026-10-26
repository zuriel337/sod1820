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

export function ahavatAlephRows(bookId = "all", query = "") {
  const needle = query.normalize("NFKD").replace(/[\u0591-\u05c7]/g, "").replace(/\s/g, "");
  return AHAVAT_ALEPH_BOOKS.filter(book => bookId === "all" || book.id === bookId)
    .flatMap(book => book.rows.map(row => ({ ...row, book: book.title })))
    .filter(row => !needle || `${row.parasha}${row.book}${row.printed}${row.count}`.normalize("NFKD").replace(/[\u0591-\u05c7\s]/g, "").includes(needle));
}
