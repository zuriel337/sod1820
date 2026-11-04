const clean = (value) => value == null ? "" : String(value).trim();
const uniq = (values) => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
const bool = (value) => value === true || value === "true";
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const CONTRIBUTOR_RESEARCH_FACET = Object.freeze({
  NUMBER: "number",
  GEMATRIA: "gematria",
  SPATIAL: "spatial",
  WORD_OR_PHRASE: "word_or_phrase",
  TREE_CONNECTED: "tree_connected",
  TREE_WAITING: "tree_waiting",
  REVIEW_REQUIRED: "review_required",
  DUPLICATE_LINEAGE: "duplicate_lineage",
});

export const CONTRIBUTOR_TREE_CONNECTION_STATE = Object.freeze({
  CONNECTED: "connected",
  WAITING_FOR_ASSIGNMENT: "waiting_for_assignment",
  NO_STRUCTURED_CONNECTION: "no_structured_connection",
  DEFERRED: "deferred",
});

function rowExt(row) {
  return object(object(row?.meta).ext);
}

function intake(row) {
  return object(rowExt(row).wa_channel_intake);
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(object(source), key);
}

function treeMatchTypes(row) {
  const matches = intake(row).tree_matches;
  if (!Array.isArray(matches)) return [];
  return uniq(matches.map((match) => object(match).type));
}

function reviewRequired(state) {
  const value = clean(state);
  return value.startsWith("source_preserved_needs_") || value === "analysis_failed_source_preserved";
}

/**
 * Aggregate-only research facets for one exact source occurrence.
 *
 * The result deliberately omits statements, search terms and tree-match labels. It reports only
 * structured evidence already present on RLS-readable research rows. A deferred read is distinct
 * from an exact read that returned zero rows.
 */
export function buildContributorSourceResearchFacets(rows = [], { deferred = false } = {}) {
  if (deferred) {
    return Object.freeze({
      availability: "deferred",
      rowCount: null,
      categories: [],
      tree: Object.freeze({ state: CONTRIBUTOR_TREE_CONNECTION_STATE.DEFERRED }),
      truthBoundary: "Deferred means not loaded, never zero or absent.",
    });
  }

  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const numberRows = safeRows.filter((row) => Number.isFinite(Number(row?.value)));
  const gematriaRows = safeRows.filter((row) => hasOwn(rowExt(row), "gematria"));
  const spatialRows = safeRows.filter((row) => hasOwn(rowExt(row), "spatial_research"));
  const promotedRows = safeRows.filter((row) => clean(row?.promoted_node_id));
  const treeMatchedRows = safeRows.filter((row) => intake(row).tree_match_state === "matched_existing_tree");
  const treeWaitingRows = safeRows.filter((row) => intake(row).tree_match_state === "candidate_unmatched");
  const reviewRows = safeRows.filter((row) => reviewRequired(intake(row).analysis_state));
  const ocrRows = safeRows.filter((row) => bool(intake(row).media_ocr_pending));
  const transcriptionRows = safeRows.filter((row) => bool(intake(row).media_transcription_pending));
  const duplicateRows = safeRows.filter((row) => (
    hasOwn(rowExt(row), "exact_duplicate_lineage") || hasOwn(rowExt(row), "exact_representation_lineage")
  ));
  const lexicalRows = safeRows.filter((row) => treeMatchTypes(row).some((type) => ["word", "phrase"].includes(type)));
  const connected = promotedRows.length > 0 || treeMatchedRows.length > 0;
  const treeState = connected
    ? CONTRIBUTOR_TREE_CONNECTION_STATE.CONNECTED
    : treeWaitingRows.length > 0
      ? CONTRIBUTOR_TREE_CONNECTION_STATE.WAITING_FOR_ASSIGNMENT
      : CONTRIBUTOR_TREE_CONNECTION_STATE.NO_STRUCTURED_CONNECTION;
  const categories = [];
  if (numberRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.NUMBER);
  if (gematriaRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.GEMATRIA);
  if (spatialRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.SPATIAL);
  if (lexicalRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.WORD_OR_PHRASE);
  if (treeState === CONTRIBUTOR_TREE_CONNECTION_STATE.CONNECTED) categories.push(CONTRIBUTOR_RESEARCH_FACET.TREE_CONNECTED);
  if (treeState === CONTRIBUTOR_TREE_CONNECTION_STATE.WAITING_FOR_ASSIGNMENT) categories.push(CONTRIBUTOR_RESEARCH_FACET.TREE_WAITING);
  if (reviewRows.length || ocrRows.length || transcriptionRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.REVIEW_REQUIRED);
  if (duplicateRows.length) categories.push(CONTRIBUTOR_RESEARCH_FACET.DUPLICATE_LINEAGE);

  const byStatus = {};
  for (const row of safeRows) {
    const status = clean(row?.status) || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  return Object.freeze({
    availability: "loaded",
    rowCount: safeRows.length,
    categories: Object.freeze(categories),
    number: Object.freeze({
      rowCount: numberRows.length,
      values: Object.freeze([...new Set(numberRows.map((row) => Number(row.value)))].sort((a, b) => a - b)),
    }),
    gematria: Object.freeze({
      rowCount: gematriaRows.length,
      methodKeys: Object.freeze(uniq(gematriaRows.map((row) => object(rowExt(row).gematria).method_key))),
      evidenceKey: "meta.ext.gematria",
    }),
    spatial: Object.freeze({
      rowCount: spatialRows.length,
      classifications: Object.freeze(uniq(spatialRows.map((row) => object(rowExt(row).spatial_research).classification))),
      clusters: Object.freeze(uniq(spatialRows.map((row) => object(rowExt(row).spatial_research).cluster))),
      evidenceKey: "meta.ext.spatial_research",
    }),
    wordOrPhrase: Object.freeze({
      rowCount: lexicalRows.length,
      matchTypes: Object.freeze(uniq(lexicalRows.flatMap(treeMatchTypes)).filter((type) => ["word", "phrase"].includes(type))),
      evidenceKey: "meta.ext.wa_channel_intake.tree_matches[].type",
    }),
    tree: Object.freeze({
      state: treeState,
      promotedRowCount: promotedRows.length,
      matchedRowCount: treeMatchedRows.length,
      waitingRowCount: treeWaitingRows.length,
      evidenceKeys: Object.freeze(["promoted_node_id", "meta.ext.wa_channel_intake.tree_match_state"]),
    }),
    review: Object.freeze({
      required: reviewRows.length > 0 || ocrRows.length > 0 || transcriptionRows.length > 0,
      reviewRowCount: reviewRows.length,
      requiresOcr: ocrRows.length > 0,
      requiresTranscription: transcriptionRows.length > 0,
      analysisStates: Object.freeze(uniq(reviewRows.map((row) => intake(row).analysis_state))),
    }),
    duplicates: Object.freeze({
      rowCount: duplicateRows.length,
      nonDestructive: true,
      evidenceKeys: Object.freeze(["meta.ext.exact_duplicate_lineage", "meta.ext.exact_representation_lineage"]),
    }),
    verification: Object.freeze({
      engineVerifiedRowCount: safeRows.filter((row) => row?.engine_verified === true).length,
      byStatus: Object.freeze(byStatus),
    }),
    truthBoundary: "These are evidence-backed facets, not a truth score, strength score, independent-source count or publication decision.",
    excludedInference: "No language, cipher or semantic topic is inferred from free text.",
  });
}

export default buildContributorSourceResearchFacets;
