// 🇺🇸 גימטריה אנגלית — כרגע **Simple (Ordinal)** בלבד: A=1, B=2 … Z=26.
// זרע ל-Language Calculation Engine (LCE) העתידי (ראה work_log «LCE»). שאר השיטות
// (Reverse/Reduction/Sumerian/Jewish) יתווספו בשלב-2 — כאן רק מוכרזות לתג הלחיץ.

export function englishSimple(text) {
  let sum = 0;
  const s = String(text || "").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 97 && c <= 122) sum += c - 96;   // a=1 … z=26
  }
  return sum;
}

// יש בכלל אותיות לטיניות? (כדי לא להציג «English Simple = 0» למילה עברית טהורה)
export const hasLatin = t => /[a-z]/i.test(String(t || ""));

// מפת-שיטות עתידית — רק Simple פעיל. שאר השיטות «בקרוב» (LCE שלב-2).
export const EN_METHODS = [
  { key: "simple",    label: "English Simple",    active: true,  note: "A=1 … Z=26" },
  { key: "reverse",   label: "English Reverse",   active: false, note: "A=26 … Z=1" },
  { key: "reduction", label: "English Reduction", active: false, note: "פיתגורי 1–9" },
  { key: "sumerian",  label: "English Sumerian",  active: false, note: "×6" },
  { key: "jewish",    label: "Jewish / Qabalah",  active: false, note: "ערכי-מקום" },
];
