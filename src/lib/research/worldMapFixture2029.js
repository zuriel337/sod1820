// FIXTURE ONLY — synthetic data for the World map UI shell preview and tests.
// Nothing here is a live source, finding or tree relation. Refs use the
// `fixture:` namespace so they can never collide with a canonical ref.

import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";

export const WORLD_MAP_FIXTURE_NOTICE = "נתוני דוגמה בלבד — אין כאן מקור חי, ממצא חי או קשר עץ חי.";

export function buildWorldMapFixtureProjection({ treeRelationsAvailable = true } = {}) {
  return buildPublicWorldContentProjectionV1({
    sources: [
      { sourceRef: "fixture:source:a", title: "מקור לדוגמה א׳ — פרסום", contributor: { slug: "fixture-writer", label: "כותב לדוגמה", href: null }, publisher: { key: "fixture", label: "מו״ל לדוגמה" } },
      { sourceRef: "fixture:source:b", title: "מקור לדוגמה ב׳ — תמונת גלריה", sourceHref: "/post/fixture-b" },
      { sourceRef: "fixture:source:c", title: "מקור לדוגמה ג׳ — פריט ערוץ" },
      { sourceRef: "fixture:source:d", title: "מקור לדוגמה ד׳ — ללא הופעות" },
      { sourceRef: "fixture:source:e", title: "מקור לדוגמה ה׳" },
      { sourceRef: "fixture:source:f", title: "מקור לדוגמה ו׳" },
      { sourceRef: "fixture:source:g", title: "מקור לדוגמה ז׳ — מחוץ לחלון" },
      { sourceRef: "fixture:source:h", title: "מקור לדוגמה ח׳ — מחוץ לחלון" },
    ],
    occurrences: [
      { occurrenceRef: "fixture:occ:a1", sourceRef: "fixture:source:a", locator: "#פסקה-1", times: { publishedAt: "2026-10-01" } },
      { occurrenceRef: "fixture:occ:a2", sourceRef: "fixture:source:a", locator: "#פסקה-2", times: { publishedAt: "2026-10-02" } },
      { occurrenceRef: "fixture:occ:a3", sourceRef: "fixture:source:a", locator: "#פסקה-3" },
      { occurrenceRef: "fixture:occ:b1", sourceRef: "fixture:source:b", locator: "תמונה 1", href: "/post/fixture-b" },
      { occurrenceRef: "fixture:occ:c1", sourceRef: "fixture:source:c", locator: "פריט 7" },
    ],
    seriesCategories: [
      { key: "fixture-series", kind: "series", label: "סדרה לדוגמה", sourceRefs: ["fixture:source:a", "fixture:source:c"] },
      { key: "fixture-category", kind: "category", label: "קטגוריה לדוגמה", sourceRefs: ["fixture:source:a", "fixture:source:b"] },
    ],
    findings: [
      { findingRef: "fixture:finding:1", sourceRefs: ["fixture:source:a"], stage: "calculation", verificationState: "match", publicationState: "public" },
      { findingRef: "fixture:finding:2", sourceRefs: ["fixture:source:b"], stage: "observation", verificationState: "unverified", publicationState: "public" },
      { findingRef: "fixture:finding:3", sourceRefs: ["fixture:source:c"], stage: "observation", publicationState: "public" },
    ],
    treeRelations: [
      { findingRef: "fixture:finding:1", targetRef: "fixture:node:374", governanceRef: "fixture:decision:374" },
      { findingRef: "fixture:finding:2", targetRef: "fixture:node:12", edgeRef: "edge:fixture-12" },
    ],
    compatibility: { legacyTopics: [{ topicRef: "fixture:topic:old", title: "נושא ישן לדוגמה" }] },
    coverage: { treeRelations: { available: treeRelationsAvailable } },
  });
}

// Layers that sit beside — never inside — a source. Fixture values only.
export const WORLD_MAP_FIXTURE_LAYERS = Object.freeze({
  "finding:fixture:finding:1": Object.freeze({
    calculation: [{ label: "חישוב מנוע (דוגמה)", value: "1,456", basis: "תמונת דיווח של 70% ספירה — נתון דוגמה" }],
    oneZeroDerivation: [{ label: "נגזרת אחד־ואפס (דוגמה)", value: "456", basis: "יישום מתועד של השיטה על הערך שלמעלה; אינו תוצאת בחירות" }],
    interpretation: [{ label: "פרשנות (דוגמה)", value: "טקסט פרשני לדוגמה", basis: "פרשנות אנושית; אינה ממצא ואינה עובדה" }],
  }),
});

// UI-only exact entry points (same idea as treeFindingTargets): finding → node id.
export const WORLD_MAP_FIXTURE_TARGETS = Object.freeze([
  Object.freeze({ findingRef: "fixture:finding:3", nodeId: "fixture-node-3", label: "ממצא לדוגמה 3" }),
  Object.freeze({ findingRef: "fixture:finding:2", nodeId: "fixture-node-2", label: "ממצא לדוגמה 2" }),
]);

// Not edges. Rendered by the inspector as proposals only.
export const WORLD_MAP_FIXTURE_CANDIDATES = Object.freeze([
  Object.freeze({ candidateRef: "fixture:candidate:1", findingRef: "fixture:finding:3", label: "הצעה: קשר ליעד לדוגמה", basis: "הצעה שלא עברה אישור" }),
]);

export function createFixtureRelationOpener(scenario = "ok") {
  return async function openRelations(target) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const anchorNodeId = target.nodeId;
    if (scenario === "failed") throw new Error("fixture: reader failed");
    if (scenario === "empty-ok") return { status: "ok", anchorNodeId, relations: [] };
    if (scenario === "partial") return { status: "partial", anchorNodeId, relations: [] };
    return {
      status: scenario === "partial-rows" ? "partial" : "ok",
      anchorNodeId,
      relations: [{ edgeRef: "edge:fixture-901", relationType: "קשור ל", fromNodeId: anchorNodeId, toNodeId: "fixture-node-900", fromLabel: "ממצא לדוגמה", toLabel: "יעד פתוח לדוגמה" }],
    };
  };
}
