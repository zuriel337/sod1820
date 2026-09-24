const RESULT_CONTRACTS = new Set([
  "els_search_result_v1",
  "els_regular_search_result_v1",
  "els_search_page_v1",
]);

const REPLAY_CONTRACT = "els_occurrence_replay_v1";

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function projectOccurrence(hit, corpusId, term) {
  if (!hit || typeof hit !== "object") return null;
  const skip = toInt(hit.skip);
  const dir = toInt(hit.dir);
  const start = toInt(hit.start);
  const end = toInt(hit.end);
  const positions = Array.isArray(hit.positions)
    ? hit.positions.map(toInt).filter(Number.isInteger)
    : [];
  const occurrenceId = clean(hit.occurrence_id)
    || (corpusId && term && skip != null && dir != null && start != null
      ? "els:" + corpusId + ":" + term + ":" + skip + ":" + dir + ":" + start
      : null);

  if (!occurrenceId || skip == null || ![-1, 1].includes(dir) || start == null) return null;

  return Object.freeze({
    occurrenceId,
    corpusId,
    term,
    skip,
    direction: dir === 1 ? "fwd" : "back",
    dir,
    start,
    end,
    positions,
    dependencyGroup: clean(hit.dependency_group),
    coordinateConvention: clean(hit.coordinate_convention) || "zero_based_character_index",
    spatialReady: positions.length > 0,
  });
}

function emptyProjection(status = "CONTEXT_REQUIRED") {
  return Object.freeze({
    contract: "els_2029_projection_v1",
    status,
    corpusId: null,
    term: null,
    selectionProtocol: null,
    completion: Object.freeze({
      executed: false,
      totalHits: 0,
      returnedHits: 0,
      truncated: false,
    }),
    presentation: Object.freeze({
      policy: null,
      representative: null,
      bias: null,
    }),
    occurrences: Object.freeze([]),
    selectedOccurrence: null,
    projectionOnly: true,
  });
}

export function projectEls2029Result(result, { selectedOccurrenceId = null } = {}) {
  if (!result || typeof result !== "object") return emptyProjection();

  if (result.contract === REPLAY_CONTRACT) {
    const corpusId = clean(result.corpus_id);
    const term = clean(result?.input?.normalized);
    const occurrence = result.verification_state === "MATCH"
      ? projectOccurrence(result.occurrence, corpusId, term)
      : null;
    return Object.freeze({
      contract: "els_2029_projection_v1",
      status: clean(result.status) || "UNVERIFIED",
      corpusId,
      term,
      selectionProtocol: "SOURCE_CLAIM_REPLAY",
      completion: Object.freeze({
        executed: result.verification_state === "MATCH" || result.verification_state === "MISMATCH",
        totalHits: occurrence ? 1 : 0,
        returnedHits: occurrence ? 1 : 0,
        truncated: false,
      }),
      presentation: Object.freeze({
        policy: "exact_replay_v1",
        representative: true,
        bias: null,
      }),
      occurrences: Object.freeze(occurrence ? [occurrence] : []),
      selectedOccurrence: occurrence,
      projectionOnly: true,
    });
  }

  if (!RESULT_CONTRACTS.has(result.contract)) return emptyProjection("UNSUPPORTED_CONTRACT");

  const corpusId = clean(result.corpus_id);
  const term = clean(result?.input?.normalized);
  const occurrences = Object.freeze(
    (Array.isArray(result.hits) ? result.hits : [])
      .map((hit) => projectOccurrence(hit, corpusId, term))
      .filter(Boolean)
  );
  const requestedSelectionId = clean(selectedOccurrenceId);
  const selectedOccurrence = requestedSelectionId
    ? occurrences.find((item) => item.occurrenceId === requestedSelectionId) || null
    : null;

  const totalHits = toInt(result?.completion?.total_hits)
    ?? toInt(result?.completion?.returned_hits)
    ?? occurrences.length;
  const returnedHits = toInt(result?.completion?.returned_hits) ?? occurrences.length;

  return Object.freeze({
    contract: "els_2029_projection_v1",
    status: clean(result.status) || "UNVERIFIED",
    corpusId,
    term,
    selectionProtocol: clean(result.selection_protocol),
    completion: Object.freeze({
      executed: result?.completion?.executed === true,
      totalHits,
      returnedHits,
      truncated: result?.completion?.truncated === true,
      continuation: result?.completion?.continuation || null,
    }),
    presentation: Object.freeze({
      policy: clean(result?.search?.sampling?.policy),
      representative: typeof result?.search?.sampling?.representative === "boolean"
        ? result.search.sampling.representative
        : null,
      bias: clean(result?.search?.sampling?.bias),
      ordering: clean(result?.search?.ordering),
    }),
    occurrences,
    selectedOccurrence,
    projectionOnly: true,
  });
}

export default projectEls2029Result;
