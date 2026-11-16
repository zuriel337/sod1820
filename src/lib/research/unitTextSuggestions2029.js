// Deterministic editorial suggestions for the free MESSAGE an admin writes for a unit (ZURIEL 12.11.2026, section 5).
// "Raziel suggests; Zuriel chooses": nothing here is applied by itself, no AI is called, and a formatting suggestion is
// admitted ONLY if it leaves every word exactly as written (sameWords). Spelling corrections are never produced here: they
// need Raziel and Zuriel's approval, one by one. The stored unit text is never touched; this works on the message text only.
const LETTER = /[^\p{L}\p{N}ְ-ׇ]+/gu;
export const wordsOf = (text) => String(text ?? "").replace(LETTER, " ").trim().split(/\s+/).filter(Boolean);
export const sameWords = (a, b) => { const x = wordsOf(a), y = wordsOf(b); return x.length === y.length && x.every((w, i) => w === y[i]); };

const tidySpacing = (text) => String(text)
  .replace(/[ \t]+/g, " ")
  .replace(/ +([,.;:!?])/g, "$1")
  .replace(/([,;:!?])(?=[^\s\d"״”’)\]])/g, "$1 ")
  .replace(/ *\n */g, "\n")
  .trim();
const breakLines = (text) => String(text).includes("\n") || String(text).length < 140 ? String(text)
  : String(text).replace(/([.!?])\s+(?=\S)/g, "$1\n");
const closePeriod = (text) => {
  const last = String(text).split("\n").pop().trim();
  return last.length >= 60 && !/[.!?:״"”)]$/.test(last) && !/\d$/.test(last) ? `${String(text).trimEnd()}.` : String(text);
};

// → [{ id, kind, label, before, after, centering? }]  every item keeps the words exactly.
export function suggestFormatting(text) {
  const before = String(text ?? "");
  if (!before.trim()) return [];
  const out = [];
  const tidy = tidySpacing(before);
  if (tidy !== before.trim() && sameWords(before, tidy)) out.push({ id: "spacing", kind: "punctuation", label: "ניקוי רווחים ופיסוק", before, after: tidy });
  const base = out.length ? tidy : before;
  const lines = breakLines(base);
  if (lines !== base && sameWords(before, lines)) out.push({ id: "lines", kind: "lines", label: "חלוקה לשורות בסוף משפט", before: base, after: lines });
  const closed = closePeriod(out.at(-1)?.after || base);
  if (closed !== (out.at(-1)?.after || base) && sameWords(before, closed)) out.push({ id: "period", kind: "punctuation", label: "נקודה בסוף המסר", before: out.at(-1)?.after || base, after: closed });
  const finalText = out.at(-1)?.after || before;
  out.push({ id: "centering", kind: "centering", label: finalText.length <= 140 && finalText.split("\n").length <= 2 ? "מרכוז: מסר קצר — מומלץ למרכז" : "מרכוז: מסר ארוך — מומלץ ליישר לקצה הקריאה", before: finalText, after: finalText, centering: finalText.length <= 140 && finalText.split("\n").length <= 2 ? "center" : "start" });
  return out;
}

const DATE = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g;
const CLAIM_LINE = /^\s*(.+?)\s*=\s*(\d{1,6})\s*(.*)$/u;
// Numbers and claim lines found in the text. Detection only: nothing is calculated and nothing is marked verified.
export function detectNumbersAndExpressions(text) {
  const out = [];
  const clean = String(text ?? "");
  for (const rawLine of clean.split("\n")) {
    const line = rawLine.replace(/\*/g, " "); // WhatsApp bold markers are formatting, not part of a phrase
    const m = CLAIM_LINE.exec(line.replace(/[״"“”]/g, ""));
    if (m && wordsOf(m[1]).length && !/^\d/.test(m[1].trim())) out.push({ kind: "claim", phrase: m[1].trim(), number: Number(m[2]), methodText: m[3].replace(/[()]/g, "").trim() || null });
    else {
      const rev = /^\s*(\d{1,6})\s*(?:=|בגימטרי[הא]\s*[:=]?)\s*(.+)$/u.exec(line.replace(/[״"“”]/g, ""));
      if (rev && wordsOf(rev[2]).length) out.push({ kind: "claim", phrase: rev[2].trim(), number: Number(rev[1]), methodText: null });
    }
  }
  const noDates = clean.replace(DATE, " ");
  for (const m of noDates.matchAll(/(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d{2,6})(?![\d])/g)) {
    const value = Number(m[1].replace(/,/g, ""));
    if (Number.isSafeInteger(value) && !out.some((o) => o.kind === "number" && o.value === value)) out.push({ kind: "number", value });
  }
  return out;
}

// Spelling is NOT decided here (decision 5.2): it is a separate step that needs Raziel and Zuriel's approval, item by item.
export const SPELLING_NEEDS_APPROVAL = Object.freeze({ producedHere: false, how: "בקשה מפורשת מרזיאל; כל תיקון בנפרד ובאישור צוריאל" });
