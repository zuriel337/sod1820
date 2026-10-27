// The stream stores base letters; the dictionary (and a user's term) may hold final forms. This is a spelling normalisation, not a search.
const FINAL_TO_BASE = Object.freeze({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" });
export const baseLetters = (word) => [...word].map((ch) => FINAL_TO_BASE[ch] || ch).join("");
