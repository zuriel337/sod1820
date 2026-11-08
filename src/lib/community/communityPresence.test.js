import test from "node:test";
import assert from "node:assert/strict";
import { fetchCommunityPresenceOnline, normalizeCommunityPresence, pingCommunityPresence } from "./communityPresence.js";

const A = "11111111-2222-4333-8444-555555555555";
const B = "66666666-7777-4888-9999-aaaaaaaaaaaa";

test("presence normalizes: display name over username, drops nameless/duplicate rows", () => {
  const people = normalizeCommunityPresence([
    { id: A, username: "dudu120", display_name: " דוד ", avatar_url: "https://x/a.jpg" },
    { id: B, username: "  ", display_name: "  ", avatar_url: null },
    { id: A, username: "dup", display_name: "dup" },
    null,
  ]);
  assert.deepEqual(people, [{ id: A, name: "דוד", avatarUrl: "https://x/a.jpg" }]);
  assert.deepEqual(normalizeCommunityPresence(null), []);
});
test("presence API calls the exact RPCs", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === "community_presence_online" ? [{ id: A, display_name: "דוד" }] : null, error: null }; } };
  await pingCommunityPresence(client);
  const people = await fetchCommunityPresenceOnline({ limit: 10 }, client);
  assert.equal(people.length, 1);
  assert.deepEqual(calls, [["community_presence_ping", undefined], ["community_presence_online", { p_limit: 10 }]]);
  await assert.rejects(pingCommunityPresence({ rpc: async () => ({ data: null, error: { message: "x" } }) }));
  await assert.rejects(fetchCommunityPresenceOnline({}, { rpc: async () => ({ data: null, error: { message: "x" } }) }));
});
