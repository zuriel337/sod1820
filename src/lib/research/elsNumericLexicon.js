// Recognition of conventional numeral NOTATION over exact engine-owned letters.
// The canonical tool's existing HEBNUM formatter is shared here. This is neither a
// Gematria calculator nor an ELS matcher; it never searches a corpus or assigns meaning.
export const ELS_NUMERIC_SELECTION = "EXPLORATORY_NUMERIC_NOTATION_V1";

// Extracted without changing the tool's HEBNUM spelling. Numeral presentation,
// not the registry-owned arbitrary-expression Gematria calculation.
export function formatElsHebrewNumeral(n) {
  if (n <= 0) return "" + n;
  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"], tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], hundreds = ["", "ק", "ר", "ש", "ת"];
  const hs = Math.floor(n / 100), rest = n % 100;
  let text = hs ? hs <= 4 ? hundreds[hs] : hundreds[4].repeat(Math.floor(hs / 4)) + (hundreds[hs % 4] || "") : "";
  text += rest === 15 ? "טו" : rest === 16 ? "טז" : tens[Math.floor(rest / 10)] + units[rest % 10];
  return text.length > 1 ? text.slice(0, -1) + '״' + text.slice(-1) : text.length === 1 ? text + "׳" : text;
}

export function elsNumericPlan(input = {}) {
  const bound = (value, fallback, min, max) => Number.isSafeInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
  const numberMin = bound(input.numberMin, 1, 1, 999), yearMin = bound(input.yearMin, 5001, 5001, 5999);
  return { numberMin, numberMax: bound(input.numberMax, 999, numberMin, 999),
    yearMin, yearMax: bound(input.yearMax, 5999, yearMin, 5999) };
}

export function createElsNumericLexicon(formatNumeral = formatElsHebrewNumeral) {
  // At most 999 entries, constructed only on an explicit numeric scan. Reuse the
  // tool's conventional spelling, including טו/טז and repeated hundreds.
  const index = new Map();
  for (let value = 1; value <= 999; value++) {
    const label = formatNumeral(value), letters = label.replace(/[׳״]/g, "");
    index.set(letters, { value, label });
  }
  return (term, words, requestedPlan) => {
    if (!/^[א-ת]{4,15}$/.test(term)) return [];
    const plan = elsNumericPlan(requestedPlan), readings = [];
    const year = term[0] === "ה" && index.get(term.slice(1));
    if (year && term.length >= 4 && 5000 + year.value >= plan.yearMin && 5000 + year.value <= plan.yearMax) {
      readings.push({ kind: "hebrew-year", exactLetters: term, numericLetters: term.slice(1),
        value: 5000 + year.value, label: `ה׳${year.label}`, lexiconSources: ["hebrew_year_notation"],
        selectionProtocol: ELS_NUMERIC_SELECTION, interpretationRequired: true });
    }
    for (let split = 2; split < term.length - 1; split++) for (const order of ["number-word", "word-number"]) {
      const numericLetters = order === "number-word" ? term.slice(0, split) : term.slice(split);
      const wordLetters = order === "number-word" ? term.slice(split) : term.slice(0, split);
      if (numericLetters.length < 2 || numericLetters.length > 5 || wordLetters.length < 3 || wordLetters.length > 10) continue;
      const number = index.get(numericLetters), word = words.get(wordLetters);
      if (!number || number.value < plan.numberMin || number.value > plan.numberMax || !word) continue;
      const wordLabel = word.label || wordLetters;
      readings.push({ kind: "number-with-word", exactLetters: term, numericLetters, wordLetters, wordLabel, order,
        value: number.value, label: order === "number-word" ? `${number.label} ${wordLabel}` : `${wordLabel} ${number.label}`,
        lexiconSources: [...new Set([...(word.lexiconSources || []), "hebrew_numeral_notation"])],
        selectionProtocol: ELS_NUMERIC_SELECTION, interpretationRequired: true });
    }
    return readings;
  };
}

// Admission checks only the annotation envelope; the existing replay path still
// verifies exact letters/coordinates. It cannot verify a political/date interpretation.
export function isElsNumericCandidate(term, readings, requestedPlan) {
  if (!/^[א-ת]{4,15}$/.test(term) || !Array.isArray(readings) || !readings.length || readings.length > 21) return false;
  const plan = elsNumericPlan(requestedPlan);
  return readings.every(reading => {
    if (reading?.exactLetters !== term || reading.selectionProtocol !== ELS_NUMERIC_SELECTION
      || reading.interpretationRequired !== true || !Number.isSafeInteger(reading.value)
      || !/^[א-ת]{1,5}$/.test(reading.numericLetters)) return false;
    if (reading.kind === "hebrew-year") return term === `ה${reading.numericLetters}`
      && reading.value >= plan.yearMin && reading.value <= plan.yearMax
      && formatElsHebrewNumeral(reading.value - 5000).replace(/[׳״]/g, "") === reading.numericLetters;
    if (reading.kind !== "number-with-word" || !/^[א-ת]{3,10}$/.test(reading.wordLetters)
      || reading.numericLetters.length < 2 || reading.value < plan.numberMin || reading.value > plan.numberMax
      || formatElsHebrewNumeral(reading.value).replace(/[׳״]/g, "") !== reading.numericLetters) return false;
    return reading.order === "number-word" ? term === reading.numericLetters + reading.wordLetters
      : reading.order === "word-number" && term === reading.wordLetters + reading.numericLetters;
  });
}
