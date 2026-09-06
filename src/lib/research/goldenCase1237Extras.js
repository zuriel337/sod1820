// goldenCase1237Extras — thin presentation-only composition for the Number Golden Case.
// Owns no truth and no new engine: every fact comes from an existing canonical adapter/reader.
// (fibonacciSequenceAdapter / piSequenceAdapter / getRealityHints already exist; this file only
// calls them and reshapes the result for the page — see UNIVERSAL_NUMBER_HUB_1237_GOLDEN_CASE_VISUAL_BUILD_V1.)
import { fibonacciSequenceAdapter } from "./fibonacciSequence.js";
import { piSequenceAdapter } from "./piSequence.js";
import { getRealityHints } from "../supabase.js";

// Only two claims are ever computed here — both are exact, deterministic answers from the
// existing sequence adapters. Nothing about "nearness" or invented relationships is added.
export async function fetchMathDimensions(value) {
  const query = String(Math.trunc(Number(value) || 0));
  if (!/^\d+$/.test(query) || query === "0") return { fibonacci: null, pi: null };
  const [fibonacci, pi] = await Promise.all([
    fibonacciSequenceAdapter.execute({ query, provenance: { requestSource: "golden-case-1237-math-dimensions" } }).catch(() => null),
    piSequenceAdapter.execute({ query, provenance: { requestSource: "golden-case-1237-math-dimensions" } }).catch(() => null),
  ]);
  return { fibonacci, pi };
}

// Cross-references the Hub's own gallery rows (from getEntityBundle/surface.galleries) against the
// existing Reality Stream reader (source='update') by id, so a gallery image already shown in the
// Hub can be flagged as a "hint/reality" image without duplicating or re-fetching its content.
// The Gallery (/archive) remains the contextual owner; this only tells the Hub which rows are hints.
export async function fetchRealityHintIdSet(value, limit = 800) {
  const target = Number(value);
  if (!Number.isFinite(target)) return new Set();
  let rows = [];
  try {
    rows = await getRealityHints(limit);
  } catch {
    return new Set();
  }
  const ids = new Set();
  for (const row of rows || []) {
    const all = Array.isArray(row?.all_values) ? row.all_values.map(Number) : [];
    if (Number(row?.primary_value) === target || all.includes(target)) {
      if (row?.id != null) ids.add(row.id);
    }
  }
  return ids;
}
