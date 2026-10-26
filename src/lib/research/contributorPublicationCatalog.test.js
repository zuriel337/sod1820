import test from "node:test";
import assert from "node:assert/strict";
import {
  contributorPublicationRecordTime,
  fetchContributorPublicationCatalog,
  sortContributorPublicationRows,
} from "./contributorPublicationCatalog.js";
import { appendContributorPublicationCatalog, buildPublicContributorView } from "../../components/contributor2029/publicContributor2029Model.js";

const identity = { id: "writer", user_id: "owner", slug: "writer", display_name: "Writer", wa_names: [], active: true };
const view = () => ({ items: [], canonicalHref: "/community/researcher/writer", partial: false });
function clientFixture({ count = 123, broken = null } = {}) {
  const calls = [];
  const contributions = Array.from({ length: count }, (_, i) => ({ id: `c${i}`, title: `Contribution ${i}`, status: "published", origin: "auto-post" }));
  return { calls, client: {
    from(table) {
      calls.push({ table });
      const b = { select: () => b, or: (filter) => { calls.push({ table, filter }); return b; }, order: () => b, in: () => b,
        eq: (key, value) => { calls.push({ table, key, value }); return b; },
        range: async () => table === broken ? { error: new Error("offline") } : { data: table === "contributors" ? [identity] : table === "posts" ? [{ id: 1, slug: "post", title: "Article", author: "Writer" }] : [] } };
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

test("writings use modified, then publication, then creation time and keep a stable newest-first order", () => {
  const rows = [
    { id: "published-newer", slug: "published-newer", title: "Published", date: "2026-10-25T00:00:00Z" },
    { id: "updated", slug: "updated", title: "Updated", date: "2020-01-01T00:00:00Z", modified: "2026-10-26T00:00:00Z" },
    { id: "created", created_at: "2026-10-24T00:00:00Z" },
    { id: "missing" },
  ];
  assert.equal(contributorPublicationRecordTime(rows[1]), "2026-10-26T00:00:00Z");
  assert.deepEqual(sortContributorPublicationRows(rows).map((row) => row.id), ["updated", "published-newer", "created", "missing"]);
  const projected = appendContributorPublicationCatalog(view(), { posts: { rows: rows.slice(0, 2), complete: true, availability: "ok" } }, identity);
  assert.equal(projected.items.find((item) => item.id === "post:updated")?.date, "2026-10-26T00:00:00Z");
  assert.equal(projected.items.find((item) => item.id === "post:updated")?.dateKind, "updated");
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

test("registered aliases reach posts and coauthored posts with escaped exact filters", async () => {
  const { client, calls } = clientFixture({ count: 0 });
  const result = await fetchContributorPublicationCatalog(identity, { client, families: ["posts"],
    attributionReader: async () => ({ identity, names: ["Writer", 'Alias, (quoted) "name"'] }) });
  const filter = calls.find((call) => call.table === "posts" && call.filter)?.filter;
  assert.ok(filter.includes(`author.eq.${JSON.stringify('Alias, (quoted) "name"')}`));
  assert.ok(filter.includes(`authors.cs.{${JSON.stringify('Alias, (quoted) "name"')}}`));
  assert.deepEqual(Object.keys(result), ["posts"]);
  assert.ok(calls.every((call) => !["els_records", "channel_updates", "research_objects"].includes(call.table)));
});

test("source authorship includes another account's upload; owned material retains its separate upload basis", async () => {
  const rows = [
    { id: "own", owner_user_id: "owner", author_name: "Writer" },
    { id: "uploaded-by-system", owner_user_id: "system-account", author_name: "Writer" },
    { id: "other-author", owner_user_id: "owner", author_name: "Someone else" },
    { id: "no-credit-own", owner_user_id: "owner", author_name: null },
    { id: "unrelated", owner_user_id: "other", author_name: null },
  ];
  let reads = 0;
  const { client } = clientFixture({ count: 0 });
  const original = client.from;
  client.from = (table) => {
    if (table !== "els_records") return original(table);
    reads += 1;
    const query = { select: () => query, eq: () => query, or: () => query, order: () => query,
      range: async () => ({ data: rows }) };
    return query;
  };
  const result = await fetchContributorPublicationCatalog({ id: identity.id, slug: identity.slug }, { client });
  assert.equal(reads, 1);
  assert.deepEqual(result.ciphers.rows.map((row) => row.id), ["own", "uploaded-by-system", "other-author", "no-credit-own"]);
  assert.equal(result.ciphers.rows[1].owner_user_id, "system-account");
  assert.equal(result.ciphers.rows[1].attributionBasis, "source_author_credit");
  assert.equal(result.ciphers.rows[2].attributionBasis, "upload_account_with_unresolved_author_credit");
  assert.equal(result.ciphers.rows[3].attributionBasis, "account_without_author_credit");
  const projected=appendContributorPublicationCatalog(view(), { ciphers: { ...result.ciphers, rows: result.ciphers.rows.map(row=>({
    ...row, slug:row.id, status:"published", visibility:"public" })) } }, identity);
  assert.equal(projected.items.find(item=>item.id==="els:uploaded-by-system").type,"findings");
  assert.equal(projected.items.find(item=>item.id==="els:other-author").type,"sources");
});

test("unavailable identity proof is unknown rather than guessed name attribution", async () => {
  const { client, calls } = clientFixture({ count: 0, broken: "contributors" });
  const result = await fetchContributorPublicationCatalog(identity, { client });
  for (const family of ["posts", "ciphers", "insights", "topics"]) {
    assert.equal(result[family].availability, "unavailable");
    assert.equal(result[family].complete, false);
  }
  assert.equal(calls.some((call) => call.table === "posts"), false);
});
