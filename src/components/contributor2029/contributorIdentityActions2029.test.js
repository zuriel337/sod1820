import test from "node:test";
import assert from "node:assert/strict";
import { membershipTenure, publicContributorOverview, publicStudioItems } from "./contributorOverview2029Model.js";
import { readPublicContributorOverview, contributorOverviewHandler } from "../../../api/contributor-public-overview.js";
import { contributorInteractionsHandler } from "../../../api/contributor-interactions.js";
import { contributorInteraction } from "./contributorInteractions2029.js";

const writer = "11111111-1111-4111-8111-111111111111";
const sender = "22222222-2222-4222-8222-222222222222";
const token = "verified_sender_session_token";
const identity = { id: "contributor-id", slug: "writer", user_id: writer, public_visibility: "public", display_name: "כותב קנוני",
  created_at: "2020-01-01T12:00:00Z", about: "על הכותב", current_focus: "מוקד כתיבה ציבורי" };
const studioRow = { id: "native-studio-id", contributor_id: identity.id, is_public: true, is_personal: false,
  title: "פרסום", body: "תוכן", image_url: "https://example.com/image.jpg", media: [{ url: "https://example.com/a.jpg", caption: "צילום" }],
  user_id: writer, private_note: "SECRET", created_at: "2025-01-01T00:00:00Z" };
function clientFor({ person = identity, studio = [studioRow], user = { created_at: "2020-10-24T10:00:00Z" }, studioError = null } = {}, calls = []) {
  function builder(result) {
    const b = { select(fields) { calls.push({ fields }); return b; }, eq(key, value) { calls.push({ key, value }); return b; },
      order(key, value) { calls.push({ order: key, ...value }); return b; }, range(from, to) { calls.push({ from, to }); return Promise.resolve(result); },
      maybeSingle() { return Promise.resolve(result); } };
    return b;
  }
  return { from(table) { calls.push({ table }); return builder({ data: table === "contributors" ? person : user }); },
    rpc(name, params) { calls.push({ name, params }); return builder({ data: studio, error: studioError }); } };
}
const response = () => ({ code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(v) { this.body = v; return this; } });
function authenticated({ id = sender, valid = true, ok = true } = {}, calls = []) {
  return { auth: { async getUser(value) { calls.push({ verified: value }); return valid ? { data: { user: { id } } } : { error: true }; } },
    async rpc(name, params) { calls.push({ name, params }); return { data: { ok, id: "private-message-id" } }; } };
}
function request(overrides = {}) {
  return { method: "POST", headers: { host: "preview.example", origin: "https://preview.example", "sec-fetch-site": "same-origin", authorization: `Bearer ${token}` },
    body: { slug: "writer", action: "message", body: "  שלום  ", p_to: sender, user_id: sender, mode: "admin_all" }, ...overrides };
}

test("membership uses full Israel calendar anniversaries, never page creation or latest publication", () => {
  assert.equal(membershipTenure("2020-10-24T10:00:00Z", new Date("2026-10-23T10:00:00Z")), "5 שנים בקהילה");
  assert.equal(membershipTenure("2020-10-24T10:00:00Z", new Date("2026-10-24T10:00:00Z")), "6 שנים בקהילה");
  assert.equal(membershipTenure("2025-10-24T10:00:00Z", new Date("2026-10-23T10:00:00Z")), "פחות משנה בקהילה");
  assert.equal(membershipTenure("2090-01-01T00:00:00Z"), null);
  const noMembership = publicContributorOverview({ state: "ready", pageSince: "2020-01-01T00:00:00Z", lastSeenAt: "2026-01-01T00:00:00Z", lastSeenState: "ready" });
  assert.equal(noMembership.joinedAt, null); assert.equal(noMembership.tenureLabel, null);
  assert.equal(noMembership.lastSeenAt, null); assert.equal(noMembership.lastSeenState, "unavailable");
});

test("overview is anonymous, keeps account IDs server-side, reads only bounded native public studio", async () => {
  const calls = [];
  const value = await readPublicContributorOverview("writer", { client: clientFor({}, calls), now: new Date("2026-10-23T00:00:00Z") });
  assert.equal(value.state, "ready"); assert.equal(value.tenureLabel, "5 שנים בקהילה");
  assert.equal(value.studio.items[0].id, studioRow.id);
  assert.deepEqual(calls.find((call) => call.name), { name: "studio_list", params: { p_slug: "writer", p_code: null } });
  assert.ok(calls.some((call) => call.from === 0 && call.to === 20));
  assert.doesNotMatch(JSON.stringify(value), /11111111|user_id|SECRET|private_note|contributor_id/);
  assert.ok(!calls.some((call) => ["profiles", "persons", "research"].includes(call.table)));
});

test("studio filtering rejects personal/private/other writer content and unsafe URLs without deleting native references", () => {
  const items = publicStudioItems([studioRow, { ...studioRow, id: "private", is_public: false }, { ...studioRow, id: "personal", is_personal: true },
    { ...studioRow, id: "other", contributor_id: "other-writer" }, { ...studioRow, id: "unsafe", link_url: "javascript:alert(1)", image_url: "//attacker.invalid" }], identity.id);
  assert.deepEqual(items.map((item) => item.id), [studioRow.id, "unsafe"]);
  assert.equal(items[1].href, null); assert.equal(items[1].imageUrl, null);
});

test("unset legacy public visibility preserves explicitly public studio items; explicit nonpublic visibility is blocked", async () => {
  const value = await readPublicContributorOverview("writer", { client: clientFor({ person: { ...identity, public_visibility: null } }) });
  assert.equal(value.state, "ready"); assert.equal(value.studio.items.length, 1);
  for (const visibility of ["private", "unlisted", "candidate", "public_candidate"]) {
    const result = await readPublicContributorOverview("writer", { client: clientFor({ person: { ...identity, public_visibility: visibility } }) });
    assert.equal(result.state, "not_found");
  }
});

test("unlinked membership and failed studio remain unavailable rather than zero; private/locked/building never queried further", async () => {
  const value = await readPublicContributorOverview("writer", { client: clientFor({ person: { ...identity, user_id: null }, studioError: true }) });
  assert.equal(value.joinedAt, null); assert.equal(value.tenureLabel, null); assert.equal(value.studio.available, false);
  for (const person of [null, { ...identity, public_visibility: "private" }, { ...identity, locked: true }, { ...identity, building: true }]) {
    const calls = []; const result = await readPublicContributorOverview("writer", { client: clientFor({ person }, calls) });
    assert.equal(result.state, "not_found"); assert.equal(calls.some((call) => call.name === "studio_list"), false);
  }
});

test("overview HTTP ignores session/admin inputs, bounds pages and methods, removes raw data again", async () => {
  const calls = [];
  const handler = contributorOverviewHandler({ reader: async (key, options) => { calls.push({ key, ...options }); return { state: "ready", user_id: writer, secret: "SECRET", studio: { available: true, items: [] } }; } });
  const res = response(); await handler({ method: "GET", query: { slug: "2042", page: "2", mode: "admin_all", studio: "PRIVATE_CODE" } }, res);
  assert.deepEqual(calls, [{ key: "2042", page: 2 }]); assert.equal(res.headers["Cache-Control"], "no-store");
  assert.doesNotMatch(JSON.stringify(res.body), /SECRET|11111111|PRIVATE_CODE/);
  for (const page of ["-1", "2.5", "10000", "NaN"]) { const r = response(); await handler({ method: "GET", query: { slug: "writer", page } }, r); assert.equal(r.code, 400); }
  const denied = response(); await handler({ method: "POST" }, denied); assert.equal(denied.code, 405);
});

test("DM verifies sender and resolves canonical recipient server-side; only existing RPC writes, no IDs returned", async () => {
  const calls = [];
  const handler = contributorInteractionsHandler({ publicClient: () => clientFor(), authenticatedClient: () => authenticated({}, calls) });
  const res = response(); await handler(request(), res);
  assert.equal(res.code, 200); assert.deepEqual(res.body, { state: "sent" });
  assert.deepEqual(calls, [{ verified: token }, { name: "dm_send", params: { p_to: writer, p_body: "שלום" } }]);
});

test("guest/spoofed auth, cross-origin and invalid bodies never send", async () => {
  const calls = [];
  const handler = contributorInteractionsHandler({ publicClient: () => clientFor(), authenticatedClient: () => authenticated({ valid: false }, calls) });
  for (const headers of [{ host: "preview.example", origin: "https://evil.example", authorization: `Bearer ${token}` },
    { host: "preview.example", origin: "https://preview.example" }, request().headers]) {
    const res = response(); await handler(request({ headers }), res); assert.ok([401, 403].includes(res.code));
  }
  assert.equal(calls.some((call) => call.name), false);
  const validHandler = contributorInteractionsHandler({ publicClient: () => clientFor(), authenticatedClient: () => authenticated({}, calls) });
  for (const body of ["", " ", "x".repeat(4001), null]) { const r = response(); await validHandler(request({ body: { slug: "writer", action: "message", body } }), r); assert.equal(r.code, 400); }
  assert.equal(calls.some((call) => call.name), false);
});

test("self/unlinked/private cannot receive DMs; owner capability is verified rather than supplied", async () => {
  for (const [person, id] of [[identity, writer], [{ ...identity, user_id: null }, sender], [{ ...identity, public_visibility: "private" }, sender]]) {
    const calls = [];
    const handler = contributorInteractionsHandler({ publicClient: () => clientFor({ person }), authenticatedClient: () => authenticated({ id }, calls) });
    const res = response(); await handler(request(), res); assert.ok([404, 409].includes(res.code)); assert.equal(calls.some((call) => call.name), false);
  }
  const ownerHandler = contributorInteractionsHandler({ publicClient: () => clientFor(), authenticatedClient: () => authenticated({ id: writer }) });
  const res = response(); await ownerHandler({ ...request(), method: "GET", query: { slug: "writer", owner: false } }, res);
  assert.deepEqual(res.body, { state: "ready", owner: true, followTopic: "author:כותב קנוני", message: "self" });
  assert.doesNotMatch(JSON.stringify(res.body), /11111111|user_id/);
});

test("RPC failure is honest and never triggers silent team fallback or retry", async () => {
  const calls = [];
  const handler = contributorInteractionsHandler({ publicClient: () => clientFor(), authenticatedClient: () => authenticated({ ok: false }, calls) });
  const res = response(); await handler(request(), res); assert.deepEqual(res.body, { state: "error" });
  assert.equal(calls.filter((call) => call.name).length, 1);
});

test("browser sends current verified session only, preserving deployment access, no recipient ID; expired/switched session cannot send", async () => {
  const calls = [];
  const auth = { getSession: async () => ({ data: { session: { user: { id: sender }, access_token: token } } }) };
  const result = await contributorInteraction("writer", { userId: sender, body: "שלום", auth, fetcher: async (url, options) => {
    calls.push({ url, options }); return { ok: true, json: async () => ({ state: "sent", user_id: writer }) };
  } });
  assert.deepEqual(result, { state: "sent" }); assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { slug: "writer", action: "message", body: "שלום" });
  assert.deepEqual(await contributorInteraction("writer", { userId: writer, body: "שלום", auth, fetcher: () => assert.fail("must not send") }), { state: "login_required" });
});
