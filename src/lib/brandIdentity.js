// SOD1820 brand evolution projection under SOD1820_DESIGN_CONTRACT_V1.
// OWNER CHECK: EXTEND_EXISTING. This is not a second brand/design registry.

export const BRAND_IDENTITY = Object.freeze({
  publicNameHe: "כי לה׳ המלוכה",
  publicNameEn: "KINGDOM RISE",
  canonicalLineEn: "For the Kingdom Is the Lord’s",
  technicalName: "SOD1820",
  storyLineHe: "כ־15 שנות דרך · עידן חדש",
  continuityLineHe: "אותו שורש. התגלמות חדשה.",
  comebackLineHe: "אותה הדרך — עולם חדש.",

  // One Master Mark across languages: Hebrew and English never get competing logo identities.
  multilingualMarkPolicy: Object.freeze({
    sameMasterMark: true,
    hebrewName: "כי לה׳ המלוכה",
    englishName: "KINGDOM RISE",
    englishCanonicalLine: "For the Kingdom Is the Lord’s",
    technicalName: "SOD1820",
  }),

  // The current historical crown remains the canonical Heritage Mark.
  heritageMark: Object.freeze({
    url: "/logo.png",
    role: "heritage",
    status: "PRESERVED",
    labelHe: "הכתר המקורי · מורשת כי לה׳ המלוכה",
    labelEn: "Original Crown · Kingdom Rise Heritage",
  }),

  // Human Gate locked the blue-gold crown identity. A clean production asset export is still pending;
  // that pending export may refine geometry/rendering quality but may not redesign the identity.
  primaryDigitalMark: Object.freeze({
    role: "primary-digital",
    direction: "locked blue-gold royal crown",
    identityStatus: "HUMAN_GATE_LOCKED",
    assetStatus: "MASTER_ASSET_PENDING_EXPORT",
    labelHe: "הכתר הראשי · הדור החדש",
    labelEn: "Primary Crown · Kingdom Rise",
    immutableDNA: Object.freeze([
      "royal-crown-silhouette",
      "deep-midnight-royal-blue-body",
      "luminous-polished-gold-frame",
      "blue-gemstone-family",
      "strong-central-vertical-crest",
      "symmetrical-premium-celestial-character",
    ]),
  }),

  variants: Object.freeze({
    symbol: "primary-crown-only",
    hebrewLockup: "primary-crown-plus-כי-לה׳-המלוכה",
    englishLockup: "primary-crown-plus-KINGDOM-RISE",
    horizontal: "localized-horizontal-lockup",
    compact: "simplified-small-size-primary-crown",
    monochrome: "single-color-same-geometry",
    heritage: "primary-dominant-with-bounded-heritage-reference",
    motion: "same-master-crown-motion-projection",
    spatial3d: "same-master-crown-3d-projection",
  }),

  transition: Object.freeze({
    mode: "heritage-to-primary",
    randomSwap: false,
    motionPurpose: "brand-history-and-comeback",
    reducedMotionFallback: "static-primary-with-heritage-seal",
  }),

  changeControl: Object.freeze({
    humanGateLocked: true,
    allowedWithoutReopening: Object.freeze([
      "cleanup-redraw",
      "vectorization",
      "animation",
      "3d-modeling",
      "material-lighting-refinement",
      "responsive-simplification",
      "localized-text-lockups",
      "technical-export-adaptation",
    ]),
    requiresNewHumanGate: Object.freeze([
      "crown-identity-change",
      "silhouette-change",
      "blue-gold-family-change",
      "brand-hierarchy-change",
      "replacement-with-different-master-mark",
    ]),
  }),
});

export const BRAND_COPY = Object.freeze({
  aboutTitle: "אותו כתר. דור חדש.",
  aboutBody:
    "כי לה׳ המלוכה מתפתחת מתוך אותה דרך שנבנתה לאורך כ־15 שנה. הכתר המקורי נשמר כחלק מהמורשת והזיכרון של האתר, ובמקביל נבנית לו התגלמות דיגיטלית חדשה בכחול־זהב — מותאמת למערכת החדשה, לאנימציה ולמרחב תלת־ממדי.",
  contactBody:
    "הגעתם לאותה דרך, בדור חדש. הכתר המקורי נשמר כסמל המורשת של כי לה׳ המלוכה, והמערכת החדשה נבנית סביבו — לא במקומו.",
  englishBrandLockup: "KINGDOM RISE",
  englishCanonicalLine: "For the Kingdom Is the Lord’s",
});
