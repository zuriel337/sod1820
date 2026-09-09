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

  // The current historical crown remains the canonical Heritage Mark until explicitly superseded.
  heritageMark: Object.freeze({
    url: "/logo.png",
    role: "heritage",
    status: "PRESERVED",
    labelHe: "הכתר המקורי · מורשת כי לה׳ המלוכה",
    labelEn: "Original Crown · Kingdom Rise Heritage",
  }),

  // Human Gate approved the blue-gold crown direction. The exact production asset is intentionally
  // not hard-coded until the final master asset is selected/exported and separately released.
  primaryDigitalMark: Object.freeze({
    role: "primary-digital",
    direction: "blue-gold crown remaster/evolution",
    status: "DIRECTION_APPROVED_ASSET_PENDING",
    labelHe: "הכתר החדש · הדור הבא",
    labelEn: "Primary Crown · Kingdom Rise",
  }),

  transition: Object.freeze({
    mode: "heritage-to-primary",
    randomSwap: false,
    motionPurpose: "brand-history-and-comeback",
    reducedMotionFallback: "static-primary-with-heritage-seal",
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
