// World 2029 presentation-only density helper.
// This module does NOT rank truth, evidence, importance, canonicality or access.
// It only helps the renderer choose an honest amount of UI for the material the
// governed World read model already returned.

const size = (value) => Array.isArray(value) ? value.length : 0;

export function worldProjectionCounts(data) {
  return Object.freeze({
    relations: size(data?.graph?.relations),
    findings: size(data?.research?.findings),
    sources: size(data?.sources),
    worlds: size(data?.numberWorlds),
    timeline: size(data?.timeline),
  });
}

// A resolved Reality Graph identity contributes one provenance timestamp to the
// timeline even when there is no surrounding research material at all. That
// baseline identity event must not make an otherwise-empty anchor look medium.
// The visible timeline count remains untouched; only presentation density drops
// that single structural event from the density decision.
export function worldDensityCounts(data) {
  const counts = worldProjectionCounts(data);
  return Object.freeze({
    ...counts,
    timeline: Math.max(0, counts.timeline - (data?.identity ? 1 : 0)),
  });
}

export function classifyWorldPresentationDensity(data) {
  if (!data?.identity) return "unavailable";
  const counts = worldDensityCounts(data);
  const values = Object.values(counts);
  const populatedChannels = values.filter((count) => count > 0).length;
  const boundedItems = values.reduce((sum, count) => sum + Math.min(count, 24), 0);

  // A single very rich channel (for example a dense graph neighborhood) may
  // warrant the rich layout even before other domains have material.
  if (populatedChannels >= 3 || boundedItems >= 24) return "rich";
  if (populatedChannels >= 1) return "medium";
  return "sparse";
}

export function worldHasAnyMaterial(data) {
  const counts = worldDensityCounts(data);
  return Object.values(counts).some((count) => count > 0);
}
