import assert from "node:assert/strict";
import {
  EXPERIENCE_SURFACE,
  SPATIAL_LEVEL,
  resolveExperienceContext,
} from "../src/lib/experienceContext.js";

const worldHe = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.WORLD,
  locale: "he-IL",
  lens: "kingdom",
});
assert.equal(worldHe.brand.identity, "סוד 1820");
assert.equal(worldHe.brand.canonicalLatinIdentity, "SOD1820");
assert.equal(worldHe.brand.expression, "כי לה׳ המלוכה");
assert.equal(worldHe.lens.key, "kingdom");
assert.equal(worldHe.brand.generateCanonicalArtworkWithAI, false);
assert.equal(worldHe.spatial.effectiveLevel, SPATIAL_LEVEL.S2);

const worldEn = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.WORLD,
  locale: "en-US",
  lens: "reality",
});
assert.equal(worldEn.brand.identity, "SOD1820");
assert.equal(worldEn.brand.expression, "KINGDOM RISE");
assert.equal(worldEn.lens.key, "reality");
assert.equal(worldEn.lens.label, "קוד המציאות");

const journey = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.JOURNEY,
  requestedSpatialLevel: SPATIAL_LEVEL.S5,
  capabilities: { xr: false, webgl: true },
});
assert.equal(journey.spatial.maximumLevel, SPATIAL_LEVEL.S5);
assert.equal(journey.spatial.effectiveLevel, SPATIAL_LEVEL.S4);
assert.equal(journey.voice.autoplay, false);
assert.equal(journey.voice.transcriptRequiredWhenActive, true);

const reducedJourney = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.JOURNEY,
  requestedSpatialLevel: SPATIAL_LEVEL.S5,
  reducedMotion: true,
  capabilities: { xr: true, webgl: true },
});
assert.equal(reducedJourney.spatial.effectiveLevel, SPATIAL_LEVEL.S2);
assert.equal(reducedJourney.motion.reduced, true);

const lowPowerEls = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.ELS,
  requestedSpatialLevel: SPATIAL_LEVEL.S4,
  capabilities: { lowPower: true, webgl: true },
});
assert.equal(lowPowerEls.spatial.effectiveLevel, SPATIAL_LEVEL.S2);
assert.equal(lowPowerEls.spatial.semanticsSurviveDowngrade, true);

const share = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.SHARE,
  voiceRequested: true,
});
assert.equal(share.voice.available, false);
assert.equal(share.voice.active, false);
assert.equal(share.spatial.effectiveLevel, SPATIAL_LEVEL.S0);

const aiImage = resolveExperienceContext({ surface: EXPERIENCE_SURFACE.AI_IMAGE });
assert.equal(aiImage.ai.generateSceneNotLogo, true);
assert.equal(aiImage.brand.compositeCanonicalArtworkAfterGeneration, true);
assert.equal(aiImage.ai.requiredBrandTextBakedIntoGeneratedBackground, false);

console.log("Experience Context 2029 smoke gate: PASS");
