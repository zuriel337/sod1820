import test from "node:test";
import assert from "node:assert/strict";
import { publicContributorPerson2029, withPublicContributorPerson2029 } from "./publicContributorPerson2029.js";
import { sourceCatalogFixtureView } from "./publicSourceCatalog2029Fixtures.js";
import { appendSourceCatalogWritings2029 } from "./publicSourceCatalog2029Model.js";
import { loadPublicContributor2029 } from "./loadPublicContributor2029.js";
import { publicContributorOverview } from "./contributorOverview2029Model.js";

const coverage = (count) => ({ count, complete: true, availability: "ok" });
const axis = (result, key) => result.axes.find((item) => item.key === key);
const generic = () => ({ canonicalHref: "/community/researcher/2042", profile: { name: "שם ציבורי", avatar: null, role: "חוקר" },
  items: [{ type: "findings", id: "candidate" }], publicationCoverage: { posts: coverage(7), ciphers: coverage(6), contributions: coverage(32) } });

test("writer uses the existing public Person projection and seven separate axes, without fabricating a Person binding", () => {
  const view = generic(), result = publicContributorPerson2029(view, { kind: "author", entryContext: "post" });
  assert.equal(result.profile.version, "person-profile-2029-v1");
  assert.equal(result.profile.viewer, "public");
  assert.equal(result.profile.person.personRef, null);
  assert.equal(result.personBinding, "unresolved");
  assert.equal(result.identityScope, "contributor");
  assert.equal(result.profile.lens, "publications");
  assert.equal(result.profile.capabilities.author, true);
  assert.deepEqual(result.axes.map((item) => item.key), ["activity", "tenure", "communityImpact", "contribution", "researchStanding", "publication", "humanCuration"]);
  assert.ok(result.axes.every((item) => item.score === null));
  assert.equal(result.profile.metrics.publications, 7);
  assert.equal(result.profile.metrics.els, 6);
  assert.equal(result.profile.metrics.findings, null, "candidate rows do not imply a substantive-finding total");
  assert.equal(result.profile.metrics.sources, null, "general source coverage is not certified by publication-family coverage");
});

test("paired media and appended posts retain source identities; counts never sum independent findings", () => {
  const source = sourceCatalogFixtureView();
  const view = appendSourceCatalogWritings2029(source, { rows: Array.from({ length: 5 }, (_, i) => ({ id: i, slug: `post-${i}`, title: "מאמר", date: "2020-01-01" })),
    complete: true, availability: "ok" }, { slug: "tzvi-opoc" });
  const before = JSON.stringify(view);
  const composed = withPublicContributorPerson2029(view, { kind: "contributor" });
  assert.equal(composed.catalog, view.catalog);
  assert.equal(composed.catalog.recentItems, source.catalog.recentItems);
  assert.equal(JSON.stringify(view), before);
  const result = composed.personProjection;
  assert.equal(result.profile.metrics.sources, 29);
  assert.equal(result.profile.metrics.publications, 5);
  assert.equal(result.profile.metrics.media, 1);
  assert.equal(result.profile.metrics.findings, null);
  const paired = view.catalog.items.find((item) => item.paired);
  assert.equal(paired.linkedSourceRefs.length, 2);
  assert.equal(axis(result, "contribution").measures.sourcePublications.value, 29);
  assert.match(axis(result, "contribution").measures.sourcePublications.scope, /not independent findings/);
});

test("complete zero, unavailable and truncated families remain distinct", () => {
  const empty = { ...generic(), publicationCoverage: { posts: coverage(0), ciphers: { count: 9, complete: false, availability: "ok" },
    contributions: { count: 0, complete: true, availability: "unavailable" } } };
  const result = publicContributorPerson2029(empty);
  assert.equal(result.profile.metrics.publications, 0);
  assert.equal(result.profile.metrics.els, null);
  assert.equal(axis(result, "publication").measures.publications.state, "measured");
  assert.equal(axis(result, "contribution").measures.contributionRows.value, null);
  const partial = sourceCatalogFixtureView();
  partial.catalog.truncated = true;
  assert.equal(publicContributorPerson2029(partial).profile.metrics.sources, null);
  partial.catalog.truncated = false; partial.catalog.sourcesAvailable = false;
  assert.equal(publicContributorPerson2029(partial).profile.metrics.sources, null);
});

test("malformed counts do not become measured zero or inflated totals", () => {
  for (const value of [null, "", "0", true, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    const view = generic(); view.publicationCoverage.posts = coverage(value);
    assert.equal(publicContributorPerson2029(view).profile.metrics.publications, null);
  }
});

test("a loaded message page, archive likes, XP and old ranks cannot manufacture a Person total, capability or R-level", () => {
  const view = { ...generic(), community: { available: true, items: Array.from({ length: 20 }, (_, id) => ({ id, likes: 10 })) },
    rankPreview: { state: "ready", level: 5, label: "חוקר היכל" },
    researchStanding: { level: "R7", label: "חוקר בכיר", humanGate: true }, xp: 90000, credits: 99999, archiveLikes: 20000 };
  for (const kind of [null, "community", "contributor", "writer", "author", "admin"]) {
    const result = publicContributorPerson2029(view, { kind });
    assert.equal(result.profile.capabilities.researcher, false);
    assert.equal(result.profile.researchStanding, null);
    assert.equal(axis(result, "researchStanding").level, null);
    assert.equal(axis(result, "researchStanding").progress, null);
    assert.equal(result.profile.metrics.messages, null);
    assert.equal(axis(result, "communityImpact").measures.likesReceived.value, null);
  }
  const researcher = publicContributorPerson2029(view, { kind: "researcher" });
  assert.equal(researcher.profile.capabilities.researcher, true);
  assert.equal(researcher.profile.researchStanding, null, "capability alone cannot supply a standing level");
});

test("account registration is explicit and does not become historical tenure or last connection", () => {
  const result = publicContributorPerson2029(generic(), { overview: { state: "ready", joinedAt: "2020-01-01T12:00:00Z",
    communitySince: "1999-01-01T12:00:00Z", firstSeen: "1998-01-01", lastSeenAt: "2026-01-01" } });
  const tenure = axis(result, "tenure");
  assert.equal(tenure.registeredAt, "2020-01-01T12:00:00.000Z");
  assert.equal(tenure.registeredAtBasis, "account_registration");
  assert.equal(tenure.measures.tenureDays.value, null);
  assert.equal(tenure.firstPublicActivityAt, null); assert.equal(tenure.lastSeenAt, null);
  assert.equal(result.profile.person.firstSeen, null); assert.equal(result.profile.person.lastSeen, null);
  const overview = publicContributorOverview({ state: "ready", joinedAt: "2020-01-01T12:00:00Z", communitySince: "1999-01-01" });
  assert.equal(overview.joinedAtBasis, "account_registration");
  assert.equal(overview.communitySince, null); assert.equal(overview.communityTenureState, "not_measured");
});

test("only public allowlisted fields enter composition; private/admin/economy and raw identity records stay out", () => {
  const view = { ...generic(), user_id: "SECRET_ACCOUNT", person_id: "SECRET_PERSON", wa_names: ["SECRET_ALIAS"],
    email: "SECRET_EMAIL", privateContext: { query: "SECRET_SEARCH" }, economy: { credits: 10000 },
    identities: [{ email: "SECRET_IDENTITY" }], admin: { moderation: "SECRET_MODERATION" } };
  const value = publicContributorPerson2029(view, { viewer: "admin", personRef: "FORGED_PERSON" });
  assert.doesNotMatch(JSON.stringify(value), /SECRET_|FORGED_PERSON|economy|privateContext|wa_names|email/);
  assert.equal(value.profile.viewer, "public");
  assert.equal(value.profile.person.personRef, null);
  for (const canonicalHref of ["https://attacker.invalid/community/researcher/a", "/admin/people", "//attacker.invalid", null]) {
    assert.throws(() => publicContributorPerson2029({ ...generic(), canonicalHref }), /public_writer_projection_required/);
  }
});

test("both canonical writer loader paths attach the projection without new queries or an unsafe Person/rank RPC", async () => {
  const calls = [];
  for (const slug of ["writer", "tzvi-opoc"]) {
    const identity = { id: "writer-id", slug, kind: "author", display_name: "שם קנוני", user_id: "SECRET_ACCOUNT", wa_names: [] };
    const client = { from(table) {
      calls.push(table);
      assert.equal(table, "contributors");
      const chain = { select() { return chain; }, eq() { return chain; }, maybeSingle: async () => ({ data: identity }) };
      return chain;
    }, rpc() { throw new Error("unexpected_rank_or_person_rpc"); } };
    const projection = { mode: "public_view", contributor: identity, sourceGroups: [], contributions: [], topics: [],
      availability: { sources: "ok", research: "deferred", contributions: "ok", topics: "unavailable" } };
    const view = await loadPublicContributor2029(slug, {
      publicClient: () => client, projectionReader: async () => projection,
      catalogReader: async (_slug, options) => {
        await options.findingsReader(slug, {});
        return { contributor: identity, items: [], recentItems: [], availability: { sources: "ok" }, loadState: {}, researchState: "deferred_until_exact_occurrence" };
      },
      publicationReader: async () => ({ posts: { rows: [], complete: true, availability: "ok" } }),
    });
    assert.equal(view.personProjection.profile.person.displayName, "שם קנוני");
    assert.equal(view.personProjection.profile.capabilities.author, true);
    assert.equal(view.personProjection.profile.metrics.publications, 0);
    assert.equal(view.personProjection.profile.researchStanding, null);
  }
  assert.deepEqual(calls, ["contributors", "contributors"]);
});
