export const ELS_MATRIX_PROFILE = Object.freeze({
  GUIDED: "GUIDED",
  CLASSIC: "CLASSIC",
  RESEARCH: "RESEARCH",
});

const clean = (value) => String(value ?? "").trim().toUpperCase();

export function normalizeElsMatrixProfile(value, fallback = ELS_MATRIX_PROFILE.GUIDED) {
  const normalized = clean(value);
  if (normalized === ELS_MATRIX_PROFILE.GUIDED) return ELS_MATRIX_PROFILE.GUIDED;
  if (normalized === ELS_MATRIX_PROFILE.CLASSIC) return ELS_MATRIX_PROFILE.CLASSIC;
  if (normalized === ELS_MATRIX_PROFILE.RESEARCH) return ELS_MATRIX_PROFILE.RESEARCH;
  return fallback;
}

export function projectElsMatrixProfile({
  profile,
  replayMatched = false,
  researchSignal = "COLD",
  razielAvailable = false,
  explicitDeepResearch = false,
} = {}) {
  const mode = normalizeElsMatrixProfile(profile);
  const signal = clean(researchSignal) || "COLD";
  const isClassic = mode === ELS_MATRIX_PROFILE.CLASSIC;
  const isGuided = mode === ELS_MATRIX_PROFILE.GUIDED;
  const isResearch = mode === ELS_MATRIX_PROFILE.RESEARCH;
  const supportsVerifiedResearch = !isClassic;

  return Object.freeze({
    contract: "els_matrix_profile_v1",
    profile: mode,
    defaultProfile: ELS_MATRIX_PROFILE.GUIDED,
    replayMatched: Boolean(replayMatched),
    representation: Object.freeze({
      primary: "2D",
      layeredAllowed: isResearch,
      matrixVolumeAllowed: isResearch,
      true3dRequired: false,
    }),
    interaction: Object.freeze({
      directMatrix: true,
      manualFindingActions: true,
      sourceContext: true,
      adaptiveResearchAvailable: isResearch,
      progressiveDisclosure: supportsVerifiedResearch,
      storyEntry: isGuided,
      advancedWorkspace: mode === ELS_MATRIX_PROFILE.RESEARCH,
    }),
    compute: Object.freeze({
      heavyIoOnEntry: false,
      modeSwitchTriggersReplay: false,
      modeSwitchTriggersSearch: false,
      deepResearchPolicy: isGuided
        ? "BOUNDED_GUIDED_PLAN_ONLY"
        : isResearch
        ? "EXPLICIT_ACTION_OR_QUALIFIED_BOUNDED_PLAN"
        : "EXPLICIT_MANUAL_ONLY",
      deepResearchEligible: isResearch && (
        Boolean(explicitDeepResearch) || ["WARM", "HOT"].includes(signal)
      ),
    }),
    ai: Object.freeze({
      required: false,
      autoInvoke: false,
      razielSurfaceAction: supportsVerifiedResearch && Boolean(razielAvailable),
    }),
    semantics: Object.freeze({
      oneEngine: true,
      oneResearchState: true,
      profileChangesTruth: false,
      profileChangesEvidence: false,
      legacyUiCanonical: false,
    }),
  });
}

export function transitionElsMatrixProfile({
  from,
  to,
  state,
} = {}) {
  const source = normalizeElsMatrixProfile(from);
  const target = normalizeElsMatrixProfile(to);
  const same = source === target;

  return Object.freeze({
    contract: "els_matrix_profile_transition_v1",
    from: source,
    to: target,
    state,
    stateIdentityPreserved: true,
    requiresReplay: false,
    clearsFindings: false,
    clearsSelection: false,
    clearsJourney: false,
    clearsViewport: false,
    recomputeRequired: false,
    hiddenResearchStatePolicy: target === ELS_MATRIX_PROFILE.CLASSIC
      ? "PRESERVE_HIDE_RESEARCH_ONLY_PROJECTIONS"
      : "RESTORE_EXISTING_RESEARCH_PROJECTIONS",
    noOp: same,
    truthPromotion: false,
  });
}

export function getElsMatrixProfileCapabilities(profile) {
  const mode = normalizeElsMatrixProfile(profile);
  if (mode === ELS_MATRIX_PROFILE.CLASSIC) {
    return Object.freeze([
      "EXACT_2D_MATRIX",
      "PAN_ZOOM_FOCUS",
      "DIRECT_OCCURRENCE_INSPECTION",
      "MANUAL_FINDING_ACTIONS",
      "SOURCE_VERSE_CONTEXT",
    ]);
  }

  if (mode === ELS_MATRIX_PROFILE.GUIDED) {
    return Object.freeze([
      "EXACT_2D_MATRIX",
      "PAN_ZOOM_FOCUS",
      "DIRECT_OCCURRENCE_INSPECTION",
      "MANUAL_FINDING_ACTIONS",
      "SOURCE_VERSE_CONTEXT",
      "STORY_FIRST_BOUNDED_PLAN",
      "LOCAL_VERIFIED_CONTEXT",
      "OPTIONAL_RAZIEL",
    ]);
  }

  return Object.freeze([
    "EXACT_2D_MATRIX",
    "PAN_ZOOM_FOCUS",
    "DIRECT_OCCURRENCE_INSPECTION",
    "MANUAL_FINDING_ACTIONS",
    "SOURCE_VERSE_CONTEXT",
    "LAYERED_RELATIONS",
    "VECTOR_GEOMETRY",
    "SLICE_SHIFT",
    "MATRIX_VOLUME",
    "ADAPTIVE_BOUNDED_RESEARCH",
    "CONTROLS_AND_CHALLENGE",
    "OPTIONAL_RAZIEL",
  ]);
}

export default projectElsMatrixProfile;
