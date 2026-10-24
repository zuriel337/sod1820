import test from "node:test";
import assert from "node:assert/strict";
import { buildContributorAuthorCoverage, contributorAuthorAttribution, fetchContributorAuthorAttribution,
  resolveContributorAuthorCredit } from "./contributorAuthorAttribution.js";

const writer = { id: "writer", slug: "writer", active: true, display_name: "Canonical", wa_names: ["Registered alias"] };

test("only exact unique names and registered aliases resolve; similar text creates no person", () => {
  for (const name of ["Canonical", "Registered alias"]) assert.equal(resolveContributorAuthorCredit(name, [writer]).contributor.id, writer.id);
  for (const name of ["Canonical extra", "canonical", "Unregistered"]) assert.equal(resolveContributorAuthorCredit(name, [writer]).status, "unresolved");
  assert.deepEqual(contributorAuthorAttribution(writer, [writer]).names, ["Canonical", "Registered alias"]);
});

test("ambiguous names fail closed, including collision with a private or locked contributor", () => {
  const other = { ...writer, id: "other", slug: "other", display_name: "Other", public_visibility: "private" };
  const result = resolveContributorAuthorCredit("Registered alias", [writer, other]);
  assert.deepEqual(result, { status: "ambiguous", contributor: null });
  assert.deepEqual(contributorAuthorAttribution(writer, [writer, other]).names, ["Canonical"]);
  for (const blocked of [{ public_visibility: "private" }, { locked: true }, { building: true }, { active: false }]) {
    assert.equal(resolveContributorAuthorCredit("Canonical", [{ ...writer, ...blocked }]).contributor, null);
    assert.throws(() => contributorAuthorAttribution(writer, [{ ...writer, ...blocked }]));
  }
  assert.throws(() => contributorAuthorAttribution({ ...writer, slug: "forged" }, [writer]));
});

test("coverage preserves unresolved credits, counts and system bylines without minting profiles", () => {
  const result = buildContributorAuthorCoverage([{ credit: "Registered alias", count: 5 },
    { credit: "Unresolved author", count: 12 }, { credit: "sod1820", count: 4 }], [writer]);
  assert.equal(result[0].href, "/community/researcher/writer");
  assert.deepEqual(result[1], { credit: "Unresolved author", count: 12, status: "unresolved", slug: null, href: null });
  assert.equal(result[2].status, "system");
  assert.equal(result[2].href, null);
});

test("attribution reads stable inventory pages before deciding uniqueness", async () => {
  const rows = [...Array.from({ length: 100 }, (_, i) => ({ ...writer, id: `other${i}`, slug: `other${i}`, display_name: `Other${i}`, wa_names: [] })), writer];
  const offsets = [];
  const client = { from(table) {
    assert.equal(table, "contributors");
    const query = { select: () => query, order: () => query,
      range: async (start, end) => { offsets.push(start); return { data: rows.slice(start, end + 1) }; } };
    return query;
  } };
  const result = await fetchContributorAuthorAttribution(writer, { client });
  assert.deepEqual(offsets, [0, 100]);
  assert.deepEqual(result.names, ["Canonical", "Registered alias"]);
});
