// A bounded reading of the printed table on PDF page 6. These are the
// author's counts, not an independent Torah corpus count.
export const AHAVAT_DS01_BOOKS = Object.freeze([
  { id: "bereshit", title: "בראשית", printed: "קס״ה", count: 165, rows: [
    ["בראשית", 36], ["נח", 14], ["לך לך", 30], ["וירא", 26], ["חיי שרה", 19], ["תולדות", 14],
    ["ויצא", 13], ["וישלח", 1], ["וישב", 11], ["מקץ", 0], ["ויגש", 0], ["ויחי", 1],
  ], reading: "closed" },
  { id: "shemot", title: "שמות", printed: "שצ״ח", count: 398, rows: [], reading: "needs_cell_review" },
  { id: "vayikra", title: "ויקרא", printed: "שי״א", count: 311, rows: [
    ["ויקרא", 59], ["צו", 43], ["שמיני", 29], ["תזריע", 3], ["מצורע", 15],
    ["אחרי מות", 28], ["קדושים", 27], ["אמור", 77], ["בהר", 8], ["בחוקותי", 22],
  ], reading: "closed" },
  { id: "bamidbar", title: "במדבר", printed: "שצ״ו", count: 396, rows: [], reading: "needs_cell_review" },
  { id: "devarim", title: "דברים", printed: "תק״ן", count: 550, rows: [
    ["דברים", 48], ["ואתחנן", 88], ["עקב", 93], ["ראה", 85], ["שופטים", 55],
    ["כי תצא", 30], ["כי תבוא", 74], ["ניצבים", 34], ["וילך", 19], ["האזינו", 9], ["וזאת הברכה", 15],
  ], reading: "closed" },
].map(book => Object.freeze({ ...book, rows: Object.freeze(book.rows.map(row => Object.freeze(row))) })));

export const AHAVAT_DS01_TOTAL = 1820;
export const AHAVAT_DS01_SOURCE_PAGE = 6;

export function ahavatDs01RowSum(book) {
  return book.rows.reduce((sum, [, count]) => sum + count, 0);
}
