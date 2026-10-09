// src/lib/spatial/hebrewGlyphAssets.js
// Hebrew glyph/vector asset lineage (scene.v1 M3). EXTENDS the existing renderer-neutral Letter Anatomy / scene.v1
// owners — no new glyph system, registry or store. Semantic identity stays the Unicode codepoint; geometry is
// REPRESENTATION only. This module resolves identity -> manifest entry -> asset_ref and exposes the pure placement
// math shared (formula-for-formula) by Web/R3F and the Blender importer. No numeric gematria/ELS data lives here.
import MANIFEST from "./hebrewGlyph/v1/manifest.v1.js";

export const HEBREW_GLYPH_MANIFEST = MANIFEST;
export const HEBREW_GLYPH_ASSET_REF_KIND = "hebrew_glyph_svg";

const BY_CODEPOINT = new Map(MANIFEST.glyphs.map((g) => [g.codepoint, g]));
const BY_ID = new Map(MANIFEST.glyphs.map((g) => [g.glyph_id, g]));

export const getHebrewGlyph = (codepoint) => BY_CODEPOINT.get(codepoint) || null;
export const getHebrewGlyphById = (glyphId) => BY_ID.get(glyphId) || null;

// Additive scene.v1 `asset_ref`: identity + version only (NO tessellation, NO renderer-specific bytes). Null when no asset.
export function buildGlyphAssetRef(codepoint) {
  const g = getHebrewGlyph(codepoint);
  if (!g) return null;
  return {
    kind: HEBREW_GLYPH_ASSET_REF_KIND,
    glyph_id: g.glyph_id,
    vector_version: g.vector_version,
    content_hash: g.content_hash,
    manifest_version: MANIFEST.manifest_version,
    profile_id: MANIFEST.profile.profile_id,
  };
}

// Resolves an asset_ref against the manifest; fails soft (null) on unknown glyph, kind, or lineage mismatch so
// renderers fall back to their text/canvas path instead of drawing a wrong/stale shape.
export function resolveGlyphAssetRef(ref) {
  if (!ref || ref.kind !== HEBREW_GLYPH_ASSET_REF_KIND) return null;
  const g = getHebrewGlyphById(ref.glyph_id);
  if (!g || g.content_hash !== ref.content_hash || g.vector_version !== ref.vector_version
    || ref.manifest_version !== MANIFEST.manifest_version || ref.profile_id !== MANIFEST.profile.profile_id) return null;
  return g;
}

// Common-scale placement of a glyph inside a node's bounds {width,height,depth}. Letters share ONE scale (so shapes keep
// relative proportions); the x-height body [212..800] spans 0.6*height, advance is clamped to 0.95*width.
// SVG point (x,y) -> node-local (X,Y):  X = (x - advance/2) * s ;  Y = (baseline_y - y) * s + baselineLocalY.
const BODY_SPAN = 800 - 212;
export function glyphPlacement(bounds, glyph) {
  const advance = glyph.anchor.advance_width, baseline = glyph.anchor.baseline_y;
  let scale = (0.6 * bounds.height) / BODY_SPAN;
  if (advance * scale > 0.95 * bounds.width) scale = (0.95 * bounds.width) / advance;
  return { scale, advance, baseline, baselineLocalY: -0.3 * bounds.height };
}
export function glyphPointToLocal(placement, x, y) {
  return { x: (x - placement.advance / 2) * placement.scale, y: (placement.baseline - y) * placement.scale + placement.baselineLocalY };
}
