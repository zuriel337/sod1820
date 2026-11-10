# Research pending journals — lifecycle proposal (10.11.2026)

**Status: DRAFT implementation + evidence. NOT approved to merge or to activate.** (ZURIEL, 10.11: a separate Draft PR is allowed; merging or
activating the lease change is not.) Base: `origin/main` `defc7c573` (includes the auth fix #1292, which this branch does not touch).
The approved two-tab contract tests pass unchanged. Nothing here is deployed, and no data is deleted or changed.

## Problem (measured on the unchanged runtime, `researchJournalLifecycle.test.js` BASELINE tests)
* Every page load of a signed-in tab creates a new durable journal `<state>:pending:<id>` and writes it immediately, even with an empty
  queue. 30 passive loads -> 30 journals; none is reclaimed (the previous journal is only removed after a flush drains the queue).
* A tab that records history/context on each load (those ops never grant write intent, so they never flush) copies the whole queue into
  each new journal: 12 loads -> 12 journals, the largest 6x the smallest, total bytes super-linear.
* Production corroboration (24 h): 413 snapshot reads, 0 `apply_ops` calls: the writes that would drain these journals almost never occur.

## Constraints from the owner
1. Two active tabs hold distinct, durable journals (existing contract test "duplicated tabs own distinct durable pending journals").
2. Passive loads must not accumulate journals or keys without bound.
3. Crash recovery and unsynced data are preserved. Nothing is deleted unless it is provably redundant. The contract is not changed
   until a design and a no-loss proof are presented (this document).

## Design (`src/lib/research/researchJournalLifecycle.js`, pure, ~90 lines)
1. **Lazy persistence (identity of the owner = the tab).** A tab writes a journal only when it has something to persist: a commit, an
   explicit retry or a recovery. A passive load with an empty queue writes nothing; a passive load that merely restored a queue leaves the
   original journal untouched. This alone removes the per-load growth.
2. **Ownership lease.** The record gains `owner: { id, at, released }` (older runtimes ignore unknown fields). The owner refreshes `at`
   (every 15 s, only while it has pending work) and sets `released` on `pagehide`. To persist what it restored a tab:
   * **adopts in place** if the pointed journal is its own, released, or its lease expired (45 s) **and** its stored content is byte-for-byte
     what the tab restored (compare-and-set; `cleanRecoveredCopy` already uses the same idea);
   * otherwise **copies into a new key** (today's copy-on-resume). A duplicated tab shares the sessionStorage pointer but the original's
     lease is live, so the duplicate always gets a distinct durable journal: contract 1 holds.
   * before each write a tab verifies it still owns its journal; if it was taken over (a background tab whose timers were throttled lost its
     lease) or reaped, it writes its full in-memory queue to a new key. A false expiry therefore cannot lose data.
3. **Reaping, lossless only.** A journal that is not live/own may be removed iff (a) it holds nothing, or (b) every batch in it (id and ops)
   is also present, with the same revision, in another **free** journal that stays. Batch ids are idempotent on the server (durable receipts),
   so replaying either copy is equivalent. Journals from an older runtime (no `owner`) are never adopted, only reaped if empty. Journals with
   distinct unsynced content are kept for the existing explicit recovery UI.
4. **Bound.** More than `MAX_UNOWNED` (24) non-reapable unowned journals sets `overCap` so the UI asks the person to recover or discard
   (explicit, confirmed). The planner itself deletes nothing past the cap.

Resulting bounds: passive loads -> 0 journals; one tab with pending work reloaded any number of times -> 1 journal of constant size;
N concurrent tabs with pending work -> N journals; closed tabs -> collapse to the distinct unsynced content only.

## Evidence of no loss (`researchJournalLifecycle.test.js`)
* MODEL, 3000 random histories x 60 steps (180 000 steps; tab open / reload / duplicate / commit / ack / heartbeat with random missed beats
  (throttling) / clean close or crash / time jumps / reaping / explicit recovery), with the invariant checked after **every** step:
  every batch created and not acknowledged is present in at least one durable journal; a tab that persisted holds a journal that mirrors its
  queue; two live tabs never own the same journal.
* MODEL final state, 1500 histories: after all tabs close and leases expire, no empty journal remains, a second reaping pass finds nothing,
  unsynced content is all still there.
* BOUND: 1000 passive tabs write 0 journals; one tab with 2 batches reloaded 500 times keeps 1 journal, queue size constant.
* CONTRACT: a duplicate of a live tab gets a distinct key and the original's journal is byte-identical afterwards.
* MUTATION CHECK: removing the content compare-and-set breaks 4 tests; removing the "keeper must be free" rule or the revision check breaks the safety test.
* The existing runtime tests (50, including the two-tab contract) pass unchanged on this branch.

## What this does NOT prove (honest limits)
* It is a model of the planner, not the runtime: wiring `persist()` and `start()` to it is the next step and needs the same properties tested on the real runtime with real timers.
* Cross-tab writes to localStorage are not atomic; the compare-and-set and the pre-write ownership check shrink the window to a read-then-write gap but cannot close it. The consequence of losing that race is a duplicate journal, never a lost batch (every tab writes its complete queue).
* `pagehide` is not guaranteed on mobile; a crash leaves a lease that expires after 45 s, so the first reload within that window copies (then the copy is reaped later).
* Reaping needs a place to run (on startup after hydrate, plus when `recoveryJournals` is listed); it must run under the same storage-fault guards as the runtime.

## Implementation plan (needs ZURIEL approval; separate PR)
1. Wire `persist()`/`start()`/`pagehide`/heartbeat/reap to the planner behind the existing runtime API (no new store).
2. Invert the two BASELINE tests; keep the contract test; add the model test as a permanent gate.
3. Ship without any deletion of existing journals: they are classified `legacy` and only reaped if empty.
4. After deploy, measure journal counts from the storage report (names and sizes only) already shown on the sign-in screen.


## Proof against the REAL runtime (second pass; `researchJournalRuntime.test.js`, real `createResearchSyncRuntime`, no model)
Harness: shared localStorage, one sessionStorage per tab, a server with durable receipts (idempotent by batch id) and compare-and-set revisions,
tabs that open / reload / duplicate / commit (write and passive) / flush / go offline / throttle heartbeats / close cleanly / crash / get restored by
the browser with their sessionStorage / recover explicitly. The invariants are checked after every step.

| Property | Unchanged runtime | With the lease |
|---|---|---|
| No unsynced batch ever exists outside durable journals (300 histories x 40 steps; also run with 2500 seeds) | pass | pass |
| A duplicated live tab commits without touching the original's journal; owns a distinct one | pass | pass |
| 300 passive reloads + 50 duplicates write no journal | **fail (351)** | pass (0) |
| A tab with pending work reloaded 200x keeps one journal, constant size | **fail (201 journals)** | pass (1) |
| History recorded on each of 100 loads: one journal, linear size, no batch dropped | **fail (101 journals)** | pass |
| 20 crashed tabs with distinct work + 30 crash/restore cycles of one tab | **fail (51 journals)** | pass (21: one per distinct unsynced work) |
| Duplicate of a live tab, both closed, later load: never more journals, all unsynced work present | **fail** | pass |
| A stale tab never overwrites a journal that changed after it restored (compare-and-set) | n/a (always copies) | pass |
Mutation checks on the real runtime: disabling the compare-and-set breaks 2 tests; disabling the ownership claim breaks 22 of the 46 runtime tests.
Existing: all 37 sync runtime tests (including "duplicated tabs own distinct durable pending journals") and the recovery tests pass unchanged;
the whole `src/lib/research` suite passes (1586 tests).

## What the draft changes in the runtime (`researchSyncRuntime.js`, `ResearchProvider.jsx`)
* The journal key is claimed lazily: only when the tab has pending work AND has touched it (commit, flush, retry, recovery, conflict resolution).
  A drained tab removes its own journal. Journals written by older code are only read and copied, never adopted.
* The record gains `owner: { id, at, released }`; a heartbeat (15 s, only while it holds work) and `release()` (on `stop()` and `pagehide`).
* `stop()` never writes (existing contract: "existing research journals are retained when cloud admission is closed" compares bytes); only an explicit `release()` marks the lease released. The provider calls `release()` on `pagehide`, and only for a session that may hold pending work (the reading-access contract requires a locked session to register no window listeners).
* `planPersist` decides write-own / adopt-in-place (free + content unchanged since restore) / copy. `reapRedundant()` runs once at `start()`.
* New optional parameters `now` and `heartbeatMs` (tests); the public API only gains `heartbeat()` and `release()`.

## Residual risks and limits (not hidden)
* A passive tab still appends one real batch per recorded navigation to its single journal (history/context ops never grant write intent, so
  they never flush): size is linear in real batches, no longer quadratic or multiplied. Bounding that queue (for example, trimming history
  batches that can no longer be visible) changes data semantics and is NOT in this draft; it needs its own decision.
* Journals written by the previous version stay until drained or recovered (they are classified `legacy`: copied, never collapsed, only removed if empty).
* The race between the compare-and-set read and the write across tabs is not atomic; the consequence is a duplicate journal, never a lost batch (a tab always writes its full queue).
* Verified in Node with fake storage and clocks; not yet in a real browser with real timers and `pagehide`.

## Existing contract tests that constrained the design (found by running the provider-level tests, not by the sync tests)
* `doc37-runtime-admission` "existing research journals are retained when cloud admission is closed": `stop()` must not rewrite a journal -> lease release moved out of `stop()`.
* `doc37-research-reading-access`: a locked reading session registers no window listeners -> the `pagehide` listener is registered only when actions are allowed.
After those two adjustments the 12 node-level tests that import the runtime or provider give the same result on this branch as on `main` (100 of 101; the one failure, "font failure or a never-settling font…", fails identically on `main` in this environment). `src/lib/research` passes (1586 of 1586). Browser-level tests of the provider were not run locally.
