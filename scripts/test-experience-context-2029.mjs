import assert from "node:assert/strict";
import {
  EXPERIENCE_SURFACE,
  SPATIAL_LEVEL,
  resolveExperienceContext,
} from "../src/lib/experienceContext.js";
import { normalizeResearchContext, mergeResearchContext } from "../src/lib/research/researchContext.js";
import {
  EXPERIENCE_CAPABILITY,
  USAGE_RESOURCE,
  composeCapabilityProjection,
  getExperienceCapabilityContract,
} from "../src/lib/experienceCapabilities.js";

for (const [surface, expectedQuestion] of [
  [EXPERIENCE_SURFACE.HOME, "מאיפה מתחילים?"],
  [EXPERIENCE_SURFACE.NUMBER, "מה המספר הזה מראה?"],
  [EXPERIENCE_SURFACE.BOOKS, "מה המקור אומר?"],
]) {
  const ctx = resolveExperienceContext({ surface, locale: "he-IL" });
  assert.equal(ctx.surface, surface);
  assert.equal(ctx.experience.question, expectedQuestion);
  assert.equal(ctx.brand.identity, "סוד 1820");
  assert.equal(ctx.experience.truthSafe, true);
}

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

const postListen = getExperienceCapabilityContract(EXPERIENCE_CAPABILITY.POST_LISTEN);
assert.equal(postListen.availabilityFlag, "lock_post_listen");
assert.equal(postListen.actionLabelHe, "האזן לפוסט");
assert.ok(postListen.meters.includes(USAGE_RESOURCE.CACHED_MEDIA_DELIVERY));
assert.equal(postListen.fallback, "read_text");

const razielVoice = composeCapabilityProjection(EXPERIENCE_CAPABILITY.RAZIEL_VOICE, {
  availability: "building",
  entitlement: "premium_required",
  budget: "available",
});
assert.equal(razielVoice.availabilityFlag, "lock_raziel_voice");
assert.equal(razielVoice.serverGateRequiredBeforeExpensiveIO, true);
assert.equal(razielVoice.pricingCanonicalHere, false);
assert.ok(razielVoice.meters.includes(USAGE_RESOURCE.AUDIO_SESSION_SECONDS));
assert.equal(razielVoice.fallback, "raziel_text");

const researchMedia = getExperienceCapabilityContract(EXPERIENCE_CAPABILITY.RESEARCH_TO_MEDIA);
assert.equal(researchMedia.fallback, "canonical_share_card");
assert.ok(researchMedia.meters.includes(USAGE_RESOURCE.MEDIA_GENERATION));

console.log("Experience Context 2029 smoke gate: PASS");


const focusedNumberContext = normalizeResearchContext({
  subject: { id: "98", type: "number", label: "98", href: "/2029/number/98" },
  selection: {
    entityId: "98",
    entityType: "number",
    expression: "חנם",
    method: "רגיל",
    resultValue: 98,
    focusKind: "expression",
    crossingPartner: "סלח",
  },
  lens: "number",
  returnTo: {
    href: "/topic/98-ikuv-geula",
    label: "98 — עיכוב",
    subject: { id: "98-ikuv-geula", type: "topic", label: "98 — עיכוב" },
    selection: { entityId: "98-ikuv-geula", entityType: "topic" },
    lens: "topic",
  },
});
assert.equal(focusedNumberContext.selection.expression, "חנם");
assert.equal(focusedNumberContext.selection.method, "רגיל");
assert.equal(focusedNumberContext.selection.resultValue, 98);
assert.equal(focusedNumberContext.selection.focusKind, "expression");
assert.equal(focusedNumberContext.selection.crossingPartner, "סלח");

const exactFocusReturn = mergeResearchContext(focusedNumberContext, {
  subject: focusedNumberContext.returnTo.subject,
  selection: focusedNumberContext.returnTo.selection,
  lens: focusedNumberContext.returnTo.lens,
  dimensions: {},
  journey: null,
  returnTo: null,
});
assert.equal(exactFocusReturn.subject.type, "topic");
assert.equal(exactFocusReturn.selection.entityType, "topic");
