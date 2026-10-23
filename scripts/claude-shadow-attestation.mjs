// scripts/claude-shadow-attestation.mjs — CLAUDE_SHADOW_RESEARCH_V1, Audit Closure (pure, no I/O).
//
// Two facts that were conflated in the first report are kept apart here:
//   engine_recomputed  the canonical engine returns the stated value for the captured span          (a calculation)
//   source_attested    the POST itself asserts "this expression = this value", in the line it came from (a claim)
// Neither implies the other, and neither implies an author's interpretation.
//
// This is a CLASSIFICATION layer over rows the shared extractor already produced. It does not change triage.js /
// analysisFlow.js (ONE SYSTEM LAW), the staging script or any statistic. The rules are structural — tokens, separators,
// operators, delimiters — and contain no phrase list and no per-row exception.
//
//   R1  locate     the claim line is found after removing spelling punctuation that is not part of the letters
//                  (a hyphen/maqaf/quote INSIDE a word, e.g. א-להים; a spaced dash between words)
//   R2  link       the span and the value must be members of one equation chain on that line: the line is cut at "="
//                  (or "שווה"); the span is a member (whole, or the tail/head next to the operator), the value is the
//                  number at the head/tail of another member, and no sentence terminator separates them
//   R3  best line  every line of the post is considered; the first line satisfying R2 wins (the earliest line that merely
//                  contains both the span and the number does not)
//   R4  edge flag  `function_word_at_edge` is waived only when the span is a WHOLE equation member on that edge
//                  (nothing else of the clause is cut off); every other boundary flag still blocks attestation

import { METHODS, DEPTH_METHODS, methodLabel } from "../src/lib/gematria.js";

export const ATTESTATION_VERSION = "claude-shadow-attestation-v1";

const EMOJI = /[\u{1F000}-\u{1FAFF}☀-➿️‍‎‏]/gu;
const TERMINATOR = /[.!?…;]/u;
const methodWords = new Set([...METHODS, ...DEPTH_METHODS].flatMap((m) => [m.key, methodLabel(m.key)]).map((n) => String(n).replace(/[\s"'׳״]/g, "")));

// R1 — spelling punctuation is not part of the letters
export function normLoc(text) {
  return String(text || "")
    .replace(/[֑-ׇ]/gu, "")                                   // niqqud, cantillation, maqaf
    .replace(EMOJI, " ")
    .replace(/(?<=[א-ת])["'׳״’‘“”`-](?=[א-ת])/gu, "")        // inside a word: א-להים, יודי"ן
    .replace(/\s+[–—-]\s+/gu, " ")                            // spaced dash between words
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")                   // 1,100 → 1100
    .replace(/[ \s]+/gu, " ")
    .trim();
}
const strip = (s) => s.replace(/^[\s"'׳״«»“”()\[\]{}*#:,\-–—]+|[\s"'׳״«»“”()\[\]{}*#:,\-–—]+$/gu, "");
const isMethodToken = (t) => methodWords.has(t.replace(/^ב/u, "")) || methodWords.has(t);
function dropTrailingMethod(s) {
  const tokens = strip(s).split(" ");
  while (tokens.length > 1 && isMethodToken(strip(tokens.at(-1)))) tokens.pop();
  return tokens.join(" ");
}
function dropLeadingNumberParen(s) {
  return strip(s.replace(/^\s*\(\s*\d+\s*\)\s*/u, ""));
}

const numberAt = (segment, value) => {
  const v = String(value);
  const t = strip(segment);
  const startsAt = new RegExp(`^(?<![\\d])${v}(?![\\d])`, "u");
  const endsAt = new RegExp(`(?<![\\d])${v}$`, "u");
  return { head: startsAt.test(t), tail: endsAt.test(t) };
};

// → {attested, line, role, waived[], reason}
export function attestRow(text, row) {
  const phrase = normLoc(row.extracted_phrase);
  const value = row.computed_value ?? row.declared_value;
  if (!phrase || value == null) return { attested: false, reason: "no_phrase_or_value" };
  const lines = String(text || "").split("\n");
  let seenPhrase = false; let seenBoth = false;
  for (let li = 0; li < lines.length; li += 1) {
    const line = normLoc(lines[li]);
    if (!line.includes(phrase)) continue;
    seenPhrase = true;
    if (!new RegExp(`(?<![\\d])${value}(?![\\d])`).test(line)) continue;
    seenBoth = true;
    const segments = line.split(/\s*=\s*|\s+שווה(?:\s+ל)?\s+/u);
    for (let i = 0; i < segments.length; i += 1) {
      const seg = dropLeadingNumberParen(segments[i]);
      for (let j = 0; j < segments.length; j += 1) {
        if (i === j) continue;
        const forward = i < j; // span before the value
        const spanSeg = forward ? dropTrailingMethod(seg) : seg;
        const whole = strip(spanSeg) === phrase;
        const edge = forward
          ? strip(spanSeg).endsWith(phrase)
          : strip(spanSeg).startsWith(phrase);
        if (!edge) continue;
        const { head, tail } = numberAt(segments[j], value);
        if (forward ? !head : !tail) continue;
        const between = segments.slice(forward ? i + 1 : j + 1, forward ? j : i);
        if (between.some((s) => TERMINATOR.test(s))) continue;
        // the span must not be separated from the operator by a sentence terminator inside its own member
        const afterPhrase = forward ? strip(spanSeg).slice(strip(spanSeg).lastIndexOf(phrase) + phrase.length) : "";
        const beforePhrase = !forward ? strip(spanSeg).slice(0, strip(spanSeg).indexOf(phrase)) : "";
        if (TERMINATOR.test(afterPhrase) || TERMINATOR.test(beforePhrase)) continue;
        return { attested: true, line: li + 1, role: whole ? "whole_member" : forward ? "tail_member" : "head_member", operator_members: segments.length };
      }
    }
  }
  return { attested: false, reason: !seenPhrase ? "span_not_located_in_post" : !seenBoth ? "span_and_value_never_on_one_line" : "no_equation_link_between_span_and_value" };
}

// Row-level verdict: engine_recomputed is a property of the row, source_attested needs R2 and surviving boundary flags.
export function classifyRow(text, row, { holds = new Map() } = {}) {
  const engine = row.extraction_status === "engine_verified";
  const hold = holds.get(row.row_id);
  const link = engine ? attestRow(text, row) : { attested: false, reason: "engine_did_not_reproduce" };
  const flags = row.boundary_flags || [];
  const blocking = [];
  for (const flag of flags) {
    if (flag === "function_word_at_edge" && link.attested && link.role === "whole_member") continue; // R4 waiver
    blocking.push(flag);
  }
  const waived = flags.filter((f) => !blocking.includes(f));
  const attested = engine && link.attested && blocking.length === 0 && !hold;
  return {
    row_id: row.row_id, post_id: row.post_id,
    engine_recomputed: engine,
    source_attested: attested,
    attestation_status: attested ? "source_attested" : hold ? "held_by_human_gate" : "review_required",
    reasons: attested ? [] : [...(hold ? [`human_gate_hold:${hold.decision}`] : []), ...(link.attested ? [] : [link.reason]), ...blocking.map((f) => `boundary:${f}`)],
    waived_flags: waived, link: link.attested ? { line: link.line, role: link.role } : null,
    rule_only_source_attested: engine && link.attested && blocking.length === 0, // what the rules alone say, ignoring the hold
  };
}

// Relation-level: attested iff at least one supporting row is.
export function classifyRelation(rowVerdicts) {
  const attestedBy = rowVerdicts.filter((v) => v.source_attested);
  const ruleOnly = rowVerdicts.filter((v) => v.rule_only_source_attested);
  const held = rowVerdicts.some((v) => v.attestation_status === "held_by_human_gate");
  return {
    engine_recomputed: rowVerdicts.some((v) => v.engine_recomputed),
    source_attested: attestedBy.length > 0,
    attestation_status: attestedBy.length ? "source_attested" : held ? "held_by_human_gate" : "review_required",
    attested_in_posts: [...new Set(attestedBy.map((v) => v.post_id))],
    supporting_rows: rowVerdicts.length,
    rule_only_source_attested: ruleOnly.length > 0,
    reasons: attestedBy.length ? [] : [...new Set(rowVerdicts.flatMap((v) => v.reasons))],
  };
}
