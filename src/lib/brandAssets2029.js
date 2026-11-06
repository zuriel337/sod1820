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

// Larger delivery derivative of the same complete approved lockup, for the entrance intro.
// Resized from the fingerprint-verified source; no crop, redraw, recolor or text removal.
export const BRAND_LOCKUP_HERO_2029 = Object.freeze({
  state: BRAND_LOCKUP_2029.state,
  alt: BRAND_LOCKUP_2029.alt,
  src: "/brand/2029/canonical-lockup-384.webp",
  width: 384,
  height: 384,
  sourceSha256: BRAND_LOCKUP_2029.sha256,
});

// Byte-exact local delivery of the approved full square lockup for installed
// applications. A fingerprinted URL updates the icon without changing PWA id.
export const BRAND_APP_ICON_2029 = Object.freeze({
  ...BRAND_LOCKUP_2029,
  src: "/brand/2029/app-icon-3f8a2a2fdc0a.png",
});

// Browser-tab, bookmark and crawler icons: resize-only delivery derivatives of the
// same complete approved lockup (fingerprint-verified source, transparent, no crop,
// redraw, recolor or text removal). The installed-app manifest keeps the byte-exact
// BRAND_APP_ICON_2029 above; these only answer /favicon.ico and /apple-touch-icon*.png,
// which the document function used to answer with HTML.
export const BRAND_SITE_ICONS_2029 = Object.freeze({
  state: BRAND_LOCKUP_2029.state,
  sourceSha256: BRAND_LOCKUP_2029.sha256,
  png48: Object.freeze({ src: "/brand/2029/icon-48-3f8a2a2fdc0a.png", width: 48, height: 48, type: "image/png" }),
  appleTouch180: Object.freeze({ src: "/brand/2029/apple-touch-icon-180-3f8a2a2fdc0a.png", width: 180, height: 180, type: "image/png" }),
  ico: Object.freeze({ src: "/brand/2029/favicon-3f8a2a2fdc0a.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" }),
});

// User-selected decorative Home atmosphere, 2 Nov 2026; not a content source or Brand mark.
export const HOME_ATMOSPHERE_2029 = Object.freeze({"desktop": "/backgrounds/2029/home-cosmos-desktop-5113c94ba6e5.webp", "mobile": "/backgrounds/2029/home-cosmos-mobile-8eaaeef46082.webp"});
