import { DEPTH_METHODS, METHODS } from "../gematria.js";
import { extractCompoundClaims } from "../triage.js";

const clean = (value) => value == null ? "" : String(value).trim();
const finite = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const REGULAR_METHOD = METHODS.find((method) => method.key === "רגיל");
const METHOD_BY_KEY = new Map([...METHODS, ...DEPTH_METHODS].map((method) => [method.key, method]));
const LEGACY_MATRIX_METHODS = Object.freeze({
  "רגיל": "רגיל",
  "מילוי": "מילוי",
  "מסתתר": "מסתתר",
  "קדמי": "קדמי",
  "ריבוע": "ריבוע",
  "גדול": "גדול",
  "סידורי": "סידורי",
  "אתבש": "אתבש",
  "אלבם": "אלבם",
  "אותיות_אחרי": "אותיות אחרי",
  "אותיות_לפני": "אותיות לפני",
  "הכפלה": "הכפלה",
  "קדמי_גדול": "משולש גדול",
  "מילוי_דמילוי": "מילוי דמילוי",
  "הכפלה_גדול": "הכפלה גדולה",
  "ריבוע_גדול": "ריבוע גדול",
});
const REVIEW_READY_STATES = new Set([
  "deterministic_match",
  "arithmetic_match",
  "compound_match",
  "explicit_match",
  "legacy_matrix_match",
]);

if (!REGULAR_METHOD?.fn) throw new Error("World legacy replay requires the canonical regular gematria method");

function sourceLocatorState(sourceRef) {
  const match = clean(sourceRef).match(/^channel_updates:([0-9a-f-]+)(?:#|$)/iu);
  return match?.[1] && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(match[1])
    ? "channel_uuid"
    : "stored_ref_requires_resolution";
}

export function classifyWorldMissingEngineStatement(value) {
  const statement = clean(value);
  const signals = Object.freeze({
    spatialOrConstants: /(מרחב|מרחבי|תלת.?ממד|קובי|קוביה|קובייה|פירמיד|פאון|ציר|גאומטר|גיאומטר|מעגל|עיגול|כדור|π|פאי)/iu.test(statement),
    elsOrCipher: /(צופן|דילוג|אותיות בדילוג|\bELS\b)/iu.test(statement),
    language: /(אנגלית|לטינית|ערבית|שפה|תרגום|תעתיק)/u.test(statement),
    formula: /[=+×*÷]/u.test(statement),
    number: /[0-9]/u.test(statement),
  });
  let queue = "textual_statement";
  if (signals.spatialOrConstants) queue = "spatial_or_constants";
  else if (signals.elsOrCipher) queue = "els_or_cipher";
  else if (signals.language) queue = "language";
  else if (signals.formula) queue = "formula";
  else if (signals.number) queue = "numeric_statement";
  const reasons = {
    spatial_or_constants: "הטקסט כולל מונח מרחבי או קבוע; להעביר למיון מבנים לפני בחירת מנוע.",
    els_or_cipher: "הטקסט כולל סימן מפורש לצופן או דילוג; להעביר לתור ELS בלי להסיק אימות.",
    language: "הטקסט כולל סימן שפה או תעתיק; להעביר לגשרי שפה ומקור.",
    formula: "הטקסט כולל אופרטור חישובי; נדרשת מעטפת ביטוי ושיטה לפני replay.",
    numeric_statement: "הטקסט כולל מספר אך לא אופרטור מפורש; למיין טענה מספרית מול אזכור בלבד.",
    textual_statement: "לא נמצא סימן חישובי מפורש; לבדוק מקור, נושא וסוג ידע לפני הפעלת מנוע.",
  };
  return Object.freeze({ queue, reason: reasons[queue], signals });
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

// Old Zvi intake rows store a phrase -> method matrix rather than a claim envelope. The matrix is
// a deterministic computation cache, not proof that the surrounding source claim matched it.
// Replay every known numeric method and preserve engine_verified as a separate claim-level axis.
export function replayWorldLegacyMethodMatrix(value, engineVerified = null) {
  const detail = asObject(value);
  const phraseEntries = Object.entries(detail).filter(([, methods]) => Object.keys(asObject(methods)).length);
  if (!phraseEntries.length) {
    if (clean(detail.method) && finite(detail.computed) != null) {
      return Object.freeze({ state: "legacy_incomplete_method_envelope", phraseCount: 0, checkedMethodCount: 0, mismatchCount: 0 });
    }
    if (clean(detail.saved_from || detail.channel)) {
      return Object.freeze({ state: "legacy_source_metadata_only", phraseCount: 0, checkedMethodCount: 0, mismatchCount: 0 });
    }
    return Object.freeze({ state: "legacy_matrix_unsupported", phraseCount: 0, checkedMethodCount: 0, mismatchCount: 0 });
  }

  let checkedMethodCount = 0;
  let unsupportedPhraseCount = 0;
  let mismatchCount = 0;
  const mismatches = [];
  for (const [phrase, rawMethods] of phraseEntries) {
    const methods = asObject(rawMethods);
    let checkedForPhrase = 0;
    for (const [storedKey, methodKey] of Object.entries(LEGACY_MATRIX_METHODS)) {
      const claimed = finite(methods[storedKey]);
      if (claimed == null) continue;
      const method = METHOD_BY_KEY.get(methodKey);
      if (!method?.fn) continue;
      const replayComputed = method.fn(phrase);
      checkedMethodCount += 1;
      checkedForPhrase += 1;
      if (replayComputed !== claimed) {
        mismatchCount += 1;
        if (mismatches.length < 8) mismatches.push(Object.freeze({ phrase, storedKey, method: methodKey, claimed, replayComputed }));
      }
    }
    if (!checkedForPhrase) unsupportedPhraseCount += 1;
  }

  let state;
  if (!checkedMethodCount) state = "legacy_matrix_unsupported";
  else if (mismatchCount) state = "legacy_matrix_mismatch";
  else if (unsupportedPhraseCount) state = "legacy_matrix_partial";
  else state = engineVerified === true ? "legacy_matrix_match" : "legacy_matrix_claim_unmatched";
  return Object.freeze({
    state,
    phraseCount: phraseEntries.length,
    checkedMethodCount,
    mismatchCount,
    unsupportedPhraseCount,
    mismatches: Object.freeze(mismatches),
    engineVerified: engineVerified === true,
  });
}

export function projectWorldLegacyReplayOccurrence(row) {
  const detail = asObject(row?.engine_detail);
  const explicitVerificationState = clean(detail.verification_state);
  if (explicitVerificationState) {
    const isExactMatch = explicitVerificationState === "match";
    const isNumericOnlyMatch = explicitVerificationState === "match_numeric_only";
    let state;
    if (isExactMatch && row?.engine_verified === true) state = "explicit_match";
    else if (isNumericOnlyMatch && row?.engine_verified === true) state = "explicit_numeric_match";
    else if (row?.engine_verified === true) state = "explicit_state_conflict";
    else state = "explicit_review_required";
    const sourceRef = clean(row?.source_ref) || null;
    return Object.freeze({
      id: clean(row?.id),
      state,
      method: clean(detail.claimed_method || detail.method || detail.engine_method_tested) || null,
      expression: clean(detail.claimed_expression || detail.term || detail.source_claim) || null,
      claimed: finite(detail.claimed_value),
      storedComputed: finite(detail.engine_result),
      replayComputed: null,
      explicitVerificationState,
      engineVerified: row?.engine_verified === true,
      sourceRef,
      sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }
  const verification = asObject(detail.verification);
  const method = clean(verification.method);
  const expression = clean(verification.phrase || verification.text);
  const sourceRef = clean(row?.source_ref) || null;
  const compound = asObject(detail.compound);
  if (!Object.keys(detail).length && row?.engine_verified !== true) {
    const routing = classifyWorldMissingEngineStatement(row?.statement);
    return Object.freeze({
      id: clean(row?.id),
      state: row?.engine_verified === false ? "missing_engine_detail_unverified" : "missing_engine_assessment",
      method: null,
      expression: null,
      claimed: null,
      storedComputed: null,
      replayComputed: null,
      engineVerified: row?.engine_verified === true,
      sourceRef,
      sourceLocatorState: sourceLocatorState(sourceRef),
      routingQueue: routing.queue,
      routingReason: routing.reason,
      contentSignals: routing.signals,
    });
  }
  const isLegacyMatrixCandidate = Object.keys(detail).length
    && !method
    && clean(verification.kind) !== "arithmetic"
    && !Object.keys(compound).length;
  if (row?.engine_verified !== true) {
    if (!isLegacyMatrixCandidate) return null;
    const replay = replayWorldLegacyMethodMatrix(detail, false);
    return Object.freeze({
      id: clean(row?.id), method: "legacy_method_matrix",
      expression: null, claimed: null, storedComputed: null, replayComputed: null,
      ...replay,
      sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

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

  if (Object.keys(compound).length) {
    const replay = replayWorldCompoundEnvelope(compound);
    return Object.freeze({
      id: clean(row?.id), method: replay.compoundKind ? `compound:${replay.compoundKind}` : "compound",
      claimed: null, storedComputed: null, replayComputed: null,
      ...replay,
      sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

  if (Object.keys(detail).length) {
    const replay = replayWorldLegacyMethodMatrix(detail, row?.engine_verified);
    return Object.freeze({
      id: clean(row?.id), method: "legacy_method_matrix",
      expression: null, claimed: null, storedComputed: null, replayComputed: null,
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
    if (replay?.id) index.set(replay.id, Object.freeze({
      ...replay,
      targetReview: projectStructuredTargetReview(row),
    }));
  }
  return index;
}

function structuredTreeTargets(row) {
  const matches = row?.meta?.ext?.wa_channel_intake?.tree_matches;
  if (!Array.isArray(matches)) return [];
  const seen = new Set();
  const targets = [];
  for (const match of matches) {
    if (!match || typeof match !== "object" || Array.isArray(match)) continue;
    const type = clean(match.type).toLowerCase();
    const key = clean(match.key);
    if (!type || !key) continue;
    const identity = `${type}:${key}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    targets.push(Object.freeze({
      type,
      key,
      label: clean(match.label) || null,
      match: clean(match.match) || null,
    }));
  }
  return targets;
}

function projectStructuredTargetReview(row) {
  const promotedNodeId = clean(row?.promoted_node_id) || null;
  const targets = structuredTreeTargets(row);
  let state = "missing_structured_target";
  if (promotedNodeId) state = "already_connected";
  else if (targets.length === 1) state = "single_structured_target";
  else if (targets.length > 1) state = "multiple_structured_targets";
  return Object.freeze({
    state,
    promotedNodeId,
    targetCount: targets.length,
    targets: Object.freeze(targets),
  });
}

function incrementCount(counts, value) {
  const key = clean(value) || "unknown";
  counts[key] = (counts[key] || 0) + 1;
}

function decisionReason(sourceReadiness, targetReadiness, repairCount, targetCount) {
  if (sourceReadiness === "source_locator_repair") {
    return `${repairCount} הופעות דורשות תיקון locator לפני הכרעת יעד; אין להשלים מקור לפי הטקסט.`;
  }
  if (targetReadiness === "already_connected") return "קיים חיבור חי ליעד; ה־replay אינו משנה אותו.";
  if (targetReadiness === "single_structured_target") return "קיים יעד מובנה יחיד לבדיקה אנושית; זו אינה הוראת קידום אוטומטית.";
  if (targetReadiness === "multiple_structured_targets") return `${targetCount} יעדים מובנים דורשים בחירה אנושית; אין לבחור יעד לפי דירוג או ניחוש.`;
  if (targetReadiness === "mixed_target_states") return "הופעות האשכול אינן מסכימות על מצב היעד; יש לבדוק כל הופעת מקור בנפרד.";
  return "לא קיים יעד מובנה; יש למפות יעד על בסיס מקור מפורש לפני חיבור לעץ.";
}

/**
 * Separates technical replay readiness from source and tree-target decisions.
 * It is manager-only projection metadata and never writes, promotes or changes truth.
 */
export function classifyWorldLegacyReplayDecision(occurrences = []) {
  const items = Array.isArray(occurrences) ? occurrences.filter(Boolean) : [];
  if (!items.length || items.some((item) => !REVIEW_READY_STATES.has(item.state))) return null;

  const sourceLocatorStateCounts = {};
  const targetStateCounts = {};
  const targets = new Map();
  let repairCount = 0;
  for (const item of items) {
    incrementCount(sourceLocatorStateCounts, item.sourceLocatorState);
    if (item.sourceLocatorState !== "channel_uuid") repairCount += 1;
    const targetReview = item.targetReview || { state: "missing_structured_target", targets: [] };
    incrementCount(targetStateCounts, targetReview.state);
    for (const target of targetReview.targets || []) {
      const identity = `${clean(target.type)}:${clean(target.key)}`;
      if (identity !== ":" && !targets.has(identity)) targets.set(identity, target);
    }
  }

  const targetStates = Object.keys(targetStateCounts);
  const targetReadiness = targetStates.length === 1 ? targetStates[0] : "mixed_target_states";
  const sourceReadiness = repairCount ? "source_locator_repair" : "exact_source";
  const decisionState = sourceReadiness === "source_locator_repair" ? sourceReadiness : targetReadiness;
  const structuredTargets = Object.freeze([...targets.values()]);
  return Object.freeze({
    decisionState,
    sourceReadiness,
    targetReadiness,
    readyOccurrenceCount: items.length,
    sourceRepairOccurrenceCount: repairCount,
    sourceLocatorStateCounts: Object.freeze(sourceLocatorStateCounts),
    targetStateCounts: Object.freeze(targetStateCounts),
    targetCount: structuredTargets.length,
    targets: structuredTargets,
    reason: decisionReason(sourceReadiness, targetReadiness, repairCount, structuredTargets.length),
    mutatesLiveData: false,
  });
}

function sourceId(value) {
  return clean(value).replace(/^research:/u, "");
}

export function attachWorldLegacyReplay(row, replayIndex) {
  if (!row || !(replayIndex instanceof Map)) return row;
  const ids = Array.isArray(row.occurrences) && row.occurrences.length
    ? row.occurrences.map((occurrence) => sourceId(occurrence.sourceId || occurrence.id))
    : [sourceId(row.sourceId || row.id)];
  const occurrences = ids.map((id) => replayIndex.get(id)).filter(Boolean);
  if (!occurrences.length) return row;
  const hasIndependentReviewProjection = occurrences.some((occurrence) =>
    occurrence.state.startsWith("explicit_")
    || occurrence.state.startsWith("legacy_")
    || occurrence.state.startsWith("missing_engine_"));
  if (row.verification !== "legacy_signal" && !hasIndependentReviewProjection) return row;
  const stateCounts = {};
  for (const occurrence of occurrences) stateCounts[occurrence.state] = (stateCounts[occurrence.state] || 0) + 1;
  const states = Object.keys(stateCounts);
  const state = states.length === 1 ? states[0] : "mixed_replay_states";
  const representative = occurrences.find((item) => item.id === sourceId(row.sourceId)) || occurrences[0];
  const decision = classifyWorldLegacyReplayDecision(occurrences);
  return {
    ...row,
    legacyReplay: Object.freeze({
      ...representative,
      state,
      stateCounts: Object.freeze(stateCounts),
      occurrenceCount: occurrences.length,
      decision,
      mutatesLiveData: false,
    }),
  };
}
