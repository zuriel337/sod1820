import test from "node:test";
import assert from "node:assert/strict";
import { fetchCommunityMessageActions, editCommunityMessage, deleteCommunityMessage } from "./communityMessageActions.js";

const ACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MESSAGE = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";
const readyRow = { id: MESSAGE, can_edit: true, can_delete: true, reason: "allowed" };
function fixture(reply = { data: [readyRow] }) {
  const calls = [];
  let actor = ACTOR;
  const options = { principalKey: ACTOR, getCurrentPrincipal: () => actor,
    client: { rpc(name, args) { calls.push({ name, args }); return Promise.resolve(typeof reply === "function" ? reply() : reply); } } };
  return { calls, options, switchAccount: () => { actor = OTHER; } };
}

test("one permission RPC per page; IDs deduplicate and missing rows stay unknown", async () => {
  const f = fixture();
  const value = await fetchCommunityMessageActions([MESSAGE, MESSAGE, SECOND], f.options);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0], { name: "community_message_actions_v1", args: { p_ids: [MESSAGE, SECOND] } });
  assert.equal(value.items[MESSAGE].canEdit, true);
  assert.deepEqual(value.items[SECOND], { state: "unavailable", canEdit: false, canDelete: false });
});

test("guest, absent scope and an already-switched account issue no request", async () => {
  const f = fixture();
  assert.deepEqual(await fetchCommunityMessageActions([MESSAGE], { ...f.options, principalKey: null }), { state: "login_required" });
  assert.deepEqual(await fetchCommunityMessageActions([MESSAGE], { ...f.options, getCurrentPrincipal: undefined }), { state: "unavailable" });
  f.switchAccount();
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, f.options), { state: "stale" });
  assert.equal(f.calls.length, 0);
});

test("malformed IDs, oversized page and invalid edit fail before transport", async () => {
  const f = fixture();
  await assert.rejects(fetchCommunityMessageActions(["שם"], f.options), TypeError);
  const ids = Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
  await assert.rejects(fetchCommunityMessageActions(ids, f.options), RangeError);
  await assert.rejects(editCommunityMessage(MESSAGE, "  ", f.options), RangeError);
  await assert.rejects(editCommunityMessage(MESSAGE, "א".repeat(6001), f.options), RangeError);
  assert.equal(f.calls.length, 0);
});

test("string booleans, contradictory permissions, unsolicited IDs and duplicate rows fail closed", async () => {
  for (const rows of [[{ ...readyRow, can_edit: "true" }], [{ ...readyRow, reason: "not_owner" }],
    [{ ...readyRow, id: SECOND }], [readyRow, readyRow], [{ ...readyRow, reason: "guessed" }]]) {
    const f = fixture({ data: rows });
    assert.deepEqual(await fetchCommunityMessageActions([MESSAGE], f.options), { state: "unavailable" });
  }
});

test("a pending permission read cannot expose an old principal after switching", async () => {
  let release;
  const f = fixture(() => new Promise(resolve => { release = resolve; }));
  const pending = fetchCommunityMessageActions([MESSAGE], f.options);
  f.switchAccount();
  release({ data: [readyRow] });
  assert.deepEqual(await pending, { state: "stale" });
});

test("only server acknowledgment marks an edit saved; no fabricated timestamp", async () => {
  const time = "2026-10-26T10:00:00Z";
  const f = fixture({ data: time });
  assert.deepEqual(await editCommunityMessage(MESSAGE, "  מתוקן  ", f.options), { state: "saved", editedAt: time });
  assert.deepEqual(f.calls[0], { name: "community_edit_message", args: { p_id: MESSAGE, p_body: "מתוקן" } });
  for (const data of [undefined, true, { editedAt: time }, "not a date"]) {
    assert.deepEqual(await editCommunityMessage(MESSAGE, "מתוקן", fixture({ data }).options), { state: "unavailable" });
  }
  assert.deepEqual(await editCommunityMessage(MESSAGE, "מתוקן", fixture({ data: null }).options), { state: "unchanged" });
});

test("removal uses existing Community RPC and distinguishes idempotent replay", async () => {
  const f = fixture({ data: "already_deleted" });
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, f.options), { state: "deleted", alreadyDeleted: true });
  assert.equal(f.calls[0].name, "community_delete_message");
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, fixture({ data: true }).options), { state: "unavailable" });
});

test("review-required and denied are explicit; backend errors do not become success", async () => {
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, fixture({ error: { code: "55000", message: "source_requires_review" } }).options), { state: "review_required" });
  assert.deepEqual(await editCommunityMessage(MESSAGE, "תיקון", fixture({ error: { code: "42501" } }).options), { state: "denied" });
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, fixture({ error: { code: "network" } }).options), { state: "unavailable" });
});

test("a stale mutation acknowledgment or aborted read cannot update a new account's UI", async () => {
  let release;
  const f = fixture(() => new Promise(resolve => { release = resolve; }));
  const pending = deleteCommunityMessage(MESSAGE, f.options);
  f.switchAccount();
  release({ data: "deleted" });
  assert.deepEqual(await pending, { state: "stale" });
  const signal = AbortSignal.abort();
  const read = fixture();
  assert.deepEqual(await fetchCommunityMessageActions([MESSAGE], { ...read.options, signal }), { state: "stale" });
  assert.equal(read.calls.length, 0);
});

test("a broken principal reader and transport rejection fail closed", async () => {
  const f = fixture();
  assert.deepEqual(await fetchCommunityMessageActions([MESSAGE], { ...f.options, getCurrentPrincipal() { throw new Error("scope unavailable"); } }), { state: "stale" });
  assert.equal(f.calls.length, 0);
  const network = fixture(() => Promise.reject(new Error("network")));
  assert.deepEqual(await deleteCommunityMessage(MESSAGE, network.options), { state: "unavailable" });
});
