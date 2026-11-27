import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createResearchSyncRuntime } from "../src/lib/research/researchSyncRuntime.js";
import { makeResearchOp, principalStateKey, principalToken } from "../src/lib/research/researchSyncState.js";
import { saveFailureNotice } from "../src/lib/research/personalSaveDecision.js";

// A personal save that fails must say WHY, from what the runtime observed, and a full browser store must be recoverable without ever touching an explicit save.
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
class Store {
  constructor(limit = Infinity) { this.map = new Map(); this.limit = limit; }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  removeItem(k) { this.map.delete(k); }
  setItem(k, v) {
    const used = [...this.map].reduce((n, [a, b]) => n + (a === k ? 0 : a.length + b.length), 0) + k.length + String(v).length;
    if (used > this.limit) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }
    this.map.set(k, String(v));
  }
}
const USER = "A", P = principalToken(USER), K = principalStateKey(P);
const post = { id: "post:slug-1", type: "post", title: "פוסט", ref: "slug-1", link: "/post/slug-1", metadata: {}, addedAt: 1 };
const passive = (i) => ({ batch_id: `b${i}`, ops: [{ kind: "history_add", op_id: `o${i}`, entity: { id: `post:${i}`, type: "post", title: "t", ref: `s${i}`, link: "/p", metadata: {}, t: i } }] });
const explicit = { batch_id: "keep", ops: [{ kind: "item_upsert", op_id: "k1", bucket: "library", entity: { id: "number:7", type: "number", title: "7", ref: "7", link: "/number/7", metadata: {}, addedAt: 1 } }] };
const journal = (queue, owner = undefined) => JSON.stringify({ principal: P, revision: 3, queue, inflight: null, ...(owner ? { owner } : {}) });
function make({ storage = new Store(), session = new Store() } = {}) {
  const server = { calls: [], revision: 3, fail: 0, applied: [] };
  const snapshot = () => ({ cart: [], saved: [], pinned: [], history: [], collections: [], journeys: [], revision: server.revision, context: null });
  const runtime = createResearchSyncRuntime({ userId: USER, storage, session, delay: 1, cloudEnabled: true, resumePendingOnStart: false,
    readCloud: async () => snapshot(),
    writeCloud: async (_uid, ops, meta) => { server.calls.push(meta.batchId); if (server.fail > 0) { server.fail -= 1; throw new Error("network down"); } server.applied.push(meta.batchId); server.revision += 1; return { ok: true, batch_id: meta.batchId, applied_revision: server.revision, snapshot: { ...snapshot(), saved: ops.filter(o => o.kind === "item_upsert").map(o => o.entity) } }; } });
  runtime.start();
  return { runtime, server, storage, session };
}
const tick = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));
const save = (runtime) => runtime.commit([makeResearchOp("item_upsert", { bucket: "library", entity: post }), makeResearchOp("history_add", { entity: { ...post, t: 1 } })]);

test("a healthy store: the save reaches the server and only then is it confirmed", async () => {
  const f = make(); await tick();
  assert.equal(save(f.runtime), true);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, false, "queued is not a receipt");
  await tick(80);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(f.server.calls.length, 1);
  assert.equal(f.runtime.getSnapshot().storageIssue, null);
  f.runtime.stop();
});

test("a full store is named as such, and the save STILL reaches the account from memory: confirmed only by the server's receipt (CLOUD FIRST stage 2)", async () => {
  const storage = new Store(600);
  const f = make({ storage }); await tick();
  const before = [...storage.map];
  assert.equal(save(f.runtime), true, "the batch is accepted: it is queued for the account even though the device cannot hold it");
  let snap = f.runtime.getSnapshot();
  assert.equal(snap.storageIssue, "quota", "the real cause, not a guess");
  assert.equal(snap.syncStatus, "pending", "not a failure: the account is still being written");
  assert.equal(snap.cloudConfirmed, false, "queued is not a receipt");
  assert.equal(snap.memoryOnly, true, "the work exists only in this tab until the server answers");
  await tick(80);
  snap = f.runtime.getSnapshot();
  assert.equal(f.server.calls.length, 1, "no longer fail-closed: the full store did not stop the request");
  assert.equal(snap.cloudConfirmed, true, "confirmed after the server's receipt");
  assert.equal(snap.syncPending, 0);
  assert.equal(snap.memoryOnly, false, "nothing left that only memory holds");
  assert.equal(snap.saved.length, 1);
  assert.deepEqual([...storage.map.keys()], [...before.map(([k]) => k)], "no journal was left behind and nothing else was written or removed on the device");
  f.runtime.stop();
});

test("a full store and a server that does not answer: the item waits in memory as 'error', never 'saved'; the retry sends the SAME batch and only then confirms", async () => {
  const storage = new Store(600);
  const f = make({ storage }); await tick();
  f.server.fail = 1;
  assert.equal(save(f.runtime), true);
  await tick(80);
  let snap = f.runtime.getSnapshot();
  assert.equal(snap.syncStatus, "error");
  assert.equal(snap.cloudConfirmed, false);
  assert.equal(snap.syncPending, 1, "nothing was dropped");
  assert.equal(snap.memoryOnly, true, "still only in memory: the page warns before it is closed");
  assert.equal(snap.storageIssue, "quota");
  const firstBatch = f.server.calls[0];
  assert.equal(await f.runtime.retry(), true);
  await tick(80);
  snap = f.runtime.getSnapshot();
  assert.equal(snap.cloudConfirmed, true);
  assert.equal(f.server.calls.length, 2);
  assert.equal(f.server.calls[1], firstBatch, "the same batch id: a repeat is idempotent on the server");
  assert.equal(f.server.applied.length, 1, "applied once");
  f.runtime.stop();
});

test("a full store keeps what is already on the device: pending journals, a conflict copy and the localonly record are not dropped while the save goes to the account", async () => {
  const storage = new Store();
  storage.setItem(`${K}:pending:precious`, journal([explicit]));
  storage.setItem(`${K}:pending:precious:conflict:c1`, journal([explicit]));
  storage.setItem(`${K}:localonly`, JSON.stringify({ principal: P, items: [{ bucket: "library", entity: { id: "number:7", type: "number", title: "7", ref: "7", link: "/number/7", metadata: {}, addedAt: 1 } }], extras: {}, at: 1 }));
  storage.limit = [...storage.map].reduce((n, [a, b]) => n + a.length + b.length, 0) + 30;   // full
  const keptBefore = [...storage.map];
  const f = make({ storage }); await tick();
  assert.equal(save(f.runtime), true); await tick(100);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(f.server.calls.length >= 1, true);
  for (const [name, raw] of keptBefore) assert.equal(storage.getItem(name), raw, `${name} is exactly as it was`);
  f.runtime.stop();
});

test("a full store with device-only items the account does not hold: the copy-aside cannot be written, so the stored state is NOT overwritten, and the account is still written", async () => {
  const storage = new Store();
  const local = { state: { cart: [], saved: [{ id: "number:7", type: "number", title: "7", ref: "7", link: "/number/7", metadata: {}, addedAt: 1 }], pinned: [], history: [], collections: [], journeys: [], context: null }, mode: "reader", revision: null };
  storage.setItem(K, JSON.stringify(local));
  storage.limit = [...storage.map].reduce((n, [a, b]) => n + a.length + b.length, 0) + 5;   // the localonly record cannot be created
  const f = make({ storage }); await tick(60);
  assert.equal(f.runtime.getSnapshot().storageIssue, "quota");
  assert.notEqual(f.runtime.getSnapshot().syncStatus, "error", "hydration did not fail closed");
  assert.equal(save(f.runtime), true); await tick(100);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(JSON.parse(storage.getItem(K)).state.saved[0].id, "number:7", "the device-only item is still in the stored record, never overwritten");
  assert.equal(f.server.calls.length, 1);
  f.runtime.stop();
});

test("corrupt state, an invalid journal and a blocked store are each named, and what is stored is left exactly as it was", async () => {
  const cases = [
    ["corrupt_state", s => s.setItem(K, "[1,2]"), K, "[1,2]"],
    ["corrupt_state", s => s.setItem(K, "{\"state\":{\"cart\":["), K, "{\"state\":{\"cart\":["],
    ["invalid_journal", (s, ss) => { s.setItem(`${K}:pending:bad`, "{broken"); ss.setItem(`${K}:journal`, `${K}:pending:bad`); }, `${K}:pending:bad`, "{broken"],
  ];
  for (const [issue, arrange, keyName, raw] of cases) {
    const storage = new Store(), session = new Store();
    arrange(storage, session);
    const f = make({ storage, session }); await tick();
    assert.equal(f.runtime.getSnapshot().storageIssue, issue);
    assert.equal(save(f.runtime), false);
    assert.equal(storage.getItem(keyName), raw, "the unreadable record is retained for recovery, never overwritten");
    assert.equal(f.server.calls.length, 0);
    f.runtime.stop();
  }
  const blocked = { get length() { throw Object.assign(new Error("denied"), { name: "SecurityError" }); }, getItem() { throw Object.assign(new Error("denied"), { name: "SecurityError" }); }, setItem() { throw Object.assign(new Error("denied"), { name: "SecurityError" }); }, removeItem() {}, key() { return null; } };
  const g = make({ storage: blocked }); await tick();
  assert.equal(g.runtime.getSnapshot().storageIssue, "blocked");
  // A denied store holds nothing that could be lost: the account is still written (CLOUD FIRST stage 2).
  assert.equal(save(g.runtime), true); await tick(100);
  assert.equal(g.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(g.server.calls.length, 1);
  g.runtime.stop();
});

test("the EXISTING reclaim frees the oldest journals (no owner), only when confirmed, never a journal holding a save; then the same save goes through", async () => {
  const storage = new Store();
  // Months of reading before journals had an owner: one ownerless journal per page load, holding only navigation history; plus one that holds a real save.
  for (let i = 0; i < 7; i += 1) storage.setItem(`${K}:pending:old${i}`, journal([passive(i), passive(i + 100)]));
  storage.setItem(`${K}:pending:precious`, journal([explicit]));
  storage.setItem(`${K}:pending:conflict:keep`, journal([passive(1)]));
  storage.setItem(`${K}:pending:live`, journal([passive(1)], { id: "other-tab", at: Date.now(), released: false }));
  storage.limit = [...storage.map].reduce((n, [a, b]) => n + a.length + b.length, 0) + 80;   // the browser store is now full
  const f = make({ storage }); await tick();
  assert.equal(save(f.runtime), true, "the full store does not stop the save: it goes to the account from memory");
  assert.equal(f.runtime.getSnapshot().storageIssue, "quota");
  await tick(100);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(f.server.calls.length, 1);
  const dry = await f.runtime.localOnly("reclaim");
  assert.equal(dry.count, 7, "the explicit journal, the conflict copy and another live tab's journal are not eligible");
  assert.equal(storage.getItem(`${K}:pending:old0`) !== null, true, "a dry run removes nothing");
  const done = await f.runtime.localOnly("reclaim", { confirm: true });
  assert.equal(done.count, 7);
  assert.ok(storage.getItem(`${K}:pending:precious`), "a journal with an explicit save is never touched");
  assert.ok(storage.getItem(`${K}:pending:conflict:keep`), "a conflict copy is provenance");
  assert.ok(storage.getItem(`${K}:pending:live`), "another live tab's journal stays");
  // The save is already in the account; with room again the device copy can be written and the cause clears.
  assert.equal(f.runtime.getSnapshot().saved.length, 1);
  assert.equal(await f.runtime.retry(), true);
  await tick(100);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(f.server.calls.length, 1, "not sent twice");
  assert.equal(f.runtime.getSnapshot().storageIssue, null);
  f.runtime.stop();
});

test("the failure notice names the observed cause; the queue length is not a reason", () => {
  assert.match(saveFailureNotice({ syncStatus: "local_error", storageIssue: "quota", reclaimablePassiveJournals: 4 }).text, /מלא/);
  assert.equal(saveFailureNotice({ syncStatus: "local_error", storageIssue: "quota", reclaimablePassiveJournals: 4 }).action, "reclaim");
  assert.equal(saveFailureNotice({ syncStatus: "local_error", storageIssue: "quota", reclaimablePassiveJournals: 0 }).action, null);
  assert.match(saveFailureNotice({ storageIssue: "blocked" }).text, /חוסם/);
  assert.match(saveFailureNotice({ storageIssue: "corrupt_state" }).text, /אינם קריאים/);
  assert.match(saveFailureNotice({ storageIssue: "invalid_journal" }).text, /לשונית חדשה/);
  // A queue with items and a healthy store: it must NOT claim the browser store failed.
  const healthy = saveFailureNotice({ syncStatus: "pending", storageIssue: null, syncPending: 5 });
  assert.doesNotMatch(healthy.text, /אחסון|דפדפן/);
});

test("every save front-end goes through the ONE runtime and the button states a real cause", () => {
  // The button renders; the ONE indicator logic lives in usePersonalSave2029 (the same guarantees, now shared by every save surface).
  const button = read("../src/components/userCenter/PersonalSaveButton2029.jsx") + read("../src/lib/research/usePersonalSave2029.js");
  assert.doesNotMatch(button, /syncPending>0\?'הפריט נקלט/, "the old guess is gone");
  assert.match(button, /indicatorFailureNotice\(/);
  assert.match(button, /localOnlyResearch\?\.\("reclaim", \{ confirm: true \}\)/, "the reclaim is the existing one, explicit");
  assert.doesNotMatch(read("../src/lib/research/ResearchProvider.jsx") + read("../src/lib/research/researchSyncRuntime.js"), /reclaimPassive/, "no second reclaim");
  for (const file of ["../src/components/community2029/CommunityPersonalActions2029.jsx", "../src/components/experience2029/PostActionBar2029.jsx", "../src/components/experience2029/PostReadingActions2029.jsx", "../src/pages/Number2029Page.jsx"]) {
    assert.match(read(file), /PersonalSaveButton2029/, `${file} uses the one button`);
  }
  assert.match(read("../src/pages/Books2029Page.jsx"), /usePersonalSave2029\(/, "the Book save is the same one indicator");
  assert.doesNotMatch(read("../src/pages/Books2029Page.jsx"), /research\.saveItem/, "no second save mechanism in the Book page");
  for (const file of ["../src/components/contributor2029/ContributorReadingController2029.jsx", "../src/components/experience2029/ElsSavedDiscovery2029.jsx", "../src/components/experience2029/SystemFrame2029.jsx", "../src/lib/research/RazielSessionProvider2029.jsx", "../src/lib/research/useUniversalWorkspace.js", "../src/lib/research/usePersonalSave2029.js"]) {
    assert.match(read(file), /research\.saveItem|saveItem\?\.|saveItem\(/, `${file} saves through research.saveItem (the one runtime)`);
  }
});
