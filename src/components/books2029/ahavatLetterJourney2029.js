// Presentation lookup only: retain the existing source row object and its locus.
// No source value, identity, total or missing reading is created here.
export function ahavatRetainedLetterRow(readings, form, parasha) {
  if (!parasha || !Array.isArray(readings?.[form])) return null;
  const book = readings[form].find(item => item.rows.some(row => row.parasha === parasha));
  const row = book?.rows.find(item => item.parasha === parasha);
  return row ? { bookId: book.id, row } : null;
}
