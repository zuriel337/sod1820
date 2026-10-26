import { getMatrixLibraryPage } from "../elsMatrices.js";

const clean = (value) => value == null ? "" : String(value).trim();
const MATCH = new Set(["match", "matched", "ok"]);

function explicitReplayState(detail) {
  const candidates = [
    detail?.verification_state,
    detail?.golden_scan_v1?.axis?.verification_state,
    detail?.golden_parallel_v1?.axis?.verification_state,
  ];
  return candidates.map((value) => clean(value).toLowerCase()).find(Boolean) || null;
}

function nonEmptyObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
}

function legacyEnvelopeCapped(detail) {
  return detail?.sampling?.capped === true || detail?.occurrence?.capped === true;
}

function integerOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function identitySignature(row) {
  const parts = [row.corpusId, row.termNorm, row.scope, row.skip, row.direction, row.startIndex];
  return parts.every((value) => value !== null && value !== "") ? parts.join("|") : null;
}

export function projectWorldElsTriageRows(rows = []) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const engineDetail = nonEmptyObject(row?.engine_detail) ? row.engine_detail : null;
    const replayState = explicitReplayState(engineDetail);
    const hasReplayMatch = replayState ? MATCH.has(replayState) : false;
    const envelopeCapped = legacyEnvelopeCapped(engineDetail);
    const corpusId = clean(row?.corpus_id) || null;
    const termNorm = clean(row?.term_norm) || null;
    const startIndex = integerOrNull(row?.start_index);
    const skip = integerOrNull(row?.skip_distance);
    const direction = clean(row?.direction) || null;
    const scope = clean(row?.scope) || null;
    const identityMissing = [
      !corpusId ? "corpus_id" : null,
      !termNorm ? "term_norm" : null,
      startIndex == null ? "start_index" : null,
      skip == null ? "skip_distance" : null,
      !direction ? "direction" : null,
    ].filter(Boolean);
    const state = identityMissing.length
      ? "identity_incomplete"
      : !engineDetail
        ? "missing_engine_envelope"
        : hasReplayMatch
          ? "replay_evidence_available"
          : envelopeCapped
            ? "legacy_envelope_capped"
            : "legacy_envelope_unreplayed";
    const id = clean(row?.id);
    const slug = clean(row?.slug);
    return Object.freeze({
      id,
      slug: slug || null,
      href: slug ? `/codes/${encodeURIComponent(slug)}` : null,
      title: clean(row?.title) || clean(row?.search_term) || "צופן ללא כותרת",
      term: clean(row?.search_term) || null,
      termNorm,
      scope,
      skip,
      direction,
      startIndex,
      corpusId,
      source: clean(row?.source) || "לא צוין",
      status: clean(row?.status) || "לא צוין",
      visibility: clean(row?.visibility) || "לא צוין",
      createdAt: row?.created_at || null,
      state,
      identityMissing: Object.freeze(identityMissing),
      hasEngineEnvelope: Boolean(engineDetail),
      engineVersion: clean(engineDetail?.engineVersion || engineDetail?.engine_version || engineDetail?.engine) || null,
      replayState,
      hasReplayMatch,
      envelopeCapped,
      qualityVerified: engineDetail?.ranking?.quality?.verified === true,
    });
  });

  const byId = new Map(normalized.filter((row) => row.id).map((row) => [row.id, row]));
  const unique = [...byId.values()];
  const signatures = new Map();
  for (const row of unique) {
    const signature = identitySignature(row);
    if (!signature) continue;
    const group = signatures.get(signature) || [];
    group.push(row.id);
    signatures.set(signature, group);
  }
  const duplicateGroups = [...signatures.values()].filter((group) => group.length > 1);
  const priority = {
    identity_incomplete: 0,
    missing_engine_envelope: 1,
    legacy_envelope_capped: 2,
    legacy_envelope_unreplayed: 3,
    replay_evidence_available: 4,
  };
  unique.sort((left, right) => (priority[left.state] - priority[right.state])
    || clean(right.createdAt).localeCompare(clean(left.createdAt))
    || left.id.localeCompare(right.id));

  return Object.freeze({
    capturedAt: new Date().toISOString(),
    rows: Object.freeze(unique),
    counts: Object.freeze({
      total: unique.length,
      publicPublished: unique.filter((row) => row.status === "published" && row.visibility === "public").length,
      mainLibrary: unique.filter((row) => row.status === "published" && row.visibility === "public" && row.source !== "research").length,
      researchFolder: unique.filter((row) => row.status === "published" && row.source === "research").length,
      outsidePublicReader: unique.filter((row) => row.status !== "published" || row.visibility !== "public").length,
      missingEngineEnvelope: unique.filter((row) => !row.hasEngineEnvelope).length,
      missingCorpusId: unique.filter((row) => !row.corpusId).length,
      missingTermNorm: unique.filter((row) => !row.termNorm).length,
      missingStartIndex: unique.filter((row) => row.startIndex == null).length,
      replayEvidenceAvailable: unique.filter((row) => row.hasReplayMatch).length,
      legacyEnvelopeCapped: unique.filter((row) => row.state === "legacy_envelope_capped").length,
      legacyEnvelopeUnreplayed: unique.filter((row) => row.state === "legacy_envelope_unreplayed").length,
      envelopeNotVerified: unique.filter((row) => row.hasEngineEnvelope && !row.hasReplayMatch).length,
      duplicateIdentityGroups: duplicateGroups.length,
      duplicateIdentityRows: duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
    }),
    duplicateGroups: Object.freeze(duplicateGroups.map((group) => Object.freeze(group))),
    rules: Object.freeze({
      replayEvidenceIsNotTruth: true,
      historicalReplayIsNotFreshVerification: true,
      cappedSearchRequiresFreshReplay: true,
      publishedIsNotVerified: true,
      noAutomaticPromotion: true,
      noSourceDeletion: true,
    }),
  });
}

export async function fetchWorldElsTriageProjection({ reader = getMatrixLibraryPage, pageSize = 48 } = {}) {
  const rows = [];
  for (let offset = 0; offset < 500; offset += pageSize) {
    const page = await reader({ view: "review", offset, pageSize });
    rows.push(...(page?.rows || []));
    if (!page?.more) break;
  }
  return projectWorldElsTriageRows(rows);
}
