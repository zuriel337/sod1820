import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { registerHooks } from "node:module";
import { supabase } from "../src/lib/supabase.js";
// Vite supplies import.meta.env in the real browser; provide its empty nonsecret
// test equivalent to the existing marketing dependency, without replacing any IO implementation.
registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  return url.endsWith("/lib/marketing.js") ? { ...result, source: result.source.toString().replaceAll("import.meta.env", "({})") } : result;
} });
const { followCenterIO, followTopics, notificationHref, readOwnWhatsAppBinding2029 } = await import("../src/lib/userCenter/followCenter2029.js");

const ACCOUNT = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
async function transport(replies, run, sessionId = ACCOUNT) {
  const calls = [];
  let checks = 0;
  const auth = mock.method(supabase.auth, "getSession", async () => ({ data: { session: { user: {
    id: Array.isArray(sessionId) ? sessionId[Math.min(checks++, sessionId.length - 1)] : sessionId,
  } } } }));
  const net = mock.method(globalThis, "fetch", async (input, init) => {
    const req = new Request(input, init), url = new URL(req.url), name = url.pathname.split("/").at(-1);
    calls.push({ name, method: req.method, params: url.searchParams, body: req.method === "GET" ? null : await req.json() });
    assert.equal(url.hostname, "linswmnnkjxvweumprav.supabase.co");
    assert.ok(Object.hasOwn(replies, name), `Unexpected request: ${req.method} ${name}`);
    const entry = replies[name];
    return new Response(JSON.stringify(entry.data), { status: entry.status || 200, headers: { "content-type": "application/json" } });
  });
  try { await run(calls); } finally { auth.mock.restore(); net.mock.restore(); }
}

await test("follow adapter preserves measured missing rows and canonicalizes existing aliases once", () => {
  assert.deepEqual(followTopics(null), []);
  assert.deepEqual(followTopics({ topics: ["num_1820", "number:1820", "category:בדיקה", "cat:בדיקה"] }), ["number:1820", "cat:בדיקה"]);
  for (const prefs of [undefined, {}, { topics: null }, { topics: [null] }, { topics: [""] }]) assert.throws(() => followTopics(prefs));
});
await test("native DM targets preserve the exact conversation without accepting external targets", () => {
  assert.equal(notificationHref(`/me?tab=messages&dm=${OTHER}`), `/2029/me/messages?dm=${OTHER}`);
  assert.equal(notificationHref("/me?tab=messages&dm=bad"), "/2029/me/messages");
  for (const href of ["https://evil.invalid/me?tab=messages", "/post/exact?item=7#here", null]) assert.equal(notificationHref(href), href);
});
await test("real inbox adapter uses one strict bounded read and native conversation mapping", async () => {
  await transport({ user_notifications: { data: [{ id: "n1", link: `/me?tab=messages&dm=${OTHER}` }] } }, async calls => {
    const rows = await followCenterIO.readUpdates(ACCOUNT);
    assert.equal(rows[0].link, `/2029/me/messages?dm=${OTHER}`);
    assert.equal(calls.length, 1); assert.equal(calls[0].params.get("limit"), "30");
    assert.equal(calls[0].params.get("order"), "created_at.desc");
    assert.equal(calls[0].params.get("user_id"), "eq." + ACCOUNT);
  });
});
await test("failed or malformed inbox reads reject rather than proving zero", async () => {
  for (const entry of [{ data: null }, { data: { rows: [] } }, { status: 403, data: { message: "Denied fixture" } }]) {
    await transport({ user_notifications: entry }, async () => assert.rejects(followCenterIO.readUpdates(ACCOUNT)));
  }
});
await test("preferences and public writer links are read in one batch, with no private/ambiguous link", async () => {
  await transport({ notification_prefs: { data: { topics: ["author:יחיד", "author:כפול", "author:פרטי", "num_1820"], channels: ["email"], email: "must-not-escape@example.invalid" } },
    contributors: { data: [
      { display_name: "יחיד", slug: "unique", active: true, visibility: "public" },
      { display_name: "כפול", slug: "one", active: true }, { display_name: "כפול", slug: "two", active: true },
      { display_name: "פרטי", slug: "private", active: true, visibility: "private" },
    ] } }, async calls => {
    const result = await followCenterIO.readFollows(ACCOUNT);
    assert.deepEqual(result.links, { "author:יחיד": "/community/researcher/unique" });
    assert.equal(result.topics.at(-1), "number:1820");
    assert.deepEqual(Object.keys(result).sort(), ["channelState", "channels", "links", "topics"]);
    assert.deepEqual(result.channels, ["email"]); assert.equal(result.channelState, "ready");
    assert.doesNotMatch(JSON.stringify(result), /must-not-escape/);
    assert.equal(calls.length, 2); assert.equal(calls[0].params.get("user_id"), `eq.${ACCOUNT}`);
    assert.equal(calls[1].method, "GET"); assert.ok(calls[1].params.has("display_name"));
  });
});
await test("known absent preferences are empty but malformed preferences stay unavailable", async () => {
  await transport({ notification_prefs: { data: null } }, async () => assert.deepEqual(await followCenterIO.readFollows(ACCOUNT), { topics: [], links: {}, channels: [], channelState: "ready" }));
  await transport({ notification_prefs: { data: {} } }, async () => assert.rejects(followCenterIO.readFollows(ACCOUNT)));
});

await test("unknown channel selections stay unknown without discarding valid follows", async () => {
  for (const channels of [undefined, null, [1], [""]]) {
    await transport({ notification_prefs: { data: { topics: ["number:1820"], channels } } }, async calls => {
      const result = await followCenterIO.readFollows(ACCOUNT);
      assert.deepEqual(result.topics, ["number:1820"]);
      assert.equal(result.channels, null); assert.equal(result.channelState, "unavailable");
      assert.equal(calls.length, 1, "no channel activation or extra request");
    });
  }
});
await test("every operation rejects a changed account before touching the transport", async () => {
  await transport({}, async calls => {
    for (const run of [() => followCenterIO.readUpdates(ACCOUNT), () => followCenterIO.readFollows(ACCOUNT),
      () => followCenterIO.markAll(ACCOUNT), () => followCenterIO.markOne(ACCOUNT, "n1"), () => followCenterIO.unfollow(ACCOUNT, "number:1820")]) await assert.rejects(run());
    assert.equal(calls.length, 0);
  }, OTHER);
});
await test("unfollow reuses canonical engine and explicit false/source without changing channels", async () => {
  await transport({ watch_toggle: { data: { ok: true } } }, async calls => {
    assert.deepEqual(await followCenterIO.unfollow(ACCOUNT, "number:1820"), { ok: true });
    assert.deepEqual(calls[0].body, { p_topic: "number:1820", p_source: "center", p_on: false, p_visitor: null });
    assert.equal(calls.length, 1);
  });
});
await test("account change during transport rejects the prior account result", async () => {
  await transport({ user_notifications: { data: [{ id: "private-prior-account" }] } }, async calls => {
    await assert.rejects(followCenterIO.readUpdates(ACCOUNT));
    assert.equal(calls.length, 1);
  }, [ACCOUNT, OTHER]);
});
await test("mark-read adapter requires and returns only existing strict acknowledgment evidence", async () => {
  await transport({ user_notifications: { data: [{ id: "n1", read_at: "2026-10-25T12:00:00Z" }] } }, async calls => {
    assert.deepEqual(await followCenterIO.markAll(ACCOUNT), { ok: true, markedIds: ["n1"] });
    assert.equal(calls[0].method, "PATCH"); assert.equal(calls[0].params.get("select"), "id,read_at");
    assert.equal(calls[0].params.get("read_at"), "is.null"); assert.deepEqual(Object.keys(calls[0].body), ["read_at"]);
    assert.equal(calls[0].params.get("user_id"), "eq." + ACCOUNT);
  });
});

await test("WhatsApp reads only own verified_at; binding/empty/denied/failure are distinct and stale principal cancels partial state", async () => {
  async function binding({rows=[],error=null,ids=[ACCOUNT,ACCOUNT],token=true,signal}={}) {
    const calls=[];let checks=0;
    const query={then:yes=>Promise.resolve({data:rows,error}).then(yes)};
    for(const name of ["select","eq","not","limit","retry","abortSignal"]) query[name]=(...args)=>{calls.push([name,...args]);return query;};
    const client={auth:{getSession:async()=>({data:{session:{user:{id:ids[Math.min(checks++,ids.length-1)]},access_token:token?"synthetic-account-token":null}}})},from:table=>{calls.push(["from",table]);return query;}};
    const result=await readOwnWhatsAppBinding2029(ACCOUNT,{client,signal});return {result,calls};
  }
  const verifiedAt="2026-10-01T12:00:00Z";
  const {result,calls}=await binding({rows:[{verified_at:verifiedAt,phone:"must-not-escape",user_id:OTHER,credited_msgs:100}]});
  assert.deepEqual(result,{state:"linked",verifiedAt});assert.doesNotMatch(JSON.stringify(result),/phone|user_id|credited/);
  assert.deepEqual(calls,[["from","wa_account_links"],["select","verified_at"],["eq","user_id",ACCOUNT],["not","verified_at","is",null],["limit",1],["retry",false]]);
  assert.deepEqual((await binding()).result,{state:"measured_empty"});
  for(const error of [{code:"42501"},{status:401},{status:403}])assert.equal((await binding({error})).result.state,"access_filtered");
  for(const error of [{message:"network"},{code:"bad"}])assert.equal((await binding({error})).result.state,"failed");
  for(const rows of [null,{},[{}],[{verified_at:"broken"}],[{verified_at:verifiedAt},{verified_at:verifiedAt}]])assert.equal((await binding({rows})).result.state,"failed");
  for(const ids of [[OTHER],[ACCOUNT,OTHER]])assert.deepEqual((await binding({rows:[{verified_at:verifiedAt}],ids})).result,{state:"access_filtered"});
  assert.equal((await binding({token:false})).calls.length,0);
  const abort=new AbortController();abort.abort();await assert.rejects(binding({signal:abort.signal}),{name:"AbortError"});
});
