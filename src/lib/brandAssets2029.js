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

// Byte-exact local delivery of the approved full square lockup for installed
// applications. A fingerprinted URL updates the icon without changing PWA id.
export const BRAND_APP_ICON_2029 = Object.freeze({
  ...BRAND_LOCKUP_2029,
  src: "/brand/2029/app-icon-3f8a2a2fdc0a.png",
});

// User-selected decorative Home atmosphere, 2 Nov 2026; not a content source or Brand mark.
export const HOME_ATMOSPHERE_2029 = Object.freeze({"desktop": "/backgrounds/2029/home-cosmos-desktop-5113c94ba6e5.webp", "mobile": "/backgrounds/2029/home-cosmos-mobile-8eaaeef46082.webp"});
