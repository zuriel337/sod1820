import { METHODS } from "../gematria.js";
import { extractCompoundClaims } from "../triage.js";

const clean = (value) => value == null ? "" : String(value).trim();
const finite = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const REGULAR_METHOD = METHODS.find((method) => method.key === "רגיל");

if (!REGULAR_METHOD?.fn) throw new Error("World legacy replay requires the canonical regular gematria method");

function sourceLocatorState(sourceRef) {
  const match = clean(sourceRef).match(/^channel_updates:([0-9a-f-]+)(?:#|$)/iu);
  return match?.[1] && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(match[1])
    ? "channel_uuid"
    : "stored_ref_requires_resolution";
}

const ARITHMETIC_PHRASE_RE = /^([א-ת\u05F3\u05F4'"־\-\s]{1,80})\((\d{1,9})\)$/u;
const ARITHMETIC_NUMBER_RE = /^\d{1,9}$/u;

function freezeOperandCheck(check) {
  return Object.freeze(check);
}

function arithmeticOperand(token) {
  const value = clean(token);
  if (ARITHMETIC_NUMBER_RE.test(value)) {
    const number = Number(value);
    return freezeOperandCheck({ kind: "number", expression: value, claimed: number, replayComputed: number, matches: true });
  }
  const match = value.match(ARITHMETIC_PHRASE_RE);
  if (!match) return null;
  const phrase = clean(match[1]);
  const claimed = Number(match[2]);
  const replayComputed = REGULAR_METHOD.fn(phrase);
  return freezeOperandCheck({
    kind: "regular_gematria",
    expression: phrase,
    claimed,
    replayComputed,
    matches: replayComputed === claimed,
  });
}

// Historical arithmetic envelopes were produced from a small addition extractor. Replay remains
// deliberately narrower than the general research parser: exactly one equality, addition only,
// numeric literals or Hebrew regular-gematria operands with an explicit parenthesized value.
// Anything else fails closed into the manager review queue; this function never uses eval.
export function replayWorldArithmeticExpression(value, storedOk = null) {
  const expression = clean(value);
  const equality = expression.split("=");
  if (equality.length !== 2 || !ARITHMETIC_NUMBER_RE.test(clean(equality[1]))) {
    return Object.freeze({ state: "arithmetic_unsupported", expression: expression || null });
  }
  const operandTokens = equality[0].split("+").map(clean);
  if (operandTokens.length < 2 || operandTokens.some((token) => !token)) {
    return Object.freeze({ state: "arithmetic_unsupported", expression });
  }
  const operandChecks = operandTokens.map(arithmeticOperand);
  if (operandChecks.some((operand) => !operand)) {
    return Object.freeze({ state: "arithmetic_unsupported", expression });
  }
  const claimed = Number(clean(equality[1]));
  const replayComputed = operandChecks.reduce((sum, operand) => sum + operand.replayComputed, 0);
  const matches = replayComputed === claimed && operandChecks.every((operand) => operand.matches);
  const envelopeMatches = typeof storedOk !== "boolean" || storedOk === matches;
  return Object.freeze({
    state: envelopeMatches ? (matches ? "arithmetic_match" : "arithmetic_mismatch") : "arithmetic_envelope_mismatch",
    expression,
    claimed,
    replayComputed,
    operandChecks: Object.freeze(operandChecks),
    operandCount: operandChecks.length,
    storedOk: typeof storedOk === "boolean" ? storedOk : null,
  });
}

function operandSignature(value) {
  const operand = asObject(value);
  if (!Object.keys(operand).length) return null;
  return {
    phrase: clean(operand.phrase) || null,
    value: finite(operand.value),
    method: clean(operand.method) || null,
    ok: operand.ok === true,
  };
}

function numberList(value) {
  if (!Array.isArray(value)) return null;
  const numbers = value.map(finite);
  return numbers.some((number) => number == null) ? null : numbers;
}

function compoundSignature(value) {
  const compound = asObject(value);
  const operands = Array.isArray(compound.operands)
    ? compound.operands.map(operandSignature)
    : (Object.keys(asObject(compound.operand)).length ? [operandSignature(compound.operand)] : []);
  return JSON.stringify({
    kind: clean(compound.kind) || null,
    status: clean(compound.status) || null,
    result: finite(compound.result),
    computedTotal: finite(compound.computedTotal),
    sum: finite(compound.sum),
    quantity: finite(compound.quantity),
    a: finite(compound.a),
    b: finite(compound.b),
    linkCount: finite(compound.linkCount),
    linkValues: numberList(compound.linkValues),
    numbers: numberList(compound.numbers),
    operands,
  });
}

// Reuses the canonical compound extractor/evaluator from triage.js. Matching is exact by stored
// text and kind; there is no fuzzy fallback to a different claim from the same source.
export function replayWorldCompoundEnvelope(value) {
  const stored = asObject(value);
  const expression = clean(stored.text || stored.raw);
  const kind = clean(stored.kind);
  if (!expression || !kind) {
    return Object.freeze({ state: "compound_unsupported", expression: expression || null, compoundKind: kind || null });
  }
  const matches = extractCompoundClaims(expression)
    .filter((claim) => clean(claim?.kind) === kind && clean(claim?.text) === expression);
  if (matches.length !== 1) {
    return Object.freeze({ state: "compound_unsupported", expression, compoundKind: kind });
  }
  const replayed = matches[0];
  const storedStatus = clean(stored.status) || null;
  const replayStatus = clean(replayed.status) || null;
  const envelopeMatches = compoundSignature(stored) === compoundSignature(replayed);
  let state;
  if (replayStatus === "METHOD_UNRESOLVED") state = "compound_method_unresolved";
  else if (replayStatus === "ENGINE_MISMATCH") state = "compound_mismatch";
  else if (replayStatus !== "ENGINE_VERIFIED_COMPOSITE") state = "compound_unsupported";
  else state = envelopeMatches ? "compound_match" : "compound_envelope_mismatch";
  const operands = Array.isArray(replayed.operands)
    ? replayed.operands
    : (Object.keys(asObject(replayed.operand)).length ? [replayed.operand] : []);
  return Object.freeze({
    state,
    expression,
    compoundKind: kind,
    claimed: finite(replayed.result),
    replayComputed: finite(replayed.computedTotal) ?? finite(replayed.sum) ?? finite(replayed.result),
    storedStatus,
    replayStatus,
    envelopeMatches,
    operandCount: operands.length,
    operandChecks: Object.freeze(operands.map((operand) => freezeOperandCheck({
      kind: "gematria",
      expression: clean(operand?.phrase) || null,
      claimed: finite(operand?.value),
      replayComputed: finite(operand?.value),
      method: clean(operand?.method) || null,
      matches: operand?.ok === true,
    }))),
  });
}

export function projectWorldLegacyReplayOccurrence(row) {
  const detail = asObject(row?.engine_detail);
  if (row?.engine_verified !== true || clean(detail.verification_state)) return null;

  const verification = asObject(detail.verification);
  const method = clean(verification.method);
  const expression = clean(verification.phrase || verification.text);
  const sourceRef = clean(row?.source_ref) || null;

  if (method === "רגיל") {
    const claimed = finite(verification.claimed);
    const storedComputed = finite(verification.computed);
    if (!expression || claimed == null || storedComputed == null) {
      return Object.freeze({
        id: clean(row?.id), state: "incomplete_regular_envelope", method, expression: expression || null,
        claimed, storedComputed, replayComputed: null, sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
      });
    }
    const replayComputed = REGULAR_METHOD.fn(expression);
    const matches = replayComputed === claimed && replayComputed === storedComputed;
    const mixedInput = /[A-Za-z0-9]/u.test(expression);
    return Object.freeze({
      id: clean(row?.id),
      state: matches ? (mixedInput ? "mixed_input_match" : "deterministic_match") : "deterministic_mismatch",
      method,
      expression,
      claimed,
      storedComputed,
      replayComputed,
      sourceRef,
      sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

  if (clean(verification.kind) === "arithmetic") {
    const replay = replayWorldArithmeticExpression(expression, verification.ok);
    return Object.freeze({
      id: clean(row?.id), method: "arithmetic_addition",
      claimed: null, storedComputed: null, replayComputed: null,
      ...replay,
      sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

  const compound = asObject(detail.compound);
  if (Object.keys(compound).length) {
    const replay = replayWorldCompoundEnvelope(compound);
    return Object.freeze({
      id: clean(row?.id), method: replay.compoundKind ? `compound:${replay.compoundKind}` : "compound",
      claimed: null, storedComputed: null, replayComputed: null,
      ...replay,
      sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

  return Object.freeze({
    id: clean(row?.id), state: "missing_replay_envelope", method: null, expression: null,
    claimed: null, storedComputed: null, replayComputed: null,
    sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
  });
}

export function buildWorldLegacyReplayIndex(rows = []) {
  const index = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const replay = projectWorldLegacyReplayOccurrence(row);
    if (replay?.id) index.set(replay.id, replay);
  }
  return index;
}

function sourceId(value) {
  return clean(value).replace(/^research:/u, "");
}

export function attachWorldLegacyReplay(row, replayIndex) {
  if (!row || row.verification !== "legacy_signal" || !(replayIndex instanceof Map)) return row;
  const ids = Array.isArray(row.occurrences) && row.occurrences.length
    ? row.occurrences.map((occurrence) => sourceId(occurrence.sourceId || occurrence.id))
    : [sourceId(row.sourceId || row.id)];
  const occurrences = ids.map((id) => replayIndex.get(id)).filter(Boolean);
  if (!occurrences.length) return row;
  const stateCounts = {};
  for (const occurrence of occurrences) stateCounts[occurrence.state] = (stateCounts[occurrence.state] || 0) + 1;
  const states = Object.keys(stateCounts);
  const state = states.length === 1 ? states[0] : "mixed_replay_states";
  const representative = occurrences.find((item) => item.id === sourceId(row.sourceId)) || occurrences[0];
  return {
    ...row,
    legacyReplay: Object.freeze({
      ...representative,
      state,
      stateCounts: Object.freeze(stateCounts),
      occurrenceCount: occurrences.length,
      mutatesLiveData: false,
    }),
  };
}
