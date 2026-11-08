// ZURIEL, 8.11.2026: contributor-interactions needs real Authorization and a real
// POST to work (sending a message to a writer); the other public adapters in
// public-reading-deploy/api stay GET-only/anonymous. publicReadingWritableApi is the
// one exception, forwarding Authorization while still stripping cookies and still
// checking deployment authorization and same-site origin.
import test from "node:test";
import assert from "node:assert/strict";
import { publicReadingWritableApi } from "../public-reading-deploy/read-only-api.js";

const SITE = "https://sod1820.co.il";
function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; },
    json(value) { return this.send(JSON.stringify(value)); } };
}
const req = (path, extras = {}) => ({ method: "GET", headers: { host: "sod1820.co.il" }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams) }, ...extras });

test("a real member's GET and POST reach the handler with Authorization intact and cookies stripped", async () => {
  let calls = 0;
  const api = publicReadingWritableApi((request, res) => {
    calls++;
    assert.equal(request.headers.authorization, "Bearer real-member-token");
    assert.equal(request.headers.cookie, undefined);
    return res.status(200).json({ state: calls === 1 ? "ready" : "sent" });
  }, { authorized: () => true });
  const get = response();
  await api(req("/api/contributor-interactions?slug=torah-tamima", {
    headers: { host: "sod1820.co.il", authorization: "Bearer real-member-token", cookie: "saved" },
  }), get);
  assert.equal(get.code, 200);
  const post = response();
  await api(req("/api/contributor-interactions", {
    method: "POST", headers: { host: "sod1820.co.il", authorization: "Bearer real-member-token", cookie: "saved" },
  }), post);
  assert.equal(post.code, 200);
  assert.equal(calls, 2, "both the capability check and the send reached the real handler");
});

test("still fails closed off-deployment, off-origin and for any other method", async () => {
  let reached = 0;
  const handler = (request, res) => { reached++; return res.status(200).json({ state: "ready" }); };
  const dormant = response();
  await publicReadingWritableApi(handler, { authorized: () => false })(req("/api/contributor-interactions"), dormant);
  assert.equal(dormant.code, 503);
  const offOrigin = response();
  await publicReadingWritableApi(handler, { authorized: () => true })(req("/api/contributor-interactions", { headers: { host: "not-sod1820.example" } }), offOrigin);
  assert.equal(offOrigin.code, 421);
  const wrongMethod = response();
  await publicReadingWritableApi(handler, { authorized: () => true })(req("/api/contributor-interactions", { method: "DELETE", headers: { host: "sod1820.co.il" } }), wrongMethod);
  assert.equal(wrongMethod.code, 405);
  assert.equal(reached, 0, "the real handler is never reached in any of these cases");
});

test("the wired endpoint file is wrapped, not a bare pass-through to the real handler", async () => {
  const mod = await import("../public-reading-deploy/api/contributor-interactions.js");
  assert.equal(typeof mod.default, "function");
  // This dormant local build is never deploymentAuthorized(); any wrapper around the
  // real handler must fail closed (503) rather than reach Supabase/dm_send.
  const res = response();
  await mod.default(req("/api/contributor-interactions", { method: "POST", headers: { host: "sod1820.co.il" } }), res);
  assert.equal(res.code, 503);
});
