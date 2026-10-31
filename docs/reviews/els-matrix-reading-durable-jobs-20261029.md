# ELS matrix reading: durable recovery and duplicate-start safety

## Scope and lineage

- Actor: GPT; task `ELS_MATRIX_READING_DURABLE_JOBS_20261029`; handoff to ZURIEL.
- Base: `e10553963a7d10b6f3ba98fd1aa895b25cd07505`, verified against origin `gpt/els-reading-saved-results-20261029` before writing.
- Branch: `gpt/els-reading-durable-jobs-20261029`. No old branch imports/cherry-picks; no main/merge/deploy.
- The user explicitly approved the technical durable-job design, including a local migration and tests. This is NOT authorization to apply it to a live database or enable the paid feature.
- Live read-only coordination checked before writing and before delivery: the latest relevant Claude AFTER releases `ELS_MATRIX_FABLE_READING_RAZIEL_V2_20261029`. No overlapping active reading-layer writer found. The connector cannot write BEFORE/AFTER; this document is the passive handoff, not a claimed live work-log row.
- Independent security review and nonoverlapping SQL implementation were performed by Codex subagents. No external Claude session was invoked.
- Supabase skill guidance informed the server-only ACL/RLS, bounded indexes and real isolated PostgreSQL testing. No live product-data writes, keys, model calls or deployments were used.

## Reproduced cause on the base

The prior implementation kept the signed batch handle only in client memory. A second identical `start` sent a second provider POST. When the provider accepted a batch but the response was lost, the code returned `batch_create_failed`, no handle and zero spend. Neither browser storage nor saved chat text can make a provider POST idempotent across tabs or recover an ambiguously accepted request safely.

## Implemented

One private **technical job receipt** under the existing `ai-analyze` owner, not a new research store, chat, Provider, transport, ELS engine, server function or worker:

1. The existing explicit submit creates a UUID request ID. Before sending any paid request, the server atomically claims owner + exact occurrence/corpus and the request hash.
2. One winning claim permits at most one automatic provider POST. Repeated request IDs and concurrent tabs reuse the receipt. Changing the parameters of a reused request ID is refused. An active occurrence cannot be restarted with a new UUID.
3. The provider custom ID is an opaque job UUID, without identity or story. The measured prompt/request hash is unchanged. The batch ID and trusted metadata are stored server-side; the browser receives a non-secret job ID, never a new signed job token.
4. Explicit **חזור לסריקה האחרונה של המופע** finds this authenticated owner's exact occurrence. It collects through the existing `askRaziel`/`ai-analyze` poll route. Reload, render, mode change and restoring a saved conversation do not run a model or automatically resume polling.
5. Terminal results are bounded and cached with canonical axis/corpus, verification receipts, coverage, provenance and cost. Reopening a cached result does not call the provider or re-verify the engine; it is labelled as a return to an existing scan.
6. Cost insertion into the existing `ai_token_log` and the job receipt are one locked transaction. Concurrent collection writes one cost row; only the winning collector emits the model-cost trace. Its optional existing trace/span link is attached idempotently afterward. No audit schema, credits, quotas or pricing changes.
7. Lost/malformed provider responses, failed attachment and DB outages do not become permission to pay again. UNKNOWN is never automatically unlocked, even after a timeout. Unknown cost is `null`, not zero. Malformed provider result types/statuses stay retryable and locked, not terminal failures that free a new start.
8. Provider requests refuse redirects. The result endpoint must be the canonical Anthropic HTTPS batch endpoint before a credential-bearing fetch.

Existing explicit saved conversations may retain the opaque job ID, but never a signed token or raw model/request/grid payload. Legacy saved interrupted records with no durable ID remain locked against duplicate starts. Registered signed-token clients may locate their durable job; unregistered legacy tokens fail closed and cannot bypass accounting.

## Database boundary

Migration: `supabase/migrations/20261029125427_els_matrix_reading_durable_jobs.sql`.

- One table with bounded snapshot/payload/result and a unique owner/request key.
- Partial unique active owner/scope index, plus latest-exact-scope index.
- RLS on; no client policies or table grants. Six RPCs are `SECURITY INVOKER`, empty fixed search path, PUBLIC/anon/authenticated execution revoked, service-only execution. No client-supplied owner is trusted by the handler.
- Owner, batch, request, exact axis and corpus are bound on claim/attach/get/finish. Terminal state and result are first-write-wins; cost receipt replay rejects conflicting model/token counts.
- No automatic dispatch lease, scheduler, conversation table, changes to existing RLS, or live migration application.

## Preserved

Classic search, optional dictionaries, the three-mode layout, native research, legacy generated HTML, ResearchProvider, RazielSessionProvider2029 and SystemFrame are unchanged. No automatic dictionary/journal load. The existing global session remains the only conversation. The only `ai-analyze` entrypoint change is recognizing `recover` as a stored-job operation; all existing availability/admin/JWT gates remain.

## Honest remaining limits

- This is **at-most-one automatic dispatch**, not a claim of exactly-once delivery across the database and Anthropic.
- A crash after claim but before dispatch can leave an UNKNOWN job even if no spend occurred. An accepted provider POST whose handle never arrives requires explicit reconciliation (the opaque provider custom ID can assist); no automatic listing/reconciliation worker was added. The card explains the block.
- No scheduler: collection, cost logging and terminal caching happen when the user explicitly returns. If nobody returns before the provider's retention deadline, this slice cannot guarantee collection. Retention/reconciliation policy remains a release prerequisite for broad paid use.
- Turning the feature off, removing admin access or losing the provider credential also blocks collection through the existing gates. Do not disable a live rollout with outstanding work without a reconciliation plan.
- The global Raziel session is busy while following a scan; parallel ordinary conversation is not implemented.
- The new migration is tested against isolated PostgreSQL 17.6 matching the observed server version, with a narrowly modelled existing schema. It has NOT been applied to a full isolated Supabase branch or production.
- Admin-only, no credit charge, default OFF, existing experimental cap/window remain. No claim of improved discovery quality, meaning or statistical significance. Every model/engine network response used in these tests is a declared fixture.

## Verification and release

- Before/after reproduction at the exact base in a clean detached worktree: two identical starts produced **2 provider POSTs**; an accepted POST with lost response reported **zero spend and no job**. Current failure/concurrency tests produce one POST, retain the durable receipt and report unknown cost honestly. Logs: `/tmp/els-durable-before-proof.log`, `/tmp/els-durable-after-proof.log` (32/32 passed).
- Focused matrix-reading suite: **110/110 passed, zero skipped**, including real PostgreSQL tests and real handler/client tests with declared model/engine fixtures.
- PostgreSQL 17.6 suite: **13/13** (real RLS/ACL, 12-way races, rollback, owner/corpus, immutable terminal results and cost/trace receipts). Full server-operation → repository payloads → real PostgreSQL integration: **1/1**, including lost attach response and 12 concurrent recoveries. No remote database URL or credential is accepted by the test harness.
- Existing Raziel saved-session, session, lazy loader, Preview gate and ELS consumer/context: **52/52**. Additional `ai-analyze` early-trace/numeric-guard regressions: **2/2**.
- Full native browser: **47/47**, 383 seconds, including Classic private/public saves, exact skip/no-hit, connected crossings, pinch zoom, Guided and deferred research loading.
- Card and advanced-page browser: **2/2**. Actual card/global Provider/request builder, test-only transport/library fixtures; explicit resume/recovery after Reload, no AI on load/restore/selection, same conversation, exact occurrence isolation, legacy token exclusion, incomplete results hidden, 320/390/1440px and three real palettes without horizontal overflow. Screenshots `/workspace/els-durable-reading-review/`; the 320px saved result was visually inspected.
- Broad ELS + ELS library run: **354 tests, 345 passed, 6 failed, 3 skipped**. All six failures were reproduced unchanged on the exact base `e105539...` in a clean worktree (25 tests, 19 passed/6 failed): three Classic wrapper checks and one each in research-bar, semantic-surface and visual-representation. They still expect the old direct Native render/cross signature. The three skipped old executable tests require their own local PostgreSQL setup; the new durable-job SQL tests did NOT skip. No baseline assertion was relaxed.
- `npm run build:legacy` and `npm run build:2029`: **passed**, actual dependencies, no stubs. Existing chunk/dynamic-import warnings remain.
- Built dependency graph/lazy budget: **passed**, eager JS gzip **412,899 bytes**, 45,843 below the gate baseline (249 bytes above this task's base). Existing request adapter/Research Plan remain lazy.
- 2029 isolation, Legacy Production lock and `git diff --check`: **passed**.

Local evidence is in `/tmp/els-durable-*.log`; none is hosted Preview acceptance or live Fable evidence. Packaging must run from committed sources; its final provenance is supplied with the handoff.

Release order, only after separate exact-SHA authorization: validate/apply the migration in an appropriate isolated environment; deploy the committed/provenance-checked existing `ai-analyze`; deploy the 2029 client Preview; enable its existing admin-only flag; perform one explicitly budgeted live scan and reload/recovery acceptance. Do not enable the new client against the old server/missing migration. No Production cutover or domain changes are part of this slice.

## Changed files

Product/runtime (11 files):

- `src/components/experience2029/ElsMatrixReadingCard2029.jsx`
- `src/lib/research/elsMatrixReadingPresentation.js`
- `src/lib/research/elsMatrixReadingSavedResult.js`
- `src/lib/research/elsMatrixReadingSession.js`
- `src/lib/research/elsMatrixReadingTransport.js`
- `src/lib/research/razielSession2029.js`
- `supabase/functions/_shared/elsMatrixReading.js`
- `supabase/functions/_shared/elsMatrixReadingAction.js`
- `supabase/functions/_shared/elsMatrixReadingJobs.js` (new)
- `supabase/functions/ai-analyze/index.ts`
- `supabase/migrations/20261029125427_els_matrix_reading_durable_jobs.sql` (new, unapplied)

Tests/evidence (22 files):

- `test/els-matrix-reading-{card-browser,card-examples,client-e2e,engine,operation,raziel-route,resume-contract,session}.test.mjs`
- `test/els-matrix-reading-durable.test.mjs` (new)
- `test/els-matrix-reading-durable-jobs-sql.test.mjs` (new)
- `test/els-matrix-reading-durable-postgres-integration.test.mjs` (new)
- `test/helpers/els-matrix-reading-card-examples.mjs`
- `test/helpers/els-matrix-reading-world.mjs`
- `test/helpers/els-matrix-reading-durable-jobs-local-pg.mjs` (new)
- `test/fixtures/els-matrix-reading-durable-jobs-bootstrap.sql` (new)
- Seven regenerated card examples in `test/fixtures/els-matrix-reading/card-examples/`: running-start, running-poll, session-progress, complete, incomplete-max-tokens, failed-batch-errored, cancel-requested.
- This review/handoff (34 files total).
