import { SPATIAL_MODELS } from "../spatialModels.js";

const ZVI_SOURCE_HREF = "/world?view=sources&source=tzvi-opoc#world-contributor-material";

function sourceLocator(ref) {
  const match = /^channel_updates:([0-9a-f-]{36})$/i.exec(ref);
  if (!match) return { ref, exact: false, href: ZVI_SOURCE_HREF };
  const params = new URLSearchParams({ view: "sources", source: "tzvi-opoc", sourceRef: ref });
  return { ref, exact: true, href: `/world?${params.toString()}#source-occurrence-${match[1]}` };
}

function cleanSourceRefs(model) {
  const refs = Array.isArray(model?.spatial?.provenance?.refs)
    ? model.spatial.provenance.refs
    : [];
  return [...new Set(refs.map((ref) => String(ref || "").trim()).filter(Boolean))];
}

function convergencePathCount(model) {
  const explicit = model?.spatial?.convergences?.find((item) => Number.isFinite(item?.independentPaths))?.independentPaths;
  if (Number.isFinite(explicit)) return explicit;
  return Math.max(1, Array.isArray(model?.spatial?.operations) ? model.spatial.operations.length : 0);
}

export function buildZviSpatialWorldProjection(models = SPATIAL_MODELS) {
  const cards = models.map((model) => {
    const sourceRefs = cleanSourceRefs(model);
    const pathCount = convergencePathCount(model);
    return {
      id: `spatial:${model.slug}`,
      slug: model.slug,
      title: model.title,
      subtitle: model.subtitle || null,
      value: model.value,
      form: model.form,
      dimension: model.spatial?.dimension || null,
      image: model.image || null,
      text: model.text || null,
      gematria: Array.isArray(model.gematria) ? model.gematria : [],
      structure: Array.isArray(model.structure) ? model.structure : [],
      operations: Array.isArray(model.spatial?.operations) ? model.spatial.operations : [],
      pathCount,
      interpretation: model.midrash || null,
      source: {
        contributor: model.spatial?.provenance?.contributor || "צבי",
        refs: sourceRefs,
        locators: sourceRefs.map(sourceLocator),
        occurrenceCount: sourceRefs.length,
        independentSourceCount: null,
        href: ZVI_SOURCE_HREF,
      },
      review: {
        connectionStrength: null,
        evidenceQuality: sourceRefs.length ? "מקור ופעולות חישוב מתועדים" : "אין נתון",
        calculationState: model.spatial?.operations?.length ? "פעולות מתועדות" : "אין נתון",
        publicationState: "מוצג בעולם",
      },
      href: `/world?view=explore&kind=spatial#spatial-${encodeURIComponent(model.slug)}`,
    };
  });

  return {
    id: "zvi-spatial-world-v1",
    title: "גימטריה מרחבית",
    description: "מבנים מרחביים מתוך חומרי צבי, כהקרנה על אותו עולם מחקרי ולא כמאגר נפרד.",
    cards,
    counts: {
      models: cards.length,
      sourceOccurrences: cards.reduce((sum, card) => sum + card.source.occurrenceCount, 0),
      withImage: cards.filter((card) => card.image).length,
      multiPath: cards.filter((card) => card.pathCount > 1).length,
    },
    rules: {
      truthLayers: ["source", "gematria", "mathematical_structure", "spatial_form", "interpretation"],
      threeDimensionalAssetsLoadOnDemand: true,
      missingStrengthLabel: "טרם דורג",
      independentSourcesAreNotInferredFromOccurrences: true,
    },
  };
}

export const ZVI_SPATIAL_WORLD = buildZviSpatialWorldProjection();
