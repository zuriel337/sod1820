// SOD1820 — System Self-Model / Surface Launch Contract compiler (2029)
//
// This is an implementation projection of the existing Surface Registration /
// Launch Contract. It is NOT a new semantic owner, route registry, truth store,
// graph, availability engine, entitlement engine, analytics store or UI system.
// Each registration points to the canonical owners that continue to own those
// decisions. The compiler only makes the resulting contract inspectable and
// testable across surfaces.

export const SYSTEM_SELF_MODEL_VERSION = "sod1820.surface-launch.v1";

export const SYSTEM_RAIL_OWNER = Object.freeze({
  EXPERIENCE: "experience_governance_foundation_v1_law",
  REALITY_GRAPH: "reality_graph_law",
  RESEARCH_CONTEXT: "research_workspace_law",
  RESEARCH_STRATEGY: "research_strategy_layer_law",
  TRUTH: "truth_axes_foundation_law",
  AVAILABILITY: "site_flags_lock_law",
  ACCESS: "platform_tiers_law",
  RAZIEL: "raziel_companion_layer_law",
  PERSONAL_REALITY: "person_foundation_contract_law",
  ATTENTION: "system_suggestions_law",
  PUBLISHING: "project_codex.publishing_conventions",
  PRESENTATION: "SOD1820_DESIGN_CONTRACT_V2 + System Frame",
});

export const SURFACE_AVAILABILITY = Object.freeze({
  OPEN: "OPEN",
  BUILDING: "BUILDING",
  LATER: "LATER",
  GATED: "GATED",
});

export const SURFACE_EXPOSURE = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
  INTERNAL: "internal",
});

export const SURFACE_ACCESS = Object.freeze({
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  ENTITLED: "entitled",
  ADMIN: "admin",
  MIXED: "mixed",
});

export const SURFACE_LOCALE_BEHAVIOR = Object.freeze({
  HEBREW_FIRST: "hebrew_first",
  LOCALE_AWARE: "locale_aware",
  CANONICAL_PROJECTION: "canonical_projection",
  INTERNAL_ONLY: "internal_only",
});

export const SURFACE_INDEXABILITY = Object.freeze({
  INDEX: "index",
  NOINDEX: "noindex",
  CONDITIONAL: "conditional",
});

export const SURFACE_SITEMAP = Object.freeze({
  ELIGIBLE: "eligible",
  INELIGIBLE: "ineligible",
  CONDITIONAL: "conditional",
});

export const SURFACE_CRAWLER_BEHAVIOR = Object.freeze({
  READ_ONLY: "read_only",
  BLOCKED: "blocked",
  CONDITIONAL: "conditional",
});

export const SURFACE_PARTICIPATION = Object.freeze({
  NONE: "none",
  READ: "read",
  PROJECT: "project",
  READ_WRITE_CONTEXT: "read_write_context",
  AUTHORIZED_PROJECTION: "authorized_projection",
});

export const SURFACE_OBSERVABILITY = Object.freeze({
  REQUIRED: "required",
  CONDITIONAL: "conditional",
  NOT_APPLICABLE: "not_applicable",
});

export const SURFACE_PRIVACY_CLASS = Object.freeze({
  PUBLIC: "public",
  ACCOUNT: "account",
  PERSONAL: "personal",
  SENSITIVE: "sensitive",
  ADMIN: "admin",
});

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "surfaceId",
  "routeFamily",
  "canonicalSubjectTypes",
  "semanticOwner",
  "presentationOwner",
  "availability",
  "exposure",
  "localeBehavior",
  "accessClass",
  "seo",
  "actions",
  "participation",
  "observability",
  "privacyClass",
  "attentionOwner",
  "acceptanceFixtures",
  "evidenceRefs",
]);

const FORBIDDEN_PAYLOAD_FIELDS = new Set([
  "content",
  "findings",
  "nodes",
  "edges",
  "userData",
  "personalData",
  "styles",
  "layout",
  "colors",
  "component",
]);

const SURFACE_ID = /^[a-z0-9][a-z0-9._:-]*$/;
const values = object => new Set(Object.values(object));
const AVAILABILITY_VALUES = values(SURFACE_AVAILABILITY);
const EXPOSURE_VALUES = values(SURFACE_EXPOSURE);
const ACCESS_VALUES = values(SURFACE_ACCESS);
const LOCALE_VALUES = values(SURFACE_LOCALE_BEHAVIOR);
const INDEXABILITY_VALUES = values(SURFACE_INDEXABILITY);
const SITEMAP_VALUES = values(SURFACE_SITEMAP);
const CRAWLER_VALUES = values(SURFACE_CRAWLER_BEHAVIOR);
const OBSERVABILITY_VALUES = values(SURFACE_OBSERVABILITY);
const PRIVACY_VALUES = values(SURFACE_PRIVACY_CLASS);
const ACTION_ID = /^[a-z][a-z0-9_]*$/;
const SUBJECT_TYPE_ID = /^[a-z][a-z0-9_:-]*$/;
const PARTICIPATION_BY_RAIL = Object.freeze({
  realityGraph: new Set([
    SURFACE_PARTICIPATION.NONE,
    SURFACE_PARTICIPATION.READ,
    SURFACE_PARTICIPATION.PROJECT,
  ]),
  researchContext: new Set([
    SURFACE_PARTICIPATION.NONE,
    SURFACE_PARTICIPATION.READ,
    SURFACE_PARTICIPATION.READ_WRITE_CONTEXT,
  ]),
  raziel: new Set([
    SURFACE_PARTICIPATION.NONE,
    SURFACE_PARTICIPATION.READ,
    SURFACE_PARTICIPATION.PROJECT,
  ]),
  personalReality: new Set([
    SURFACE_PARTICIPATION.NONE,
    SURFACE_PARTICIPATION.READ,
    SURFACE_PARTICIPATION.AUTHORIZED_PROJECTION,
  ]),
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isUniqueStringArray(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return false;
  if (!value.every(isNonEmptyString)) return false;
  return new Set(value).size === value.length;
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function addEnumError(errors, value, allowed, path) {
  if (!allowed.has(value)) errors.push(`${path} must be one of: ${[...allowed].join(", ")}`);
}

function addOwner(ownerIndex, owner, surfaceId) {
  if (!ownerIndex[owner]) ownerIndex[owner] = [];
  if (!ownerIndex[owner].includes(surfaceId)) ownerIndex[owner].push(surfaceId);
}

function sortedIndex(index) {
  return Object.fromEntries(
    Object.entries(index)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => [key, [...list].sort()]),
  );
}

export function inspectSurfaceRegistration(registration) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(registration)) {
    return Object.freeze({ valid: false, errors: ["registration must be a plain object"], warnings });
  }

  for (const key of Object.keys(registration)) {
    if (FORBIDDEN_PAYLOAD_FIELDS.has(key)) {
      errors.push(`${key} belongs to its canonical domain owner and may not live in the System Self-Model`);
    } else if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      errors.push(`unknown top-level field: ${key}`);
    }
  }

  if (!isNonEmptyString(registration.surfaceId) || !SURFACE_ID.test(registration.surfaceId)) {
    errors.push("surfaceId must be a stable lowercase machine id");
  }

  if (!isUniqueStringArray(registration.routeFamily)) {
    errors.push("routeFamily must be a non-empty array of unique route patterns");
  } else if (!registration.routeFamily.every(route => route.startsWith("/") || route.startsWith("internal:"))) {
    errors.push("routeFamily entries must start with / or internal:");
  }

  if (!isUniqueStringArray(registration.canonicalSubjectTypes)) {
    errors.push("canonicalSubjectTypes must be a non-empty array of unique canonical subject types");
  } else if (!registration.canonicalSubjectTypes.every(subjectType => SUBJECT_TYPE_ID.test(subjectType))) {
    errors.push("canonicalSubjectTypes entries must be stable lowercase machine ids");
  }
  if (!isNonEmptyString(registration.semanticOwner)) errors.push("semanticOwner is required");
  if (!isNonEmptyString(registration.presentationOwner)) errors.push("presentationOwner is required");

  if (!isPlainObject(registration.availability)) {
    errors.push("availability must be an object");
  } else {
    addEnumError(errors, registration.availability.state, AVAILABILITY_VALUES, "availability.state");
    if (registration.availability.owner !== SYSTEM_RAIL_OWNER.AVAILABILITY) {
      errors.push(`availability.owner must remain ${SYSTEM_RAIL_OWNER.AVAILABILITY}`);
    }
    if (registration.availability.flag != null && !isNonEmptyString(registration.availability.flag)) {
      errors.push("availability.flag must be null or a non-empty canonical flag key");
    }
  }

  addEnumError(errors, registration.exposure, EXPOSURE_VALUES, "exposure");
  addEnumError(errors, registration.localeBehavior, LOCALE_VALUES, "localeBehavior");
  addEnumError(errors, registration.accessClass, ACCESS_VALUES, "accessClass");
  addEnumError(errors, registration.privacyClass, PRIVACY_VALUES, "privacyClass");

  if (!isPlainObject(registration.seo)) {
    errors.push("seo must be an object");
  } else {
    addEnumError(errors, registration.seo.indexability, INDEXABILITY_VALUES, "seo.indexability");
    addEnumError(errors, registration.seo.sitemapEligibility, SITEMAP_VALUES, "seo.sitemapEligibility");
    addEnumError(errors, registration.seo.crawlerBehavior, CRAWLER_VALUES, "seo.crawlerBehavior");
    if (!isNonEmptyString(registration.seo.canonicalOwner)) errors.push("seo.canonicalOwner is required");
    if (!isNonEmptyString(registration.seo.shareOwner)) errors.push("seo.shareOwner is required");
  }

  if (!isPlainObject(registration.actions)) {
    errors.push("actions must be an object");
  } else {
    if (!isUniqueStringArray(registration.actions.meaningful)) {
      errors.push("actions.meaningful must be a non-empty array of unique semantic action ids");
    } else if (!registration.actions.meaningful.every(action => ACTION_ID.test(action))) {
      errors.push("actions.meaningful entries must be stable lowercase semantic action ids");
    }
    if (!isUniqueStringArray(registration.actions.expensive, { allowEmpty: true })) {
      errors.push("actions.expensive must be an array of unique semantic action ids");
    } else if (!registration.actions.expensive.every(action => ACTION_ID.test(action))) {
      errors.push("actions.expensive entries must be stable lowercase semantic action ids");
    } else if (Array.isArray(registration.actions.meaningful)) {
      const meaningful = new Set(registration.actions.meaningful);
      for (const action of registration.actions.expensive) {
        if (!meaningful.has(action)) errors.push(`expensive action is not declared meaningful: ${action}`);
      }
    }
  }

  if (!isPlainObject(registration.participation)) {
    errors.push("participation must be an object");
  } else {
    for (const field of ["realityGraph", "researchContext", "raziel", "personalReality"]) {
      addEnumError(errors, registration.participation[field], PARTICIPATION_BY_RAIL[field], `participation.${field}`);
    }
  }

  if (!isPlainObject(registration.observability)) {
    errors.push("observability must be an object");
  } else {
    for (const field of ["telemetry", "traceCost", "releaseSha", "beforeAfter"]) {
      addEnumError(errors, registration.observability[field], OBSERVABILITY_VALUES, `observability.${field}`);
    }
  }

  if (!isNonEmptyString(registration.attentionOwner)) errors.push("attentionOwner is required");
  if (!isUniqueStringArray(registration.acceptanceFixtures)) {
    errors.push("acceptanceFixtures must identify at least one replayable launch fixture/test");
  }
  if (!isUniqueStringArray(registration.evidenceRefs)) {
    errors.push("evidenceRefs must identify the owner-qualified evidence for this registration");
  }

  if (registration.availability?.state === SURFACE_AVAILABILITY.OPEN) {
    if (registration.observability?.telemetry !== SURFACE_OBSERVABILITY.REQUIRED) {
      errors.push("OPEN surfaces require telemetry");
    }
    if (registration.observability?.releaseSha !== SURFACE_OBSERVABILITY.REQUIRED) {
      errors.push("OPEN surfaces require release SHA attribution");
    }
    if (registration.observability?.beforeAfter !== SURFACE_OBSERVABILITY.REQUIRED) {
      errors.push("OPEN surfaces require before/after measurement");
    }
  }

  if (registration.exposure === SURFACE_EXPOSURE.PUBLIC && registration.seo?.crawlerBehavior === SURFACE_CRAWLER_BEHAVIOR.BLOCKED) {
    warnings.push("public surface blocks crawlers; confirm that this is an intentional owner decision");
  }
  if (registration.exposure === SURFACE_EXPOSURE.PUBLIC && registration.accessClass === SURFACE_ACCESS.ADMIN) {
    errors.push("public exposure cannot use admin-only access");
  }
  if (registration.exposure === SURFACE_EXPOSURE.PRIVATE && registration.accessClass === SURFACE_ACCESS.PUBLIC) {
    errors.push("private exposure cannot use public access");
  }

  return deepFreeze({ valid: errors.length === 0, errors, warnings });
}

export function defineSurfaceRegistration(registration) {
  const inspection = inspectSurfaceRegistration(registration);
  if (!inspection.valid) {
    throw new TypeError(`Invalid SOD1820 surface registration:\n- ${inspection.errors.join("\n- ")}`);
  }
  return deepFreeze(deepClone(registration));
}

export function buildSystemSelfModel(registrations) {
  if (!Array.isArray(registrations)) throw new TypeError("registrations must be an array");
  if (registrations.length === 0) throw new TypeError("registrations must include at least one surface");

  const surfaces = {};
  const routeIndex = {};
  const ownerIndex = {};
  const availabilityIndex = {};
  const participationIndex = {
    realityGraph: [],
    researchContext: [],
    raziel: [],
    personalReality: [],
  };

  for (const candidate of registrations) {
    const registration = defineSurfaceRegistration(candidate);
    const { surfaceId } = registration;
    if (surfaces[surfaceId]) throw new TypeError(`Duplicate surfaceId: ${surfaceId}`);

    for (const route of registration.routeFamily) {
      if (routeIndex[route]) throw new TypeError(`Route pattern ${route} is owned by both ${routeIndex[route]} and ${surfaceId}`);
      routeIndex[route] = surfaceId;
    }

    surfaces[surfaceId] = registration;
    const state = registration.availability.state;
    if (!availabilityIndex[state]) availabilityIndex[state] = [];
    availabilityIndex[state].push(surfaceId);

    for (const owner of [
      registration.semanticOwner,
      registration.presentationOwner,
      registration.availability.owner,
      registration.seo.canonicalOwner,
      registration.seo.shareOwner,
      registration.attentionOwner,
      SYSTEM_RAIL_OWNER.EXPERIENCE,
      SYSTEM_RAIL_OWNER.TRUTH,
      SYSTEM_RAIL_OWNER.ACCESS,
      ...(registration.participation.realityGraph === SURFACE_PARTICIPATION.NONE ? [] : [SYSTEM_RAIL_OWNER.REALITY_GRAPH]),
      ...(registration.participation.researchContext === SURFACE_PARTICIPATION.NONE ? [] : [SYSTEM_RAIL_OWNER.RESEARCH_CONTEXT]),
      ...(registration.participation.raziel === SURFACE_PARTICIPATION.NONE ? [] : [SYSTEM_RAIL_OWNER.RAZIEL]),
      ...(registration.participation.personalReality === SURFACE_PARTICIPATION.NONE ? [] : [SYSTEM_RAIL_OWNER.PERSONAL_REALITY]),
    ]) addOwner(ownerIndex, owner, surfaceId);

    for (const rail of Object.keys(participationIndex)) {
      if (registration.participation[rail] !== SURFACE_PARTICIPATION.NONE) participationIndex[rail].push(surfaceId);
    }
  }

  const orderedSurfaces = Object.fromEntries(Object.entries(surfaces).sort(([a], [b]) => a.localeCompare(b)));
  const orderedRoutes = Object.fromEntries(Object.entries(routeIndex).sort(([a], [b]) => a.localeCompare(b)));
  const coverage = {
    total: Object.keys(orderedSurfaces).length,
    byAvailability: Object.fromEntries(
      Object.values(SURFACE_AVAILABILITY).map(state => [state, (availabilityIndex[state] || []).length]),
    ),
    contractValid: true,
  };

  return deepFreeze({
    contractVersion: SYSTEM_SELF_MODEL_VERSION,
    authority: {
      semantics: "canonical owners",
      experience: SYSTEM_RAIL_OWNER.EXPERIENCE,
      graph: SYSTEM_RAIL_OWNER.REALITY_GRAPH,
      researchContext: SYSTEM_RAIL_OWNER.RESEARCH_CONTEXT,
      researchStrategy: SYSTEM_RAIL_OWNER.RESEARCH_STRATEGY,
      availability: SYSTEM_RAIL_OWNER.AVAILABILITY,
      truth: SYSTEM_RAIL_OWNER.TRUTH,
      access: SYSTEM_RAIL_OWNER.ACCESS,
      raziel: SYSTEM_RAIL_OWNER.RAZIEL,
      personalReality: SYSTEM_RAIL_OWNER.PERSONAL_REALITY,
      attention: SYSTEM_RAIL_OWNER.ATTENTION,
      publishing: SYSTEM_RAIL_OWNER.PUBLISHING,
      presentation: SYSTEM_RAIL_OWNER.PRESENTATION,
    },
    surfaces: orderedSurfaces,
    indexes: {
      routes: orderedRoutes,
      owners: sortedIndex(ownerIndex),
      availability: sortedIndex(availabilityIndex),
      participation: sortedIndex(participationIndex),
    },
    coverage,
  });
}
