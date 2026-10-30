import { ahavatSourceRowsCsv, ahavatSourceSearch } from "./ahavatTorahPeople2029.js";

// Physical order in the printed table, not an imposed Tanakh/liturgical order.
export const AHAVAT_MEGILLOT = Object.freeze([
  { id: "esther", title: "אסתר", letters: ["י״ב אלף ק״ח", 12108], words: ["ג׳ אלף מ״ה", 3045] },
  { id: "shir", title: "שיר השירים", letters: ["ה׳ אלף קס״ב", 5162], words: ["אלף ת׳", 1400] },
  { id: "ruth", title: "רות", letters: ["ד׳ אלף תתקמ״ז", 4947], words: ["אלף רי״ד", 1214] },
  { id: "eicha", title: "איכה", letters: ["ה׳ אלף תתקע״ד", 5974], words: ["אלף תקמ״א", 1541] },
  { id: "kohelet", title: "קהלת", letters: ["י״ד אלף תתקס״ח", 14968], words: ["ב׳ אלף תתקפ״ו", 2986] },
].map(item => Object.freeze({ ...item, letters: Object.freeze(item.letters), words: Object.freeze(item.words), totalPage: 43 })));

// Explicit printed/decimal pairs. '?' is unresolved, never zero or inferred.
const source = [
  ["א", 42, "תתי״א=811|רפ״א=281|ת״ל=430|שמ״ב=342|?=?"],
  ["ב", 42, "?=?|ר״ס=260|רל״ח=238|שמ״ו=346|תקפ״א=581"],
  ["ג", 42, "ק״ו=106|ס״ה=65|ס׳=60|ע״ו=76|קי״ג=113"],
  ["ד", 42, "?=?|קפ״ח=188|קט״ז=116|קס״ג=163|רס״ח=268"],
  ["ה", 42, "אלף קמ״א=1141|שמ״ו=346|תר״ד=604|ת״ד=404|תתקפ״א=981"],
  ["ו", 42, "אלף רע״ו=1276|ת״פ=480|?=?|תרל״ח=638|תתק״פ=980"],
  ["ז", 42, "ס״ב=62|ל״ח=38|מ״ג=43|כ״ה=25|פ׳=80"],
  ["ח", 42, "ר״ו=206|קל״ב=132|פ״ח=88|ק״ע=170|ש״ל=330"],
  ["ט", 42, "נ״ג=53|ל״ב=32|כ״ט=29|מ״א=41|ק״כ=120"],
  ["י", 42, "אלף קע״ו=1176|תרס״ג=663|תקמ״ט=549|תשי״ו=716|אלף קע״ח=1178"],
  ["כ", 42, "ש״ב=302|קמ״ג=143|קכ״ח=128|קפ״ח=188|ת״כ=420"],
  ["ך", 42, "ר״ל=230|ק״ד=104|ע׳=70|נ״ו=56|ק״ד=104"],
  ["ל", 42, "תתק״א=901|שי״ט=319|שפ״ו=386|תכ״ד=424|תתקכ״ו=926"],
  ["מ", 42, "תשפ״ו=786|רע״ג=273|רמ״ט=249|רס״ז=267|תקנ״ו=556"],
  ["ם", 42, "שנ״ט=359|קע״א=171|קל״ד=134|ק״צ=190|?=?"],
  ["נ", 42, "ש״ד=304|רנ״ב=252|קי״ד=114|ש״ה=305|רפ״ה=285"],
  ["ן", 42, "ק״פ=180|ס״ח=68|ס׳=60|נ״ט=59|קל״ב=132"],
  ["ס", 42, "קמ״ד=144|ל״ו=36|ט׳=9|ל״ז=37|צ״ח=98"],
  ["ע", 42, "שצ״ז=397|?=?|קי״ח=118|ר״מ=240|תס״א=461"],
  ["פ", 42, "קמ״ג=143|ק״ו=106|ל״ז=37|כ״ד=24|ק״א=101"],
  ["ף", 43, "י״ח=18|י״א=11|?=?|י״ב=12|?=?"],
  ["צ", 43, "ס״ו=66|ס׳=60|ל״ה=35|פ״ד=84|נ״ח=58"],
  ["ץ", 43, "כ״ג=23|ח׳=8|ח׳=8|י״ח=18|ל״ה=35"],
  ["ק", 43, "ק״ה=105|ס״ב=62|פ״א=81|פ״ב=82|קל״ג=133"],
  ["ר", 43, "תש״נ=750|רפ״ט=289|רס״ז=267|של״ה=335|תקע״ח=578"],
  ["שׁ", 43, "תקע״ה=575|רט״ו=215|קצ״ח=198|ר׳=200|תפ״ד=484"],
  ["שׂ", 43, "קל״ז=137|ל״ד=34|נ״ו=56|נ״א=51|קט״ו=115"],
  ["ת", 43, "תש״ד=704|ש״ו=306|שע״ו=376|רצ״א=291|תקע״ג=573"],
];
// Bounded, direct readings of the scan; retain the earlier uncertain tokens above.
// Neither author totals nor row balances are used to recover a missing cell.
export const AHAVAT_MEGILLOT_REVIEWED_READINGS = Object.freeze([
  { id: "ruth:ו", printed: "תרצ״ג", count: 693, page: 42, region: "טור ימני, שורת ו״ו" },
  { id: "kohelet:ם", printed: "תכ״ב", count: 422, page: 42, region: "טור שמאלי, שורת מ״ם סופית" },
  { id: "shir:ע", printed: "קפ״ד", count: 184, page: 42, region: "טור שמאלי, שורת עי״ן" },
  { id: "ruth:ף", printed: "ג׳", count: 3, page: 43, region: "ראש הטור הימני, שורת פ״א סופית" },
  { id: "kohelet:ף", printed: "כ״ב", count: 22, page: 43, region: "ראש הטור הימני, שורת פ״א סופית" },
].map(reading => Object.freeze({ ...reading, previousPrinted: "?", previousCount: null, sourceIdentity: "book:hebrewbooks:5635", sourcePdfSha256: "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b", sourceAnchor: `#page=${reading.page}&view=FitH`, engineVerification: "not_tested" })));
export const AHAVAT_MEGILLAH_LETTER_ROWS = Object.freeze(source.flatMap(([form, page, cells]) => {
  const readings = cells.split("|");
  if (readings.length !== 5) throw new Error("Incomplete megillah matrix row");
  return AHAVAT_MEGILLOT.map((megillah, index) => {
    const [printed, value] = readings[index].split("=");
    const count = value === "?" ? null : Number(value);
    if (!printed || count !== null && (!Number.isSafeInteger(count) || count < 0)) throw new Error("Invalid megillah reading");
    const id = `${megillah.id}:${form}`;
    const reviewed = AHAVAT_MEGILLOT_REVIEWED_READINGS.find(reading => reading.id === id && reading.page === page);
    return Object.freeze({ id, megillahId: megillah.id, megillah: megillah.title, form, printed: reviewed?.printed ?? printed, count: reviewed?.count ?? count, page, kind: "letters" });
  });
}));

export function ahavatMegillahRows(kind = "letters", megillahId = "all", query = "") {
  if (!["words", "letters"].includes(kind)) return [];
  const rows = kind === "words" ? AHAVAT_MEGILLOT.map(item => ({ id: `${item.id}:words`, megillahId: item.id, megillah: item.title, form: "תיבות", printed: item.words[0], count: item.words[1], page: 43, kind })) : AHAVAT_MEGILLAH_LETTER_ROWS;
  const needle = ahavatSourceSearch(query);
  return rows.filter(row => (megillahId === "all" || row.megillahId === megillahId) && (!needle || ahavatSourceSearch(`${row.megillah} ${row.form} ${row.printed} ${row.count ?? ""}`).includes(needle)));
}
export function ahavatMegillahBars(kind = "letters", megillahId = "all", query = "") {
  if (!["words", "letters"].includes(kind)) return [];
  if (megillahId === "all" && !query) return AHAVAT_MEGILLOT.filter(item => Number.isSafeInteger(item[kind][1])).map(item => ({ id: item.id, label: item.title, count: item[kind][1], page: 43 }));
  return ahavatMegillahRows(kind, megillahId, query).filter(row => Number.isSafeInteger(row.count)).map(row => ({ id: row.id, label: `${row.megillah} · ${row.form}`, count: row.count, page: row.page }));
}
export function ahavatMegillahBalance(megillahId) {
  const rows = ahavatMegillahRows("letters", megillahId);
  const megillah = AHAVAT_MEGILLOT.find(item => item.id === megillahId);
  if (!megillah || rows.some(row => row.count === null)) return { rowTotal: null, delta: null };
  const rowTotal = rows.reduce((sum, row) => sum + row.count, 0);
  return { rowTotal, delta: rowTotal - megillah.letters[1] };
}
export function ahavatMegillahCsv(kind = "letters", megillahId = "all", query = "", pdfUrl = "") {
  return ahavatSourceRowsCsv(["זהות מקור", "מאגר", "מגילה", "צורה", "מניין בדפוס", "קריאת מספר", "עמוד PDF", "מקור", "סיכום המגילה בדפוס", "קריאת סיכום", "עמוד הסיכום", "סכום שורות האותיות", "פער קריאה"],
    ahavatMegillahRows(kind, megillahId, query).map(row => {
      const item = AHAVAT_MEGILLOT.find(megillah => megillah.id === row.megillahId);
      const balance = kind === "letters" ? ahavatMegillahBalance(item.id) : { rowTotal: null, delta: null };
      return ["book:hebrewbooks:5635", kind === "letters" ? "DS-09" : "DS-10", row.megillah, row.form, row.printed, row.count, row.page, pdfUrl ? `${pdfUrl}#page=${row.page}&view=FitH` : "", item[kind][0], item[kind][1], 43, balance.rowTotal, balance.delta];
    }));
}
