import test from "node:test";
import assert from "node:assert/strict";
import { commitReactionMutation, isReactionBoostMap } from "./reactionMutation.js";

const previous = { likes: 648, "👍": ["other"], "💡": ["mine"], "🔥": [], "🙏": [], "✨": [] };
const optimistic = { ...previous, "👍": ["other", "mine"] };

for (const [label, request] of [
  ["an RPC denial", async () => ({ data: null, error: { message: "not available" } })],
  ["an error alongside a payload", async () => ({ data: optimistic, error: { message: "failed" } })],
  ["a null success payload", async () => ({ data: null, error: null })],
  ["a malformed payload", async () => ({ data: [], error: null })],
  ["a malformed voter map", async () => ({ data: { "👍": 1 }, error: null })],
  ["a network rejection", async () => { throw new Error("offline"); }],
]) {
  test(`${label} restores the previous selection and immutable legacy likes`, async () => {
    const changes = [];
    const saved = await commitReactionMutation({ previous, optimistic, request, apply: (value) => changes.push(value) });
    assert.equal(saved, false);
    assert.equal(changes[0], optimistic);
    assert.equal(changes[1], previous);
    assert.equal(changes[1].likes, 648);
    assert.deepEqual(changes[1]["👍"], ["other"]);
    assert.deepEqual(changes[1]["💡"], ["mine"]);
  });
}

test("a confirmed toggle uses the complete server map with its five emojis and voter identities", async () => {
  const canonical = { ...optimistic, "👍": ["other", "mine", "arrived-concurrently"] };
  const changes = [];
  assert.equal(await commitReactionMutation({ previous, optimistic, request: async () => ({ data: canonical, error: null }), apply: (value) => changes.push(value) }), true);
  assert.equal(changes.at(-1), canonical);
  assert.equal(canonical.likes, 648);
  assert.equal(Object.keys(canonical).length, 6);
});

test("an empty map and valid zero counters are confirmed without truthiness checks", async () => {
  for (const [data, isValid] of [
    [{}, undefined],
    [{ likes: 0, dislikes: 0, "👍": [] }, undefined],
    [{ "👍": 0 }, isReactionBoostMap],
  ]) {
    let value;
    assert.equal(await commitReactionMutation({ previous, optimistic, request: async () => ({ data, error: null }), apply: (next) => { value = next; }, isValid }), true);
    assert.equal(value, data);
  }
});

test("a failed removal restores the existing vote; a failed admin boost restores the old boost", async () => {
  for (const snapshot of [
    { previous: { likes: 648, "👍": ["mine"] }, optimistic: { likes: 648, "👍": [] } },
    { previous: { "👍": 3 }, optimistic: { "👍": 4 } },
  ]) {
    let value;
    assert.equal(await commitReactionMutation({ ...snapshot, request: async () => ({ data: null, error: { message: "denied" } }), apply: (next) => { value = next; } }), false);
    assert.equal(value, snapshot.previous);
  }
});

test('historical dislikes are preserved by a confirmed like and a failed retry',async()=>{
 const previous={likes:7,dislikes:3,'👍':[]};const next={...previous,'👍':['account-one']};let value;
 assert.equal(await commitReactionMutation({previous,optimistic:next,request:async()=>({data:next,error:null}),apply:result=>{value=result;}}),true);
 assert.equal(value.dislikes,3);assert.equal(value.likes,7);
 assert.equal(await commitReactionMutation({previous:next,optimistic:previous,request:async()=>({data:null,error:{code:'42501'}}),apply:result=>{value=result;}}),false);
 assert.deepEqual(value,next);
});
