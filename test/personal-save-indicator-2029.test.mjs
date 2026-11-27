import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createResearchSyncRuntime } from "../src/lib/research/researchSyncRuntime.js";
import { makeResearchOp, principalStateKey, principalToken, applyResearchOps, emptyResearchState } from "../src/lib/research/researchSyncState.js";
import { conflictReapplySafe, indicatorFailureNotice, saveIndicatorPhase } from "../src/lib/research/personalSaveIndicator.js";

// ZURIEL 27.11.2026, post 5144: ONE save indicator (idle -> saving -> confirmed | failed with a retry), driven only by the server's receipt.
// This file proves the state machine and the runtime path that failed on the live site (full browser store -> reclaim -> retry -> the server answered 409 and no screen could resolve it).
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
const USER = "A", P = principalToken(USER), K = principalStateKey(P);
const post = { id: "post:5144", type: "post", title: "פלישת חיות הבר", ref: "mah-kore-wild-animals-hyena-jackals-boar", link: "/post/mah-kore-wild-animals-hyena-jackals-boar", metadata: {}, addedAt: 1 };
const saveOps = () => [makeResearchOp("item_upsert", { bucket: "library", entity: post }), makeResearchOp("history_add", { entity: { ...post, t: 1 } })];
const passive = i => ({ batch_id: `b${i}`, ops: [{ kind: "history_add", op_id: `o${i}`, entity: { id: `post:${i}`, type: "post", title: "t", ref: `s${i}`, link: "/p", metadata: {}, t: i } }] });
const journal = (queue, revision = 3) => JSON.stringify({ principal: P, revision, queue, inflight: null });

// A server that is compare-and-set on the revision like production, idempotent by batch id, and can hold an answer back.
function server({ revision = 3 } = {}) {
  const s = { revision, saved: [], calls: [], receipts: new Map(), hold: null, failNext: 0 };
  s.snapshot = () => ({ ...emptyResearchState(), saved: [...s.saved], revision: s.revision });
  s.write = async (_uid, ops, meta) => {
    s.calls.push({ batch: meta.batchId, expected: meta.expectedRevision });
    if (s.hold) await s.hold;
    if (s.failNext > 0) { s.failNext -= 1; throw new Error("network down"); }
    const receipt = s.receipts.get(meta.batchId);
    if (receipt) return { ok: true, batch_id: meta.batchId, applied_revision: receipt, snapshot: s.snapshot() };
    if (meta.expectedRevision !== s.revision) throw new Error("RESEARCH_SYNC_CONFLICT");
    s.saved = applyResearchOps({ ...emptyResearchState(), saved: s.saved }, ops).saved; s.revision += 1; s.receipts.set(meta.batchId, s.revision);
    return { ok: true, batch_id: meta.batchId, applied_revision: s.revision, snapshot: s.snapshot() };
  };
  return s;
}
function make(srv, { storage = new Store(), session = new Store() } = {}) {
  const runtime = createResearchSyncRuntime({ userId: USER, storage, session, delay: 1, cloudEnabled: true, resumePendingOnStart: false, readCloud: async () => srv.snapshot(), writeCloud: srv.write });
  runtime.start();
  return { runtime, storage, session };
}
const phase = (runtime, attempt = "idle") => { const r = runtime.getSnapshot(); const saved = r.saved.some(x => x.id === post.id); return saveIndicatorPhase({ saved, syncStatus: r.syncStatus, syncPending: r.syncPending, syncAwaitingAction: r.syncAwaitingAction, attempt }); };

test("the indicator is a state machine: only the server's receipt is 'confirmed'", () => {
  assert.equal(saveIndicatorPhase({ saved: false, syncStatus: "synced", syncPending: 0 }), "idle");
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: "synced", syncPending: 0 }), "confirmed");
  // a local commit, a queued batch and an in-flight request are never success
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: "pending", syncPending: 1, attempt: "saving" }), "saving");
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: "syncing", syncPending: 1 }), "saving");
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: "synced", syncPending: 1, attempt: "saving" }), "saving", "an empty status with queued work is not a receipt");
  assert.equal(saveIndicatorPhase({ saved: true, syncStatus: "local_only", syncPending: 0 }), "idle", "device-only: the button offers the sync, it does not claim success");
  for (const status of ["error", "conflict", "local_error", "local_recovery_required"]) {
    assert.equal(saveIndicatorPhase({ saved: true, syncStatus: status, syncPending: 1, attempt: "saving" }), "failed");
    assert.equal(saveIndicatorPhase({ saved: false, syncStatus: status, syncPending: 0, attempt: "idle" }), "idle", "another item's failure does not mark this one");
  }
  assert.equal(saveIndicatorPhase({ saved: false, syncStatus: "local_error", syncPending: 0, attempt: "failed" }), "failed");
});

test("a conflict is re-applied by one explicit click only when the queue merely adds; a pending delete is never replayed over newer server data", () => {
  assert.equal(conflictReapplySafe({ queue: [{ ops: [{ kind: "item_upsert" }, { kind: "history_add" }] }], inflight: null }), true);
  assert.equal(conflictReapplySafe({ queue: [{ ops: [{ kind: "item_upsert" }] }], inflight: { ops: [{ kind: "item_delete" }] } }), false);
  assert.equal(conflictReapplySafe({ queue: [{ ops: [{ kind: "item_clear_bucket" }] }] }), false);
  assert.equal(conflictReapplySafe({ queue: [] }), false);
  assert.equal(conflictReapplySafe(null), false);
  const offered = indicatorFailureNotice({ syncStatus: "conflict", conflictReapplyOffered: true });
  assert.equal(offered.action, "resolve");
  assert.doesNotMatch(offered.text, /באזור האישי/, "no promise of a screen that does not exist");
  assert.match(offered.text, /לא נמחק דבר/);
  assert.equal(indicatorFailureNotice({ syncStatus: "conflict" }).action, null);
});

test("server ack before success: nothing is confirmed while the server has not answered, and a dropped answer is a failure with a retry, not a success", async () => {
  const srv = server(); const f = make(srv); await tick();
  let release; srv.hold = new Promise(r => { release = r; });
  assert.equal(f.runtime.commit(saveOps()), true);
  await tick(30);
  assert.equal(srv.calls.length, 1, "the request is in flight");
  assert.equal(f.runtime.getSnapshot().cloudConfirmed, false);
  assert.equal(phase(f.runtime, "saving"), "saving");
  release(); srv.hold = null; await tick(60);
  assert.equal(phase(f.runtime, "saving"), "confirmed");
  assert.equal(srv.saved.length, 1);
  f.runtime.stop();
  // the server fails: the item stays on the device, the state is 'failed', and the same button's retry confirms it
  const srv2 = server(); srv2.failNext = 1; const g = make(srv2); await tick();
  g.runtime.commit(saveOps()); await tick(60);
  assert.equal(g.runtime.getSnapshot().syncStatus, "error");
  assert.equal(phase(g.runtime, "saving"), "failed");
  assert.equal(g.runtime.getSnapshot().saved.length, 1, "nothing was removed");
  assert.equal(await g.runtime.retry(), true); await tick(60);
  assert.equal(phase(g.runtime, "saving"), "confirmed");
  assert.equal(srv2.saved.length, 1);
  g.runtime.stop();
});

test("post 5144: full store -> the existing reclaim -> retry -> the server holds a newer revision (409) -> one explicit re-apply -> confirmed, nothing deleted", async () => {
  const srv = server({ revision: 9 });   // the account moved on (another device or tab saved) while this browser's journal still says revision 3
  const storage = new Store(), session = new Store();
  // The earlier attempt left its journal behind (revision 3, the save still queued); the browser store is full; old reading journals pile up beside it.
  storage.setItem(`${K}:pending:mine`, journal([{ batch_id: "mine1", ops: saveOps() }], 3));
  session.setItem(`${K}:journal`, `${K}:pending:mine`);
  for (let i = 0; i < 12; i += 1) storage.setItem(`${K}:pending:old${i}`, journal([passive(i), passive(i + 100)]));
  const keep = { batch_id: "keep", ops: [{ kind: "item_upsert", op_id: "k1", bucket: "library", entity: { id: "number:7", type: "number", title: "7", ref: "7", link: "/number/7", metadata: {}, addedAt: 1 } }] };
  storage.setItem(`${K}:pending:precious`, journal([keep]));
  storage.limit = [...storage.map].reduce((n, [a, b]) => n + a.length + b.length, 0) + 1900;   // the new state record does not fit
  const f = make(srv, { storage, session }); await tick();
  assert.equal(f.runtime.getSnapshot().saved.some(x => x.id === post.id), true, "the earlier attempt is still on the device");
  assert.equal(await f.runtime.retry(), false);
  assert.equal(f.runtime.getSnapshot().storageIssue, "quota", "the real cause is named");
  assert.equal(phase(f.runtime, "failed"), "failed");
  assert.equal(srv.calls.length, 0, "fail closed: nothing is sent without a durable journal");
  const dry = await f.runtime.localOnly("reclaim");
  assert.equal(dry.count, 12, "only abandoned passive journals are offered");
  assert.equal(storage.getItem(`${K}:pending:old0`) !== null, true, "the dry run clears nothing");
  const done = await f.runtime.localOnly("reclaim", { confirm: true });
  assert.equal(done.count, 12);
  assert.ok(storage.getItem(`${K}:pending:precious`), "a journal holding an explicit save is never cleared");
  assert.ok(storage.getItem(`${K}:pending:mine`), "this tab's own journal is never cleared");
  await f.runtime.retry(); await tick(60);
  // The revision recorded locally is stale: the server refuses it. That is a conflict, and it must be resolvable from the button.
  assert.equal(srv.calls.length, 1);
  assert.equal(f.runtime.getSnapshot().syncStatus, "conflict");
  assert.equal(phase(f.runtime, "saving"), "failed");
  assert.equal(await f.runtime.retry(), false, "a plain retry cannot pass a conflict");
  assert.equal(conflictReapplySafe(f.runtime.exportPending()), true, "the queue only adds, so the one-click re-apply is offered");
  assert.equal(srv.saved.length, 0);
  assert.equal(await f.runtime.resolveConflict({ confirm: true, action: "reapply" }), true); await tick(80);
  assert.equal(phase(f.runtime, "saving"), "confirmed");
  assert.equal(srv.saved.some(x => x.id === post.id), true, "the server holds the item");
  assert.equal([...storage.map.keys()].some(k => k.includes(":conflict:")), true, "the disputed batch is preserved as provenance");
  assert.ok(f.runtime.getSnapshot().saved.some(x => x.id === post.id), "nothing the person saved was removed");
  f.runtime.stop();
});

test("one mechanism: the button and the Book save are the same hook; the status never leaves the flow of the row", () => {
  const hook = read("../src/lib/research/usePersonalSave2029.js");
  assert.match(read("../src/components/userCenter/PersonalSaveButton2029.jsx"), /usePersonalSave2029\(entity\)/);
  assert.match(read("../src/pages/Books2029Page.jsx"), /usePersonalSave2029\(item/);
  assert.match(hook, /saveIndicatorPhase\(/);
  assert.doesNotMatch(hook.replace(/localStorage\.removeItem\("__sod_probe"\)/, ""), /removeItem\(|\.clear\(/, "this surface never deletes anything (its read-only probe removes only its own temporary key): the only clearing is the existing explicit reclaim");
  assert.match(hook, /localOnlyResearch\?\.\("reclaim", \{ confirm: true \}\)/);
  const css = read("../src/components/experience2029/postReadingActions2029.css");
  const saveRules = css.slice(css.indexOf(".post-reading-save {"), css.indexOf("@media (max-width: 540px)"));
  assert.doesNotMatch(saveRules, /position:\s*absolute/, "the status is an in-flow line, not a floating box the header can clip");
  assert.match(css, /\.post-reading-action-row \{[^}]*flex-wrap: wrap/, "the row wraps instead of clipping");
  assert.doesNotMatch(css, /min\(240px, 65vw\)/);
});
