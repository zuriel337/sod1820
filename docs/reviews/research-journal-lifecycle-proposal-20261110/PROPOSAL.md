# Research pending journals — lifecycle proposal (10.11.2026)

**Status: PROPOSAL + evidence only.** `researchSyncRuntime.js` and the approved two-tab contract are unchanged and not touched by this branch.
Nothing here is wired into the runtime, merged, deployed, or changes data. Base `origin/main` `0d718702c`.

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
