// The rough chance model of an ELS reading, in ONE place (moved out of elsMatrixReading.js on 18.11.2026 so that the 2029 page can show the same
// number without loading the server module). Plain ES module, no imports; Node, Deno and the browser run the same text.
// E = occurrences expected by chance for the same letters at one skip, both directions, over the whole Torah, with independent letters at the
// Torah's own frequencies. A rough model, not a significance test; E<1 means "not expected by chance", never "meaningful".

export const TORAH_LENGTH = 304_805;

/** Letter counts of the Torah stream (public.torah_stream, 304,805 letters, md5 0066c2431821863d258745e664d3883e). */
export const TORAH_LETTER_COUNTS = Object.freeze({
  א: 27059, ב: 16345, ג: 2109, ד: 7032, ה: 28056, ו: 30513, ז: 2198, ח: 7189, ט: 1804, י: 31531, כ: 11968,
  ל: 21570, מ: 25090, נ: 14126, ס: 1833, ע: 11250, פ: 4805, צ: 3962, ק: 4695, ר: 18125, ש: 15595, ת: 17950,
});

export function expectedChance(text, skip) {
  const letters = [...text];
  const starts = Math.max(0, TORAH_LENGTH - (letters.length - 1) * skip);
  let p = 1;
  for (const ch of letters) p *= (TORAH_LETTER_COUNTS[ch] ?? 0) / TORAH_LENGTH;
  return 2 * starts * p;
}
