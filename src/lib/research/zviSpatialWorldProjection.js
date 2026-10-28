import { SPATIAL_MODELS } from "../spatialModels.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";
import {
  contributorSourceLibraryHref,
  contributorSourceLocator,
} from "./worldContributorSourceLocator.js";

const ZVI_SOURCE_SLUG = "tzvi-opoc";
const ZVI_SOURCE_HREF = contributorSourceLibraryHref(ZVI_SOURCE_SLUG);

function publicSpatialSourceRef(value) {
  const ref = String(value || "").trim();
  // Only a concrete public channel occurrence can become a source identity in
  // the unified DTO. Legacy model labels stay visible in the spatial card but
  // never become invented public source records.
  return /^channel_updates:[0-9a-f-]{36}$/i.test(ref) ? ref : null;
}

export function buildZviSpatialContentProjection(models = SPATIAL_MODELS) {
  const cards = Array.isArray(models) ? models : [];
  const knownRefs = [...new Set(cards.flatMap(cleanSourceRefs).map(publicSpatialSourceRef).filter(Boolean))];
  const allRefs = cards.flatMap(cleanSourceRefs);
  const hasUnresolvedSourceIdentity = allRefs.some((ref) => !publicSpatialSourceRef(ref));
  const occurrences = [];
  for (const model of cards) {
    for (const sourceRef of cleanSourceRefs(model)) {
      if (!publicSpatialSourceRef(sourceRef)) continue;
      occurrences.push({
        occurrenceRef: `spatial:${model.slug}:${sourceRef}`,
        sourceRef,
        locator: `spatial-model:${model.slug}`,
        href: contributorSourceLocator(sourceRef, { slug: ZVI_SOURCE_SLUG }).href,
      });
    }
  }
  return buildPublicWorldContentProjectionV1({
    sources: knownRefs.map((sourceRef) => ({
      sourceRef,
      contributor: { slug: ZVI_SOURCE_SLUG, label: "צבי", href: ZVI_SOURCE_HREF },
      sourceHref: contributorSourceLocator(sourceRef, { slug: ZVI_SOURCE_SLUG }).href,
    })),
    occurrences,
    seriesCategories: [{
      key: "spatial-structures",
      kind: "category",
      label: "מבנים מרחביים",
      sourceRefs: knownRefs,
    }],
    coverage: {
      // The showcase still contains one legacy-only model reference. Its
      // existence makes the all-spatial source total unknown, never 11/12.
      sources: { available: !hasUnresolvedSourceIdentity },
      occurrences: { available: !hasUnresolvedSourceIdentity },
      clusters: { available: false },
      seriesCategories: { available: true },
      findings: { available: false },
      treeRelations: { available: false },
      legacyTopics: { available: false },
    },
  });
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
        locators: sourceRefs.map((ref) => contributorSourceLocator(ref, { slug: ZVI_SOURCE_SLUG })),
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
      exactSourceOccurrences: cards.reduce((sum, card) => sum + card.source.locators.filter((locator) => locator.exact).length, 0),
      historicalSourceOccurrences: cards.reduce((sum, card) => sum + card.source.locators.filter((locator) => !locator.exact).length, 0),
      withImage: cards.filter((card) => card.image).length,
      multiPath: cards.filter((card) => card.pathCount > 1).length,
    },
    coverage: {
      kind: "curated_showcase",
      completeCorpus: false,
      label: "מבחר מבנים מאוצר · לא כל קורפוס המרחבים",
    },
    rules: {
      truthLayers: ["source", "gematria", "mathematical_structure", "spatial_form", "interpretation"],
      threeDimensionalAssetsLoadOnDemand: true,
      missingStrengthLabel: "טרם דורג",
      independentSourcesAreNotInferredFromOccurrences: true,
    },
    // Additive unified representation. The existing curated cards retain
    // their presentation shape while World/News can consume the same DTO.
    contentProjection: buildZviSpatialContentProjection(models),
  };
}

export const ZVI_SPATIAL_WORLD = buildZviSpatialWorldProjection();

function publicSourceImage(row) {
  const thumb = String(row?.thumb_url || "").trim();
  const image = String(row?.image_url || "").trim();
  if (/^https:\/\//i.test(thumb)) return thumb;
  if (/^https:\/\//i.test(image) && !/\.(?:mp4|mov|webm|m4v)(?:[?#]|$)/i.test(image)) return image;
  return null;
}

export async function fetchZviSpatialWorldProjection({ publicClient = getPublicResearchClient } = {}) {
  const base = buildZviSpatialWorldProjection();
  const ids = [...new Set(base.cards.flatMap((card) => card.source.locators)
    .filter((locator) => locator.exact)
    .map((locator) => locator.occurrenceId))];
  if (!ids.length) return { ...base, access: { sourceMedia: "not_applicable" } };

  try {
    const client = publicClient();
    const { data, error } = await client
      .from("channel_updates")
      .select("id,image_url,thumb_url")
      .in("id", ids);
    if (error) throw error;
    const byRef = new Map((data || []).map((row) => [`channel_updates:${row.id}`, row]));
    const cards = base.cards.map((card) => {
      const sourceRow = card.source.refs.map((ref) => byRef.get(ref)).find((row) => publicSourceImage(row));
      const sourceImage = publicSourceImage(sourceRow);
      return {
        ...card,
        image: card.image || sourceImage,
        imageProvenance: card.image ? "curated_spatial_asset" : sourceImage ? "public_source_occurrence" : null,
      };
    });
    return {
      ...base,
      cards,
      counts: { ...base.counts, withImage: cards.filter((card) => card.image).length },
      access: { sourceMedia: "public_reader" },
    };
  } catch (_) {
    return { ...base, access: { sourceMedia: "unavailable" } };
  }
}
