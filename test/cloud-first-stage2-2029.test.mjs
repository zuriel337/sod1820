import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createResearchSyncRuntime } from "../src/lib/research/researchSyncRuntime.js";
import { applyResearchOps, emptyResearchState, makeResearchOp, principalStateKey, principalToken } from "../src/lib/research/researchSyncState.js";
import { indicatorFailureNotice, saveIndicatorPhase } from "../src/lib/research/personalSaveIndicator.js";

// CLOUD FIRST, stage 2 (ZURIEL 27.11.2026, docs/reviews/cloud-first-20261127/PLAN.md):
//   A. a save in the account is never conditional on a local write: a full or denied browser store keeps the batch in memory and the batch is still sent;
//      "saved" is only ever the server's receipt (applied_revision); nothing existing on the device is dropped or overwritten.
//   B. storage reduction applies to NEW writes only: no automatic personal history_add from saving/adding an item; the history that exists is still read and kept.
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
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
const tick = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));
const USER = "U1", P = principalToken(USER), K = principalStateKey(P);
const item = id => ({ id: `post:${id}`, type: "post", title: `פוסט ${id}`, ref: id, link: `/post/${id}`, metadata: {}, addedAt: 1 });
const upsert = (id, bucket = "library") => makeResearchOp("item_upsert", { bucket, entity: item(id) });
const old = { id: "post:old", type: "post", title: "ישן", ref: "old", link: "/post/old", metadata: {}, t: 1 };

// A compare-and-set server, idempotent by batch id, that can drop an answer or go down.
function server(initial = {}) {
  const s = { revision: 5, state: { ...emptyResearchState(), ...initial }, calls: [], receipts: new Map(), down: 0, loseAck: false, hold: null };
  s.snap = () => ({ ...s.state, revision: s.revision });
  s.read = async () => s.snap();
  s.write = async (_uid, ops, meta) => {
    s.calls.push(meta.batchId);
    if (s.hold) await s.hold;
    if (s.down > 0) { s.down -= 1; throw new Error("network down"); }
    const receipt = s.receipts.get(meta.batchId);
    if (receipt) return { ok: true, replayed: true, batch_id: meta.batchId, applied_revision: receipt, snapshot: s.snap() };
    if (meta.expectedRevision !== s.revision) throw new Error("RESEARCH_SYNC_CONFLICT");
    s.state = applyResearchOps(s.state, ops); s.revision += 1; s.receipts.set(meta.batchId, s.revision);
    if (s.loseAck) { s.loseAck = false; throw new Error("lost response"); }
    return { ok: true, batch_id: meta.batchId, applied_revision: s.revision, snapshot: s.snap() };
  };
  return s;
}
function make(srv, { storage = new Store(), session = new Store(), userId = USER } = {}) {
  const runtime = createResearchSyncRuntime({ userId, storage, session, delay: 1, cloudEnabled: true, resumePendingOnStart: false, readCloud: srv.read, writeCloud: srv.write });
  runtime.start();
  return { runtime, storage, session };
}

test("A1. quota exceeded: the batch is sent anyway, 'saved' (cloudConfirmed) appears only after the server's receipt", async () => {
  const srv = server(); srv.hold = new Promise(r => { srv.release = r; });
  const f = make(srv, { storage: new Store(300) }); await tick();
  assert.equal(f.runtime.commit([upsert("a")]), true, "accepted: queued for the account");
  await tick(30);
  let snap = f.runtime.getSnapshot();
  assert.equal(srv.calls.length, 1, "the request left although nothing could be written to the device");
  assert.equal(snap.syncStatus, "syncing");
  assert.equal(snap.cloudConfirmed, false, "in flight is not a receipt");
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: snap.syncStatus, syncPending: snap.syncPending, syncAwaitingAction: snap.syncAwaitingAction, attempt: "saving" }), "saving");
  assert.equal(snap.memoryOnly, true);
  srv.release(); await tick(40);
  snap = f.runtime.getSnapshot();
  assert.equal(snap.cloudConfirmed, true);
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: snap.syncStatus, syncPending: snap.syncPending, syncAwaitingAction: snap.syncAwaitingAction, attempt: "saving" }), "confirmed");
  assert.equal(srv.state.saved.length, 1);
  assert.equal(snap.syncRevision, 6, "the receipt's applied_revision");
  f.runtime.stop();
});

test("A2. the server never answers ok: not confirmed, kept in memory as pending work, retry resends the same batch and confirms once", async () => {
  const srv = server(); srv.down = 1;
  const f = make(srv, { storage: new Store(300) }); await tick();
  f.runtime.commit([upsert("a")]); await tick(60);
  let snap = f.runtime.getSnapshot();
  assert.equal(snap.syncStatus, "error");
  assert.equal(snap.cloudConfirmed, false);
  assert.equal(snap.syncPending, 1, "preserved, not dropped");
  assert.equal(snap.memoryOnly, true);
  const notice = indicatorFailureNotice({ syncStatus: snap.syncStatus, storageIssue: snap.storageIssue, syncPending: snap.syncPending });
  assert.match(notice.text, /זיכרון הלשונית/, "tells the person where the item waits");
  assert.doesNotMatch(notice.text, /השמירה לא נשלחה לחשבון/, "no longer claims that nothing was sent");
  assert.equal(await f.runtime.retry(), true); await tick(60);
  snap = f.runtime.getSnapshot();
  assert.equal(snap.cloudConfirmed, true);
  assert.deepEqual([...new Set(srv.calls)].length, 1, "one batch id for both attempts");
  assert.equal(srv.state.saved.length, 1, "applied once");
  f.runtime.stop();
});

test("A3. a denied store (SecurityError on every access) does not stop the account write either", async () => {
  const deny = () => { throw Object.assign(new Error("denied"), { name: "SecurityError" }); };
  const blocked = { get length() { return deny(); }, getItem: deny, setItem: deny, removeItem() {}, key() { return null; } };
  const srv = server();
  const f = make(srv, { storage: blocked }); await tick();
  assert.equal(f.runtime.getSnapshot().storageIssue, "blocked");
  assert.equal(f.runtime.commit([upsert("a")]), true); await tick(60);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true);
  assert.equal(srv.state.saved.length, 1);
  f.runtime.stop();
});

test("A4. unreadable local DATA still fails closed and is left exactly as it was (only a denied/full store is let through)", async () => {
  const storage = new Store(); storage.setItem(K, "[1,2]");
  const srv = server();
  const f = make(srv, { storage }); await tick();
  assert.equal(f.runtime.getSnapshot().storageIssue, "corrupt_state");
  assert.equal(f.runtime.commit([upsert("a")]), false);
  assert.equal(storage.getItem(K), "[1,2]");
  assert.equal(srv.calls.length, 0);
  f.runtime.stop();
});

test("A5. existing pending journals, a conflict copy and the localonly record are never deleted or overwritten while a save goes through a full store", async () => {
  const storage = new Store();
  const mine = { principal: P, revision: 5, queue: [{ batch_id: "keep1", ops: [upsert("kept")] }], inflight: null };
  storage.setItem(`${K}:pending:j1`, JSON.stringify(mine));
  storage.setItem(`${K}:pending:j1:conflict:c1`, JSON.stringify(mine));
  storage.setItem(`${K}:localonly`, JSON.stringify({ principal: P, items: [], extras: { collections: [{ id: "c1", name: "אוסף" }] }, at: 1 }));
  const before = [...storage.map];
  storage.limit = before.reduce((n, [a, b]) => n + a.length + b.length, 0) + 10;
  const srv = server();
  const f = make(srv, { storage }); await tick();
  f.runtime.commit([upsert("new")]); await tick(80);
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, true, "the new save reached the account");
  for (const [name, raw] of before) assert.equal(storage.getItem(name), raw, `${name} is untouched`);
  f.runtime.stop();
});

test("A6. signed out: nothing goes to any account, and a full store is still reported as a local failure (the sign-in offer at the action is unchanged)", async () => {
  const srv = server();
  const f = make(srv, { storage: new Store(10), userId: null }); await tick();
  assert.equal(f.runtime.commit([upsert("a")]), false);
  assert.equal(f.runtime.getSnapshot().syncStatus, "local_error");
  assert.equal(srv.calls.length, 0);
  f.runtime.stop();
  const button = read("../src/lib/research/usePersonalSave2029.js");
  assert.match(button, /personalActionsLocked\(auth\)\) \{ shell\.openWorkspace\?\.\(\)/, "the existing signed-out flow (AccountEntry via the shell) is untouched");
});

test("A7. the page warns before it is closed only while a save exists solely in memory", () => {
  const provider = read("../src/lib/research/ResearchProvider.jsx");
  assert.match(provider, /if \(!state\.memoryOnly\) return undefined;[\s\S]{0,200}addEventListener\("beforeunload"/);
  assert.match(provider, /\[state\.memoryOnly\]\);/);
});

test("B1. saving an item or adding it to the research no longer appends an automatic personal history entry", () => {
  const provider = read("../src/lib/research/ResearchProvider.jsx");
  const addToResearch = provider.slice(provider.indexOf("addToResearch(entity)"), provider.indexOf("removeFromResearch"));
  const saveItem = provider.slice(provider.indexOf("saveItem(entity)"), provider.indexOf("removeSaved"));
  for (const body of [addToResearch, saveItem]) {
    assert.match(body, /commitAction\(\[op\("item_upsert"/);
    assert.doesNotMatch(body, /history\(/, "no history_add beside the save");
  }
  // The explicit history writer (an opened source, an observed ELS result) and its reader/clear stay as they were.
  assert.match(provider, /logHistory: \(entity\) => \(workspace\.current && entity\?\.id \? commitAction\(\[op\("history_add", \{ entity: \{ \.\.\.entity, t: Date\.now\(\) \} \}\)\]\) : false\)/);
  assert.match(provider, /clearHistory: \(\) => commitAction\(\[op\("history_clear"\)\]\)/);
  assert.match(read("../src/components/experience2029/WorkspaceProjection2029.jsx"), /key: "history", title: "אחרונים"/, "existing history is still shown");
});

test("B2. a save sends exactly one operation; the history that already exists is read, kept and not touched by it", async () => {
  const srv = server({ history: [old] });
  const f = make(srv); await tick();
  assert.deepEqual(f.runtime.getSnapshot().history.map(x => x.id), ["post:old"], "existing history is read");
  f.runtime.commit([upsert("a")]); await tick(60);
  const snap = f.runtime.getSnapshot();
  assert.equal(snap.cloudConfirmed, true);
  assert.deepEqual(snap.history.map(x => x.id), ["post:old"], "unchanged by the save: nothing added, nothing deleted");
  assert.deepEqual(srv.state.history.map(x => x.id), ["post:old"]);
  assert.equal(srv.state.saved.length, 1);
  // reopen: the stored copy still holds the history
  f.runtime.stop();
  const g = make(srv, { storage: f.storage, session: f.session }); await tick();
  assert.deepEqual(g.runtime.getSnapshot().history.map(x => x.id), ["post:old"]);
  g.runtime.stop();
});

test("B3. an explicit history entry (logHistory) is still written and read as before", async () => {
  const srv = server();
  const f = make(srv); await tick();
  f.runtime.commit([upsert("a"), makeResearchOp("history_add", { entity: { ...item("a"), t: 2 } })]); await tick(60);
  assert.deepEqual(srv.state.history.map(x => x.id), ["post:a"]);
  f.runtime.stop();
});

test("B4. sod_entry_learn_2029_v1 is still written (the post/number orientation reads it to stay dismissed), and it is bounded well under 4KB", async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  globalThis.sessionStorage = globalThis.localStorage;
  const m = await import("../src/lib/entryLearn2029.js");
  for (const s of ["home", "post", "number", "topic", "world", "books", "journey", "els", "heichal"]) m.markSurfaceFamiliarity(s, "dismissed", 1);
  for (const c of ["anchor", "method", "finding", "relation", "verification", "evidence", "convergence", "interpretation", "milui", "mistater", "kadmi", "els", "journey"]) m.markConceptFamiliarity(c, "complete", 1);
  const raw = store.get("sod_entry_learn_2029_v1");
  assert.ok(raw && raw.length < 4096, `every surface and concept it can ever hold is ${raw?.length} bytes`);
  // backward compatible read: an old record and garbage both read safely; nothing is deleted
  store.set("sod_entry_learn_2029_v1", JSON.stringify({ version: 1, surfaces: { post: { v: 1, state: "dismissed", at: 5 } }, concepts: {} }));
  assert.equal(m.getSurfaceFamiliarity("post").state, "dismissed");
  store.set("sod_entry_learn_2029_v1", "{garbage");
  assert.equal(m.getSurfaceFamiliarity("post"), null);
  // its readers exist in shipped screens
  assert.match(read("../src/components/experience2029/SystemFrame2029.jsx"), /getSurfaceFamiliarity/);
  assert.match(read("../src/components/experience2029/InspectProjection2029.jsx"), /getConceptFamiliarity/);
});
