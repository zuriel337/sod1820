import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PERSON_PROFILE_VIEWERS,
  projectPersonProfile2029,
  profileHasLens,
} from "../src/lib/research/personProfile2029Projection.js";

const source = fs.readFileSync("src/lib/research/personProfile2029Projection.js", "utf8");

assert.doesNotMatch(source, /supabase|\.rpc\(|\.from\(/, "projection must remain pure/read-only");
assert.doesNotMatch(source, /senior_level|is_researcher/, "legacy researcher flags must not define 2029 standing");
assert.match(source, /PERSON_PROFILE_ENTRY_LENS/);
assert.match(source, /Credits cannot|Research Standing|researchStanding/i);

// Community-first person: multiple historical identities must still project one profile.
const communityPayload = {
  person: {
    personRef: "person:community:1",
    displayName: "חברת קהילה",
    username: "member",
    joinedAt: "2023-01-01T00:00:00Z",
    firstSeen: "2023-01-01T00:00:00Z",
    lastSeen: "2026-09-22T00:00:00Z",
    activityState: "ACTIVE",
  },
  identities: [
    { sourceId: "source-a", contributorId: "contrib-a", displayName: "חברת קהילה", emailVerified: true, messages: 1000 },
    { sourceId: "source-b", contributorId: "contrib-b", displayName: "חברת קהילה", messages: 400 },
  ],
  metrics: {
    messages: 1400,
    activeDays: 500,
    likesReceived: 3200,
    reactionsReceived: 3400,
    hints: 4,
    media: 12,
    findings: 0,
    sources: 0,
    methods: 0,
    els: 0,
    publications: 0,
  },
  capabilities: {
    contributor: true,
    researcher: false,
    writer: false,
  },
  communityImpact: {
    score: 312,
    reactionsReceived: 3400,
    uniqueResponders: 81,
    repliesReceived: 204,
    explain: ["תגובות מקוריות", "משתתפים ייחודיים"],
  },
  researchStanding: {
    level: "R5",
    label: "חוקר בכיר",
  },
  privateContext: {
    activityItems: [
      { kind: "search", ref: "private:query:1", title: "שאילתה פרטית", private: true },
    ],
    savedCount: 8,
  },
  economy: { credits: 150, xp: 700, participationLevel: "L4" },
  referrals: { invitedCount: 5, activeInvitees: 2 },
};

const communityPublic = projectPersonProfile2029(communityPayload, {
  viewer: PERSON_PROFILE_VIEWERS.PUBLIC,
  entryContext: "chat",
});
assert.equal(communityPublic.person.displayName, "חברת קהילה");
assert.equal(communityPublic.identitySummary.identityCount, 2);
assert.equal(communityPublic.lens, "messages");
assert.equal(communityPublic.metrics.messages, 1400);
assert.equal(communityPublic.researchStanding, null, "ordinary community person must not receive Research Standing just because input contains a level");
assert.equal(profileHasLens(communityPublic, "messages"), true);
assert.equal(profileHasLens(communityPublic, "hints"), true);
assert.equal(profileHasLens(communityPublic, "findings"), false);
assert.equal(profileHasLens(communityPublic, "publications"), false);
assert.equal("private" in communityPublic, false);
assert.equal("economy" in communityPublic, false);
assert.equal("referrals" in communityPublic, false);
assert.equal("admin" in communityPublic, false);
assert.equal(JSON.stringify(communityPublic).includes("private:query:1"), false, "public profile must not leak raw private activity");

const communitySelf = projectPersonProfile2029(communityPayload, {
  viewer: PERSON_PROFILE_VIEWERS.SELF,
  entryContext: "self",
});
assert.equal(communitySelf.lens, "activity");
assert.equal(communitySelf.economy.credits, 150);
assert.equal(communitySelf.referrals.invitedCount, 5);
assert.equal(communitySelf.private.activityItems[0].ref, "private:query:1");

const communityAdminDefault = projectPersonProfile2029(communityPayload, {
  viewer: PERSON_PROFILE_VIEWERS.ADMIN,
});
assert.equal("private" in communityAdminDefault, false, "admin must not receive raw private activity by default");

const communityAdminAuthorized = projectPersonProfile2029({
  ...communityPayload,
  admin: { privateActivityAuthorized: true },
}, {
  viewer: PERSON_PROFILE_VIEWERS.ADMIN,
});
assert.equal(communityAdminAuthorized.private.activityItems[0].ref, "private:query:1");

// Researcher/writer: same profile family, capability-gated depth.
const researcherPayload = {
  person: {
    personRef: "person:researcher:1",
    displayName: "חוקר לדוגמה",
    activityState: "RECENT",
  },
  identities: [
    {
      sourceId: "historical-1",
      contributorId: "researcher-1",
      displayName: "חוקר לדוגמה",
      emailVerified: true,
      siteAccountMatch: true,
      firstSeen: "2024-01-01T00:00:00Z",
      lastSeen: "2026-09-20T00:00:00Z",
      messages: 220,
      activeDays: 90,
      email: "must-not-pass@example.com",
      phone: "000",
    },
  ],
  metrics: {
    messages: 220,
    activeDays: 90,
    hints: 18,
    findings: 12,
    sources: 7,
    methods: 3,
    els: 2,
    publications: 4,
    openThreads: 5,
  },
  capabilities: {
    contributor: true,
    researcher: true,
    writer: true,
    author: true,
  },
  researchStanding: {
    level: "R4",
    label: "חוקר מבוסס",
    summary: "ממצאים ומקורות מאומתים",
    explain: ["12 ממצאים", "7 מקורות"],
    calibrationVersion: "v0",
  },
  admin: {
    claimState: "CLAIMED",
    reconciliationState: "VERIFIED",
    attributionConfidence: "HIGH",
  },
};

const researcherFromHeichal = projectPersonProfile2029(researcherPayload, {
  viewer: PERSON_PROFILE_VIEWERS.PUBLIC,
  entryContext: "heichal",
});
assert.equal(researcherFromHeichal.lens, "findings");
assert.equal(researcherFromHeichal.researchStanding.level, "R4");
for (const lens of ["findings", "sources", "methods", "els", "publications", "questions"]) {
  assert.equal(profileHasLens(researcherFromHeichal, lens), true, `expected ${lens} tab`);
}

const researcherFromPost = projectPersonProfile2029(researcherPayload, {
  viewer: PERSON_PROFILE_VIEWERS.PUBLIC,
  entryContext: "post",
});
assert.equal(researcherFromPost.lens, "publications");

const researcherAdmin = projectPersonProfile2029(researcherPayload, {
  viewer: PERSON_PROFILE_VIEWERS.ADMIN,
  requestedLens: "sources",
});
assert.equal(researcherAdmin.lens, "sources");
assert.equal(researcherAdmin.admin.identities.length, 1);
assert.equal(researcherAdmin.admin.identities[0].sourceId, "historical-1");
assert.equal(JSON.stringify(researcherAdmin.admin).includes("must-not-pass@example.com"), false, "admin identity projection must not pass raw email");
assert.equal(JSON.stringify(researcherAdmin.admin).includes("000"), false, "admin identity projection must not pass raw phone");

// Missing contextual capability falls back to Overview rather than inventing a tab.
const noFindings = projectPersonProfile2029({
  person: { displayName: "חדש", joinedAt: "2026-09-25T00:00:00Z" },
  metrics: { messages: 1, activeDays: 1 },
}, { entryContext: "heichal" });
assert.equal(noFindings.lens, "overview");
assert.deepEqual(noFindings.tabs.map((tab) => tab.key), ["overview", "messages", "activity"]);

// Negative/bad metric values are clamped and never manufacture capability.
const clamped = projectPersonProfile2029({
  person: { displayName: "בדיקה" },
  metrics: { messages: -4, findings: -2, activeDays: "bad" },
});
assert.equal(clamped.metrics.messages, 0);
assert.equal(clamped.metrics.findings, 0);
assert.deepEqual(clamped.tabs.map((tab) => tab.key), ["overview"]);

console.log("person profile 2029 projection: PASS");
