import { METHODS } from "../gematria.js";

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
    return Object.freeze({
      id: clean(row?.id), state: "arithmetic_executor_required", method: "arithmetic",
      expression: expression || null, claimed: null, storedComputed: null, replayComputed: null,
      sourceRef, sourceLocatorState: sourceLocatorState(sourceRef),
    });
  }

  if (Object.keys(asObject(detail.compound)).length) {
    return Object.freeze({
      id: clean(row?.id), state: "compound_mapping_required", method: null, expression: null,
      claimed: null, storedComputed: null, replayComputed: null,
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
