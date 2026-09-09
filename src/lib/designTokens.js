// SOD1820 — Visual Foundation 2027
// Implementation extension of SOD1820_DESIGN_CONTRACT_V1.md.
// This module does not create a second design system. It fills token families
// that were previously implicit/local while color remains owned by palette.js,
// chrome color by chromeTheme.js, and world semantics by worlds.js.

export const SPACE = Object.freeze({
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
});

export const RADIUS = Object.freeze({
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
});

export const TYPE_SCALE = Object.freeze({
  micro: Object.freeze({ fontSize: 13, lineHeight: 1.45 }),
  small: Object.freeze({ fontSize: 14, lineHeight: 1.55 }),
  body: Object.freeze({ fontSize: 16, lineHeight: 1.7 }),
  lead: Object.freeze({ fontSize: 18, lineHeight: 1.65 }),
  title: Object.freeze({ fontSize: 24, lineHeight: 1.3 }),
  display: Object.freeze({ fontSize: 36, lineHeight: 1.18 }),
});

export const MOTION = Object.freeze({
  duration: Object.freeze({ instant: 0, fast: 120, normal: 180, slow: 280, ambient: 900 }),
  easing: Object.freeze({
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  }),
  reduced: Object.freeze({ duration: 0, transform: 'none', parallax: false, autoplayAmbient: false }),
});

export const BREAKPOINT = Object.freeze({
  acceptanceNarrow: 320,
  acceptanceMobile: 360,
  acceptanceWideMobile: 390,
  compact: 640,
  medium: 900,
  wide: 1200,
});

export const LAYOUT = Object.freeze({
  contentMax: 1200,
  readingMax: 760,
  controlMinHeight: 44,
  controlMinWidth: 44,
  focusRingWidth: 2,
  focusRingOffset: 2,
});

export const DIRECTION = Object.freeze({
  inlineStart: 'start',
  inlineEnd: 'end',
  textStart: 'start',
  textEnd: 'end',
});

// Role vocabulary only. These are environment semantics, not hard-coded images
// and not a second theme/palette owner. Asset selection/generation remains a
// representation concern under the Design Contract.
export const ENVIRONMENT = Object.freeze({
  DARK_OBSERVATORY: 'dark_observatory',
  LIGHT_CELESTIAL: 'light_celestial',
  RESEARCH_LAB: 'research_lab',
  SPATIAL_JOURNEY: 'spatial_journey',
});

export const VISUAL_ASSET_STATE = Object.freeze({
  CURATED: 'curated_asset',
  GENERATED_CANDIDATE: 'generated_candidate',
  CANONICAL_FALLBACK: 'canonical_fallback',
});

export function motionForPreference(reducedMotion) {
  return reducedMotion ? MOTION.reduced : MOTION;
}

export function responsiveBand(width) {
  if (width < BREAKPOINT.compact) return 'compact';
  if (width < BREAKPOINT.medium) return 'medium';
  if (width < BREAKPOINT.wide) return 'wide';
  return 'xwide';
}

export function requiresContextualVisualAsset(surfaceKind) {
  return ['product', 'journey', 'major_experience', 'editorial_experience'].includes(surfaceKind);
}
