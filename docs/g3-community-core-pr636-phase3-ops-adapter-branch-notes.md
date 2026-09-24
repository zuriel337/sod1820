# G3 Community Core — PR #636 Phase 3 concrete Supabase ops adapter (branch-only)

Assignment: `work_log.id=0427d2cd-14a5-4924-b1d3-fc30ccefe8a7`,
`task_key=G3_COMMUNITY_CORE_PR636_PHASE3_OPS_ADAPTER_V1`,
`release_authorization_state=BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER`.

Same PR #636 branch (`claude/awesome-dirac-88xf74`) as Phase 1/2/2.1/2.2/parent-reconstruction/
two-phase-executor, amended in place; no new parallel branch/PR. No live DB write, no migration,
no OpenWeb/current chat/forum file touched, no merge/deploy, no import execution.

## What this closes

The two-phase-executor pass's own "Not done" section explicitly deferred writing "a real
production `ops` implementation ... against the live `research_contributions` table" as "a
separate, explicitly-gated, ZURIEL-authorized task." This pass writes that implementation —
wiring only, still off by default behind `executor.mjs`'s existing triple gate
(`execute:true` + `EXECUTOR_CONFIRMATION_PHRASE` + a supplied `ops`), plus this pass's own
new `runBoundedImport` batch gate. **No canonical Supabase write API is called anywhere in this
task** — every function here takes a caller-supplied query-builder-shaped `client`; only tests,
against an in-memory fake, ever invoke it.

## What changed in this pass

**New: `scripts/g3-community-foundation-runtime/opsAdapter.mjs`**

- `resolveImportState(client, messages)` — read-only preflight. Derives exactly the `state` shape
  `planImport` needs (`importedMessageIds`, `linkedOpenwebUserIds`, `contributorsByOpenwebUserId`)
  entirely from existing provenance in `contribution_links`/`research_contributions`/`contributors`.
  Never writes. Checks both each message's own `message_id` *and* any `parent_message_id` it
  references, so a reply whose parent lives in an already-committed earlier batch is correctly
  seen as importable via `existing-via:` (cross-batch resolution) even when that parent isn't in
  the current `messages` array at all.
- `preflightImport(client, messages)` — the assignment's dry-run/preflight mode: resolves state
  and returns `planImport`'s plan, with zero writes (equivalent to
  `runImport(messages, state, {execute:false})` but without hand-building `state`).
- `createSupabaseOps(client)` — the real `insertContribution`/`skipDuplicate`/`linkParent`/
  `resolveExistingParentId` implementation `executor.mjs` calls when `execute:true`:
  - `insertContribution`: creates a new `contributors` row **only** when the op carries a
    genuinely new contributor placeholder (never re-inserts an already-resolved one); upserts
    `visitor_identity` (`visitor='openweb:<user_id>'`, keyed on `visitor`, never on email);
    inserts the `research_contributions` row with `parent_id` forced `null` and the planner's
    own placeholder `id` stripped (a real uuid column must generate its own id — passing the
    placeholder through would corrupt or reject the insert); then inserts the provenance
    (`derived_from` → `openweb_message`) and identity (`authored_by_external` → `openweb_user`)
    `contribution_links` rows. Anonymous messages (`op.contributor_op`/`op.visitor_identity_op`
    both null) create neither a contributor nor a visitor_identity row.
  - `skipDuplicate`: looks up the existing contribution via `contribution_links` and returns its
    id — a replayed `message_id` resolves to the prior row, never a second insert.
  - `linkParent` / `resolveExistingParentId`: thin wrappers over `research_contributions.update`
    and a `contribution_links` lookup, matching `executor.mjs`'s phase-2 contract exactly.
- `runBoundedImport(client, messages, {batchSize, execute, confirm})` — the transactional-execution
  design for a future authorized run: splits `messages` into fixed-size batches (41,080 rows in one
  transaction is unsafe) and calls `resolveImportState` + `runImport` per batch. Deliberately **no
  new checkpoint store** — resuming after a stop/crash/partial batch just calls this again from the
  start of `messages`; every already-committed row is re-derived as a duplicate by
  `resolveImportState` reading the same `contribution_links` provenance a real write already
  produced. A batch that reports any `linkFailures` halts the run before the next batch, surfacing
  that batch's `linkFailures` for reconciliation rather than masking it by continuing.

`planImport`/`executor.mjs` themselves are unchanged by this pass — this is wiring on top of an
already-frozen contract.

### PII / privacy invariants this pass preserves (never widens)

- `contributors.dossier_settings` is written back exactly as `planImport` set it
  (`visibility: 'private'`) — never widened.
- `contribution_links` (public-readable, per live schema check) never receives an `email` field or
  any PII: the provenance note is the planner's own JSON (url/moderation/parent_message_id/
  `representation_payload_missing`); the identity link's `target_id` is the opaque source-native
  `openweb_user_id`, never an email.
- Identity is keyed by `visitor='openweb:<user_id>'` and the source-native id throughout — never by
  email, matching `identity_architecture_law v1`.
- Anonymous messages never get a contributor/visitor_identity row.

## Tests

New `scripts/test-g3-community-core-pr636-phase3-ops-adapter.mjs`
(`npm run test:g3-community-core-pr636-phase3-ops-adapter`) — 11 tests against a small in-memory
fake Supabase client (the same `.from().select()/.insert()/.update()/.upsert()` shape, no real
project touched):

1. anonymous message creates no contributor/visitor_identity row.
2. identified OpenWeb user gets a private contributor + visitor_identity row; no PII lands in any
   `contribution_links` row (email absent from every link, never present in a provenance note).
3. two same-batch messages from the same OpenWeb user share one contributor row (no duplicate).
4. replay/idempotency: re-processing an already-imported `message_id` in a later batch resolves the
   existing contribution via `skipDuplicate`, never inserts a duplicate row.
5. cross-batch parent resolution: a reply processed in a later call links to its parent's real id
   from an earlier call, purely via live provenance.
6. a genuinely absent parent (never imported anywhere) stays `parent_id: null` forever, no failure.
7. partial failure: an inconsistent/corrupted provenance state (constructed directly, since
   `resolveImportState` itself can never produce this) is reported in `linkFailures` with
   `completed:false`, while the batch's other, unrelated row still inserts correctly.
8. `preflightImport` performs zero writes.
9. `runBoundedImport` across two size-1 batches: the second batch resolves its cross-batch parent
   from the first purely via re-querying live provenance, not an in-memory handoff between batches.
10. `runBoundedImport` halts before a third batch once an earlier batch's `linkParent` call fails
    (simulated DB failure) — the run reports `completed:false` and the third batch is never
    attempted.
11. dry-run (`execute:false`) touches the client for reads only in service of the (unused) plan and
    writes nothing.

Two real bugs were caught and fixed by these tests before landing:
- `insertContribution` was passing `planImport`'s placeholder `id` straight through to the
  `research_contributions` insert instead of letting the table generate a real one.
- `resolveImportState` only checked each message's own `message_id` against `contribution_links`,
  never the `parent_message_id` a reply references — which silently broke cross-batch parent
  linking for any parent not also present in the same `messages` array.

## Build/test evidence (this session, on this branch)

```
npm ci
npm run test:g3-community-foundation-runtime               # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2                 # 15 pass, 0 fail
npm run test:g3-community-core-2029-phase2-1                # 13 pass, 0 fail
npm run test:g3-community-core-2029-phase2-2                # 10 pass, 0 fail
npm run test:g3-community-core-pr636-parent-reconstruction   # 4 pass, 0 fail
npm run test:g3-community-core-pr636-two-phase-executor      # 6 pass, 0 fail
npm run test:g3-community-core-pr636-phase3-ops-adapter      # 11 pass, 0 fail (new)
npm run build:2029                                          # ✓ built in 1.13s (same pre-existing
                                                              #   INEFFECTIVE_DYNAMIC_IMPORT warning
                                                              #   on src/lib/auth.js, unrelated to
                                                              #   this change, noted in every prior
                                                              #   pass's own notes)
```

Total focused Community suite: 63 pre-existing + 11 new = 74 tests, 0 failures.

## Not done in this branch (explicitly out of scope / carried open)

- No live Supabase apply, no migration change, no real 41,080-row import execution. `createSupabaseOps`
  is never invoked against the canonical project in this task — only against the in-memory fake in
  tests.
- No real service_role client wiring/credentials/CLI entrypoint is added — this pass supplies the
  `ops` object shape `executor.mjs` needs; wiring an actual `@supabase/supabase-js` client instance
  and invoking `runBoundedImport` with `execute:true` against the live project remains a separate,
  explicitly-gated task requiring `G3_COMMUNITY_CORE_PR636_PHASE3_FINAL_CHALLENGE_V1` to return PASS
  and a separate ZURIEL human-confirmation phrase, per this assignment's own hard guards.
- The 39 genuinely-absent parents remain unresolved by design; nothing in this pass invents or
  guesses a parent for them.
- No PR description change was made in this pass; pushing to this branch updates PR #636 in place.
