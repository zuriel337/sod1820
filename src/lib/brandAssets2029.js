// Centralized Brand Core asset pointers for 2029 projections.
// Human-Gate-approved full lockup candidate; partial-mark crops are forbidden.
// The full source remains owned by canonical Supabase media storage and Brand Core provenance.
export const BRAND_LOCKUP_2029 = Object.freeze({
  state: "approved_candidate",
  alt: "כי לה׳ המלוכה",
  src: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/brand/logo-v2-candidate/sod1820_primary_lockup_v2_transparent_candidate.png",
  width: 1254,
  height: 1254,
  sha256: "3f8a2a2fdc0a5a141d10b63bc633eefbd9ba2bfe7dbf7521f3984c21830dcd18",
  storagePath: "media/sod1820/2029/brand/logo-v2-candidate/sod1820_primary_lockup_v2_transparent_candidate.png",
});

// Delivery derivative of the complete approved lockup, not a new brand mark.
// Source fingerprint verified before resize; no crop, redraw, or text removal.
// 128 px preserves detail at 3x DPR for the 40 px navigation image.
export const BRAND_LOCKUP_NAV_2029 = Object.freeze({
  state: BRAND_LOCKUP_2029.state,
  alt: BRAND_LOCKUP_2029.alt,
  src: "/brand/2029/canonical-lockup-128.webp",
  width: 128,
  height: 128,
  sourceSha256: BRAND_LOCKUP_2029.sha256,
});
