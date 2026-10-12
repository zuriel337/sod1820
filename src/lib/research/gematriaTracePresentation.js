import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";

// Presentation adapter for the existing canonical trace, not a method registry or calculator.
// All displayed values (including intermediate totals) must be supplied by the engine.
export function traceNumber(value) {
  if (!["number", "string"].includes(typeof value) || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

const clean = (value) => String(value ?? "").trim();
const label = (key) => canonicalMethodPublicLabel({ method_key: key });
const KINDS = new Set(["LETTER_LEDGER", "SUBSTITUTION_LEDGER", "ADJACENT_DIFFERENCE", "CUMULATIVE_PREFIX", "POSITION_WEIGHTED", "COMPOSITE"]);

export function isVerifiedMethodTrace(trace, { expression = trace?.input, methodKey = trace?.method_key, expectedValue = null } = {}) {
  const result = traceNumber(trace?.result);
  return Boolean(trace && trace.status !== "error" && trace.trace_kind !== "context_required"
    && clean(trace.input) === clean(expression) && clean(expression)
    && clean(trace.method_key) === clean(methodKey) && clean(methodKey)
    && result != null && trace.verification?.parity === true
    && traceNumber(trace.verification.trace_value) === result
    && traceNumber(trace.verification.canonical_value) === result
    && (expectedValue == null || traceNumber(expectedValue) === result));
}

function required(value) {
  const number = traceNumber(value);
  if (number == null) throw new Error("Missing engine value");
  return number;
}

function letterRows(steps) {
  let wordIndex = 0;
  let previousSubtotal = 0;
  return steps.flatMap((step, index) => {
    if (step?.scope !== "letter" || typeof step.token !== "string") throw new Error("Missing letter identity");
    const value = required(step.contribution ?? step.base_value);
    const subtotal = required(step.running_subtotal);
    if (!step.token.trim()) {
      if (!/\s+/.test(step.token) || value !== 0 || subtotal !== previousSubtotal) throw new Error("Invalid word boundary");
      wordIndex += 1;
      return [];
    }
    previousSubtotal = subtotal;
    const token = step.token;
    const transformed = clean(step.transformed_token) || null;
    return [{ id: `letter:${index}`, token, transformed, wordIndex, value, subtotal,
      position: required(step.position ?? step.index), source: step,
      text: `${token}${transformed && transformed !== token ? ` ← ${transformed}` : ""}: ${value} · סכום עד כאן: ${subtotal}` }];
  });
}

function prefixRows(steps) {
  const tokens = [];
  return steps.map((step, index) => {
    const token = clean(step?.token);
    if (!token) throw new Error("Missing prefix token");
    const position = required(step.original_position ?? step.index);
    tokens.push({ token, position });
    // Reverse traces arrive from the end of the input; keep each displayed segment
    // in its original Hebrew reading order using the supplied source positions.
    const prefix = [...tokens].sort((a, b) => a.position - b.position).map((part) => part.token).join("");
    const value = required(step.prefix_subtotal);
    return { id: `prefix:${index}`, token, prefix, value, position, source: step,
      text: `${prefix}: ${value}` };
  });
}

export function projectGematriaTrace(trace, options = {}, level = 0) {
  const base = { state: "unverified", kind: trace?.trace_kind || null, groups: [], components: [], lines: [], result: null,
    methodKey: clean(options.methodKey ?? trace?.method_key), expression: clean(options.expression ?? trace?.input) };
  if (trace?.trace_kind === "context_required") return { ...base, state: "context_required",
    instruction: "השיטה דורשת סימון מפורש של אות רבתי במקור. בלי ההקשר הזה אין תוצאה להצגה." };
  if (!isVerifiedMethodTrace(trace, options)) return base;
  const verified = { ...base, result: traceNumber(trace.result), methodLabel: label(trace.method_key), semantics: trace.semantics || {} };
  if (!KINDS.has(trace.trace_kind)) return { ...verified, state: "unsupported" };
  if (level > 8) return base;
  try {
    const kind = trace.trace_kind;
    const groups = [];
    let components = [];
    let instruction;
    if (kind === "COMPOSITE") {
      const operator = trace.steps?.operator;
      if (!["sum", "diff"].includes(operator) || !Array.isArray(trace.steps.components) || trace.steps.components.length < 2) throw new Error("Unknown composition");
      components = trace.steps.components.map((component, index) => {
        const key = clean(component.component_method);
        const value = required(component.component_value);
        const detail = projectGematriaTrace(component.component_trace, { expression: base.expression, methodKey: key, expectedValue: value }, level + 1);
        if (detail.state !== "ready") throw new Error("Unverified component");
        return { id: `component:${index}`, methodKey: key, label: label(key), value, detail };
      });
      instruction = operator === "diff" ? "מחשבים את שיטות הבסיס, ואז מחסרים לפי הסדר המוצג." : "מחשבים את שיטות הבסיס, ואז מחברים את תוצאותיהן.";
      return { ...verified, state: "ready", operator, components, instruction,
        lines: [...components.flatMap((c) => [`${c.label}: ${c.value}`, ...c.detail.lines.map((line) => `  ${line}`)]), `תוצאה: ${verified.result}`] };
    }
    if (!Array.isArray(trace.steps) || !trace.steps.length) throw new Error("Missing steps");
    if (kind === "LETTER_LEDGER" || kind === "SUBSTITUTION_LEDGER") {
      const rows = letterRows(trace.steps);
      if (!rows.length || rows.at(-1).subtotal !== verified.result) throw new Error("Incomplete letter ledger");
      for (const wordIndex of [...new Set(rows.map((row) => row.wordIndex))]) {
        const wordRows = rows.filter((row) => row.wordIndex === wordIndex);
        groups.push({ id: `word:${wordIndex}`, label: wordRows.map((row) => row.token).join(""), rows: wordRows });
      }
      instruction = rows.some((row) => row.transformed)
        ? "קוראים את האות המקורית, את האות שהוחלפה בה ואת תרומתה לסכום."
        : "עוברים על האותיות לפי הסדר ורואים את תרומת כל אות ואת הסכום המצטבר.";
    } else if (kind === "ADJACENT_DIFFERENCE") {
      for (const [index, word] of trace.steps.entries()) {
        const letters = [...clean(word.word)];
        if (!letters.length || word.letter_values?.length !== letters.length || word.pairs?.length !== letters.length - 1) throw new Error("Invalid adjacent shape");
        const rows = word.pairs.map((pair, at) => {
          const left = required(pair.left_value), right = required(pair.right_value), value = required(pair.difference);
          if (left !== required(word.letter_values[at]) || right !== required(word.letter_values[at + 1])) throw new Error("Mismatched pair identity");
          return { id: `pair:${index}:${at}`, token: `${letters[at]} ↔ ${letters[at + 1]}`, left, right, value, source: pair,
            text: `${letters[at]} (${left}) ↔ ${letters[at + 1]} (${right}): הפרש ${value}` };
        });
        if (!rows.length) rows.push({ id: `single:${index}`, token: word.word, value: required(word.word_subtotal), text: `${word.word}: אין זוג אותיות סמוכות` });
        groups.push({ id: `word:${index}`, label: word.word, subtotal: required(word.word_subtotal), rows });
      }
      instruction = "בכל מילה בודקים זוגות סמוכים. ההפרש של כל זוג מצטרף לתוצאה; אין חיבור בין שתי מילים.";
    } else if (kind === "CUMULATIVE_PREFIX") {
      if (trace.semantics?.per_word_reset === true) {
        trace.steps.forEach((word, index) => groups.push({ id: `word:${index}`, label: clean(word.word), subtotal: required(word.word_subtotal), rows: prefixRows(word.steps) }));
        instruction = "בונים קידומת אות אחר אות ומצרפים את ערכי הקידומות. בתחילת כל מילה מתחילים מחדש.";
      } else {
        groups.push({ id: "phrase", label: base.expression, rows: prefixRows(trace.steps) });
        instruction = "בונים קידומות לפי הסדר שמוצג ומצרפים את ערכיהן. החישוב ממשיך לאורך הביטוי כולו.";
        if (trace.steps[0]?.original_position > trace.steps.at(-1)?.original_position) instruction = "מתחילים באות האחרונה ומוסיפים בכל צעד את האות שלפניה. מחברים את ערכי המקטעים.";
      }
    } else if (kind === "POSITION_WEIGHTED") {
      trace.steps.forEach((word, index) => groups.push({ id: `word:${index}`, label: clean(word.word), subtotal: required(word.word_subtotal),
        rows: word.steps.map((step, at) => {
          const value = required(step.contribution), position = required(step.position), baseValue = required(step.base_value);
          if (!clean(step.token)) throw new Error("Missing weighted token");
          return { id: `weight:${index}:${at}`, token: step.token, value, position, baseValue, source: step,
            text: `${step.token}: ערך ${baseValue} × מיקום ${position} = ${value}` };
        }) }));
      instruction = "מכפילים את ערך האות במיקומה במילה. המיקום מתחיל מחדש בכל מילה.";
    }
    return { ...verified, state: "ready", groups, components, instruction,
      lines: [...groups.flatMap((group) => [group.label, ...group.rows.map((row) => row.text), ...(group.subtotal != null ? [`סכום המילה: ${group.subtotal}`] : [])]), `תוצאה: ${verified.result}`] };
  } catch {
    return { ...base, state: "incomplete" };
  }
}

export function gematriaTraceLines(trace, options) {
  return projectGematriaTrace(trace, options).lines;
}
