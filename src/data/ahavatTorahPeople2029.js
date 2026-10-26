// Book-summary rows in אוריין תליתאי, read against HebrewBooks 5635.
// These are the author's two attribution metrics, NOT name-occurrence counts.
// Per-parasha detail and the final whole-Torah recap remain in the PDF.
const reading = token => {
  const [printed, number] = token.split("=");
  const value = number === "?" ? null : Number(number);
  if (!printed || value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error("Invalid attribution reading");
  return Object.freeze({ printed, value });
};
function summary(id, title, page, lines) {
  const rows = lines.trim().split("\n").map((line, ordinal) => {
    const [entity, times, words, sourcePage] = line.trim().split("|");
    return Object.freeze({ id: `${id}:${ordinal + 1}`, entity, times: reading(times), words: reading(words), page: Number(sourcePage) || page, book: title, bookId: id, ordinal: ordinal + 1 });
  });
  return Object.freeze({ id, title, pages: Object.freeze([...new Set(rows.map(row => row.page))]), rows: Object.freeze(rows) });
}

export const AHAVAT_PEOPLE_BOOKS = Object.freeze([
  summary("bereshit", "בראשית", 26, `
דבר ה׳|פ״ב=82|אלף שמונה מאות כ״ג=1823
תורה|תקמ״ז=547|י״א אלף שבע מאות ל״ד=11734
אדם|ד׳=4|מ״ט=49
חוה|ד׳=4|ל״ח=38
נחש|ב׳=2|כ״ו=26
קין|ב׳=2|כ״ה=25
שת|אחד=1|אחת=1
למך|אחד=1|כ״א=21
למך אבי נח|ב׳=2|י״א=11
נח|ב׳=2|כ״ד=24
דור הפלגה|ב׳=2|כ״א=21
מלך סדום|אחד=1|ו׳=6
מלכי צדק|אחד=1|י״ד=14
הגר|ג׳=3|י״ג=13
אברהם|ל״ה=35|תקפ״ג=583
שרה|ו׳=6|ס״ט=69
מלאכים|כ״ד=24|רצ״ו=296
פרעה|י״ד=14|רפ״ז=287
עשו|ט״ז=16|צ״ח=98
לוט|ג׳=3|צ׳=90
הבכירה|ג׳=3|ל״ו=36
הצעירה|אחד=1|ב׳=2
אנשי סדום|ג׳=3|כ״א=21|27
אבימלך|י״ג=13|קצ״א=191|27
יצחק|כ״ז=27|רמ״ט=249|27
רבקה|י״א=11|קס״ג=163|27
יצחק ורבקה|אחד=1|אחת=1|27
עבדי יצחק|אחד=1|אחת=1|27
רועי גרר|אחד=1|ב׳=2|27
לבן|י״ז=17|רמ״ט=249|27
לבן ובתואל|אחד=1|כ״ב=22|27
לבן ואמו|ד׳=4|כ״ו=26|27
בני לבן|אחד=1|י״ג=13|27
אליעזר|ו׳=6|שכ״ב=322|27
עפרון|ב׳=2|ל״ב=32|27
בני חת|אחד=1|ב׳=2|27
יעקב|פ״ג=83|אלף קצ״ז=1197|27
רחל|י״ג=13|ע״ג=73|27
לאה|י״ח=18|נ״ב=52|27
רחל ולאה|אחד=1|ל״ד=34|27
שלשה עדרי צאן|ד׳=4|כ״ה=25|27
שמעון ולוי|אחד=1|ד׳=4|27
בני יעקב|אחד=1|מ״ט=49|27
יוסף|ל״ג=33|שבע מאות פ״ב=782|27
מליץ של יוסף|י״ב=12|קס״ב=162|27
אשר על בית יוסף|ב׳=2|כ״ח=28|27
אחי יוסף|כ״א=21|שע״ט=379|27
ראובן|ה׳=5|נ״א=51|27
יהודה|י״ז=17|קצ״ו=196|27
תמר|ה׳=5|ב״ט=29|27
בת שוע|ב׳=2|ב׳=2|27
המילדת|ג׳=3|י״ד=14|27
אשת פוטיפר|ד׳=4|מ״ח=48|27
סריסי פרעה|אחד=1|ה׳=5|27
שר המשקים|ב׳=2|פ״ח=88|27
שר האופים|אחד=1|כ״ג=23|27
חמור|אחד=1|כ״ח=28|27
שכם|ב׳=2|כ״ז=27|27
חמור ושכם|אחד=1|נ״ב=52|27
רעה העדולמי|ב׳=2|ט״ז=16|27
אנשי המקום|אחד=1|ד׳=4|27
המגיד|ד׳=4|כ״א=21|27
מצרים|ג׳=3|ס״א=61|27
יושב הכנעני|אחד=1|ד׳=4|27
`),
  summary("shemot", "שמות", 28, `
דבר ה׳|צ״ו=96|ו׳ אלף שע״ו=6376
תורה|רי״ז=217|ו׳ אלף רח״ח=6308
משה|פ״ד=84|אלף תקכ״ז=1527
קול במחנה|אחד=1|ח׳=8
משה ואהרן|ד׳=4|קכ״ג=123
משה ובני ישראל|אחד=1|קס״ח=168
אהרן|ב׳=2|צ״ו=96
יהושע|אחד=1|ג׳=3
בת פרעה|ה׳=5|י״ט=19
פרעה|ב׳=2|שי״ב=312
עבדי פרעה|אחד=1|י״ח=18
פרעה ועבדיו|אחד=1|ח׳=8
אחות משה|אחד=1|י״א=11
מרים|אחד=1|ט׳=9
שפרה ופועה|אחד=1|י״ג=13
רעואל|ב׳=2|כ״ד=24
יתרו|ה׳=5|ע״ר=274
רשע|אחד=1|י״ג=13
שבע בנות יתרו|אחד=1|י״ב=12
צפרה|ב׳=2|ח׳=8
נגשים ושוטרים|אחד=1|י״ט=19
נגשים|ב׳=2|י״ט=19
שוטרים|ג׳=3|ל״ט=39
החרטמים|אחד=1|ו׳=6
מצרים|ב׳=2|י״ד=14
בני ישראל|י״ד=14|של״ט=339
החכמים|אחד=1|י״א=11
המגיד|אחד=1|ב׳=2
`),
  summary("vayikra", "ויקרא", 28, `
דבר ה׳|ל״ט=39|י׳ אלף שמ״ט=10349
תורה|מ״ו=46|אלף רי״ד=1214
משה|ו׳=6|שי״ט=319|29
אהרן|אחד=1|י״ח=18|29
`),
  summary("bamidbar", "במדבר", 29, `
דבר ה׳|ע״ו=76|ו׳ אלף שנ״ד=6354
תורה|קכ״א=121|ז׳ אלף ט״ז=7016
משה|ל״ב=32|אלף שנ״ג=1353
אהרן|אחד=1|כ״ב=22
מרים ואהרן|אחד=1|ט׳=9
טמאים לנפש אדם|אחד=1|ט״ז=16
הנער|אחד=1|ו׳=6
יהושע|אחד=1|ג׳=3
חובב|אחד=1|ט׳=9
בני ישראל|ט״ז=16|רי״א=211
מרגלים|ג׳=3|נ״ג=53
יהושע וכלב|אחד=1|מ״ו=46
כלב|אחד=1|ח׳=8
קרח ועדתו|אחד=1|י״ד=14
דתן ואבירם|אחד=1|ל״ה=35
משה ואהרן|אחד=1|י״ב=12
בלק|ט׳=9|קל״ו=136
בלעם|כ״ג=23|תקכ״ג=523
שרי בלק|אחד=1|ד׳=4
שרי בלק השניים|אחד=1|כ״ו=26|30
`),
  summary("devarim", "דברים", 30, `
דבר ה׳|ד׳=4|רע״ט=279
תורה|כ״ז=27|תל״ב=432
משה|ב׳=2|י״ג אלף תתפ״ט=13889
משה והזקנים|אחד=1|קי״ז=117
משה והכהנים|אחד=1|כ״ב=22
משה ויהושע|אחד=1|תס״א=461
`),
]);

export function ahavatSourceSearch(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0591-\u05c7\s׳״'"־-]/g, "");
}
export function ahavatPeopleRows(bookId = "all", query = "") {
  const needle = ahavatSourceSearch(query);
  return AHAVAT_PEOPLE_BOOKS.filter(book => bookId === "all" || book.id === bookId).flatMap(book => book.rows)
    .filter(row => !needle || ahavatSourceSearch(`${row.entity} ${row.book} ${row.times.printed} ${row.times.value ?? ""} ${row.words.printed} ${row.words.value ?? ""}`).includes(needle));
}
export function ahavatSourceRowsCsv(headers, rows) {
  const cell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
export function ahavatPeopleCsv(bookId = "all", query = "", pdfUrl = "") {
  return ahavatSourceRowsCsv(["זהות מקור", "מאגר", "חתך", "חומש", "ייחוס בדפוס", "פעמים בדפוס", "קריאת פעמים", "תיבות בדפוס", "קריאת תיבות", "עמוד PDF", "מקור"],
    ahavatPeopleRows(bookId, query).map(row => ["book:hebrewbooks:5635", "DS-05", "סיכום חומש", row.book, row.entity, row.times.printed, row.times.value, row.words.printed, row.words.value, row.page, pdfUrl ? `${pdfUrl}#page=${row.page}&view=FitH` : ""]));
}
