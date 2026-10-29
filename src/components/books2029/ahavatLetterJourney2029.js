import { ahavatLetterUnitId, ahavatReaderUnit, ahavatReaderUnitHref } from "../../data/ahavatTorahReaderUnits2029.js";

export const AHAVAT_LETTER_COMPARISON_ANCHOR = "ahavat29-letter-comparison";

// One letter across the existing source order; preserve actual source objects.
export function ahavatLetterParashaEntries(readings, forms, form) {
  const source = forms.find(item => item.form === form);
  return source && Array.isArray(readings?.[form]) ? readings[form].flatMap(book => book.rows.map(row => ({ source, bookId: book.id, book: book.title, row }))) : [];
}

export function ahavatLetterComparisonRows(readings, forms, form, from, to) {
  if (!from || !to || from === to) return [];
  const rows = ahavatLetterParashaEntries(readings, forms, form);
  const pair = [from, to].map(parasha => rows.find(entry => entry.row.parasha === parasha));
  return pair.every(Boolean) ? pair : [];
}

// Presentation return only. Arbitrary query state never creates a source unit.
export function ahavatLetterComparisonTarget(readings, forms, params, unitId) {
  if (params.get("study") !== "letters" || params.get("letterComparison") !== "open" || params.get("letterComparisonFocus") !== unitId) return null;
  const unit = ahavatReaderUnit(unitId);
  if (unit?.layer !== "letter") return null;
  const pair = ahavatLetterComparisonRows(readings, forms, unit.form, params.get("letterComparisonFrom"), params.get("letterComparisonTo"));
  return pair.some(entry => ahavatLetterUnitId(entry.source.form, entry.bookId, entry.row.parasha) === unitId) ? unitId : null;
}

export function ahavatLetterComparisonHref(readings, forms, unitId, currentUrl) {
  const href = ahavatReaderUnitHref(unitId, currentUrl);
  if (!href) return href;
  const params = new URL(currentUrl, "https://books.invalid").searchParams;
  return ahavatLetterComparisonTarget(readings, forms, params, unitId) ? href.replace(/#.*$/, `#${AHAVAT_LETTER_COMPARISON_ANCHOR}`) : href;
}

// Presentation lookup only: retain the existing source row object and its locus.
// No source value, identity, total or missing reading is created here.
export function ahavatRetainedLetterRow(readings, form, parasha) {
  if (!parasha || !Array.isArray(readings?.[form])) return null;
  const book = readings[form].find(item => item.rows.some(row => row.parasha === parasha));
  const row = book?.rows.find(item => item.parasha === parasha);
  return row ? { bookId: book.id, row } : null;
}

// Transpose the existing source rows, in printed form order. Never add totals,
// merge finals/shin/sin, rebalance a reading or replace an unread value by zero.
export function ahavatParashaLetterRows(readings, forms, parasha) {
  return forms.flatMap(source => {
    const selected = ahavatRetainedLetterRow(readings, source.form, parasha);
    return selected ? [{ source, ...selected, book: readings[source.form].find(book => book.id === selected.bookId).title }] : [];
  });
}

export function ahavatFilterParashaLetters(rows, query = "") {
  const normalized = String(query).normalize("NFC").trim().toLowerCase();
  return normalized ? rows.filter(({ source }) => `${source.form} ${source.name}`.normalize("NFC").toLowerCase().includes(normalized)) : rows;
}

export function ahavatParashaLettersCsv(rows, pdfUrl = "") {
  const header = ["זהות מקור", "צורת האות", "שם האות", "פרשה", "חומש", "המניין בדפוס", "קריאת המספר", "עמוד PDF", "קישור למקור", "יחידת קריאה"];
  const records = rows.map(({ source, bookId, book, row }) => ["book:hebrewbooks:5635", source.form, source.name, row.parasha, book, row.printed, row.count, row.page, pdfUrl ? `${pdfUrl}#page=${row.page}&view=FitH` : "", ahavatLetterUnitId(source.form, bookId, row.parasha)]);
  const cell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return "\uFEFF" + [header, ...records].map(record => record.map(cell).join(",")).join("\r\n") + "\r\n";
}
