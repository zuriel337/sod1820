// A display-only projection inside the EXISTING saved Raziel conversation.
// No storage, requests, tokens, automatic resume, ELS calculation or new truth owner.
import { ELS_MATRIX_READING_RESULT_CONTRACT, isElsReadingJobId } from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const scalar = value => typeof value === "boolean" || value === null || (typeof value === "number" && Number.isFinite(value))
  || (typeof value === "string" && value.length <= 700) ? value : undefined;
const fields = names => Object.fromEntries(names.split(" ").map(name => [name, scalar]));

function project(value, schema) {
  if (typeof schema === "function") return schema(value);
  if (Array.isArray(schema)) return Array.isArray(value) && value.length <= 120
    ? value.map(item => project(item, schema[0])) : undefined;
  if (!object(value)) return undefined;
  return Object.fromEntries(Object.entries(schema).flatMap(([key, child]) => {
    const selected = project(value[key], child);
    return selected === undefined ? [] : [[key, selected]];
  }));
}

const span = fields("from to count requested");
const byKind = fields("R C D A");
const schema = {
  ...fields("contract ok state error reason continuation_required experimental is_test_fixture retryable restart_blocked recovered"),
  model: fields("id verified_available verified_at source"),
  provider: fields("name route kind live_model_call"),
  axis: fields("term scope skip dir start corpus_id occurrence_id verification_state"),
  request: fields("instruction sha256 lock_sha256 window_sha256 cap"),
  // Only non-secret provenance. In particular job.token, request bodies, provider output and progress are not saved.
  job: { ...fields("batch_id created_at expires_at"), id: value => isElsReadingJobId(value) ? value : undefined },
  timing: fields("created_at ended_at elapsed_ms"),
  cost: {
    ...fields("usd batch_factor provider_currency basis certainty logged ai_token_log_ref"),
    ils: { ...fields("amount currency status"), fx: fields("ils_per_usd basis effective_at source_ref") },
    list_price_parts_usd: fields("input cacheWrite cacheRead output"),
  },
  estimate: { ...fields("upper_bound_usd input_tokens"), expected_usd: fields("low high"),
    upper_bound_ils: { ...fields("amount currency status"), fx: fields("ils_per_usd basis effective_at source_ref") } },
  coverage: {
    ...fields("scope matrix_width torah_complete_rows cells what_is_not_covered"), rows: span, cols: span,
    axis: { ...fields("column cells"), rows: [scalar] }, margin: fields("above below left right"),
    shifted_to_stay_inside_torah: fields("rows cols"), touches_matrix_edge: fields("top bottom left right"),
    lines_shown: { ...fields("total readings"), by_kind: byKind },
    lines_omitted_shorter_than_3: { ...fields("total"), by_kind: byKind },
  },
  cap: fields("requested proposals reached meaning"),
  findings: [{
    ...fields("id text line"), parts: [scalar],
    occurrence: { ...fields("reading skip dir start length"), cells: [[scalar]] },
    verification: { ...fields("state letters_match occurrences_verified"), reasons: [scalar],
      engine: fields("verification_state contract occurrence_id corpus_id") },
    chance: fields("expected_occurrences unlikely_by_chance basis"),
    relation_to_axis: fields("distance relation"),
    model_claims: fields("kind tier continue_from note status"),
  }],
};
const states = new Set(["PREVIEW", "RUNNING", "COMPLETE", "INCOMPLETE", "FAILED_WITH_REASON", "CANCEL_REQUESTED", "REFUSED"]);
const verificationStates = new Set(["ENGINE_VERIFIED", "PLAIN_TEXT_ONLY", "NOT_VERIFIED"]);

export function projectSavedElsMatrixReading(value, contextAxis) {
  if (!object(value) || value.contract !== ELS_MATRIX_READING_RESULT_CONTRACT || !states.has(value.state)) return null;
  const saved = project(value, schema);
  const axis = saved.axis;
  if (axis && (!contextAxis || !["term", "scope", "skip", "dir", "start"].every(key => axis[key] === contextAxis[key]))) return null;
  if (axis?.corpus_id && axis.corpus_id !== contextAxis?.corpusId) return null;
  if (value.state === "COMPLETE" && (!axis || typeof axis.term !== "string" || !axis.term
    || !Number.isSafeInteger(axis.start) || axis.start < 0 || !Number.isSafeInteger(axis.skip) || axis.skip < 1
    || ![1, -1].includes(axis.dir) || typeof contextAxis?.corpusId !== "string" || !contextAxis.corpusId)) return null;
  if (value.findings != null && (!Array.isArray(value.findings) || value.findings.length > 60)) return null;
  saved.findings = value.state === "COMPLETE" ? saved.findings || [] : [];
  for (const finding of saved.findings) {
    if (!finding || typeof finding.text !== "string" || !finding.text || !verificationStates.has(finding.verification?.state)) return null;
    const verification = finding.verification;
    const occurrence = finding.occurrence;
    const positioned = occurrence && Number.isSafeInteger(occurrence.start) && occurrence.start >= 0
      && Number.isSafeInteger(occurrence.skip) && occurrence.skip > 0 && [1, -1].includes(occurrence.dir)
      && Number.isSafeInteger(occurrence.length) && occurrence.length > 0;
    // A saved label alone is not a replay receipt. Never upgrade invalid/missing receipts to verified.
    if (verification.state === "ENGINE_VERIFIED" && (!positioned || occurrence.skip < 2 || verification.letters_match !== true
      || !Number.isSafeInteger(verification.occurrences_verified) || verification.occurrences_verified < 1 || verification.engine?.verification_state !== "MATCH"
      || verification.engine?.contract !== "els_occurrence_replay_v1" || typeof verification.engine?.occurrence_id !== "string" || !verification.engine.occurrence_id
      || verification.engine?.corpus_id !== contextAxis.corpusId)) verification.state = "NOT_VERIFIED";
    if (verification.state === "PLAIN_TEXT_ONLY" && (!positioned || occurrence.skip !== 1 || verification.letters_match !== true)) verification.state = "NOT_VERIFIED";
  }
  saved.saved_snapshot = true; // Historical display, never a fresh replay or a live request.
  saved.tracking_unavailable = !isElsReadingJobId(saved.job?.id) && (value.tracking_unavailable === true || Boolean(value.poll_interrupted)
    || ["RUNNING", "CANCEL_REQUESTED"].includes(value.state) || (value.retryable === true && Boolean(value.job?.token)));
  return saved;
}
