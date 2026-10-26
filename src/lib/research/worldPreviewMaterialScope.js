const clean = (value) => value == null ? "" : String(value).trim();

export const WORLD_PREVIEW_MATERIAL_SCOPE = Object.freeze({
  excludedContributionOrigins: Object.freeze(["openweb"]),
  excludedChannels: Object.freeze(["or-geula"]),
  excludedResearchSources: Object.freeze(["openweb_legacy"]),
  excludedResearchRefPrefixes: Object.freeze(["openweb_message:"]),
});

function normalized(value) {
  return clean(value).toLocaleLowerCase("en-US");
}

function sourceRefMatches(sourceRef, excludedRefs) {
  const ref = clean(sourceRef);
  if (!ref) return false;
  return excludedRefs.some((excluded) => ref === excluded || ref.startsWith(`${excluded}#`));
}

export function worldPreviewMaterialExclusion(row, family, { excludedChannelSourceRefs = [] } = {}) {
  if (!row) return null;

  if (family === "contribution") {
    return WORLD_PREVIEW_MATERIAL_SCOPE.excludedContributionOrigins.includes(normalized(row.origin))
      ? "old_chat"
      : null;
  }

  if (family === "source_message") {
    return WORLD_PREVIEW_MATERIAL_SCOPE.excludedChannels.includes(normalized(row.channel))
      ? "or_geula"
      : null;
  }

  if (family !== "research_object") return null;

  const source = normalized(row.source);
  const sourceRef = clean(row.source_ref);
  if (
    WORLD_PREVIEW_MATERIAL_SCOPE.excludedResearchSources.includes(source)
    || WORLD_PREVIEW_MATERIAL_SCOPE.excludedResearchRefPrefixes.some((prefix) => sourceRef.startsWith(prefix))
  ) return "old_chat";

  const contributor = clean(row.contributor);
  if (
    contributor === "אור הגאולה"
    || source === "or-geula"
    || sourceRefMatches(sourceRef, excludedChannelSourceRefs)
  ) return "or_geula";

  return null;
}

export function scopeWorldPreviewMaterial(familyRows = {}) {
  const excludedChannelSourceRefs = [...new Set(
    (familyRows.excludedChannelSourceRefs || []).map(clean).filter(Boolean),
  )];
  const excluded = { old_chat: 0, or_geula: 0 };

  const keep = (family) => (row) => {
    const reason = worldPreviewMaterialExclusion(row, family, { excludedChannelSourceRefs });
    if (reason) excluded[reason] += 1;
    return !reason;
  };

  return Object.freeze({
    researchObjects: Object.freeze((familyRows.researchObjects || []).filter(keep("research_object"))),
    contributions: Object.freeze((familyRows.contributions || []).filter(keep("contribution"))),
    sourceMessages: Object.freeze((familyRows.sourceMessages || []).filter(keep("source_message"))),
    topics: Object.freeze([...(familyRows.topics || [])]),
    convergenceCandidates: Object.freeze([...(familyRows.convergenceCandidates || [])]),
    excluded: Object.freeze(excluded),
  });
}

