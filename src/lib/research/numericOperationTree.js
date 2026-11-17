// src/lib/research/numericOperationTree.js — the ONE parser / evaluator / token-role projection for arithmetic derivations in research content.
//
// Why it exists: before this module the only "parser" was a regex in spatialRenderModel (two integers and a ×). The law (research_intake_foundation_contract_law
// §6.10/§14.3) requires every operation to have an explicit operation_key distinct from its glyph; this module reads text OR structured inputs into the same typed
// tree, evaluates it deterministically, and projects it to tokens that carry a SEMANTIC ROLE, so every consumer (UI, 3D, Raziel) renders from the tree and never
// from a hand-written "×" or "=".
//
// Hard rules:
//  - deterministic and closed: a hand-written tokenizer + recursive descent over a small grammar; NO eval / Function / regex-guessing / AI;
//  - exact arithmetic: BigInt integers; a non-integer division, a division by zero or an overflow is `unsupported`, never an invented result;
//  - gematria values are NEVER computed here: an Expression leaf's value comes only from the caller's `expressionValues` (the canonical engine, verified by the
//    caller). A value written in the text is a CLAIM that is checked against the engine value;
//  - an operator is a property of an operation node. It is never a number, an expression, a shape or an entity of the research tree;
//  - unsupported ≠ inconsistent: a formula the grammar does not cover is `unsupported`; `inconsistent` means it WAS evaluated and the declared result differs.
import { NUMERIC_OPERATION_REGISTRY } from "./numericArithmeticOperations.js";

export const SEMANTIC_ROLE = Object.freeze({
  EXPRESSION: "expression",
  VALUE: "value",
  OPERATOR: "operator",
  RESULT: "result",
  GEOMETRY: "geometry",
  QUANTITY: "quantity",
  SOURCE: "source",
  INTERPRETATION: "interpretation",
  UI_CONTROL: "ui_control",
});

export const FORMULA_STATUS = Object.freeze({
  VERIFIED: "verified",
  PENDING: "pending",
  UNAVAILABLE: "unavailable",
  NO_PHRASE: "no_phrase",
  INCONSISTENT: "inconsistent",
  UNSUPPORTED: "unsupported",
});

// The relation glyph is defined once. "=" is a RELATION between two sides (a kind: arithmetic or value equality), never an operation of the registry.
export const RELATION_SYMBOL = "=";

const BIDI = /[​-‏‪-‮⁦-⁩﻿]/g;
const NIQQUD = /[֑-ֽֿׁׂׄ-ׇ]/g; // marks only: the maqaf U+05BE is deliberately kept (it is an ambiguous dash, never an operator)
const DECORATIVE_QUOTES = /[«»“”„‟]/g;
const HEBREW_WORD_CHAR = /[א-ת׳״]/;

const unsupported = (code, reason, at = null) => ({ ok: false, status: FORMULA_STATUS.UNSUPPORTED, code, reason, at });

// ---------------------------------------------------------------- tokenizer
export function tokenizeFormula(input, registry = NUMERIC_OPERATION_REGISTRY) {
  let text = String(input ?? "").normalize("NFC").replace(BIDI, "").replace(NIQQUD, "").replace(DECORATIVE_QUOTES, " ").replace(/ /g, " ");
  text = text.replace(/\s+/g, " ").trim().replace(/[.,;:!?]+$/, "").trim(); // trailing punctuation of a sentence is not part of the formula
  if (!text) return unsupported("empty", "אין נוסחה");
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === " ") { i += 1; continue; }
    if (/[0-9]/.test(ch)) {
      let j = i; while (j < text.length && /[0-9]/.test(text[j])) j += 1;
      if (text[j] === "." && /[0-9]/.test(text[j + 1] || "")) return unsupported("non_integer", "מספר עשרוני אינו נתמך", i);
      if (text[j] === "," && /[0-9]/.test(text[j + 1] || "")) return unsupported("thousands_separator", "מפריד אלפים אינו נתמך (לא מנחשים)", i);
      tokens.push({ type: "number", text: text.slice(i, j), at: i }); i = j; continue;
    }
    if (HEBREW_WORD_CHAR.test(ch)) {
      let j = i; while (j < text.length && (HEBREW_WORD_CHAR.test(text[j]) || (/["']/.test(text[j]) && HEBREW_WORD_CHAR.test(text[j - 1] || "") && HEBREW_WORD_CHAR.test(text[j + 1] || "")))) j += 1;
      tokens.push({ type: "word", text: text.slice(i, j), at: i }); i = j; continue;
    }
    if (ch === "(") { tokens.push({ type: "lparen", text: ch, at: i }); i += 1; continue; }
    if (ch === ")") { tokens.push({ type: "rparen", text: ch, at: i }); i += 1; continue; }
    if (ch === "=") { tokens.push({ type: "equals", text: ch, at: i }); i += 1; continue; }
    if (ch === "–" || ch === "—" || ch === "־") return unsupported("ambiguous_dash", "מקף/קו מפריד אינו סימן חיסור (לא מנחשים)", i);
    if (ch === "-") {
      const before = text[i - 1] || "", after = text[i + 1] || "";
      // hyphen glued between two Hebrew letters is punctuation of a word, not an operator
      if (HEBREW_WORD_CHAR.test(before) && HEBREW_WORD_CHAR.test(after)) return unsupported("ambiguous_dash", "מקף בתוך טקסט אינו בהכרח פעולה (לא מנחשים)", i);
      tokens.push({ type: "op", text: ch, key: registry.keyForGlyph(ch), at: i }); i += 1; continue;
    }
    if (ch === "x" || ch === "X") {
      const before = text[i - 1] || " ", after = text[i + 1] || " ";
      if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) return unsupported("unknown_character", "אות לטינית בתוך הנוסחה", i);
      tokens.push({ type: "op", text: ch, key: registry.keyForGlyph(ch), at: i }); i += 1; continue;
    }
    const key = registry.keyForGlyph(ch);
    if (key) { tokens.push({ type: "op", text: ch, key, at: i }); i += 1; continue; }
    return unsupported("unknown_character", `תו שאינו נתמך בנוסחה: ${ch}`, i);
  }
  // a minus/plus is unary only where an operand is expected: the parser decides, the tokenizer only labels glyphs
  return { ok: true, tokens };
}

// ---------------------------------------------------------------- parser (closed grammar)
//   formula := sum ('=' sum)*
//   sum     := term (('+'|'−') term)*
//   term    := factor (('×'|'÷') factor)*
//   factor  := ('−'|'+')? primary          (a leading '−' is a sign, not an operation)
//   primary := NUMBER | PHRASE ['(' NUMBER ')'] | '(' sum ')'
//   A '(' right after a PHRASE is a VALUE ANNOTATION ("שבת (702)"), never grouping; a '(' at the start of an operand is grouping; implicit multiplication is unsupported.
export function parseFormulaText(input, registry = NUMERIC_OPERATION_REGISTRY) {
  const lexed = tokenizeFormula(input, registry);
  if (!lexed.ok) return lexed;
  const tokens = lexed.tokens;
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const fail = (code, reason) => { throw Object.assign(new Error(reason), { unsupportedCode: code, at: peek()?.at ?? null }); };

  const primary = () => {
    const t = peek();
    if (!t) fail("incomplete", "הנוסחה נקטעת");
    if (t.type === "number") { take(); if (peek()?.type === "lparen" || peek()?.type === "word" || peek()?.type === "number") fail("implicit_operation", "אין פעולה בין הרכיבים (כפל משתמע/פרוזה אינם נתמכים)"); return { kind: "number", value: BigInt(t.text), text: t.text }; }
    if (t.type === "word") {
      const words = [take().text];
      while (peek()?.type === "word") words.push(take().text); // a multi-word expression: consecutive words up to the next operator / '=' / parenthesis
      const node = { kind: "expression", text: words.join(" ") };
      if (peek()?.type === "lparen") {
        const save = pos; take();
        if (peek()?.type === "number" && tokens[pos + 1]?.type === "rparen") { node.declaredValue = Number(take().text); take(); }
        else { pos = save; fail("grouping_after_expression", "סוגריים אחרי ביטוי חייבים להכיל ערך בלבד (ביאור), לא קיבוץ"); }
      }
      return node;
    }
    if (t.type === "lparen") { take(); const inner = sum(); if (peek()?.type !== "rparen") fail("unbalanced_parentheses", "סוגריים לא מאוזנים"); take(); return { kind: "group", operand: inner }; }
    return fail("unexpected_token", `רכיב לא צפוי: ${t.text}`);
  };
  const factor = () => {
    const t = peek();
    if (t?.type === "op" && (t.key === "subtract" || t.key === "add") && (t.text === "-" || t.text === "−" || t.text === "+")) {
      take(); const operand = factor();
      if (t.key === "add") return operand;
      return operand.kind === "number" ? { kind: "number", value: -operand.value, text: `-${operand.text}` } : { kind: "neg", operand };
    }
    return primary();
  };
  // n-ary only for an associative same-key run (a+b+c, a×b×c); non-associative operations (− ÷) nest left to right
  const chain = (next, keys) => {
    let left = next(), run = null;
    while (peek()?.type === "op" && keys.includes(peek().key)) {
      const op = take(), right = next();
      if (run && run.key === op.key) { run.operands.push(right); continue; }
      const associative = Boolean(registry.get(op.key)?.associative);
      const operands = [left, right];
      left = { kind: "op", key: op.key, operands };
      run = associative ? { key: op.key, operands } : null;
    }
    return left;
  };
  const term = () => chain(factor, ["multiply", "divide"]);
  const sum = () => chain(term, ["add", "subtract"]);

  try {
    const sides = [sum()];
    while (peek()?.type === "equals") { take(); sides.push(sum()); }
    if (pos < tokens.length) fail("unexpected_token", `רכיב לא צפוי: ${peek().text}`);
    return { ok: true, formula: { kind: "formula", sides } };
  } catch (error) {
    if (error.unsupportedCode) return unsupported(error.unsupportedCode, error.message, error.at);
    throw error;
  }
}

// ---------------------------------------------------------------- evaluator
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const toNumber = (v) => (v <= MAX_SAFE && v >= -MAX_SAFE ? Number(v) : null);

// context.expressionValues: { [expressionText]: { value:Number, state:"verified"|"pending"|"unavailable" } } — supplied by the caller from the CANONICAL ENGINE.
// A missing entry means "no engine value": the leaf is `missing` and the formula cannot be verified (it is never filled in from the text).
function evalNode(node, ctx, acc) {
  switch (node.kind) {
    case "number":
      // a value declared WITHOUT an expression (a literal operand) is a claim nobody verified: it can never make a formula verified
      if (node.declaredOnly) { acc.leaves.push({ role: SEMANTIC_ROLE.VALUE, text: String(node.value), value: Number(node.value), state: "declared_only" }); return { v: node.value, state: ctx.trustLiterals ? "ok" : "missing" }; }
      return { v: node.value, state: "ok" };
    case "quantity": {
      if (!Number.isSafeInteger(node.value)) throw Object.assign(new Error("non-integer quantity"), { unsupportedCode: "non_integer" });
      acc.leaves.push({ role: node.role || SEMANTIC_ROLE.QUANTITY, text: String(node.value), value: Number(node.value), origin: node.provenance || null, key: node.key || null });
      return { v: BigInt(node.value), state: node.provenance ? "ok" : "undeclared" };
    }
    case "expression": {
      const known = ctx.expressionValues?.[node.text];
      const state = !known ? "missing" : known.state === "verified" ? "ok" : known.state === "pending" ? "pending" : "unavailable";
      acc.leaves.push({ role: SEMANTIC_ROLE.EXPRESSION, text: node.text, value: known?.value ?? null, state: known?.state || "missing", declaredValue: node.declaredValue ?? null });
      if (known && known.state === "verified" && node.declaredValue != null && Number(node.declaredValue) !== Number(known.value)) acc.findings.push({ code: "annotation_mismatch", text: node.text, declared: node.declaredValue, engine: known.value });
      return { v: known && Number.isSafeInteger(known.value) ? BigInt(known.value) : null, state };
    }
    case "group": return evalNode(node.operand, ctx, acc);
    case "neg": { const r = evalNode(node.operand, ctx, acc); return r.v == null ? r : { v: -r.v, state: r.state }; }
    case "op": {
      const row = ctx.registry.get(node.key);
      if (!row) throw Object.assign(new Error("unknown operation"), { unsupportedCode: "unknown_operation" });
      const parts = node.operands.map((operand) => evalNode(operand, ctx, acc));
      const state = parts.map((p) => p.state).reduce((a, b) => rank(b) > rank(a) ? b : a, "ok");
      if (parts.some((p) => p.v == null)) return { v: null, state: state === "ok" ? "missing" : state };
      const base = ctx.registry.base(node.key)?.operation_key || node.key;
      const operands = parts.map((p) => p.v);
      let v;
      if (base === "add") v = operands.reduce((a, b) => a + b, 0n);
      else if (base === "multiply") v = operands.reduce((a, b) => a * b, 1n);
      else if (base === "subtract") v = operands[0] - operands[1];
      else if (base === "divide") {
        if (operands[1] === 0n) throw Object.assign(new Error("division by zero"), { unsupportedCode: "division_by_zero" });
        if (operands[0] % operands[1] !== 0n) throw Object.assign(new Error("non-integer division"), { unsupportedCode: "non_integer_division" });
        v = operands[0] / operands[1];
      } else throw Object.assign(new Error("unknown operation"), { unsupportedCode: "unknown_operation" });
      const n = toNumber(v); if (n === null) throw Object.assign(new Error("too large"), { unsupportedCode: "too_large" });
      acc.steps.push({ operationKey: node.key, symbol: ctx.registry.symbol(node.key), inputs: operands.map((o) => Number(o)), result: n });
      return { v, state };
    }
    default: throw Object.assign(new Error("unknown node"), { unsupportedCode: "unknown_node" });
  }
}
const rank = (s) => ({ ok: 0, undeclared: 1, missing: 2, pending: 3, unavailable: 4 }[s] ?? 0);

// trustLiterals: ONLY for the model-internal arithmetic pre-check (does the declared product equal the declared result?). It never makes a formula verified for display.
export function evaluateFormula(formula, { expressionValues = {}, registry = NUMERIC_OPERATION_REGISTRY, trustLiterals = false } = {}) {
  const ctx = { expressionValues, registry, trustLiterals };
  const sides = [], findings = [];
  try {
    for (const side of formula.sides) {
      const acc = { steps: [], leaves: [], findings };
      const r = evalNode(side, ctx, acc);
      sides.push({ value: r.v == null ? null : toNumber(r.v), state: r.state, steps: acc.steps, leaves: acc.leaves, lone: side.kind === "expression" ? "expression" : side.kind === "number" ? "number" : null });
    }
  } catch (error) {
    if (error.unsupportedCode) return { status: FORMULA_STATUS.UNSUPPORTED, code: error.unsupportedCode, reason: error.message, sides: [], equalities: [], findings };
    throw error;
  }
  const equalities = [];
  for (let i = 0; i + 1 < sides.length; i += 1) {
    const a = sides[i], b = sides[i + 1];
    const kind = a.lone === "expression" || b.lone === "expression" ? "value_equality" : "arithmetic_equality";
    equalities.push({ between: [i, i + 1], kind, holds: a.value == null || b.value == null ? null : a.value === b.value });
  }
  const worst = sides.map((s) => s.state).reduce((a, b) => (rank(b) > rank(a) ? b : a), "ok");
  let status;
  if (worst === "unavailable") status = FORMULA_STATUS.UNAVAILABLE;
  else if (worst === "pending") status = FORMULA_STATUS.PENDING;
  else if (worst === "missing" || worst === "undeclared") status = FORMULA_STATUS.NO_PHRASE;
  else if (findings.length || equalities.some((e) => e.holds === false)) status = FORMULA_STATUS.INCONSISTENT;
  else status = FORMULA_STATUS.VERIFIED;
  return { status, sides, equalities, findings };
}

// ---------------------------------------------------------------- structured inputs (the model's own references → the same tree)
// operation: { operationKey, inputs:[{ref}], expression?, result }; model: { gematria:[[phrase,value]], structuralProperties:[{key,value,provenance}], assignments:[…] }
// Refs: expression:<phrase> · quantity:<key> · assignment:<target>.<field> · literal:<int> (a value with NO expression: it can never be verified).
export function resolveOperationInputs(operation, model = {}, registry = NUMERIC_OPERATION_REGISTRY) {
  const key = operation?.operationKey;
  const row = registry.get(key);
  if (!row) return unsupported("unknown_operation", `מפתח פעולה לא רשום: ${String(key)}`);
  if (!Array.isArray(operation.inputs) || !operation.inputs.length) return unsupported("no_inputs", "לפעולה אין אופרנדים מוצהרים");
  const operands = [];
  for (const input of operation.inputs) {
    const ref = String(input?.ref || "");
    const [kind, ...rest] = ref.split(":");
    const body = rest.join(":");
    if (kind === "expression") {
      const entry = (model.gematria || []).find((item) => Array.isArray(item) && item[0] === body);
      operands.push({ kind: "expression", text: body, ...(entry ? { declaredValue: Number(entry[1]) } : {}) });
    } else if (kind === "quantity") {
      const matches = (model.structuralProperties || []).filter((item) => item?.key === body);
      if (matches.length !== 1) return unsupported("unresolved_input", `כמות לא ניתנת לשיוך חד־משמעי: ${body}`);
      const p = matches[0];
      operands.push({ kind: "quantity", key: p.key, value: p.value, provenance: p.provenance || null, role: /geometry/i.test(p.provenance || "") ? SEMANTIC_ROLE.GEOMETRY : SEMANTIC_ROLE.QUANTITY });
    } else if (kind === "assignment") {
      const [target, field] = body.split(".");
      const found = (model.assignments || []).find((item) => item?.target === target);
      const value = found?.[field];
      if (!Number.isInteger(value)) return unsupported("unresolved_input", `שיוך חסר: ${body}`);
      operands.push({ kind: "quantity", key: body, value, provenance: "מקור המודל (assignment)", role: SEMANTIC_ROLE.QUANTITY });
    } else if (kind === "literal") {
      const n = Number(body);
      if (!Number.isSafeInteger(n)) return unsupported("unresolved_input", `ערך לא תקין: ${body}`);
      operands.push({ kind: "number", value: BigInt(n), text: String(n), declaredOnly: true });
    } else return unsupported("unknown_input_ref", `סוג הפניה לא מוכר: ${ref}`);
  }
  const node = key === "times_ten_sefirot"
    ? { kind: "op", key, operands: [...operands, { kind: "quantity", key: "ten_sefirot", value: row.fixed_operand, provenance: "עשר ספירות (קבוע של החוק)", role: SEMANTIC_ROLE.QUANTITY }] }
    : { kind: "op", key, operands };
  if (operands.length < row.arity.min || operands.length > row.arity.max) return unsupported("arity", `מספר אופרנדים לא תקין עבור ${row.display_label}`);
  return { ok: true, formula: { kind: "formula", sides: [node, ...(Number.isFinite(operation.result) ? [{ kind: "number", value: BigInt(operation.result), text: String(operation.result), role: SEMANTIC_ROLE.RESULT }] : [])] } };
}

// ---------------------------------------------------------------- token projection (what every UI / 3D / Raziel consumer renders from)
export function formulaTokens(formula, evaluation = null, { registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  const tokens = [];
  const lastSide = formula.sides.length - 1;
  const emit = (node, sideIndex) => {
    switch (node.kind) {
      case "number": tokens.push({ role: node.role === SEMANTIC_ROLE.RESULT || (sideIndex === lastSide && formula.sides.length > 1) ? SEMANTIC_ROLE.RESULT : SEMANTIC_ROLE.VALUE, text: node.value < 0n ? `${registry.symbol("subtract")}${-node.value}` : String(node.value), value: Number(node.value), declaredOnly: Boolean(node.declaredOnly) }); break;
      case "quantity": tokens.push({ role: node.role || SEMANTIC_ROLE.QUANTITY, text: String(node.value), value: Number(node.value), origin: node.provenance || null, key: node.key || null, a11y: node.role === SEMANTIC_ROLE.GEOMETRY ? "כמות מהגיאומטריה" : "כמות" }); break;
      case "expression": {
        const leaf = evaluation?.sides?.flatMap((s) => s.leaves).find((l) => l.role === SEMANTIC_ROLE.EXPRESSION && l.text === node.text);
        tokens.push({ role: SEMANTIC_ROLE.EXPRESSION, text: node.text, value: leaf?.value ?? null, declaredValue: node.declaredValue ?? null, state: leaf?.state || null });
        break;
      }
      case "group": tokens.push({ role: "group", text: "(" }); emit(node.operand, sideIndex); tokens.push({ role: "group", text: ")" }); break;
      case "neg": tokens.push({ role: SEMANTIC_ROLE.OPERATOR, text: registry.symbol("subtract"), key: "subtract", a11y: "סימן שלילי", unary: true }); emit(node.operand, sideIndex); break;
      case "op":
        node.operands.forEach((operand, i) => {
          if (i) tokens.push({ role: SEMANTIC_ROLE.OPERATOR, text: registry.symbol(node.key), key: node.key, a11y: registry.symbolLabel(node.key) });
          const needsGroup = operand.kind === "op" && operand.key !== node.key && ["add", "subtract"].includes(operand.key) && ["multiply", "divide"].includes(registry.base(node.key)?.operation_key || node.key);
          if (needsGroup) { tokens.push({ role: "group", text: "(" }); emit(operand, sideIndex); tokens.push({ role: "group", text: ")" }); } else emit(operand, sideIndex);
        });
        break;
      default: break;
    }
  };
  formula.sides.forEach((side, i) => {
    if (i) {
      const eq = evaluation?.equalities?.[i - 1];
      tokens.push({ role: "relation", text: RELATION_SYMBOL, kind: eq?.kind || (formula.sides[i - 1].kind === "expression" || side.kind === "expression" ? "value_equality" : "arithmetic_equality"), a11y: "יחס שוויון" });
    }
    emit(side, i);
  });
  return tokens;
}

export const tokensToText = (tokens) => tokens.map((t) => t.text).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
export const formulaToText = (formula, options) => tokensToText(formulaTokens(formula, null, options));

// One call for the common consumer: a text formula → parsed + evaluated + tokens, or the unsupported verdict.
export function analyzeFormulaText(text, context = {}) {
  const parsed = parseFormulaText(text, context.registry);
  if (!parsed.ok) return { status: FORMULA_STATUS.UNSUPPORTED, code: parsed.code, reason: parsed.reason, tokens: [], formula: null, evaluation: null };
  const evaluation = evaluateFormula(parsed.formula, context);
  return { status: evaluation.status, code: evaluation.code || null, reason: evaluation.reason || null, formula: parsed.formula, evaluation, tokens: evaluation.status === FORMULA_STATUS.UNSUPPORTED ? [] : formulaTokens(parsed.formula, evaluation, context) };
}

export function analyzeOperationSpec(operation, model, context = {}) {
  const resolved = resolveOperationInputs(operation, model, context.registry);
  if (!resolved.ok) return { status: FORMULA_STATUS.UNSUPPORTED, code: resolved.code, reason: resolved.reason, tokens: [], formula: null, evaluation: null };
  const evaluation = evaluateFormula(resolved.formula, context);
  return { status: evaluation.status, code: evaluation.code || null, reason: evaluation.reason || null, formula: resolved.formula, evaluation, tokens: evaluation.status === FORMULA_STATUS.UNSUPPORTED ? [] : formulaTokens(resolved.formula, evaluation, context) };
}
