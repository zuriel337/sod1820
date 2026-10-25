import test from "node:test";
import assert from "node:assert/strict";
import { loadCommunityPerson2029 } from "./loadCommunityPerson2029.js";
import { contributorPersonView2029 } from "./contributorPersonView2029.js";

const source = "e7581ab5-8c15-4832-b602-f361e41ff373";
const other = "11111111-1111-4111-8111-111111111111";
const account = "22222222-2222-4222-8222-222222222222";
const row = { id: "native-message", authorName: "שם שפורסם בהודעה", body: "הודעה ציבורית", origin: "openweb", parentId: null };
const options = (overrides = {}) => ({ client: { from() { throw new Error("PRIVATE_DOSSIER_READ"); } },
  writerReader: async () => null, identityReader: async () => ({ accountIds: [], contributorIds: [source] }),
  activityReader: async (_key, args) => { assert.equal(args.filter, "chat"); assert.equal(args.limit, 20); return { rows: [row], count: 1249, nextOffset: 1 }; },
  summaryReader: async () => ({ firstAt: "2023-01-01T00:00:00Z", archiveLikes: null }), ...overrides });

test("unclaimed archive author uses the same Person projection using public message credit only", async () => {
  const result = await loadCommunityPerson2029(source, options());
  assert.equal(result.profile.name, row.authorName);
  assert.equal(result.profile.avatar, null); assert.equal(result.profile.bio, "");
  assert.equal(result.publicActions, false); assert.equal(result.noindex, true);
  assert.equal(result.personProjection.profile.metrics.messages, 1249);
  assert.equal(result.personProjection.profile.researchStanding, null);
  assert.equal(result.personProjection.personBinding, "unresolved");
  assert.equal(result.personProjection.profile.person.personRef, null);
  assert.equal(result.community.page.rows[0], row, "native message object/ref is reused");
  assert.equal(result.entrySection, "community");
  assert.deepEqual(result.activitySections, { community: "chat", all: "all", sources: "contributions" });
  assert.match(result.publicLinks[0].href, /claim=/, "existing verified claim flow remains reachable without executing it");
  const person = contributorPersonView2029(result.personProjection, { name: result.profile.name });
  assert.equal(person.mode, "community");
  assert.equal(person.standing, null);
  assert.ok(person.measured.some((group) => group.items.some((item) => item.key === "messages" && item.value === 1249)));
});
test("reported historical likes retain their provenance and never become computed standing", async () => {
  const result = await loadCommunityPerson2029(source, options());
  const impact = result.personProjection.axes.find((axis) => axis.key === "communityImpact");
  assert.equal(impact.measures.likesReceived.value, 22900);
  assert.equal(impact.measures.likesReceived.source, "verified_archive_profile_baseline");
  assert.equal(impact.score, null);
  const unknown = await loadCommunityPerson2029(other, options());
  assert.equal(unknown.personProjection.axes.find((axis) => axis.key === "communityImpact").measures.likesReceived.value, null);
});
test("a unique existing public writer reuses the canonical writer reader and retains entry source identity", async () => {
  const calls = [];
  const result = await loadCommunityPerson2029(source, options({ writerReader: async () => ({ href: "/community/researcher/tzvi-opoc", kind: "contributor" }),
    contributorReader: async (key) => { calls.push(key); return { canonicalHref: "/community/researcher/tzvi-opoc", profile: { name: "צבי" }, kind: "source_catalog", catalog: { recentItems: [] } }; } }));
  assert.deepEqual(calls, ["tzvi-opoc"]);
  assert.equal(result.kind, "source_catalog");
  assert.equal(result.entrySection, "community");
  assert.equal(result.communityAuthorKey, source);
  assert.equal(result.community.page.rows[0], row);
  assert.equal(result.personProjection.profile.metrics.messages, 1249);
});
test("only an existing account binding can bridge a source author to a public writer", async () => {
  const calls = [];
  const result = await loadCommunityPerson2029(source, options({ identityReader: async () => ({ accountIds: [account] }),
    writerReader: async (key) => { calls.push(key); return key.startsWith("user:") ? { href: "/community/researcher/2042" } : null; },
    contributorReader: async () => ({ canonicalHref: "/community/researcher/2042", profile: { name: "שם קנוני" } }) }));
  assert.deepEqual(calls, [source, `user:${account}`]);
  assert.equal(result.profile.name, "שם קנוני");
});
test("no public messages means no private-dossier fallback or invented identity", async () => {
  assert.equal(await loadCommunityPerson2029(other, options({ activityReader: async () => ({ rows: [], count: 0, nextOffset: 0 }) })), null);
  assert.equal(await loadCommunityPerson2029(source, options({ writerReader: async () => ({ href: "/community/researcher/private" }), contributorReader: async () => null })), null);
  for (const key of ["יניב", "../admin", "user:invalid", null]) {
    assert.equal(await loadCommunityPerson2029(key, options({ writerReader: () => { throw new Error("INVALID_KEY_READ"); } })), null);
  }
});
test("account keys do not become new contributor identities or claim links", async () => {
  const result = await loadCommunityPerson2029(`user:${account}`, options());
  assert.equal(result.communityAuthorKey, `user:${account}`);
  assert.equal(new URL(result.canonicalHref, "https://local.invalid").searchParams.get("member"), `user:${account}`);
  assert.deepEqual(result.publicLinks, []);
  assert.equal(result.personProjection.identityScope, "account");
});

test("unknown chat counts remain unknown while existing public-summary likes are measured", async () => {
  const result = await loadCommunityPerson2029(other, options({
    activityReader: async () => ({ rows: [row], count: null, nextOffset: 1 }),
    summaryReader: async () => ({ firstAt: null, archiveLikes: 7 }),
  }));
  assert.equal(result.personProjection.profile.metrics.messages, null);
  assert.equal(result.personProjection.axes.find(axis => axis.key === "communityImpact").measures.likesReceived.value, 7);
  assert.equal(result.personProjection.axes.find(axis => axis.key === "communityImpact").measures.likesReceived.source, "public_community_author_summary");
});
