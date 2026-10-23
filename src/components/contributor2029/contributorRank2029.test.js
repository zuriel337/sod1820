import test from "node:test";
import assert from "node:assert/strict";
import { contributorRankHandler, readPublicContributorRank } from "../../../api/public-contributor-rank.js";
import { fetchPublicContributorRank, publicContributorRank } from "./contributorRank2029Model.js";

const account = "22222222-2222-4222-8222-222222222222";
function clientFor(identity, rpcResult, calls = []) {
  return {
    from(table) {
      calls.push({ table });
      const builder = { select(fields) { calls.push({ fields }); return builder; },
        eq(key, value) { calls.push({ key, value }); return builder; },
        maybeSingle: async () => ({ data: identity }) };
      return builder;
    },
    async rpc(name, params) { calls.push({ name, params }); return rpcResult; },
  };
}
function response() {
  return { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}

test("rank comes from canonical account binding/RPC; public response contains no IDs, XP, or activity", async () => {
  const calls = [];
  const client = clientFor({ user_id: account, public_visibility: "public" },
    { data: { level: 5, label: "חוקר היכל", xp: 7800, posts: 99, whatsapp: 45, user_id: account, private_note: "SECRET" } }, calls);
  const rank = await readPublicContributorRank("tzvi-opoc", { client });
  assert.deepEqual(rank, { state: "ready", level: 5, label: "חוקר היכל" });
  assert.deepEqual(calls.find((c) => c.name), { name: "research_level_of", params: { p_user: account } });
  assert.ok(calls.some((c) => c.key === "slug" && c.value === "tzvi-opoc"));
  assert.doesNotMatch(JSON.stringify(rank), /SECRET|user_id|xp|posts|whatsapp|22222222/);
});

test("private/inactive/unknown profiles do not trigger rank RPC; no linked account does not become level 1", async () => {
  for (const identity of [null, { user_id: account, public_visibility: "private" }, { user_id: account }]) {
    const calls = [];
    assert.deepEqual(await readPublicContributorRank("writer", { client: clientFor(identity, { data: { level: 5, label: "חוקר היכל" } }, calls) }), { state: "not_found" });
    assert.equal(calls.some((c) => c.name), false);
  }
  assert.deepEqual(await readPublicContributorRank("2042", { client: clientFor({ public_visibility: "public", user_id: null }) }), { state: "unlinked" });
});

test("invalid or unavailable rank never becomes zero/a default rank", () => {
  for (const value of [null, {}, { state: "ready", level: 0, label: "מתחיל" }, { state: "ready", level: 9, label: "חוקר" },
    { state: "ready", level: 2, label: "" }, { state: "ready", level: 2, label: "חוקר test@example.com" }]) {
    assert.deepEqual(publicContributorRank(value), { state: "unavailable" });
  }
  assert.deepEqual(publicContributorRank({ state: "ready", level: 1, label: "מתחיל", admin_payload: "SECRET" }), { state: "ready", level: 1, label: "מתחיל" });
});

test("HTTP bridge is GET-only and ignores administrator headers and caller-supplied account IDs", async () => {
  const calls = [];
  const handler = contributorRankHandler({ reader: async (key) => { calls.push(key); return { state: "ready", level: 3, label: "חוקר", user_id: account }; } });
  const res = response();
  await handler({ method: "GET", query: { slug: "2042", user_id: "spoofed", mode: "admin_all" }, headers: { authorization: "Bearer ADMIN", cookie: "admin=session" } }, res);
  assert.deepEqual(calls, ["2042"]);
  assert.deepEqual(res.body, { state: "ready", level: 3, label: "חוקר" });
  assert.equal(res.headers["Cache-Control"], "no-store");
  for (const method of ["POST", "PUT", "DELETE"]) {
    const denied = response();
    await handler({ method, query: { slug: "writer" } }, denied);
    assert.equal(denied.code, 405);
  }
  assert.equal(calls.length, 1);
});

test("bad keys/reader errors produce bounded public statuses without raw errors", async () => {
  const handler = contributorRankHandler({ reader: async () => { throw new Error("PRIVATE_DATABASE_MESSAGE"); } });
  for (const slug of ["me", "../admin", "//evil.example", ["first", "second"]]) {
    const res = response(); await handler({ method: "GET", query: { slug } }, res);
    assert.equal(res.code, 404); assert.deepEqual(res.body, { state: "not_found" });
  }
  const failed = response(); await handler({ method: "GET", query: { slug: "writer" } }, failed);
  assert.equal(failed.code, 503); assert.deepEqual(failed.body, { state: "unavailable" });
});

test("browser requests only a same-origin public rank, with no cookies or session authorization", async () => {
  let request;
  const rank = await fetchPublicContributorRank("tzvi-opoc", { fetcher: async (url, options) => {
    request = { url, options }; return { ok: true, json: async () => ({ state: "ready", level: 5, label: "חוקר היכל", xp: 10000, user_id: account }) };
  } });
  assert.equal(request.url, "/api/public-contributor-rank?slug=tzvi-opoc");
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.headers.Authorization, undefined);
  assert.deepEqual(rank, { state: "ready", level: 5, label: "חוקר היכל" });
  assert.deepEqual(await fetchPublicContributorRank("writer", { fetcher: async () => { throw new Error("network"); } }), { state: "unavailable" });
});
