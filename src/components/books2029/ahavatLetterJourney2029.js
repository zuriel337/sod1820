import { ahavatLetterUnitId } from "../../data/ahavatTorahReaderUnits2029.js";

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
