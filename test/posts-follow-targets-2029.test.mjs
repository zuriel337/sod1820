import test from "node:test";
import assert from "node:assert/strict";
import { postFollowCandidates2029, fetchPostFollowTargets2029, fetchPostsCatalog2029, postsCatalogScope2029, postsSearch2029 } from "../src/lib/research/postsCatalog2029Projection.js";

const post = over => ({ author: "המערכת", categories: [], tags: [], ...over });
const noWriters = async () => ({});
test("exact series membership never becomes category, publisher or per-post Follow", () => {
  const targets = postFollowCandidates2029({ post: post({ id: 55, author: "בדרך לנצח", categories: ["מימד חמש", "וידאו", "תיעוד אירועים"] }) });
  assert.deepEqual(targets.map(t => t.topic), ["series:dimension-five", "cat:תיעוד אירועים"]);
  assert.equal(targets[0].icon, "layers");
  assert.deepEqual(postFollowCandidates2029({ post: post({ tags: ["טיוטה"], categories: ["תיעוד אירועים"] }) }), []);
  assert.deepEqual(postFollowCandidates2029({ scope: postsCatalogScope2029("series=unknown") }), []);
  assert.deepEqual(postFollowCandidates2029({ scope: postsCatalogScope2029("category=וידאו") }), []);
});
test("known series names are not offered again as new category follows", () => {
  for (const name of ["מימד חמש", "סוד החשמל", "מה קורה הבורא"]) {
    assert.deepEqual(postFollowCandidates2029({ scope: postsCatalogScope2029('category='+encodeURIComponent(name)) }), []);
    assert.ok(!postFollowCandidates2029({ post: post({ author:'מפרסם אחר',categories:[name] }) }).some(item=>item.topic==='cat:'+name));
  }
  const targets=postFollowCandidates2029({post:post({author:'אלון לוי',tags:['מה קורה הבורא'],categories:['מה קורה הבורא','תיעוד אירועים']})});
  assert.deepEqual(targets.filter(item=>item.entityType!=='author').map(item=>item.topic),['series:mah-kore-habora','cat:תיעוד אירועים']);
});
test("server-unsupported series remain explicit, without broadening to existing category", async () => {
  const calls = [];
  const client = { async rpc(name, args, options) { calls.push([name, args]); assert.deepEqual(options, { get: true }); return { data: args.p_entity_type === "series" ? "" : "cat:" + args.p_stable_id }; } };
  const rows = await fetchPostFollowTargets2029({ post: post({ author: "בדרך לנצח", categories: ["מימד חמש", "תיעוד אירועים"] }), client, writerLinks: noWriters });
  assert.deepEqual(rows.map(r => r.state), ["unsupported", "ready"]);
  assert.ok(calls.every(([name]) => name === "canonical_follow_subject"));
  assert.equal(calls.length, 2);
});
test("failed, malformed and differently resolved targets are unavailable, not absent or accepted", async () => {
  const scope = postsCatalogScope2029("series=dimension-five");
  for (const result of [{ error: { message: "offline" } }, { data: null }, { data: [null] }, { data: "cat:מימד חמש" }]) {
    const rows = await fetchPostFollowTargets2029({ scope, client: { rpc: async () => result }, writerLinks: noWriters });
    assert.equal(rows[0].state, "unavailable");
  }
  const rows = await fetchPostFollowTargets2029({ scope, client: { rpc: async () => ({ data: "series:dimension-five" }) }, writerLinks: noWriters });
  assert.equal(rows[0].state, "ready");
});
test("writer controls require an exact public canonical contributor; generic author text is insufficient", async () => {
  let calls = 0;
  const client = { rpc: async () => { calls++; return { data: "author:אלון לוי" }; } };
  const input = { post: post({ author: "אלון לוי" }), client };
  assert.equal((await fetchPostFollowTargets2029({ ...input, writerLinks: noWriters }))[0].state, "unavailable");
  assert.equal(calls, 0);
  assert.equal((await fetchPostFollowTargets2029({ ...input, writerLinks: async () => ({ "author:אלון לוי": "/community/researcher/alon" }) }))[0].state, "ready");
});
test("an unavailable writer lookup leaves independently resolved category targets usable", async () => {
  const rows = await fetchPostFollowTargets2029({ post: post({ author: "אלון לוי", categories: ["תיעוד אירועים"] }),
    client: { rpc: async () => ({ data: "cat:תיעוד אירועים" }) }, writerLinks: async () => { throw Error("offline"); } });
  assert.deepEqual(rows.map(row => row.state), ["ready", "unavailable"]);
});
test("title search uses an escaped column filter alongside public and exact series membership", async () => {
  assert.equal(postsSearch2029("  מילה  שנייה "), "מילה שנייה");
  assert.throws(() => postsSearch2029("x".repeat(121)));
  const calls = [];
  const query = { then: yes => Promise.resolve({ data: [], count: 0 }).then(yes) };
  for (const name of ["select", "or", "eq", "order", "range", "ilike"]) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  await fetchPostsCatalog2029({ scope: postsCatalogScope2029("series=dimension-five"), search: '50%_",or(x)', client: { from: () => query } });
  assert.deepEqual(calls.find(([name]) => name === "ilike"), ["ilike", "title", '%50\\%\\_",or(x)%']);
  assert.ok(calls.some(c => c[0] === "eq" && c[2] === "בדרך לנצח"));
  assert.ok(calls.some(c => c[0] === "or" && c[1].includes("טיוטה,פורום")));
});
