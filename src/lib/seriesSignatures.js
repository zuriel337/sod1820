// Projection-only mapping under the existing Design/ResearchIcon owner tree.
// This is NOT a new semantic registry: category/content identity remains where it already lives.
// The mapping only decides which canonical visual Signature a surface may project.

export const CATEGORY_SIGNATURES = Object.freeze({
  "רמזים חזקים": "strong_hints",
  "סוד החשמל": "sod_hashmal",
  "צפונות בתורה": "els",
});

export function signatureForCategories(categories) {
  if (!Array.isArray(categories)) return null;
  for (const category of categories) {
    const key = CATEGORY_SIGNATURES[String(category || "").trim()];
    if (key) return key;
  }
  return null;
}

// Capability/world projections do not need a category to resolve their visual identity.
export const CAPABILITY_SIGNATURES = Object.freeze({
  els: "els",
  cipher: "els",
  gematria: "gematria",
  journey: "journey",
  door: "journey",
  raziel: "raziel",
  source: "source",
  book: "source",
  spatial: "spatial",
});

export function signatureForCapability(capability) {
  return CAPABILITY_SIGNATURES[String(capability || "").trim()] || null;
}
