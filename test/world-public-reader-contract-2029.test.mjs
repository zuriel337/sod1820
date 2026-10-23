import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findWorldPublicResearchFinding,
  worldPublicResearchDto,
} from "../src/lib/research/worldAllResearchProjection.js";

const projectionSource = readFileSync(
  new URL("../src/lib/research/worldAllResearchProjection.js", import.meta.url),
  "utf8",
);

test("public World transport never invokes the admin candidate RPC and narrows before transfer", () => {
  const publicReader = projectionSource.slice(
    projectionSource.indexOf("export async function fetchWorldAllResearchProjection"),
    projectionSource.indexOf("export async function fetchWorldFindingReviewProjection"),
  );
  assert.doesNotMatch(publicReader, /admin_convergence_candidates|\.rpc\(/);
  assert.match(publicReader, /\.eq\("privacy_scope", "public"\)/);
  assert.match(publicReader, /\.in\("status", PUBLIC_RESEARCH_STATUSES\)/);
  assert.match(publicReader, /\.eq\("status", "approved"\)/);
  assert.match(publicReader, /\.eq\("status", "live"\)/);
  assert.doesNotMatch(publicReader, /(?:^|,)terms(?:,|$)|search_terms/);
  assert.match(publicReader, /worldPublicResearchDto\(buildWorldAllResearchProjection/);
});

test("guest DTO removes private, candidate, triage and search carriers without losing provenance", () => {
  const dto = worldPublicResearchDto({
    convergenceCandidates: [{ id: "secret-candidate" }],
    convergenceCandidateError: "secret-error",
    convergenceCandidateMeta: { activePreferences: ["secret"] },
    excludedMaterial: { hidden: 7 },
    excludedPersonOnlyResearch: 9,
    rows: [
      {
        id: "research:public-approved",
        sourceId: "public-approved",
        family: "research_object",
        status: "approved",
        access: "public",
        kind: "observation",
        verification: "match",
        sourceRef: "channel_updates:one",
        sourceRefs: ["channel_updates:one", "channel_updates:two"],
        sourceHref: "https://example.com/source",
        canonicalFindingHref: "/world?admin=1&finding=public-approved",
        terms: ["private search term"],
        triage: { recommendation: "private recommendation" },
        recommendation: "private recommendation",
        parentId: "private-parent-id",
        sourceContributorId: "private-person-id",
        sourceContributorIds: ["private-person-id"],
        occurrenceCount: 2,
        occurrences: [
          { id: "one", sourceRef: "channel_updates:one", sourceContributorId: "private-person-id" },
          { id: "two", sourceRef: "channel_updates:two", sourceContributorId: "private-person-id" },
        ],
        treeMatches: [],
      },
      {
        id: "research:private-approved",
        sourceId: "private-approved",
        family: "research_object",
        status: "approved",
        access: "private",
        terms: ["must never leave"],
      },
      {
        id: "research:public-candidate",
        sourceId: "public-candidate",
        family: "research_object",
        status: "candidate",
        access: "public",
        terms: ["must never leave either"],
      },
      {
        id: "topic:approved",
        sourceId: "approved",
        family: "topic",
        status: "approved",
        kind: "topic",
        verification: "not_applicable",
        sourceRef: "topic_cards:approved",
        sourceRefs: ["topic_cards:approved"],
      },
      {
        id: "contribution:draft",
        sourceId: "draft",
        family: "contribution",
        status: "draft",
      },
    ],
  });

  assert.deepEqual(dto.rows.map((row) => row.id), ["research:public-approved", "topic:approved"]);
  const finding = dto.rows[0];
  assert.equal(finding.canonicalFindingHref, "/world?finding=public-approved#finding-public-approved");
  assert.equal(finding.canonicalFindingHref.includes("admin=1"), false);
  assert.equal(finding.sourceHref, "https://example.com/source");
  assert.deepEqual(finding.sourceRefs, ["channel_updates:one", "channel_updates:two"]);
  assert.deepEqual(finding.occurrences.map((occurrence) => occurrence.sourceRef), ["channel_updates:one", "channel_updates:two"]);
  assert.equal(finding.occurrences.some((occurrence) => "sourceContributorId" in occurrence), false);
  for (const key of ["terms", "triage", "recommendation", "parentId", "sourceContributorId", "sourceContributorIds"]) {
    assert.equal(key in finding, false, `${key} must stay manager-only`);
  }
  assert.equal("convergenceCandidates" in dto, false);
  assert.equal("convergenceCandidateMeta" in dto, false);
  assert.equal("excludedMaterial" in dto, false);
  assert.equal(dto.duplicateProjection.groups, 1);
  assert.equal(dto.duplicateProjection.occurrencesCombined, 1);
  assert.equal(dto.duplicateProjection.rawResearchRows, 2);
  assert.equal(dto.duplicateProjection.clusteredResearchRows, 1);
  assert.equal(JSON.stringify(dto).includes("private search term"), false);
  assert.equal(JSON.stringify(dto).includes("secret-candidate"), false);
});

test("guest DTO never invents a source URL", () => {
  const dto = worldPublicResearchDto({
    rows: [{
      id: "research:no-web-source",
      sourceId: "no-web-source",
      family: "research_object",
      status: "canonical",
      access: "public",
      sourceRef: "channel_updates:source-id",
      sourceRefs: ["channel_updates:source-id"],
      sourceHref: "javascript:alert(1)",
    }],
  });
  assert.equal(dto.rows[0].sourceHref, null);
  assert.equal(dto.rows[0].sourceRef, "channel_updates:source-id");
});

test("public focused finding lookup is exact and fails closed", () => {
  const projection = worldPublicResearchDto({
    rows: [
      {
        id: "research:public-approved",
        sourceId: "public-approved",
        family: "research_object",
        status: "approved",
        access: "public",
        statement: "ממצא ציבורי",
        sourceRef: "channel_updates:one",
        sourceRefs: ["channel_updates:one"],
        triage: { recommendation: "אסור לחשוף" },
      },
      {
        id: "research:public-candidate",
        sourceId: "public-candidate",
        family: "research_object",
        status: "candidate",
        access: "public",
        statement: "אסור להציג",
      },
      {
        id: "research:private-approved",
        sourceId: "private-approved",
        family: "research_object",
        status: "approved",
        access: "private",
        statement: "אסור להציג",
      },
    ],
  });

  const publicFinding = findWorldPublicResearchFinding(projection, "public-approved");
  assert.equal(publicFinding?.statement, "ממצא ציבורי");
  assert.equal("triage" in publicFinding, false);
  assert.equal(findWorldPublicResearchFinding(projection, "public"), null, "no fuzzy fallback");
  assert.equal(findWorldPublicResearchFinding(projection, "public-candidate"), null);
  assert.equal(findWorldPublicResearchFinding(projection, "private-approved"), null);
  assert.equal(findWorldPublicResearchFinding(projection, "missing"), null);
});
