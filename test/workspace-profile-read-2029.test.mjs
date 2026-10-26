import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { registerHooks } from "node:module";
import { supabase } from "../src/lib/supabase.js";

registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  return url.endsWith("/lib/marketing.js") ? { ...result, source: result.source.toString().replaceAll("import.meta.env", "({})") } : result;
} });
const { getMyProfile } = await import("../src/lib/commandCenter.js");
const A = "22222222-2222-4222-8222-222222222222", B = "33333333-3333-4333-8333-333333333333";

async function transport(reply, run, accounts = [A]) {
  const calls = [];
  let checks = 0;
  const auth = mock.method(supabase.auth, "getSession", async () => ({ data: { session: { user: { id: accounts[Math.min(checks++, accounts.length - 1)] } } } }));
  const net = mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    assert.equal(url.hostname, "linswmnnkjxvweumprav.supabase.co");
    assert.equal(url.pathname, "/rest/v1/profiles"); assert.equal(request.method, "GET");
    calls.push(url.searchParams);
    return new Response(JSON.stringify(reply.data), { status: reply.status || 200, headers: { "content-type": "application/json" } });
  });
  try { await run(calls); } finally { auth.mock.restore(); net.mock.restore(); }
}

await test("strict Workspace profile read preserves measured zero and excludes tier/financial payloads", async () => {
  const profile = { credits: 0, xp: 0, level: 0, streak: 0 };
  await transport({ data: profile }, async calls => {
    assert.deepEqual(await getMyProfile({ strict: true, userId: A }), profile);
    assert.equal(calls.length, 1); assert.equal(calls[0].get("user_id"), `eq.${A}`);
    assert.equal(calls[0].get("select"), "credits,xp,level,streak");
  });
});
await test("measured missing profile stays null rather than fabricated credits", async () => {
  await transport({ data: null }, async () => assert.equal(await getMyProfile({ strict: true, userId: A }), null));
});
await test("strict errors/malformed numeric data reject while default caller retains null compatibility", async () => {
  for (const response of [{ status: 403, data: { message: "Denied fixture" } }, { data: 7 }, { data: { credits: "900" } }]) {
    await transport(response, async () => assert.rejects(getMyProfile({ strict: true, userId: A })));
  }
  await transport({ status: 403, data: { message: "Denied fixture" } }, async () => assert.equal(await getMyProfile(), null));
});
await test("wrong account cannot begin a strict profile request", async () => {
  await transport({ data: {} }, async calls => {
    await assert.rejects(getMyProfile({ strict: true, userId: A }));
    assert.equal(calls.length, 0);
  }, [B]);
});
await test("account switch during HTTP discards the prior account profile", async () => {
  await transport({ data: { credits: 999 } }, async () => assert.rejects(getMyProfile({ strict: true, userId: A })), [A, B]);
});
await test("default profile consumer keeps its original projection", async () => {
  await transport({ data: { credits: 7, tier: 0 } }, async calls => {
    assert.deepEqual(await getMyProfile(), { credits: 7, tier: 0 });
    assert.equal(calls[0].get("select"), "credits,xp,level,tier,streak");
    assert.equal(calls[0].has("user_id"), false);
  });
});
