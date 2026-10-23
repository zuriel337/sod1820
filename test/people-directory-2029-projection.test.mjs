import assert from "node:assert/strict";
import fs from "node:fs";
import {
  projectPeopleDirectory2029,
  normalizePeopleDirectoryPerson,
} from "../src/lib/research/peopleDirectory2029Projection.js";

const source = fs.readFileSync("src/lib/research/peopleDirectory2029Projection.js", "utf8");

assert.doesNotMatch(source, /supabase|\.rpc\(|\.from\(/, "directory projection must remain pure/read-only");
assert.doesNotMatch(source, /senior_level|is_researcher/, "legacy researcher flags must not define 2029 directory");
assert.doesNotMatch(source, /Date\.now|30\s*days|90\s*days/i, "activity windows belong to the activity owner, not this projection");
assert.doesNotMatch(source, /email|phone/i, "directory projection must not expose contact identifiers");

const rows = [
  {
    person: {
      personRef: "person:a",
      displayName: "אלף",
      username: "alpha",
      activityState: "ACTIVE",
      isReturning: true,
      firstSeen: "2023-01-01T00:00:00Z",
      lastSeen: "2026-09-24T10:00:00Z",
    },
    identityCount: 3,
    capabilities: { contributor: true, researcher: false },
    metrics: {
      messages: 800,
      activeDays: 240,
      momentum: 90,
      tenureDays: 1300,
      likesReceived: 1200,
      hints: 14,
      findings: 0,
      publications: 0,
    },
    communityImpact: { score: 300, reactionsReceived: 1400, uniqueResponders: 80 },
    researchStanding: { level: "R7", label: "לא אמור להופיע" },
    whyNow: ["חזר לפעילות"],
    identities: [{ sourceId: "must-not-pass" }],
    email: "must-not-pass@example.com",
  },
  {
    person: {
      personRef: "person:b",
      displayName: "בית",
      username: "beta",
      activityState: "ONLINE",
      isNew: true,
      firstSeen: "2026-09-01T00:00:00Z",
      lastSeen: "2026-09-25T10:00:00Z",
    },
    identityCount: 1,
    capabilities: { contributor: true, researcher: true, writer: true },
    metrics: {
      messages: 120,
      activeDays: 20,
      momentum: 98,
      tenureDays: 24,
      hints: 8,
      findings: 11,
      publications: 5,
    },
    communityImpact: { score: 120, reactionsReceived: 180 },
    researchStanding: { level: "R4", label: "חוקר מבוסס" },
    whyNow: ["מחובר עכשיו"],
  },
  {
    person: {
      personRef: "person:c",
      displayName: "גימל",
      activityState: "DORMANT",
      firstSeen: "2023-05-01T00:00:00Z",
      lastSeen: "2025-05-01T00:00:00Z",
    },
    identityCount: 2,
    capabilities: { writer: true },
    metrics: {
      messages: 500,
      activeDays: 130,
      momentum: 3,
      tenureDays: 900,
      publications: 15,
    },
    communityImpact: { score: 210, reactionsReceived: 600 },
  },
  // Duplicate canonical Person row must not create a second directory person.
  {
    person: {
      personRef: "person:a",
      displayName: "אלף ישן",
      activityState: "RECENT",
      lastSeen: "2025-01-01T00:00:00Z",
    },
    identityCount: 1,
    metrics: { messages: 10 },
  },
];

const normalizedCommunity = normalizePeopleDirectoryPerson(rows[0]);
assert.equal(normalizedCommunity.researchStanding, null, "non-researcher must not receive Research Standing from stray input");
assert.equal(normalizedCommunity.primaryCapability, "contributor");

const allRecent = projectPeopleDirectory2029(rows);
assert.equal(allRecent.totalPeople, 3, "directory must project one row per canonical personRef");
assert.deepEqual(allRecent.diagnostics.duplicatePersonRefs, ["person:a"]);
assert.deepEqual(allRecent.rows.map((row) => row.personRef), ["person:b", "person:a", "person:c"]);
assert.equal(JSON.stringify(allRecent).includes("must-not-pass@example.com"), false);
assert.equal(JSON.stringify(allRecent).includes("must-not-pass"), false, "source identities must not leak to public directory card projection");

const active = projectPeopleDirectory2029(rows, { filter: "active" });
assert.deepEqual(active.rows.map((row) => row.personRef), ["person:b", "person:a"]);

const returning = projectPeopleDirectory2029(rows, { filter: "returning" });
assert.deepEqual(returning.rows.map((row) => row.personRef), ["person:a"]);

const researchers = projectPeopleDirectory2029(rows, { filter: "researchers" });
assert.deepEqual(researchers.rows.map((row) => row.personRef), ["person:b"]);
assert.equal(researchers.rows[0].researchStanding.level, "R4");

const writers = projectPeopleDirectory2029(rows, { filter: "writers", sort: "publications" });
assert.deepEqual(writers.rows.map((row) => row.personRef), ["person:c", "person:b"]);

const byMessages = projectPeopleDirectory2029(rows, { sort: "messages" });
assert.deepEqual(byMessages.rows.map((row) => row.personRef), ["person:a", "person:c", "person:b"]);

const byImpact = projectPeopleDirectory2029(rows, { sort: "communityImpact" });
assert.deepEqual(byImpact.rows.map((row) => row.personRef), ["person:a", "person:c", "person:b"]);

const byStanding = projectPeopleDirectory2029(rows, { sort: "researchStanding" });
assert.equal(byStanding.rows[0].personRef, "person:b", "research standing sort must rank explicit researcher capability only");

const query = projectPeopleDirectory2029(rows, { query: "beta" });
assert.deepEqual(query.rows.map((row) => row.personRef), ["person:b"]);

const unknown = projectPeopleDirectory2029(rows, { filter: "nonsense", sort: "nonsense" });
assert.equal(unknown.filter, "all");
assert.equal(unknown.sort, "recent");

const missingRefs = projectPeopleDirectory2029([
  { person: { displayName: "ללא ref", activityState: "ACTIVE" }, metrics: { messages: 1 } },
  { person: { displayName: "ללא ref 2", activityState: "ACTIVE" }, metrics: { messages: 2 } },
]);
assert.equal(missingRefs.totalPeople, 2);
assert.equal(missingRefs.diagnostics.missingPersonRefs, 2);

// Unknown is not zero: missing/non-numeric stay null, known zero stays 0, and both are visible on the card.
const person = (ref, name, metrics, extra = {}) => ({ person: { personRef: ref, displayName: name, lastSeen: extra.lastSeen ?? null }, metrics, ...extra.rest });
const unknownNorm = normalizePeopleDirectoryPerson(person("p:u", "לא ידוע", { messages: null, hints: "", findings: "bad", publications: 0 }));
assert.equal(unknownNorm.metrics.messages, null);
assert.equal(unknownNorm.metrics.hints, null);
assert.equal(unknownNorm.metrics.findings, null);
assert.equal(unknownNorm.metrics.publications, 0, "a measured zero stays zero");
assert.equal(unknownNorm.metrics.activeDays, null, "an absent metric is unknown");
assert.equal(unknownNorm.communityImpact.score, null);
assert.equal(unknownNorm.communityImpact.reactionsReceived, null);

// Sorting: known values (including a known zero) outrank unknown ones; unknown keeps the explicit tie-breakers.
const unknownSortRows = [
  person("p:unknown-b", "ב", {}, { lastSeen: "2026-10-22T00:00:00Z" }),
  person("p:zero", "אפס", { messages: 0 }, { lastSeen: "2026-10-01T00:00:00Z" }),
  person("p:five", "חמש", { messages: 5 }, { lastSeen: "2026-10-02T00:00:00Z" }),
  person("p:unknown-a", "א", {}, { lastSeen: "2026-10-23T00:00:00Z" }),
];
const unknownByMessages = projectPeopleDirectory2029(unknownSortRows, { sort: "messages" });
assert.deepEqual(unknownByMessages.rows.map((row) => row.personRef), ["p:five", "p:zero", "p:unknown-a", "p:unknown-b"]);
assert.deepEqual(unknownByMessages.sortCoverage, { sort: "messages", known: 2, unknown: 2 });
assert.deepEqual(unknownByMessages.rows[0].unknownMetrics.includes("messages"), false);
assert.equal(unknownByMessages.rows[2].unknownMetrics.includes("messages"), true);
assert.equal(unknownByMessages.emptyReason, null);

// recent: a missing lastSeen is unknown and sorts after every known time.
const byRecent = projectPeopleDirectory2029([
  { person: { personRef: "p:never", displayName: "ללא זמן" } },
  { person: { personRef: "p:old", displayName: "ישן", lastSeen: "2020-01-01T00:00:00Z" } },
], { sort: "recent" });
assert.deepEqual(byRecent.rows.map((row) => row.personRef), ["p:old", "p:never"]);

// All-unknown sort metric is reported, not shown as a ranking of zeros.
const allUnknown = projectPeopleDirectory2029([person("p:1", "א", {}), person("p:2", "ב", {})], { sort: "findings" });
assert.deepEqual(allUnknown.sortCoverage, { sort: "findings", known: 0, unknown: 2 });

// Standing sort: no standing / unparseable level is unknown, below R0 which is known.
const standing = projectPeopleDirectory2029([
  { person: { personRef: "p:r0", displayName: "R0" }, capabilities: { researcher: true }, researchStanding: { level: "R0" } },
  { person: { personRef: "p:nolevel", displayName: "בלי" }, capabilities: { researcher: true }, researchStanding: { label: "תורם קבוע" } },
  { person: { personRef: "p:community", displayName: "קהילה" } },
  { person: { personRef: "p:r3", displayName: "R3" }, capabilities: { researcher: true }, researchStanding: { level: "R3" } },
], { sort: "researchStanding" });
assert.deepEqual(standing.rows.slice(0, 2).map((row) => row.personRef), ["p:r3", "p:r0"]);
assert.deepEqual(standing.sortCoverage, { sort: "researchStanding", known: 2, unknown: 2 });

// Filters never treat unknown as a match; empty states say why.
assert.equal(projectPeopleDirectory2029([person("p:u", "א", {})], { filter: "hints" }).emptyReason, "no_match");
assert.equal(projectPeopleDirectory2029([person("p:h", "א", { hints: 0 })], { filter: "hints" }).visiblePeople, 0);
assert.equal(projectPeopleDirectory2029([person("p:h", "א", { hints: 2 })], { filter: "hints" }).visiblePeople, 1);
assert.equal(projectPeopleDirectory2029([], {}).emptyReason, "no_people");
assert.equal(projectPeopleDirectory2029([person("p:x", "אבג", {})], { query: "zzz" }).emptyReason, "no_match");

console.log("people directory 2029 projection: PASS");
