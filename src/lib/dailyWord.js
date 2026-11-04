// Deterministic "word of the day" — same word for everyone on a given calendar day (no randomness,
// no server state). Presentation helper only; the VALUE is always computed by the canonical envelope
// at the call site, never stored here.
export const DAILY_WORDS = Object.freeze([
  "אמת", "אהבה", "גאולה", "משיח", "תורה", "חכמה", "בינה", "אור",
  "שלום", "חיים", "נשמה", "ברכה", "תשובה", "אמונה", "צדק",
]);

export function dailyWordFor(date = new Date()) {
  return DAILY_WORDS[date.getDate() % DAILY_WORDS.length];
}
