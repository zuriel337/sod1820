import assert from "node:assert/strict";
import test from "node:test";
import {
  SYSTEM_RAIL_OWNER,
  SYSTEM_SELF_MODEL_VERSION,
  SURFACE_ACCESS,
  SURFACE_AVAILABILITY,
  SURFACE_CRAWLER_BEHAVIOR,
  SURFACE_EXPOSURE,
  SURFACE_INDEXABILITY,
  SURFACE_LOCALE_BEHAVIOR,
  SURFACE_OBSERVABILITY,
  SURFACE_PARTICIPATION,
  SURFACE_PRIVACY_CLASS,
  SURFACE_SITEMAP,
  buildSystemSelfModel,
  defineSurfaceRegistration,
  inspectSurfaceRegistration,
} from "../src/lib/systemSelfModel2029.js";

function topicRegistration(overrides = {}) {
  return {
    surfaceId: "surface:topic",
    routeFamily: ["/topic/:slug"],
    canonicalSubjectTypes: ["topic", "convergence"],
    semanticOwner: SYSTEM_RAIL_OWNER.REALITY_GRAPH,
    presentationOwner: SYSTEM_RAIL_OWNER.PRESENTATION,
    availability: {
      state: SURFACE_AVAILABILITY.BUILDING,
      owner: SYSTEM_RAIL_OWNER.AVAILABILITY,
      flag: "lock_world",
    },
    exposure: SURFACE_EXPOSURE.PUBLIC,
    localeBehavior: SURFACE_LOCALE_BEHAVIOR.HEBREW_FIRST,
    accessClass: SURFACE_ACCESS.PUBLIC,
    seo: {
      indexability: SURFACE_INDEXABILITY.CONDITIONAL,
      canonicalOwner: "project_codex.publishing_conventions",
      sitemapEligibility: SURFACE_SITEMAP.CONDITIONAL,
      shareOwner: "share_placement_law",
      crawlerBehavior: SURFACE_CRAWLER_BEHAVIOR.CONDITIONAL,
    },
    actions: {
      meaningful: ["open", "inspect", "ask", "save", "add_to_research", "share", "exact_return"],
      expensive: ["ask"],
    },
    participation: {
      realityGraph: SURFACE_PARTICIPATION.PROJECT,
      researchContext: SURFACE_PARTICIPATION.READ_WRITE_CONTEXT,
      raziel: SURFACE_PARTICIPATION.READ,
      personalReality: SURFACE_PARTICIPATION.AUTHORIZED_PROJECTION,
    },
    observability: {
      telemetry: SURFACE_OBSERVABILITY.REQUIRED,
      traceCost: SURFACE_OBSERVABILITY.CONDITIONAL,
      releaseSha: SURFACE_OBSERVABILITY.REQUIRED,
      beforeAfter: SURFACE_OBSERVABILITY.REQUIRED,
    },
    privacyClass: SURFACE_PRIVACY_CLASS.PUBLIC,
    attentionOwner: SYSTEM_RAIL_OWNER.ATTENTION,
    acceptanceFixtures: ["topic-public-golden"],
    evidenceRefs: ["docs/2029-control-plane-attention-observability-plan-v1.md#4"],
    ...overrides,
  };
}

function postRegistration() {
  return topicRegistration({
    surfaceId: "surface:post",
    routeFamily: ["/post/:slug", "/2029/posts"],
    canonicalSubjectTypes: ["post", "publication"],
    semanticOwner: SYSTEM_RAIL_OWNER.PUBLISHING,
    availability: {
      state: SURFACE_AVAILABILITY.OPEN,
      owner: SYSTEM_RAIL_OWNER.AVAILABILITY,
      flag: null,
    },
    acceptanceFixtures: ["post-reading-golden"],
  });
}

test("defines a frozen owner-qualified surface registration without taking domain truth", () => {
  const registration = defineSurfaceRegistration(topicRegistration());
  assert.equal(registration.surfaceId, "surface:topic");
  assert.equal(registration.participation.realityGraph, SURFACE_PARTICIPATION.PROJECT);
  assert.equal(Object.isFrozen(registration), true);
  assert.equal(Object.isFrozen(registration.seo), true);
  assert.equal("content" in registration, false);
  assert.equal("nodes" in registration, false);
  assert.throws(() => { registration.seo.indexability = "index"; }, TypeError);
});

test("compiles one inspectable self-model with route, owner and availability indexes", () => {
  const model = buildSystemSelfModel([postRegistration(), topicRegistration()]);
  assert.equal(model.contractVersion, SYSTEM_SELF_MODEL_VERSION);
  assert.equal(model.coverage.total, 2);
  assert.equal(model.coverage.byAvailability.OPEN, 1);
  assert.equal(model.coverage.byAvailability.BUILDING, 1);
  assert.equal(model.indexes.routes["/topic/:slug"], "surface:topic");
  assert.equal(model.indexes.routes["/post/:slug"], "surface:post");
  assert.deepEqual(model.indexes.owners[SYSTEM_RAIL_OWNER.PRESENTATION], ["surface:post", "surface:topic"]);
  assert.deepEqual(model.indexes.participation.realityGraph, ["surface:post", "surface:topic"]);
  assert.deepEqual(model.indexes.participation.raziel, ["surface:post", "surface:topic"]);
  assert.deepEqual(model.indexes.participation.personalReality, ["surface:post", "surface:topic"]);
  assert.equal(model.authority.graph, SYSTEM_RAIL_OWNER.REALITY_GRAPH);
  assert.equal(Object.isFrozen(model), true);
});

test("fails closed on duplicate surface or route ownership", () => {
  assert.throws(() => buildSystemSelfModel([]), /at least one surface/);
  assert.throws(
    () => buildSystemSelfModel([topicRegistration(), topicRegistration()]),
    /Duplicate surfaceId/,
  );
  assert.throws(
    () => buildSystemSelfModel([
      topicRegistration(),
      topicRegistration({ surfaceId: "surface:topic-copy" }),
    ]),
    /owned by both/,
  );
});

test("keeps availability on the canonical site flag owner", () => {
  const inspection = inspectSurfaceRegistration(topicRegistration({
    availability: { state: SURFACE_AVAILABILITY.OPEN, owner: "page-local-lock", flag: null },
  }));
  assert.equal(inspection.valid, false);
  assert.ok(inspection.errors.some(error => error.includes(SYSTEM_RAIL_OWNER.AVAILABILITY)));
});

test("OPEN is a launch state with mandatory telemetry, SHA and before/after evidence", () => {
  const inspection = inspectSurfaceRegistration(topicRegistration({
    availability: { state: SURFACE_AVAILABILITY.OPEN, owner: SYSTEM_RAIL_OWNER.AVAILABILITY, flag: null },
    observability: {
      telemetry: SURFACE_OBSERVABILITY.CONDITIONAL,
      traceCost: SURFACE_OBSERVABILITY.CONDITIONAL,
      releaseSha: SURFACE_OBSERVABILITY.CONDITIONAL,
      beforeAfter: SURFACE_OBSERVABILITY.NOT_APPLICABLE,
    },
  }));
  assert.equal(inspection.valid, false);
  assert.ok(inspection.errors.includes("OPEN surfaces require telemetry"));
  assert.ok(inspection.errors.includes("OPEN surfaces require release SHA attribution"));
  assert.ok(inspection.errors.includes("OPEN surfaces require before/after measurement"));
});

test("rejects truth, graph, personal data and visual payloads from the self-model", () => {
  for (const forbidden of ["content", "findings", "nodes", "edges", "personalData", "styles", "layout", "component"]) {
    const inspection = inspectSurfaceRegistration(topicRegistration({ [forbidden]: {} }));
    assert.equal(inspection.valid, false, forbidden);
    assert.ok(inspection.errors.some(error => error.includes("may not live in the System Self-Model")), forbidden);
  }
});

test("requires expensive work to use the same semantic action vocabulary", () => {
  const inspection = inspectSurfaceRegistration(topicRegistration({
    actions: { meaningful: ["open"], expensive: ["generate_everything"] },
  }));
  assert.equal(inspection.valid, false);
  assert.ok(inspection.errors.includes("expensive action is not declared meaningful: generate_everything"));
});

test("uses rail-specific One Tree, Research Context, Raziel and Personal participation modes", () => {
  const inspection = inspectSurfaceRegistration(topicRegistration({
    participation: {
      realityGraph: SURFACE_PARTICIPATION.AUTHORIZED_PROJECTION,
      researchContext: SURFACE_PARTICIPATION.PROJECT,
      raziel: SURFACE_PARTICIPATION.READ_WRITE_CONTEXT,
      personalReality: SURFACE_PARTICIPATION.PROJECT,
    },
  }));
  assert.equal(inspection.valid, false);
  assert.ok(inspection.errors.some(error => error.startsWith("participation.realityGraph")));
  assert.ok(inspection.errors.some(error => error.startsWith("participation.researchContext")));
  assert.ok(inspection.errors.some(error => error.startsWith("participation.raziel")));
  assert.ok(inspection.errors.some(error => error.startsWith("participation.personalReality")));
});
