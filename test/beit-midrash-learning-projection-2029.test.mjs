import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEIT_MIDRASH_GUIDED_KIND,
  BEIT_MIDRASH_LEARNING_MANIFEST,
  BEIT_MIDRASH_LEARNING_SECTION,
  beitMidrashLearningHref,
  buildBeitMidrashGuidedExamples,
  buildBeitMidrashLearningPath,
  buildBeitMidrashLearningProjection,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";

function finding(sourceId, overrides = {}) {
  return {
    id: `research:${sourceId}`,
    sourceId,
    family: "research_object",
    statement: `גילוי ${sourceId}`,
    secondary: "הקשר קצר",
    kind: "relation",
    values: [1820],
    sourceLabel: "מקור לדוגמה",
    sourceRef: `channel_updates:${sourceId}#a1`,
    sourceRefs: [`channel_updates:${sourceId}#a1`],
    sourceHref: null,
    canonicalFindingHref: `/world?finding=${sourceId}#finding-${sourceId}`,
    contributor: "צוריאל",
    createdAt: "2026-10-22T10:00:00.000Z",
    verification: "match",
    status: "approved",
    access: "public",
    confidence: 93,
    evidenceQuality: { score: 9, label: "גבוהה" },
    independentSourceCount: 2,
    treeMatches: [{ type: "topic", key: "1820" }],
    linkedTopicRating: { title: "1820", meterScore: 89 },
    occurrences: [
      { sourceId, sourceRef: `channel_updates:${sourceId}#a1` },
      { sourceId: `${sourceId}-repeat`, sourceRef: `channel_updates:${sourceId}#a7` },
    ],
    triage: { rank: 1, strength: "strong", recommendation: "keep" },
    ...overrides,
  };
}

test("learning manifest establishes one home with learn, discover and participate pillars", () => {
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.identity.canonicalRoute, "/beit-midrash");
  assert.deepEqual(
    BEIT_MIDRASH_LEARNING_MANIFEST.pillars.map((pillar) => pillar.id),
    ["learn", "discover", "participate"],
  );
  assert.deepEqual(
    BEIT_MIDRASH_LEARNING_MANIFEST.sections.map((section) => section.id),
    ["start", "methods", "ciphers", "sources", "numbers", "paths", "guided", "practice", "participate"],
  );
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.beginnerConcepts.length, 4);
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.numberGuideConcepts.some((concept) => concept.id === "fibonacci"));
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.numberGuideConcepts.every((concept) => concept.check && concept.boundary));
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.cipherReadingLesson.continuation.href, "/code");
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.some((path) => path.id === "sod1820"));
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.some((path) => path.id === "ciphers"));
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.every((path) => path.href && path.steps.length >= 3));
  assert.ok(BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.every((path) => path.steps.every((step) => !step.href.startsWith("/2029/number/"))));
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.destinations.calculator.href, "/2029/gematria");
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.destinations.world.href, "/world#world-connections");
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.destinations.contribution.href, null);
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.destinations.contribution.action, "openIssueReport");
});

test("public learning copy uses discovery language while keeping canonical terms secondary", () => {
  const publicCopy = JSON.stringify({
    identity: BEIT_MIDRASH_LEARNING_MANIFEST.identity,
    pillars: BEIT_MIDRASH_LEARNING_MANIFEST.pillars,
    sections: BEIT_MIDRASH_LEARNING_MANIFEST.sections,
    concepts: BEIT_MIDRASH_LEARNING_MANIFEST.beginnerConcepts,
    paths: BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths,
    language: BEIT_MIDRASH_LEARNING_MANIFEST.language,
  });
  for (const forbidden of [
    "איכות ראיות",
    "ציון אמת",
    "סקירת מנהל",
    "טריאז׳",
    "מאגר ממצאים",
    "Research",
    "projection",
  ]) {
    assert.ok(!publicCopy.includes(forbidden), `public copy contains ${forbidden}`);
  }
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.language.crossing.title, "נקודת המפגש");
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.language.crossing.eyebrow, "הצלבה");
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.language.convergence.title, "כשהתמונה מתחברת");
  assert.equal(BEIT_MIDRASH_LEARNING_MANIFEST.language.convergence.eyebrow, "התכנסות");
});

test("all ten legacy tabs resolve into the learning IA without redirects", () => {
  const expected = {
    calc: ["practice", null],
    methods: ["methods", null],
    crosses: ["guided", "crossing"],
    atlas: ["guided", "map"],
    convergence: ["guided", "convergence"],
    searches: ["start", null],
    verified: ["sources", null],
    sod1820: ["paths", null],
    submit: ["participate", null],
    community: ["participate", null],
  };
  for (const [tab, [section, kind]] of Object.entries(expected)) {
    const resolved = resolveBeitMidrashLearningLocation({ search: `?tool=midrash&tab=${tab}` });
    assert.equal(resolved.section, section, tab);
    assert.equal(resolved.guidedKind, kind, tab);
    assert.equal(resolved.shouldRedirect, false, tab);
    assert.ok(resolved.canonicalHref.startsWith("/beit-midrash"), tab);
  }
  assert.equal(resolveBeitMidrashLearningLocation({ search: "?tab=searches" }).adminOnly, true);
  assert.equal(resolveBeitMidrashLearningLocation({ search: "?tab=verified" }).adminOnly, false);
});

test("method and finding deep links retain exact Beit Midrash identity", () => {
  const method = resolveBeitMidrashLearningLocation({
    methodKey: "משולש קדמי",
    search: "?tab=crosses&finding=abc/12",
  });
  assert.equal(method.section, BEIT_MIDRASH_LEARNING_SECTION.METHODS);
  assert.equal(method.methodKey, "משולש קדמי");
  assert.equal(method.shouldRedirect, false);
  assert.equal(
    method.canonicalHref,
    "/beit-midrash/%D7%9E%D7%A9%D7%95%D7%9C%D7%A9%20%D7%A7%D7%93%D7%9E%D7%99?finding=abc%2F12#finding-abc%2F12",
  );
  assert.equal(
    beitMidrashLearningHref("guided", { guidedKind: "crossing", findingId: "abc/12" }),
    "/beit-midrash?section=guided&kind=crossing&finding=abc%2F12#finding-abc%2F12",
  );
});

test("number lessons and learning paths keep exact resumable links", () => {
  const numberLesson = resolveBeitMidrashLearningLocation({
    search: "?section=numbers&concept=fibonacci",
  });
  assert.equal(numberLesson.section, BEIT_MIDRASH_LEARNING_SECTION.NUMBERS);
  assert.equal(numberLesson.conceptId, "fibonacci");
  assert.equal(
    numberLesson.canonicalHref,
    "/beit-midrash?section=numbers&concept=fibonacci#number-concept-fibonacci",
  );
  assert.equal(
    beitMidrashLearningHref("paths", { pathId: "sod1820" }),
    "/beit-midrash?section=paths&path=sod1820#path-sod1820",
  );
  const pathStep = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&pathStep=world-map",
  });
  assert.equal(pathStep.pathId, "sod1820");
  assert.equal(pathStep.pathStepId, "world-map");
  assert.equal(buildBeitMidrashLearningPath(pathStep.pathId, pathStep.pathStepId).selectedStep.href, "/world#world-connections");
  assert.equal(
    resolveBeitMidrashLearningLocation({ search: "?section=numbers&concept=not-a-lesson" }).conceptId,
    null,
  );
});

test("guided examples are public-only, bounded and keep canonical World order", () => {
  const projection = {
    rows: [
      finding("first"),
      finding("second"),
      finding("third"),
      finding("fourth"),
      finding("private", { access: "private" }),
      finding("candidate", { status: "candidate" }),
    ],
    duplicateProjection: { nonDestructive: true },
  };
  const result = buildBeitMidrashGuidedExamples(projection, { limit: 99 });
  assert.deepEqual(result.crossings.map((row) => row.sourceId), ["first", "second", "third"]);
  assert.deepEqual(result.convergences.map((row) => row.sourceId), ["first", "second", "third"]);
  assert.equal(result.maxExamplesPerKind, 3);
  assert.equal(result.nonDestructiveDedup, true);
  assert.equal(result.mapCallout.href, "/world#world-connections");
});

test("an exact public example resumes first without admitting a private row", () => {
  const projection = {
    rows: [
      finding("first"),
      finding("second"),
      finding("private", { access: "private" }),
    ],
  };
  assert.deepEqual(
    buildBeitMidrashGuidedExamples(projection, { findingId: "second" }).crossings.map((row) => row.sourceId),
    ["second", "first"],
  );
  assert.deepEqual(
    buildBeitMidrashGuidedExamples(projection, { findingId: "private" }).crossings.map((row) => row.sourceId),
    ["first", "second"],
  );
});

test("guided DTO teaches the example without leaking governance or score fields", () => {
  const example = buildBeitMidrashGuidedExamples({ rows: [finding("safe")] }).crossings[0];
  assert.equal(example.title, "נקודת המפגש");
  assert.equal(example.eyebrow, "הצלבה");
  assert.equal(example.sourceRef, "channel_updates:safe#a1");
  assert.equal(example.sourceHref, null);
  assert.equal(example.occurrences.length, 2);
  assert.equal(example.canonicalFindingHref, "/world?finding=safe#finding-safe");
  assert.equal(example.returnHref, "/beit-midrash?section=guided&kind=crossing&finding=safe#finding-safe");
  for (const internal of [
    "verification",
    "status",
    "access",
    "confidence",
    "evidenceQuality",
    "independentSourceCount",
    "treeMatches",
    "linkedTopicRating",
    "triage",
  ]) {
    assert.equal(Object.hasOwn(example, internal), false, internal);
  }
});

test("verified Web links survive and internal locators never become invented URLs", () => {
  const [web, internal] = buildBeitMidrashGuidedExamples({
    rows: [
      finding("web", { sourceHref: "https://example.org/source" }),
      finding("internal", { sourceHref: "channel_updates:internal#a1" }),
    ],
  }).crossings;
  assert.equal(web.sourceHref, "https://example.org/source");
  assert.equal(internal.sourceHref, null);
});

test("combined projection is headless and keeps method and World ownership explicit", () => {
  const projection = buildBeitMidrashLearningProjection({
    worldProjection: { rows: [finding("one")] },
    search: "?section=guided&kind=convergence&finding=one",
  });
  assert.equal(projection.location.guidedKind, BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE);
  assert.equal(projection.guidedExamples.convergences[0].sourceId, "one");
  assert.equal(projection.sources.methods, "canonical-method-registry");
  assert.equal(projection.sources.guidedExamples, "worldAllResearchProjection");
});

test("foundation owns no fetch, database, auth, store, ranking or dedup implementation", () => {
  const source = fs.readFileSync(
    new URL("../src/lib/research/beitMidrashLearningProjection.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /buildBeitMidrashWorldSections/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\.from\s*\(|\.rpc\s*\(|createClient\s*\(/);
  assert.doesNotMatch(source, /worldFindingReviewClient|fetchWorldFindingReviewPage/);
  assert.doesNotMatch(source, /clusterWorldResearchRows|compareWorldResearchStrength/);
  assert.doesNotMatch(source, /search[_ ]?terms/i);
});

