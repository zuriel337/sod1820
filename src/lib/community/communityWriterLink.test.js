import test from "node:test";
import assert from "node:assert/strict";
import { communityWriterHref, communityWriterLookup, resolveCommunityWriter } from "./communityWriterLink.js";

const ID = "19936860-6b35-4386-bc44-113289858ff0";

function fakeClient(rows, { error = null } = {}) {
  const calls = [];
  const query = { select: () => query, eq: (column, value) => { calls.push([column, value]); return query; },
    limit: async () => ({ data: error ? null : rows, error }) };
  return { calls, from: (table) => { calls.push(["from", table]); return query; } };
}
const writerRow = { slug: "yaniv-levi", code: null, display_name: "יניב לוי", active: true, locked: false, building: false, visibility: "public" };

test("lookup accepts only user: and contributor uuids", () => {
  assert.deepEqual(communityWriterLookup(ID), { column: "id", id: ID });
  assert.deepEqual(communityWriterLookup(`user:${ID}`), { column: "user_id", id: ID });
  assert.equal(communityWriterLookup("יניב לוי"), null);
  assert.equal(communityWriterLookup("user:not-a-uuid"), null);
  assert.equal(communityWriterLookup(null), null);
});

test("one public active writer resolves to the existing writer page", async () => {
  const client = fakeClient([writerRow]);
  assert.deepEqual(await resolveCommunityWriter(ID, { client }), { name: "יניב לוי", href: "/community/researcher/yaniv-levi" });
  assert.deepEqual(client.calls, [["from", "contributors"], ["id", ID]]);
  await resolveCommunityWriter(`user:${ID}`, { client });
  assert.deepEqual(client.calls.at(-1), ["user_id", ID]);
});

test("numeric writer code takes precedence in the writer URL", async () => {
  const writer = await resolveCommunityWriter(ID, { client: fakeClient([{ ...writerRow, code: "123" }]) });
  assert.equal(writer.href, "/community/researcher/123");
});

test("private, locked, inactive, building, missing and ambiguous writers resolve to nothing", async () => {
  for (const row of [{ ...writerRow, visibility: "private" }, { ...writerRow, visibility: null }, { ...writerRow, locked: true },
    { ...writerRow, active: false }, { ...writerRow, building: true }]) {
    assert.equal(await resolveCommunityWriter(ID, { client: fakeClient([row]) }), null);
  }
  assert.equal(await resolveCommunityWriter(ID, { client: fakeClient([]) }), null);
  assert.equal(await resolveCommunityWriter(ID, { client: fakeClient([writerRow, { ...writerRow, slug: "other" }]) }), null, "ambiguous binding is never guessed");
  assert.equal(await resolveCommunityWriter(ID, { client: fakeClient(null, { error: new Error("rls") }) }), null);
  assert.equal(await resolveCommunityWriter("not-an-id", { client: fakeClient([writerRow]) }), null);
});

test("writer href carries only an approved return target", () => {
  const writer = { href: "/community/researcher/yaniv-levi" };
  const origin = "https://sod1820.example";
  assert.equal(communityWriterHref(writer, "/community/chat?x=1#message-9", origin),
    `/community/researcher/yaniv-levi?returnTo=${encodeURIComponent("/community/chat?x=1#message-9")}`);
  assert.equal(communityWriterHref(writer, "/2029?preview=community&data=live", origin), "/community/researcher/yaniv-levi", "preview path is not an approved return");
  assert.equal(communityWriterHref(writer, "https://evil.example/community/chat", origin), "/community/researcher/yaniv-levi");
  assert.equal(communityWriterHref(writer, "//evil.example/community", origin), "/community/researcher/yaniv-levi");
  assert.equal(communityWriterHref(null, "/community/chat", origin), null);
});
