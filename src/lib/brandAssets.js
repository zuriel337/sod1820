// SOD1820 Brand Core 2029 — physical asset binding only.
// Owner: SOD1820_DESIGN_CONTRACT_V1.md + sod1820_canonical_identity_law.
// This is not a Brand System/Store/Registry. It binds protected asset identities
// to verified physical files and deliberately fails closed while the transparent
// Primary 2029 pack is incomplete.

export const BRAND_ASSET_MANIFEST_PATH = "/brand/2029/manifest.json";

export const HERITAGE_LOGO = Object.freeze({
  path: "/logo.png",
  role: "HERITAGE_COMPATIBILITY",
  primary2029: false,
  preserve: true,
});

export const PRIMARY_2029_APPROVED_REFERENCE = Object.freeze({
  path: "/brand/2029/reference/primary-lockup-approved-2026-09-17.jpg",
  role: "APPROVED_ARTWORK_REFERENCE_NOT_TRANSPARENT_MASTER",
  mime: "image/jpeg",
  width: 1536,
  height: 1536,
  sha256: "c3aedacaf5f544320bd9d242ad07e4468ea5097648927d2a04b0f1916f00ab9e",
});

export const REQUIRED_PRIMARY_BRAND_ASSET_KEYS = Object.freeze([
  "master_crown_transparent",
  "hebrew_heritage_wordmark_transparent",
  "hebrew_master_lockup",
  "icon_crown_crop",
  "asset_metadata_dimensions_checksum_clearspace",
]);

const PRIMARY_2029_PROTECTED_ASSETS = Object.freeze({
  master_crown_transparent: null,
  hebrew_heritage_wordmark_transparent: null,
  hebrew_master_lockup: null,
  icon_crown_crop: null,
  asset_metadata_dimensions_checksum_clearspace: null,
});

export function resolvePrimaryBrandAsset(assetKey) {
  if (!REQUIRED_PRIMARY_BRAND_ASSET_KEYS.includes(assetKey)) return null;
  // No fallback to HERITAGE_LOGO. A missing Primary asset stays missing.
  return PRIMARY_2029_PROTECTED_ASSETS[assetKey] || null;
}

export function isPrimaryBrandPackReady() {
  return REQUIRED_PRIMARY_BRAND_ASSET_KEYS.every((key) => Boolean(PRIMARY_2029_PROTECTED_ASSETS[key]));
}
