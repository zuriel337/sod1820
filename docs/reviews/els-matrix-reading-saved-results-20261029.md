# Matrix reading: explicit saved results and fail-closed resume — 29 October 2026

## Scope and lineage

- Actor: GPT. Task: `ELS_MATRIX_READING_SAVED_RESULTS_20261029`. Handoff: ZURIEL.
- Exact base: `98a716dcecb367230fde5c0e6b6960f8051190f1` on `gpt/els-fable-card-integration-20261029`, verified against origin before writing.
- Isolated branch: `gpt/els-reading-saved-results-20261029`. No old commits imported or re-applied.
- Canonical read-only coordination checked: Claude's `ELS_MATRIX_FABLE_READING_RAZIEL_V2_20261029` AFTER closes the reading-layer scope. Other current writers have nonoverlapping scopes.
- Local passive handoff only; the read-only connector cannot write BEFORE/AFTER. No live work-log write or delivery to another agent is claimed.
- Owner: existing ELS owner and one-engine invariant; saved conversation continues to belong to ResearchProvider. No Provider, SystemFrame, engine, transport, server function, schema, RLS, flag, pricing or deployment changes.

## Reproduced before editing

Two executable tests failed on the base:

1. A completed reading saved through `buildRazielSavedSessionEntity` lost `elsMatrixReading`. Reloading the serialized conversation preserved only its answer text; the matrix card had no result.
2. `buildElsMatrixReadingSubmission({ op: "status", context })` without a job token returned a paid `start` submission. `cancel` had the same fallback. A missing resume credential must not mean permission to create another paid batch.

## Implemented

- The existing lazy saved-conversation serializer now projects the bounded structured result, the exact occurrence context, verification receipts, model notes, coverage, recorded cost/FX and fixture provenance. It uses the same private library item, stable session identity and 180KB UTF-8 limit.
- New pure helper `elsMatrixReadingSavedResult.js` is a serialization whitelist, not a store or an ELS calculation. Opaque job tokens, raw provider output, thinking, raw grids and arbitrary nested fields are excluded. More than 60 findings or mismatched occurrence context fails the save instead of silently dropping evidence.
- Missing/mismatched replay receipts are never upgraded to verified. Ordinary-text findings retain their distinction; incomplete results retain their status and no findings. A restored result is explicitly historical, not a new canonical replay.
- The matrix card exposes **שמור את השיחה והתוצאה** after completion. This invokes only the existing `session.saveCurrentSession`, never automatic persistence or an AI request. Failure is visible. Users restore through the existing saved conversations in Raziel.
- `status`/`cancel` without a valid token, unsupported operations and malformed action options now fail before submission, using the existing shared action validator. No retry or fallback to `start`.
- An explicitly saved interrupted result contains no resume credential. Its restored card explains that tracking cannot be recovered and blocks a new paid start from that card. It is a historical record, not recovery of the underlying provider batch.

## Not solved / not authorized

This closes the **completed structured-result save/restore** gap from the preceding integration. It does **not** close durable recovery of an active job.

- Reload/closing during an active reading can still lose the token while the provider batch continues costing money. Active conversations remain unsaveable, as before. No token was put in a second browser store or cloud-library field to hide this problem.
- Eventual collection/cost accounting, cross-browser idempotency and concurrent duplicate-start prevention still need a bounded server-side design/review before public paid use. This slice changes no server code or DB.
- Global Raziel remains busy during the scan; normal conversation in parallel is not implemented.
- No actual Fable call, secret, enabled feature flag, hosted Preview or Production deployment. Tests use declared fixtures/fakes; they are not model-quality evidence.
- Classic and Research search behavior, optional dictionary loading and the three-mode layout are unchanged. Restoring additional old advanced wizards is still separate work.

## Verification

- Two before-tests failed on the base and pass after the fix (loss of structured result; tokenless resume becoming a paid start).
- Focused reading/ELS/Raziel/Preview-gate/saved-conversation set: **114 passed**, no failures or skips. Final serialization/session checks: **29 passed**.
- Card browser: **1 passed**, actual React card, global Provider and request builder with explicitly marked fake transport and a test-only private-library adapter. Verified explicit save, JSON persistence across Reload, restore without any model request, exact occurrence isolation, token exclusion, no restart of an uncollected saved job, and incomplete suppression. Tested 320/390/1440px and the three real palettes; no horizontal overflow. Screenshots: `/workspace/els-saved-results-review/`; the 320px restored result was visually inspected. These are test examples, not live Fable results.
- Full native browser: **47/47 passed**, 391 seconds. Includes private/public saving, crossed search, exact-skip no-hit, pinch zoom and all three profiles without automatic wide dictionary loading.
- Advanced-page browser: **1 passed**, preserving explicit Guided planning and canonical verification.
- Broad ELS non-browser and ELS library suite, final serial run: **324 tests: 315 passed, 6 failed, 3 PostgreSQL-dependent skips**. The same six failed assertions were reproduced on a clean worktree at the **exact base `98a716d...`** (25 tests, 19 passed/6 failed). They are pre-existing direct-Native-render/old-cross-signature checks in `els-2029-classic-faithful-port`, `els-2029-research-bar`, `els-2029-semantic-surface`, `els-2029-visual-representation`. No expectations were relaxed.
- The initial concurrent broad run had one additional failure in the existing client E2E abort test (`drive` exhausted its 600 mocked-clock steps). Its entire file passed unchanged alone (6/6), and the broad serial run passed that test. This is recorded as test-run variability, not a proven runtime defect or a silently ignored failure.
- `npm run build:legacy` and `npm run build:2029`: **passed**, real installed dependencies, no stubs.
- `scripts/test-2029-built-graph.mjs`: **passed**, eager JS gzip 412,650 bytes (46,092 below baseline). Request builder/Research Plan and saved-conversation serializer remain lazy; the saved-result helper adds no eager dictionary or journal.
- `scripts/test-2029-isolation.mjs`, `scripts/test-legacy-production-lock.mjs` and `git diff --check`: **passed**.

Local logs: `/tmp/els-saved-focused.log`, `/tmp/els-saved-unit-final.log`, `/tmp/els-saved-card-final.log`, `/tmp/els-saved-native-browser.log`, `/tmp/els-saved-advanced-browser.log`, `/tmp/els-saved-broad-final.log`, `/tmp/els-saved-baseline-six.log`, `/tmp/els-saved-built-graph.log`. No remote/live acceptance is inferred from them.

## Changed files

- `src/components/experience2029/ElsMatrixReadingCard2029.jsx`
- `src/lib/research/elsMatrixReadingSession.js`
- `src/lib/research/elsMatrixReadingSavedResult.js` (new pure serialization projection)
- `src/lib/research/razielSavedSession2029.js`
- `test/els-matrix-reading-saved-result.test.mjs` (new)
- `test/els-matrix-reading-session.test.mjs`
- `test/els-matrix-reading-card-browser.test.mjs`
- This review/handoff.
