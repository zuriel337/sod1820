// SOD1820 — Experience Context Resolver 2029
// Runtime composer only. This is NOT a new owner, design system, brand registry,
// voice system or truth layer. It consumes existing canonical owners/tokens and
// returns one projection context for web, spatial, audio, AI, share and video renderers.

import { F } from "../theme.js";
import { STREAMS, isStream } from "./stream.js";
import { ENVIRONMENT, MOTION, motionForPreference } from "./designTokens.js";

export const EXPERIENCE_SURFACE = Object.freeze({
  HOME: "home",
  WORLD: "world",
  NUMBER: "number",
  BOOKS: "books",
  HEICHAL: "heichal",
  JOURNEY: "journey",
  RAZIEL: "raziel",
  ELS: "els",
  POST: "post",
  SHARE: "share",
  REMOTION: "remotion",
  AI_IMAGE: "ai_image",
  XR: "xr",
});

export const SPATIAL_LEVEL = Object.freeze({
  S0: "S0_static",
  S1: "S1_micro_motion",
  S2: "S2_layered_depth",
  S3: "S3_canvas_2_5d",
  S4: "S4_gpu_3d",
  S5: "S5_xr",
});

const SPATIAL_ORDER = Object.freeze([
  SPATIAL_LEVEL.S0,
  SPATIAL_LEVEL.S1,
  SPATIAL_LEVEL.S2,
  SPATIAL_LEVEL.S3,
  SPATIAL_LEVEL.S4,
  SPATIAL_LEVEL.S5,
]);

export const VOICE_MODE = Object.freeze({
  NONE: "none",
  ON_DEMAND: "on_demand",
  OPT_IN: "opt_in",
  GUIDED: "guided_available",
  CONVERSATIONAL: "conversational",
});

export const CAPTION_MODE = Object.freeze({
  NONE: "none",
  WHEN_VOICE: "timed_when_voice",
  ALWAYS_FOR_AUTHORED_VIDEO: "timed_authored_video",
});

const P = MOTION.pattern;

// Implementation projection of the Human-Gate approved Experience Projection Matrix.
// These are surface defaults/ceilings, not new semantic owners.
const SURFACE_PROFILES = Object.freeze({
  [EXPERIENCE_SURFACE.HOME]: Object.freeze({
    question: "מאיפה מתחילים?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "low_orientation",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S1,
    spatialMax: SPATIAL_LEVEL.S2,
    voiceMode: VOICE_MODE.NONE,
    captionMode: CAPTION_MODE.NONE,
    ambience: "off_by_default",
    spatialAudio: false,
    aiVisualFreedom: "low_brand_safe",
    brandLockup: "identity_required",
  }),
  [EXPERIENCE_SURFACE.WORLD]: Object.freeze({
    question: "מה מתחבר?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "medium",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.orbit, P.travel, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S2,
    spatialMax: SPATIAL_LEVEL.S4,
    voiceMode: VOICE_MODE.OPT_IN,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "contextual_atmosphere",
    spatialAudio: false,
    aiVisualFreedom: "medium_scene_only",
    brandLockup: "identity_with_contextual_expression",
  }),
  [EXPERIENCE_SURFACE.NUMBER]: Object.freeze({
    question: "מה המספר הזה מראה?",
    environment: ENVIRONMENT.RESEARCH_LAB,
    motionIntensity: "low_explanatory",
    motionPatterns: Object.freeze([P.reveal, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S1,
    spatialMax: SPATIAL_LEVEL.S3,
    voiceMode: VOICE_MODE.ON_DEMAND,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "quiet_research",
    spatialAudio: false,
    aiVisualFreedom: "low_evidence_safe",
    brandLockup: "identity_compact",
  }),
  [EXPERIENCE_SURFACE.BOOKS]: Object.freeze({
    question: "מה המקור אומר?",
    environment: ENVIRONMENT.RESEARCH_LAB,
    motionIntensity: "low_editorial",
    motionPatterns: Object.freeze([P.reveal, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S0,
    spatialMax: SPATIAL_LEVEL.S2,
    voiceMode: VOICE_MODE.ON_DEMAND,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "quiet_research",
    spatialAudio: false,
    aiVisualFreedom: "low_evidence_safe",
    brandLockup: "identity_editorial",
  }),
  [EXPERIENCE_SURFACE.HEICHAL]: Object.freeze({
    question: "איך בודקים?",
    environment: ENVIRONMENT.RESEARCH_LAB,
    motionIntensity: "low",
    motionPatterns: Object.freeze([P.reveal, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S1,
    spatialMax: SPATIAL_LEVEL.S4,
    voiceMode: VOICE_MODE.ON_DEMAND,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "quiet_research",
    spatialAudio: false,
    aiVisualFreedom: "low_evidence_safe",
    brandLockup: "identity_compact",
  }),
  [EXPERIENCE_SURFACE.JOURNEY]: Object.freeze({
    question: "לאן זה מוביל?",
    environment: ENVIRONMENT.SPATIAL_JOURNEY,
    motionIntensity: "high_but_restrained",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.orbit, P.travel, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S3,
    spatialMax: SPATIAL_LEVEL.S5,
    voiceMode: VOICE_MODE.GUIDED,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "cinematic_contextual",
    spatialAudio: true,
    aiVisualFreedom: "high_scene_only",
    brandLockup: "identity_with_contextual_expression",
  }),
  [EXPERIENCE_SURFACE.RAZIEL]: Object.freeze({
    question: "מה כדאי לעשות עכשיו?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "low_presence",
    motionPatterns: Object.freeze([P.presence, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S1,
    spatialMax: SPATIAL_LEVEL.S3,
    voiceMode: VOICE_MODE.CONVERSATIONAL,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "minimal_presence",
    spatialAudio: false,
    aiVisualFreedom: "low_identity_safe",
    brandLockup: "identity_compact",
  }),
  [EXPERIENCE_SURFACE.ELS]: Object.freeze({
    question: "מה המבנה מראה?",
    environment: ENVIRONMENT.RESEARCH_LAB,
    motionIntensity: "medium_explanatory",
    motionPatterns: Object.freeze([P.reveal, P.orbit, P.focus, P.travel, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S2,
    spatialMax: SPATIAL_LEVEL.S4,
    voiceMode: VOICE_MODE.ON_DEMAND,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "quiet_research",
    spatialAudio: true,
    aiVisualFreedom: "low_evidence_safe",
    brandLockup: "identity_compact",
  }),
  [EXPERIENCE_SURFACE.POST]: Object.freeze({
    question: "מה הסיפור ומה המקור?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "low_editorial",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S0,
    spatialMax: SPATIAL_LEVEL.S2,
    voiceMode: VOICE_MODE.ON_DEMAND,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "off_by_default",
    spatialAudio: false,
    aiVisualFreedom: "medium_editorial_scene_only",
    brandLockup: "identity_editorial",
  }),
  [EXPERIENCE_SURFACE.SHARE]: Object.freeze({
    question: "מה חייב לעבור בשנייה אחת?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "static_or_short_derivative",
    motionPatterns: Object.freeze([P.reveal, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S0,
    spatialMax: SPATIAL_LEVEL.S1,
    voiceMode: VOICE_MODE.NONE,
    captionMode: CAPTION_MODE.NONE,
    ambience: "none",
    spatialAudio: false,
    aiVisualFreedom: "low_brand_safe",
    brandLockup: "identity_required",
  }),
  [EXPERIENCE_SURFACE.REMOTION]: Object.freeze({
    question: "איך אותה חוויה הופכת לוידאו?",
    environment: ENVIRONMENT.SPATIAL_JOURNEY,
    motionIntensity: "authored",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.orbit, P.travel, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S2,
    spatialMax: SPATIAL_LEVEL.S4,
    voiceMode: VOICE_MODE.GUIDED,
    captionMode: CAPTION_MODE.ALWAYS_FOR_AUTHORED_VIDEO,
    ambience: "authored_soundscape",
    spatialAudio: false,
    aiVisualFreedom: "medium_scene_only",
    brandLockup: "identity_required",
  }),
  [EXPERIENCE_SURFACE.AI_IMAGE]: Object.freeze({
    question: "איזו סצנה משרתת את התוכן?",
    environment: ENVIRONMENT.DARK_OBSERVATORY,
    motionIntensity: "none",
    motionPatterns: Object.freeze([]),
    spatialDefault: SPATIAL_LEVEL.S0,
    spatialMax: SPATIAL_LEVEL.S0,
    voiceMode: VOICE_MODE.NONE,
    captionMode: CAPTION_MODE.NONE,
    ambience: "none",
    spatialAudio: false,
    aiVisualFreedom: "high_scene_only_no_logo_generation",
    brandLockup: "canonical_assets_composited_after_generation",
  }),
  [EXPERIENCE_SURFACE.XR]: Object.freeze({
    question: "איך נכנסים לאותו עולם במרחב?",
    environment: ENVIRONMENT.SPATIAL_JOURNEY,
    motionIntensity: "immersive_contextual",
    motionPatterns: Object.freeze([P.reveal, P.presence, P.orbit, P.travel, P.focus, P.settle]),
    spatialDefault: SPATIAL_LEVEL.S5,
    spatialMax: SPATIAL_LEVEL.S5,
    voiceMode: VOICE_MODE.GUIDED,
    captionMode: CAPTION_MODE.WHEN_VOICE,
    ambience: "spatial_contextual",
    spatialAudio: true,
    aiVisualFreedom: "high_scene_only",
    brandLockup: "identity_spatial_contextual",
  }),
});

function normalizeLocale(locale) {
  return String(locale || "he").trim().toLowerCase().split(/[-_]/)[0] || "he";
}

function normalizeSurface(surface) {
  const value = String(surface || EXPERIENCE_SURFACE.WORLD).toLowerCase();
  if (SURFACE_PROFILES[value]) return value;
  throw new Error(`Unknown SOD1820 experience surface: ${surface}`);
}

function levelIndex(level) {
  const index = SPATIAL_ORDER.indexOf(level);
  return index < 0 ? 0 : index;
}

function lowerLevel(a, b) {
  return SPATIAL_ORDER[Math.min(levelIndex(a), levelIndex(b))];
}

function upperBound(level, max) {
  return SPATIAL_ORDER[Math.min(levelIndex(level), levelIndex(max))];
}

function resolveSpatialLevel(profile, requestedLevel, capabilities, reducedMotion) {
  let level = upperBound(requestedLevel || profile.spatialDefault, profile.spatialMax);
  const caps = capabilities || {};

  // Accessibility/performance downgrade changes richness, never meaning/capability identity.
  if (reducedMotion) level = lowerLevel(level, SPATIAL_LEVEL.S2);
  if (caps.lowPower || caps.slowNetwork) level = lowerLevel(level, SPATIAL_LEVEL.S2);
  if (caps.canvas === false) level = lowerLevel(level, SPATIAL_LEVEL.S2);
  if (caps.webgl === false) level = lowerLevel(level, SPATIAL_LEVEL.S3);
  if (level === SPATIAL_LEVEL.S5 && caps.xr !== true) level = SPATIAL_LEVEL.S4;

  return level;
}

function brandExpression(locale) {
  if (locale === "he") return "כי לה׳ המלוכה";
  if (locale === "en") return "KINGDOM RISE";
  return null; // Never invent/auto-translate an unapproved canonical brand expression.
}

function canonicalIdentity(locale) {
  return locale === "he" ? "סוד 1820" : "SOD1820";
}

function resolveLens(lens) {
  const key = isStream(lens) ? lens : "kingdom";
  const meta = STREAMS[key];
  return Object.freeze({
    key,
    label: meta.label,
    tagline: meta.tagline,
    home: meta.home,
  });
}

/**
 * Build one renderer-neutral context from the canonical Brand/Experience owners.
 * Renderers may consume only the parts they understand; they must not reinterpret
 * truth, identity, protected artwork or locale expressions.
 */
export function resolveExperienceContext({
  surface = EXPERIENCE_SURFACE.WORLD,
  locale = "he",
  lens = "kingdom",
  reducedMotion = false,
  requestedSpatialLevel,
  capabilities = {},
  voiceRequested = false,
} = {}) {
  const surfaceKey = normalizeSurface(surface);
  const language = normalizeLocale(locale);
  const profile = SURFACE_PROFILES[surfaceKey];
  const spatialLevel = resolveSpatialLevel(profile, requestedSpatialLevel, capabilities, reducedMotion);
  const voiceAvailable = profile.voiceMode !== VOICE_MODE.NONE;
  const voiceActive = voiceAvailable && Boolean(voiceRequested);

  return Object.freeze({
    version: "experience-context-2029-v1",
    surface: surfaceKey,
    locale: language,
    lens: resolveLens(lens),

    brand: Object.freeze({
      identity: canonicalIdentity(language),
      canonicalHebrewIdentity: "סוד 1820",
      canonicalLatinIdentity: "SOD1820",
      expression: brandExpression(language),
      masterMark: Object.freeze({ assetKey: "master_crown_transparent", protected: true }),
      hebrewHeritageWordmark: Object.freeze({ assetKey: "hebrew_heritage_wordmark_transparent", protected: true }),
      hebrewMasterLockup: Object.freeze({ assetKey: "hebrew_master_lockup", protected: true }),
      icon: Object.freeze({ assetKey: "icon_crown_crop", protected: true }),
      lockupPolicy: profile.brandLockup,
      generateCanonicalArtworkWithAI: false,
      compositeCanonicalArtworkAfterGeneration: true,
    }),

    typography: Object.freeze({
      ui: F.ui,
      body: F.body,
      display: F.display,
      numeric: F.numeric,
      protectedHebrewWordmarkIsArtwork: true,
    }),

    motion: Object.freeze({
      semanticPatterns: profile.motionPatterns,
      intensity: profile.motionIntensity,
      timing: motionForPreference(reducedMotion),
      reduced: Boolean(reducedMotion),
      protectedArtworkMayMorph: false,
    }),

    spatial: Object.freeze({
      defaultLevel: profile.spatialDefault,
      maximumLevel: profile.spatialMax,
      effectiveLevel: spatialLevel,
      rendererPolicy: "maximum_capability_below_selective_activation_above",
      semanticsSurviveDowngrade: true,
    }),

    voice: Object.freeze({
      masterProfile: "sod1820_master_voice",
      mode: profile.voiceMode,
      available: voiceAvailable,
      active: voiceActive,
      autoplay: false,
      delivery: "calm_curious_precise_restrained",
      ttsProviderIsCanonical: false,
      transcriptRequiredWhenActive: true,
      captionMode: profile.captionMode,
      timedCaptionsPreferred: true,
    }),

    audio: Object.freeze({
      ambience: profile.ambience,
      spatialAudioAllowed: profile.spatialAudio,
      soundNeverUpgradesTruth: true,
    }),

    ai: Object.freeze({
      visualFreedom: profile.aiVisualFreedom,
      generateSceneNotLogo: true,
      requiredBrandTextBakedIntoGeneratedBackground: false,
      preserveTruthBoundary: true,
    }),

    safeArea: Object.freeze({
      required: true,
      coordinates: "surface_projection",
      preserveAcrossCrop: true,
      protectBrandArtwork: true,
      protectCriticalText: true,
    }),

    experience: Object.freeze({
      question: profile.question,
      environmentRole: profile.environment,
      oneVoiceAdaptiveDepth: true,
      truthSafe: true,
    }),
  });
}

export function getExperienceSurfaceProfile(surface) {
  return SURFACE_PROFILES[normalizeSurface(surface)];
}
