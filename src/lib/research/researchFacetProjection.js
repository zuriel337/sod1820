// Shared Research Finding facet projection.
// EXTEND_EXISTING only: consumes projection.dimensions.researchFacets produced by Universal Finding.
// This helper creates no taxonomy, method registry, graph identity or truth state.

const clean = (value) => value == null ? "" : String(value).trim();
const hasHebrew = (value) => /[א-ת]/.test(clean(value));

export const RESEARCH_FACET_FILTER_DEFAULTS = Object.freeze({
  method: "all",
  operation: "all",
  factor: "all",
  spatial: "all",
  family: "all",
});

export const RESEARCH_OPERATION_LABELS_HE = Object.freeze({
  multiply: "הכפלה",
  add: "חיבור",
});

export function researchFacetsOf(item) {
  return item?.researchFacets
    || item?.projection?.dimensions?.researchFacets
    || null;
}

export function researchFacetAxes(item) {
  const facets = researchFacetsOf(item) || {};
  const methods = Array.isArray(facets.methods)
    ? [...new Set(facets.methods.map((row) => clean(row?.token)).filter(Boolean))]
    : [];
  const canonicalMethods = Array.isArray(facets.canonicalMethods)
    ? facets.canonicalMethods
      .map((row) => ({
        methodKey: clean(row?.methodKey),
        displayLabel: clean(row?.displayLabel) || clean(row?.methodKey),
        dbColumn: clean(row?.dbColumn) || null,
      }))
      .filter((row) => row.methodKey)
    : [];
  const displayMethods = canonicalMethods.length
    ? [...new Set(canonicalMethods.map((row) => row.displayLabel || row.methodKey).filter(Boolean))]
    : methods.filter(hasHebrew);
  const factors = Array.isArray(facets.operation?.factors)
    ? [...new Set(facets.operation.factors.map(Number).filter(Number.isFinite))]
    : [];
  const operations = Array.isArray(facets.operation?.operators)
    ? [...new Set(facets.operation.operators.map(clean).filter(Boolean))]
    : [];
  const familyKey = clean(facets.family?.key) || clean(facets.family?.cluster) || null;
  const familyLabel = clean(facets.family?.cluster) || familyKey;
  return {
    methods,
    canonicalMethods,
    displayMethods,
    operations,
    factors,
    is3d: facets.spatial?.is3d === true,
    familyKey,
    familyLabel,
  };
}

export function filterResearchFacetItems(items = [], filters = {}) {
  const f = { ...RESEARCH_FACET_FILTER_DEFAULTS, ...(filters || {}) };
  return (Array.isArray(items) ? items : []).filter((item) => {
    const axes = researchFacetAxes(item);
    if (f.method !== "all") {
      const canonicalHit = axes.canonicalMethods.some((row) => row.methodKey === f.method || row.displayLabel === f.method);
      const rawFallbackHit = !axes.canonicalMethods.length && axes.methods.includes(f.method);
      if (!canonicalHit && !rawFallbackHit) return false;
    }
    if (f.operation !== "all" && !axes.operations.includes(f.operation)) return false;
    if (f.factor !== "all" && !axes.factors.includes(Number(f.factor))) return false;
    if (f.spatial === "3d" && !axes.is3d) return false;
    if (f.spatial === "not_3d" && axes.is3d) return false;
    if (f.family !== "all" && axes.familyKey !== f.family) return false;
    return true;
  });
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + amount;
}

export function buildResearchFacetControl(items = []) {
  const rows = Array.isArray(items) ? items : [];
  const byMethod = {};
  const byOperation = {};
  const byFactor = {};
  const byFamily = {};
  let spatial3d = 0;

  for (const item of rows) {
    const axes = researchFacetAxes(item);
    for (const method of axes.displayMethods) increment(byMethod, method);
    for (const operation of axes.operations) increment(byOperation, operation);
    for (const factor of axes.factors) increment(byFactor, String(factor));
    if (axes.is3d) spatial3d += 1;
    if (axes.familyKey) {
      const current = byFamily[axes.familyKey] || { label: axes.familyLabel || axes.familyKey, count: 0 };
      current.count += 1;
      byFamily[axes.familyKey] = current;
    }
  }

  return {
    total: rows.length,
    byMethod,
    byOperation,
    byFactor,
    byFamily,
    spatial3d,
    hasStructuredFacets: Boolean(
      Object.keys(byMethod).length
      || Object.keys(byOperation).length
      || Object.keys(byFactor).length
      || Object.keys(byFamily).length
      || spatial3d
    ),
  };
}

export default researchFacetAxes;
