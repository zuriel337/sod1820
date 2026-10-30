import {
  buildPublicWorldContentProjectionV1,
  PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION,
} from "./publicWorldContentProjectionV1.js";
import { channelUpdateOccurrenceId } from "./worldContributorSourceLocator.js";
import { universalFindingId } from "./universalFinding.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value) => value == null ? "" : String(value).trim();

/**
 * Append already-authorized Zvi reader pages to the existing public envelope.
 *
 * This function is an assembly boundary, not an access reader. Its pages must
 * be results from the two existing public Zvi readers, which validate anon RLS,
 * publication, source identity, live source and (when required) fingerprint.
 * Only already-present source identities can receive a finding; source
 * locators and labels never turn into graph edges or number/topic attachments.
 *
 * complete is the caller's explicit assertion that all requested streams
 * have reached their end. A withheld/failed/missing page or source keeps
 * findings coverage unavailable (null total), even when some rows are useful.
 */
export function mergeZviFindingsIntoWorldProjection(base, pages = [], { complete = false } = {}) {
  if (!base || base.contractVersion !== PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION || !Array.isArray(pages)) {
    throw new Error("invalid_public_world_projection");
  }

  const sourceRefs = new Set((base.sources || []).map((source) => clean(source?.sourceRef)).filter(Boolean));
  const existingSourcesByFinding = new Map((base.findings || []).map((finding) => [
    clean(finding?.findingRef), new Set((finding?.sourceRefs || []).map(clean).filter(Boolean)),
  ]));
  const additionsByFinding = new Map();
  const additions = [];
  let rejected = false;
  for (const page of pages) {
    if (!page || !Array.isArray(page.rows)) { rejected = true; continue; }
    if (page.omittedUnavailable || page.omittedForReview || page.error || typeof page.hasMore !== "boolean") rejected = true;
    for (const row of page.rows) {
      const id = clean(row?.id);
      const sourceRef = clean(row?.sourceRef);
      const sourceId = channelUpdateOccurrenceId(sourceRef);
      const expectedRef = UUID.test(id) ? universalFindingId({
        kind: "research-object",
        sourceIdentity: { researchObjectId: id },
        subjectKey: id,
      }) : "";
      const expectedHref = `/world?${new URLSearchParams({ finding: id })}`;
      const publicationState = clean(row?.publicationState);
      if (!sourceId || sourceRef !== `channel_updates:${sourceId}`
        || !expectedRef || row?.findingRef !== expectedRef || row?.href !== expectedHref
        || !["approved", "canonical"].includes(publicationState) || !sourceRefs.has(sourceRef)) {
        rejected = true;
        continue;
      }
      const existingRefs = existingSourcesByFinding.get(expectedRef);
      const addedSource = additionsByFinding.get(expectedRef);
      // Conflicting snapshots of one finding are not merged into a new
      // multi-source attribution; the current provenance must be re-read.
      if ((existingRefs && !existingRefs.has(sourceRef)) || (addedSource && addedSource !== sourceRef)) {
        rejected = true;
        continue;
      }
      additionsByFinding.set(expectedRef, sourceRef);
      additions.push({
        findingRef: expectedRef,
        sourceRefs: [sourceRef],
        href: expectedHref,
        stage: null,
        // The compact Zvi reader does not certify the complete truth axes.
        verificationState: null,
        publicationState,
      });
    }
  }

  const originalCoverage = base.coverage || {};
  const coverage = Object.fromEntries(
    ["sources", "occurrences", "clusters", "seriesCategories", "findings", "treeRelations", "legacyTopics"]
      .map((field) => [field, { available: originalCoverage[field]?.available === true }]),
  );
  coverage.findings.available = originalCoverage.findings?.available === true
    && complete === true && pages.length > 0 && pages.at(-1)?.hasMore !== true && !rejected;

  return buildPublicWorldContentProjectionV1({
    sources: base.sources,
    occurrences: base.occurrences,
    clusters: base.clusters,
    seriesCategories: base.seriesCategories,
    findings: [...(base.findings || []), ...additions],
    // No relations are derived from a finding, its source, a title, or a number.
    treeRelations: base.treeRelations,
    compatibility: { legacyTopics: base.compatibility?.legacyTopics },
    coverage,
  });
}
