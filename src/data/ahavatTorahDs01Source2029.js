// A bounded reading of the printed table on PDF page 6. These are the
// author's counts, not an independent Torah corpus count.
export const AHAVAT_DS01_BOOKS = Object.freeze([
  { id: "bereshit", title: "בראשית", printed: "קס״ה", count: 165, rows: [
    ["בראשית", 36], ["נח", 14], ["לך לך", 30], ["וירא", 26], ["חיי שרה", 19], ["תולדות", 14],
    ["ויצא", 13], ["וישלח", 1], ["וישב", 11], ["מקץ", 0], ["ויגש", 0], ["ויחי", 1],
  ], reading: "closed" },
  { id: "shemot", title: "שמות", printed: "שצ״ח", count: 398, rows: [
    ["שמות", 32], ["וארא", 73], ["בא", 60], ["בשלח", 65], ["יתרו", 33],
    ["משפטים", 47], ["תרומה", 1], ["תצוה", 23], ["כי תשא", 53], ["ויקהל", 16], ["פקודי", 27],
  ], reading: "candidate_transcription", note: "קריאת השורות היא 430, לעומת 398 בסיכום המודפס; הפרש 32. אין ליישב את הפער על סמך הסכום בלבד." },
  { id: "vayikra", title: "ויקרא", printed: "שי״א", count: 311, rows: [
    ["ויקרא", 59], ["צו", 43], ["שמיני", 29], ["תזריע", 3], ["מצורע", 15],
    ["אחרי מות", 28], ["קדושים", 27], ["אמור", 77], ["בהר", 8], ["בחוקותי", 22],
  ], reading: "closed" },
  { id: "bamidbar", title: "במדבר", printed: "שצ״ו", count: 396, rows: [
    ["במדבר", 55], ["נשא", 36], ["בהעלותך", 71], ["שלח", 53], ["קרח", 48],
    ["חקת", 23], ["בלק", 33], ["פנחס", 41], ["מטות", 48], ["מסעי", 18],
  ], reading: "candidate_transcription", note: "קריאת השורות היא 426, לעומת 396 בסיכום המודפס; הפרש 30. ספרת הפתיחה של פרשת במדבר דורשת בדיקה חוזרת." },
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
