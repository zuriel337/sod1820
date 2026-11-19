# ELS return continuity — first implementation slice, 19 November 2026

Branch: `ccr-06bc2910-pgarr4`, PR #1397. Base: `30a6cc82114404ff087e99b1eabf5abcff7081a7`.
Scope: research/session return metadata. No SystemFrame/SystemToolDock files, engine limits, AI requests, feature flags, SQL writes, deployment or merge.

## Authority and coordination readback

Read-only `work_log_current`: latest ELS review `ELS_PR1397_REVIEW_8814_20261118` is REVIEW_DELIVERED; earlier ELS BEFORE records have later AFTER/handoff records. User assigned the research/continuity lane here and frame ownership to the speed session. No journal write performed.
Read document 37 (`project_codex.id=37`, updated 2026-11-13): ENTITY_ELS_FINDING, SURFACE_ELS, SURFACE_HEICHAL, HEICHAL-RAZIEL-CHANNEL-PARITY-20261020. These require source identity, existing research owners, explicit bounded computation and return context. Their historical implementation statuses do not establish live deployment.

## Implemented

- Existing `captureElsResearchReturn` accepts a bounded row-spacing projection: width, rowGap, r0/r1, c0/c1. Width × (rowGap + 1) must equal the occurrence skip; the skip and occurrence identity remain unchanged. Only existing supported limits are accepted.
- The existing principal-scoped `useElsResearchOperation` observes the displayed projection, attaches it to the same source axis/corpus, and freezes it when a task starts. Later matrix state cannot rewrite that task's snapshot.
- `elsResearchReturnLoad` and `ElsFoldedMatrix2029` restore the projection through the existing canonical load and matrix-window lens. A return nonce supports explicit repeated returns to the same occurrence.
- Explicit Fable start captures return metadata on the existing session turn; it is not sent in the model request or server action. Completion preserves it on the response. Status/cancel reuse the original job's snapshot when available, never the current page's view. Recover without that snapshot falls back to occurrence-only return.
- Explicit saved Raziel sessions serialize this metadata through the existing bounded private library projection, with no tokens and no new storage. Old records remain readable. Opening a saved result starts no AI work.
- Existing activity copy distinguishes occurrence-only return and discloses separately that the engine revalidates a reopened occurrence.

## Interface for the speed session

Keep `SystemToolDock2029` as the single action registration seam. Existing ELS actions remain findings/results/research (scan/results/save). Do not move operation ownership into the dock.

Sources for activity projection:

| Kind | Owner / reference | Real progress | Cancellation / return |
|---|---|---|---|
| Engine search/verification/local discovery | current engine request / load / scan identity | engine-reported phase/counts/coverage | per-operation cancellation; no route-unmount continuation promise |
| Background terms | `ResearchProvider.elsResearchOperation.task.id` | `rows.length / plan.terms.length`, page coverage separately | `cancel()` stops client/future requests; server may finish an existing request. Return through `elsResearchReturnTaskId` |
| Fable | existing Raziel turn id and `selectElsMatrixReadingActivity` | reported elapsed time/phase, no invented percentage | explicit provider cancel is distinct from stopping polling. Return through `elsReadingReturnTurnId` |

A frame-facing projection should carry id, kind, name, immutable origin, execution status, tracking status, phase, startedAt if known, real progress if known, requestCancel and return/open-result actions. This unified display shape remains a specification: no new registry/store/provider was added.

Treat cancel requested, confirmed local cancellation, server cancellation, tracking stopped, partial coverage and complete as distinct facts. Do not label a running provider job cancelled because its browser tracking ended. Complete means the bounded requested work, not exhaustive corpus coverage.

The frame must resolve return references against the current principal's existing task/session, never against the currently displayed matrix. A missing source snapshot must produce a limited-return disclosure, not a fresh AI scan.

## Persistence and remaining gaps

- Background term tasks remain temporary in the current tab; refresh/tab closure does not resume them. Saved findings are a separate existing persistence capability.
- Fable provider jobs can outlive browser polling. Status/recover remain explicit existing operations; no automatic resumption or paid start was added.
- Saved Fable views require an explicit successful save of the existing conversation. Old saved records only restore the occurrence.
- Matrix drag/scroll pixel offset, verse selection, and fullscreen are not captured. Row-spacing return restores the bounded letter window, not identical screen pixels.
- Fable still cannot read the folded projection. The saved viewing context does not claim to be the server's reading coverage; the response's coverage remains authoritative.
- Heichal still has no embedded ELS matrix. Matrix activation there should register the existing ELS tools while retaining research/finding identities; other surfaces expose their own tools. No Heichal renderer or route was added.

## Verification

- Focused unit/session/transport/save/return suite: 77 passing on the final tree.
- Native browser: 3 passing (normal exact return; row-spacing discovery; Columbia 4545 gap-2 A→B→A with preserved width, row/column start, findings and occurrence skip).
- Real ResearchProvider browser with mocked auth/transport: source A remains attached after displayed B; double-start reservation, late-response rejection, cancellation, timeout and principal isolation pass.
- `npm run build` and shell budget PASS on the final tree. No baseline raised.
- No live Fable/model calls, production browser acceptance or true touch-device acceptance performed. CI must be evaluated for the eventual commit; local passing tests are not CI status.

## Saved-return compatibility and recovery (base `7e2d1b2e2`)

First bounded implementation after ZURIEL's foundation review: the existing saved
Raziel/Fable conversation now supports the engine's `legacy` window designation,
alongside small/medium/large. This is a saved-window format, not the retired Legacy
product. Explicit save/reload retains the original occurrence, corpus, selected
findings and source marks, zoom, window parameters and supported row-spacing view.

Opening an existing saved conversation tolerates malformed optional return metadata:
it retains the valid structured reading and falls back to the original occurrence
only. The existing activity view then discloses the limited return. New saves remain
strict; invalid reading identity/corpus is still rejected on both save and read.
Malformed axes are contained by the copy boundary, inconsistent hitId/coordinates
cannot redirect the return, and an invalid row-spacing projection cannot claim a
complete saved view. No automatic AI start, status request or storage rewrite occurs
when opening the saved result. An explicit later save can persist the recovered form.

Validation on the final source tree: 56/56 focused unit tests and 2/2 browser cases
PASS. The regression tests failed before the fix. Browser coverage uses the real
session/request/save/restore path with declared model/library/auth/engine fixtures:
legacy-window save → reload → restore, other-occurrence isolation, damaged snapshot
recovery, cancellation, and no implicit model request. `npm run build` and the
unchanged shell budget PASS (eager gzip 203,308 / 203,493; 18 files).

This fixes the two reproduced saved-return gaps; it does not add durable discovery
runs, background-task resumption after reload, cumulative structure groups, folded
Fable input, or the Heichal matrix. Those remain subsequent feature slices. No
frame/dock, engine, SQL, secret/flag or Edge Function changes. No new Preview, merge
or Production deployment; the existing Preview remains on `7e2d1b2e2`. CI for the new
commit is tracked separately in PR #1397. Handoff is to ZURIEL in chat; the approved
read-only database connection cannot write a work-log record.
