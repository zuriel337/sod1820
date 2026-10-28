// URL projection of existing source rows/columns, not a research store or a new
// source identity. Numeric readings and editorial gaps remain owned by the models.
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows } from "./ahavatTorahPeople2029.js";
import { AHAVAT_ROOT_COLUMNS } from "./ahavatTorahRoots2029.js";
import { AHAVAT_MEGILLOT, ahavatMegillahRows } from "./ahavatTorahMegillot2029.js";

export const AHAVAT_READER_UNITS = Object.freeze([
  ...AHAVAT_PEOPLE_BOOKS.flatMap(book => book.rows.map(row => ({ id: `people:${row.id}`, rowId: row.id, page: row.page, title: `${row.book} · ${row.entity}`, datasetId: "DS-05", sectionId: "ahavat29-people", bookId: book.id }))),
  ...AHAVAT_ROOT_COLUMNS.map(column => ({ id: column.id, page: column.page, title: column.title, datasetId: "DS-11", sectionId: "ahavat29-roots" })),
  ...["letters", "words"].flatMap(kind => ahavatMegillahRows(kind).map(row => ({ id: `scrolls:${row.id}`, rowId: row.id, page: row.page, title: `${row.megillah} · ${row.form}`, datasetId: kind === "words" ? "DS-10" : "DS-09", sectionId: "ahavat29-scrolls", megillahId: row.megillahId, kind }))),
  ...AHAVAT_MEGILLOT.flatMap(item => ["letters", "words"].map(kind => ({ id: `scrolls-total:${item.id}:${kind}`, page: item.totalPage, title: `${item.title} · סיכום ${kind === "words" ? "תיבות" : "אותיות"}`, datasetId: kind === "words" ? "DS-10" : "DS-09", sectionId: "ahavat29-scrolls", megillahId: item.id, kind }))),
].map(unit => Object.freeze(unit)));

// Lightweight URL projection of the delivered companion's 35 × 3 units.
// Keep it separate from the 287 source-native rows; no prose or OCR is eager.
const companionUnits = Object.freeze(Array.from({ length: 105 }, (_, index) => {
  const page = 46 + Math.floor(index / 3), position = index % 3 + 1;
  return Object.freeze({
    id: `ahavat-novellae-p${String(page).padStart(3, "0")}-${String(position).padStart(2, "0")}`,
    page, title: `הסבר נלווה · עמוד ${page} · יחידה ${position}`,
    layer: "companion", datasetId: "", sectionId: "ahavat29-full-reader",
  });
}));

export function ahavatReaderUnit(id) {
  return AHAVAT_READER_UNITS.find(unit => unit.id === id) || companionUnits.find(unit => unit.id === id) || null;
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
  if (unit.layer === "companion") {
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
