import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyReadingPrincipal } from "../public-reading-deploy/admin-request.js";

const uid = "00000000-0000-4000-8000-000000000001";
const jwt = "e30." + Buffer.from(JSON.stringify({ sub: uid, role: "authenticated" })).toString("base64url") + ".signature";
const origin = "https://linswmnnkjxvweumprav.supabase.co";
const auth = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const verify = async (user, status = 200) => {
  const calls = [];
  const result = await verifyReadingPrincipal({
    token: jwt, apiKey: "public", registeredOnly: true,
    fetchImpl: async (url) => { calls.push(url); assert.equal(url, origin + "/auth/v1/user"); return auth(user, status); },
  });
  return { result, calls };
};

test("registered advanced verifier requires server-confirmed non-anonymous account", async () => {
  assert.equal((await verify({ id: uid, is_anonymous: false })).result, uid);
  for (const user of [{ id: uid, is_anonymous: true }, { id: uid }, { id: "00000000-0000-4000-8000-000000000002", is_anonymous: false }]) {
    assert.equal((await verify(user)).result, null);
  }
  assert.equal((await verify({ id: uid, is_anonymous: false }, 401)).result, null);
});
test("ordinary public principal verification keeps old behavior", async () => {
  const result = await verifyReadingPrincipal({
    token: jwt, apiKey: "public", fetchImpl: async () => auth({ id: uid, is_anonymous: true }),
  });
  assert.equal(result, uid);
});
test("one bounded advanced marker, enforced in worker and Edge, without lifting existing public bridge", () => {
  const worker = readFileSync(new URL("../public-reading-deploy/transport.js", import.meta.url), "utf8");
  const edge = readFileSync(new URL("../supabase/functions/els-search-bridge/index.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
  const advanced = readFileSync(new URL("../src/components/experience2029/ElsRegisteredAdvanced2029.jsx", import.meta.url), "utf8");
  assert.match(worker, /registeredOnly: registeredRange/);
  assert.match(worker, /registeredRange && !uid/);
  assert.match(worker, /body\.skip_max > 500/);
  assert.match(worker, /body\.page_size > 20/);
  assert.match(edge, /if \(!identity\?\.registered\)/);
  assert.match(edge, /skipMax > 500/);
  assert.match(edge, /pageSize > 20/);
  assert.match(page, /registeredAdvanced && !isAdmin/);
  assert.match(advanced, /access_mode: "registered_range_v1"/);
  assert.match(worker, /\["verify", "page", "verify_batch"\]/);
});
