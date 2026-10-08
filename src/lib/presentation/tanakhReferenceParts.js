// Shared display punctuation for the app and the offline ELS document.
// Inputs are already formatted Hebrew numerals; numeric source identity stays separate.
export function formatTanakhReferenceParts(book, chapterHe, verseHe = "") {
  return verseHe ? `${book} ${chapterHe}, ${verseHe}` : `${book} ${chapterHe}`;
}
