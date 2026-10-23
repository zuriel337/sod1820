#!/usr/bin/env node
// Measurement only — NOT an extractor change. It answers: "if the Shared Expression Extraction applied these GENERAL
// boundary rules, how many extraction_unresolved rows would the canonical engine then reproduce?"
// Every rule is structural (tokens, separators, parentheses) and every acceptance is decided by the canonical engine.
// No phrase list is used. Input: post_qa_review_bundle.json produced by scripts/post-knowledge-staging.mjs.
//   node audits/posts_attested_staging_20261023/boundary_rules_probe.mjs <post_qa_review_bundle.json>

import { readFileSync } from "node:fs";
import { METHODS, DEPTH_METHODS, methodLabel } from "../../src/lib/gematria.js";
import { boundaryFlags } from "../../scripts/post-knowledge-staging.mjs";

const ENGINE = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map((m) => [m.key, m.fn]));
const ALIAS = Object.fromEntries([...METHODS, ...DEPTH_METHODS].flatMap((m) => [[m.key, m.key], [methodLabel(m.key), m.key]]));
const norm = (s) => String(s || "").replace(/["׳״'`’‘“”()\[\]{}«»*#]/gu, "").replace(/\s+/gu, " ").trim();
const verifies = (phrase, value, method = "רגיל") => phrase.replace(/ /g, "").length >= 3 && ENGINE[method]?.(phrase) === value;

// R1 — left-shrink: drop up to 3 leading tokens; accept only when exactly ONE shrunk span reproduces the stated value
// AND the shrunk span itself starts/ends cleanly (no function word at the edge, no detached single letter).
function shrinkLeft(phrase, value, method) {
  const tokens = phrase.split(" ");
  const hits = [];
  for (let drop = 1; drop <= Math.min(3, tokens.length - 1); drop += 1) {
    const span = tokens.slice(drop).join(" ");
    const flags = boundaryFlags(span);
    if (verifies(span, value, method) && !flags.includes("function_word_at_edge") && !flags.includes("detached_single_letter_token")) hits.push(span);
  }
  return hits.length === 1 ? hits[0] : null;
}
// R2 — list separators: "A / B = N", "A · B = N" → each item must reproduce N on its own.
function splitItems(phrase, value, method) {
  const items = phrase.split(/\s*[\/·|,،;]\s*/u).map(norm).filter(Boolean);
  return items.length >= 2 && items.every((item) => verifies(item, value, method)) ? items : null;
}
// R3 — parenthetical method right after the value: "(מסתתר)", "(רגיל ומילוי)" → bind the named method(s); "ו" = sum.
function bindParentheticalMethod(row) {
  const text = row.claim_text || "";
  const at = text.indexOf(String(row.declared_value));
  if (at < 0) return null;
  const match = /^\s*\(([^)]{2,40})\)/u.exec(text.slice(at + String(row.declared_value).length));
  if (!match) return null;
  const names = match[1].split(/\s*ו\s*|\s*,\s*/u).map((n) => ALIAS[norm(n).replace(/^ה/u, "")]).filter(Boolean);
  if (!names.length || names.length !== match[1].split(/\s*ו\s*|\s*,\s*/u).length) return null;
  const phrase = row.extracted_phrase;
  if (names.length === 1) return verifies(phrase, row.declared_value, names[0]) ? { methods: names } : null;
  return names.reduce((s, n) => s + ENGINE[n](phrase), 0) === row.declared_value ? { methods: names, composite: "sum" } : null;
}
// R4 — arithmetic lines ("a × b = c", "a + b = c"): not a phrase claim; check the arithmetic itself. A line with more than two operands
// (e.g. 40+6+30+300 = 376, which is correct) is mis-parsed by this two-operand probe: such rows are counted as parse mismatches, never as errors.
function arithmetic(row) {
  const m = /(\d+)\s*([×x*+])\s*(\d+)\s*=\s*(\d+)/u.exec(row.claim_text || "");
  if (!m) return null;
  const [, a, op, b, c] = m;
  return (op === "+" ? Number(a) + Number(b) : Number(a) * Number(b)) === Number(c) ? { arithmetic: true } : { arithmetic: false };
}
// R5 — alternative-method recovery is NOT applied (the post did not state it); it is only counted for the reviewer.

const file = process.argv[2];
if (!file) { console.error("usage: boundary_rules_probe.mjs <post_qa_review_bundle.json>"); process.exit(2); }
const rows = JSON.parse(readFileSync(file, "utf8")).rows.filter((r) => r.extraction_status === "extraction_unresolved");
const tally = { unresolved: rows.length, shrink_left: 0, list_separator: 0, parenthetical_method: 0, arithmetic_verified: 0, arithmetic_two_operand_parse_mismatch_NOT_errors: 0, alt_method_only_not_applied: 0, still_unresolved: 0 };
const examples = { shrink_left: [], list_separator: [], parenthetical_method: [], arithmetic_two_operand_parse_mismatch_NOT_errors: [] };
for (const row of rows) {
  const method = ALIAS[row.declared_method] || "רגיל";
  const value = row.declared_value;
  let hit = null;
  if (value != null && row.extracted_phrase) {
    const items = splitItems(row.extracted_phrase, value, method);
    const shrunk = shrinkLeft(row.extracted_phrase, value, method);
    const bound = bindParentheticalMethod(row);
    if (items) { tally.list_separator += 1; hit = "list_separator"; examples.list_separator.push(items.join(" | ")); }
    else if (bound) { tally.parenthetical_method += 1; hit = "parenthetical_method"; examples.parenthetical_method.push(`${row.extracted_phrase} (${bound.methods.join("+")})=${value}`); }
    else if (shrunk) { tally.shrink_left += 1; hit = "shrink_left"; examples.shrink_left.push(`${row.extracted_phrase} → ${shrunk}`); }
  }
  if (!hit) {
    const arith = arithmetic(row);
    if (arith?.arithmetic === true) tally.arithmetic_verified += 1;
    else if (arith?.arithmetic === false) { tally.arithmetic_two_operand_parse_mismatch_NOT_errors += 1; examples.arithmetic_two_operand_parse_mismatch_NOT_errors.push((row.claim_text || "").slice(0, 80)); }
    else if (row.alternative_engine_matches?.length) tally.alt_method_only_not_applied += 1;
    else tally.still_unresolved += 1;
  }
}
tally.resolved_by_general_rules = tally.shrink_left + tally.list_separator + tally.parenthetical_method + tally.arithmetic_verified;
console.log(JSON.stringify({ rules: ["R1 left-shrink (unique)", "R2 list separators", "R3 parenthetical method binding", "R4 arithmetic lines"], tally, examples: Object.fromEntries(Object.entries(examples).map(([k, v]) => [k, v.slice(0, 8)])) }, null, 1));
