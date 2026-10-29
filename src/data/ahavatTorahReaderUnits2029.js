// URL projection of existing source rows/columns, not a research store or a new
// source identity. Numeric readings and editorial gaps remain owned by the models.
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows } from "./ahavatTorahPeople2029.js";
import { AHAVAT_ROOT_COLUMNS } from "./ahavatTorahRoots2029.js";
import { AHAVAT_MEGILLOT, ahavatMegillahRows } from "./ahavatTorahMegillot2029.js";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatSourceCountRows } from "./ahavatTorahLetters2029.js";
import { AHAVAT_PARASHA_COUNT_FORMS, AHAVAT_PARASHA_COUNT_READINGS } from "./ahavatTorahParashaCounts2029.js";
import { AHAVAT_COMPANION_PAGE_COUNTS, ahavatCompanionUnitId } from "./ahavatTorahSystem2029.js";

export const AHAVAT_READER_UNITS = Object.freeze([
  ...AHAVAT_PEOPLE_BOOKS.flatMap(book => book.rows.map(row => ({ id: `people:${row.id}`, rowId: row.id, page: row.page, title: `${row.book} · ${row.entity}`, datasetId: "DS-05", sectionId: "ahavat29-people", bookId: book.id }))),
  ...AHAVAT_ROOT_COLUMNS.map(column => ({ id: column.id, page: column.page, title: column.title, datasetId: "DS-11", sectionId: "ahavat29-roots" })),
  ...["letters", "words"].flatMap(kind => ahavatMegillahRows(kind).map(row => ({ id: `scrolls:${row.id}`, rowId: row.id, page: row.page, title: `${row.megillah} · ${row.form}`, datasetId: kind === "words" ? "DS-10" : "DS-09", sectionId: "ahavat29-scrolls", megillahId: row.megillahId, kind }))),
  ...AHAVAT_MEGILLOT.flatMap(item => ["letters", "words"].map(kind => ({ id: `scrolls-total:${item.id}:${kind}`, page: item.totalPage, title: `${item.title} · סיכום ${kind === "words" ? "תיבות" : "אותיות"}`, datasetId: kind === "words" ? "DS-10" : "DS-09", sectionId: "ahavat29-scrolls", megillahId: item.id, kind }))),
].map(unit => Object.freeze(unit)));

// Lightweight URL projection of the actually authored companion units.
// Keep it separate from the 287 source-native rows; no prose or OCR is eager.
const companionUnits = Object.freeze(Object.entries(AHAVAT_COMPANION_PAGE_COUNTS).flatMap(([pageKey, count]) => Array.from({ length: count }, (_, index) => {
  const page = Number(pageKey);
  const position = index + 1;
  return Object.freeze({
    id: ahavatCompanionUnitId(page, position),
    page, title: `הסבר נלווה · עמוד ${page} · יחידה ${position}`,
    layer: "companion", datasetId: "", sectionId: "ahavat29-full-reader",
  });
})));

export function ahavatLetterUnitId(form, bookId = "all", rowId = "") {
  const source = AHAVAT_LETTER_FORMS.find(item => item.form === form);
  if (!source) return "";
  const books = AHAVAT_LETTER_READINGS[form] || [];
  if (bookId === "all") return rowId ? "" : `letter-form:${form}`;
  const book = books.find(item => item.id === bookId);
  if (!book || (rowId && !book.rows.some(row => row.parasha === rowId))) return "";
  return rowId ? `letter-row:${form}:${bookId}:${rowId}` : `letter-book:${form}:${bookId}`;
}

function letterUnit(id) {
  if (typeof id !== "string") return null;
  const [kind, form, bookId = "all", rowId = "", ...extra] = id.split(":");
  if (kind === "letter-page") {
    const source = AHAVAT_LETTER_FORMS.find(item => item.form === form);
    const page = Number(bookId);
    if (extra.length || rowId || !source?.pages.includes(page) || String(page) !== bookId) return null;
    return { id, page, title: `${source.name} · PDF ${page}`, layer: "letter-page", datasetId: "", sectionId: "ahavat29-letters", form };
  }
  if (extra.length || !["letter-form", "letter-book", "letter-row"].includes(kind)) return null;
  if ((kind === "letter-form" && (bookId !== "all" || rowId)) || (kind === "letter-book" && (bookId === "all" || rowId)) || (kind === "letter-row" && (!rowId || bookId === "all"))) return null;
  if (ahavatLetterUnitId(form, bookId, rowId) !== id) return null;
  const source = AHAVAT_LETTER_FORMS.find(item => item.form === form);
  const book = (AHAVAT_LETTER_READINGS[form] || []).find(item => item.id === bookId);
  const row = rowId && book?.rows.find(item => item.parasha === rowId);
  const page = row ? row.page : book ? book.page : source.pages[0];
  if (!Number.isInteger(page) || !source.pages.includes(page)) return null;
  return { id, page, title: `${source.name}${book ? ` · ${book.title}` : ""}${row ? ` · ${row.parasha}` : ""}`, layer: "letter", datasetId: "", sectionId: "ahavat29-letters", form, letterBook: bookId, letterRow: rowId };
}

export function ahavatCountUnitId(form, bookId = "all", rowId = "") {
  const source = AHAVAT_PARASHA_COUNT_FORMS.find(item => item.form === form);
  if (!source) return "";
  if (bookId === "all") return rowId ? "" : `count-form:${form}`;
  const book = AHAVAT_PARASHA_COUNT_READINGS[form].find(item => item.id === bookId);
  if (!book || (rowId && !book.rows.some(row => row.parasha === rowId))) return "";
  return rowId ? `count-row:${form}:${bookId}:${rowId}` : `count-book:${form}:${bookId}`;
}

function countUnit(id) {
  if (typeof id !== "string") return null;
  const [kind, form, bookId = "all", rowId = "", ...extra] = id.split(":");
  const source = AHAVAT_PARASHA_COUNT_FORMS.find(item => item.form === form);
  if (!source || extra.length) return null;
  if (kind === "count-page") {
    const page = Number(bookId);
    if (rowId || String(page) !== bookId || !source.pages.includes(page)) return null;
    return { id, page, title: `${source.name} · PDF ${page}`, layer: "count-page", datasetId: source.datasetId, sectionId: "ahavat29-counts", form };
  }
  if (!["count-form", "count-book", "count-row"].includes(kind)) return null;
  if ((kind === "count-form" && (bookId !== "all" || rowId)) || (kind === "count-book" && (bookId === "all" || rowId)) || (kind === "count-row" && (!rowId || bookId === "all"))) return null;
  if (ahavatCountUnitId(form, bookId, rowId) !== id) return null;
  const book = AHAVAT_PARASHA_COUNT_READINGS[form].find(item => item.id === bookId);
  const row = rowId && book?.rows.find(item => item.parasha === rowId);
  const page = row ? row.page : book ? book.page : source.pages[0];
  if (!Number.isInteger(page) || !source.pages.includes(page)) return null;
  return { id, page, title: `${source.name}${book ? ` · ${book.title}` : ""}${row ? ` · ${row.parasha}` : ""}`, layer: "count", datasetId: source.datasetId, sectionId: "ahavat29-counts", form, countBook: bookId, countRow: rowId };
}

export function ahavatReaderUnit(id) {
  return AHAVAT_READER_UNITS.find(unit => unit.id === id) || companionUnits.find(unit => unit.id === id) || letterUnit(id) || countUnit(id) || null;
}

export function ahavatReaderUnitDomId(id) {
  return ahavatReaderUnit(id) ? `ahavat29-unit-${id}` : "";
}

export function ahavatReaderQuery(params, key) {
  return (params.get(key) || "").slice(0, 200);
}

export function ahavatReaderUnitHref(id, currentUrl = "/2029/control") {
  const unit = ahavatReaderUnit(id);
  if (!unit) return "";
  const url = new URL(currentUrl, "https://books.invalid");
  url.pathname = "/2029/control";
  url.searchParams.set("surface", "ahavat-torah-system");
  url.searchParams.set("readerUnit", unit.id);
  if (unit.datasetId) url.searchParams.set("dataset", unit.datasetId);
  else url.searchParams.delete("dataset");
  url.searchParams.set("page", String(unit.page));
  url.searchParams.delete("finding");
  if (unit.layer === "count-page") {
    url.searchParams.set("countKind", unit.form);
  } else if (unit.layer === "count") {
    url.searchParams.set("countKind", unit.form);
    url.searchParams.set("countBook", unit.countBook);
    if (unit.countRow) url.searchParams.set("countRow", unit.countRow);
    else url.searchParams.delete("countRow");
    const query = ahavatReaderQuery(url.searchParams, "countQuery");
    if (unit.countRow && query && !ahavatSourceCountRows(AHAVAT_PARASHA_COUNT_READINGS[unit.form], unit.countBook, query).some(row => row.parasha === unit.countRow)) url.searchParams.delete("countQuery");
  } else if (unit.layer === "letter-page") {
    url.searchParams.set("letter", unit.form);
  } else if (unit.layer === "letter") {
    url.searchParams.set("letter", unit.form);
    url.searchParams.set("letterBook", unit.letterBook);
    if (unit.letterRow) url.searchParams.set("letterRow", unit.letterRow);
    else url.searchParams.delete("letterRow");
    const query = ahavatReaderQuery(url.searchParams, "letterQuery");
    if (unit.letterRow && query && !ahavatSourceCountRows(AHAVAT_LETTER_READINGS[unit.form], unit.letterBook, query).some(row => row.parasha === unit.letterRow)) url.searchParams.delete("letterQuery");
  } else if (unit.layer === "companion") {
    // A companion is not a scroll/table row, and gets no fabricated dataset.
  } else if (unit.bookId) {
    url.searchParams.set("peopleBook", unit.bookId);
    const query = ahavatReaderQuery(url.searchParams, "peopleQuery");
    if (!ahavatPeopleRows(unit.bookId, query).some(row => row.id === unit.rowId)) url.searchParams.delete("peopleQuery");
  } else if (unit.datasetId === "DS-11") {
    url.searchParams.set("rootsPage", String(unit.page));
    url.searchParams.set("rootsOpen", "1");
    // OCR is not imported to generate a link. The mounted column reader checks
    // a restored query against the lazily loaded text before accepting it.
  } else {
    url.searchParams.set("scroll", unit.megillahId);
    url.searchParams.set("scrollKind", unit.kind);
    const query = ahavatReaderQuery(url.searchParams, "scrollQuery");
    if (!unit.rowId || !ahavatMegillahRows(unit.kind, unit.megillahId, query).some(row => row.id === unit.rowId)) url.searchParams.delete("scrollQuery");
  }
  url.hash = ahavatReaderUnitDomId(unit.id);
  return `${url.pathname}${url.search}${url.hash}`;
}
