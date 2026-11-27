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
  const server = { calls: [], revision: 3 };
  const snapshot = () => ({ cart: [], saved: [], pinned: [], history: [], collections: [], journeys: [], revision: server.revision, context: null });
  const runtime = createResearchSyncRuntime({ userId: USER, storage, session, delay: 1, cloudEnabled: true, resumePendingOnStart: false,
    readCloud: async () => snapshot(),
    writeCloud: async (_uid, ops, meta) => { server.calls.push(meta.batchId); server.revision += 1; return { ok: true, batch_id: meta.batchId, applied_revision: server.revision, snapshot: { ...snapshot(), saved: ops.filter(o => o.kind === "item_upsert").map(o => o.entity) } }; } });
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

test("a full store is named as such, nothing is sent, and no explicit save is lost", async () => {
  const storage = new Store(600);
  const f = make({ storage }); await tick();
  assert.equal(save(f.runtime), false);
  const snap = f.runtime.getSnapshot();
  assert.equal(snap.syncStatus, "local_error");
  assert.equal(snap.storageIssue, "quota", "the real cause, not a guess");
  assert.equal(f.server.calls.length, 0, "still fail-closed: nothing is sent without a durable journal");
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
  assert.equal(save(f.runtime), false);
  assert.equal(f.runtime.getSnapshot().storageIssue, "quota");
  const dry = await f.runtime.localOnly("reclaim");
  assert.equal(dry.count, 7, "the explicit journal, the conflict copy and another live tab's journal are not eligible");
  assert.equal(storage.getItem(`${K}:pending:old0`) !== null, true, "a dry run removes nothing");
  const done = await f.runtime.localOnly("reclaim", { confirm: true });
  assert.equal(done.count, 7);
  assert.ok(storage.getItem(`${K}:pending:precious`), "a journal with an explicit save is never touched");
  assert.ok(storage.getItem(`${K}:pending:conflict:keep`), "a conflict copy is provenance");
  assert.ok(storage.getItem(`${K}:pending:live`), "another live tab's journal stays");
  // The attempt that failed is still queued (nothing was dropped): the button's next step is the existing retry, which now has room to write its journal.
  assert.equal(f.runtime.getSnapshot().saved.length, 1);
  assert.equal(await f.runtime.retry(), true);
  await tick(100);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(f.server.calls.length, 1);
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
