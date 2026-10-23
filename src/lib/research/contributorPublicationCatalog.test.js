import test from "node:test";
import assert from "node:assert/strict";
import { fetchContributorPublicationCatalog } from "./contributorPublicationCatalog.js";
import { appendContributorPublicationCatalog, buildPublicContributorView } from "../../components/contributor2029/publicContributor2029Model.js";

const identity = { id: "writer", user_id: "owner", slug: "writer", display_name: "Writer", wa_names: [] };
const view = () => ({ items: [], canonicalHref: "/community/researcher/writer", partial: false });
function clientFixture({ count = 123, broken = null } = {}) {
  const calls = [];
  const contributions = Array.from({ length: count }, (_, i) => ({ id: `c${i}`, title: `Contribution ${i}`, status: "published", origin: "auto-post" }));
  return { calls, client: {
    from(table) {
      calls.push({ table });
      const b = { select: () => b, or: () => b, order: () => b, in: () => b,
        eq: (key, value) => { calls.push({ table, key, value }); return b; },
        range: async () => table === broken ? { error: new Error("offline") } : { data: table === "posts" ? [{ id: 1, slug: "post", title: "Article", author: "Writer" }] : [] } };
      return b;
    },
    rpc: async (name, args) => { calls.push({ name, ...args }); return { data: contributions.slice(args.p_offset, args.p_offset + args.p_limit) }; },
  } };
}

test("all 123 published source records are reachable across RPC pages without loading full research", async () => {
  const { client, calls } = clientFixture();
  const catalogue = await fetchContributorPublicationCatalog(identity, { client });
  assert.equal(catalogue.contributions.rows.length, 123);
  assert.deepEqual(calls.filter(c => c.name).map(c => c.p_offset), [0, 100]);
  assert.ok(calls.every(c => c.table !== "research_objects" && c.table !== "world_contributor_research_v1"));
  const result = appendContributorPublicationCatalog(view(), catalogue, identity);
  assert.equal(result.items.filter(i => i.label === "תרומה").length, 123);
  assert.equal(new Set(result.items.map(i => i.id)).size, result.items.length);
  assert.ok(result.items.some(i => i.id === "contribution:c122" && i.href.includes("item=contribution%3Ac122")));
});

test("a failed source remains unknown and preserves available articles", async () => {
  const { client } = clientFixture({ count: 0, broken: "els_records" });
  const catalogue = await fetchContributorPublicationCatalog(identity, { client });
  const result = appendContributorPublicationCatalog(view(), catalogue, identity);
  assert.equal(result.publicationCoverage.ciphers.count, null);
  assert.equal(result.partial, true);
  assert.equal(result.items[0].type, "writings");
});

test("cipher reader requires explicit public+published even when self_published bypasses RLS", async () => {
  const { client, calls } = clientFixture({ count: 0 });
  await fetchContributorPublicationCatalog(identity, { client });
  assert.ok(calls.some(c => c.table === "els_records" && c.key === "status" && c.value === "published"));
  assert.ok(calls.some(c => c.table === "els_records" && c.key === "visibility" && c.value === "public"));
  const result = appendContributorPublicationCatalog(view(), { ciphers: { rows: [
    { id: "hidden", slug: "hidden", status: "hidden", visibility: "private", self_published: true },
    { id: "public", slug: "public", status: "published", visibility: "public" },
  ], complete: true } }, identity);
  assert.deepEqual(result.items.map(i => i.id), ["els:public"]);
  assert.equal(result.items[0].strength, null);
});

test("lineage collapses a projected insight, while keeping its original source reference", () => {
  const result = appendContributorPublicationCatalog(view(), {
    contributions: { rows: [{ id: "original", status: "published", title: "Source", projected_insight_id: "projection" }], complete: true },
    insights: { rows: [{ id: "projection", title: "Projected", is_active: true }], complete: true },
  }, identity);
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0].linkedSourceRefs, ["insights:projection"]);
});

test("private insights and hidden contributions never enter the public catalogue", () => {
  const result = appendContributorPublicationCatalog(view(), {
    contributions: { rows: [{ id: "private", status: "hidden", body: "PRIVATE_BODY" }], complete: true },
    insights: { rows: [{ id: "private-insight", is_active: true, space: "private", title: "PRIVATE_BODY" }], complete: true },
  }, identity);
  assert.equal(result.items.length, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_BODY/);
});

test("live source survives the public model with reader proof and its exact World occurrence", () => {
  const result = buildPublicContributorView({ mode: "public_view", contributor: identity,
    availability: { sources: "ok", research: "deferred" }, sourceGroups: [{ id: "channel_updates:source",
      sourceRef: "channel_updates:source", source: { id: "source", status: "live", text: "Original", resolved_contributor_id: identity.id }, rows: [] }] }, identity);
  assert.equal(result.items.length, 1);
  assert.match(result.items[0].href, /sourceRef=channel_updates%3Asource/);
});
