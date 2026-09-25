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

console.log("people directory 2029 projection: PASS");
