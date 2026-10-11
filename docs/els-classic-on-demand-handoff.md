# Classic matrix: centered context and on-demand expansion

Actor: existing GPT implementation lane. Task: `ELS_CLASSIC_ON_DEMAND_TRUTH_MATRIX_V1`.
Owners: live `els_research_layer_law v9`, `els_single_engine_law`, Experience v9 and Design V2. This document is implementation evidence and handoff, not a new owner or plan store.

## User goal and boundary

User wants Classic opened to the public first, with a quiet default interface and additional controls on demand. Advanced manual research and optional Raziel guidance will later share the same engine and research state. This session implements the first Classic step only. Current user direction takes precedence over the older Research-default planning text; no owner DB record is rewritten here.

Baseline: integrated preview branch `gpt/2029-integrated-preview-20261010`, `cf608516e36f2e31e8c1a6092592c4482e3e6328`. Verified main at task start: `737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`. Includes existing native Classic and reviewed privacy source; main/production and live privacy migration are separate states.

Bounded live `work_log_current` reads confirmed previous ELS core/native writer scopes released. Other active preview work concerns saved-library/context-strip visual presentation; this change does not edit those files or shared Frame/palette. General Supabase connector used for SELECTs only. No operational claim/AFTER row was written and no external Claude dispatch/receipt is claimed. An internal read-only specialist reviewed coordinate parity and cancellation as required by AGENTS.md.

## Behavior

- Native regular searches open a compact centered window. The existing primary discovery and canonical verifier remain unchanged.
- Optional window, typography, heat, vowel, source-highlight and camera controls are under one collapsed “אפשרויות נוספות” disclosure.
- “הרחב את החיפוש” enlarges only the current regular-search window. It does not rediscover the primary term, replace the selected axis, remove secondary terms, or silently change selected occurrence identities.
- “מבט על כל המטריצה” scales the existing indexed cells to fit the width. It triggers no engine request or additional search and is saved in the existing view preferences.
- Historical snapshots without `searchWindow.centerAxis` retain their original row seam. An explicit recenter action preserves their existing dimensions.
- Existing simple-cross window selection continues its original explicit cross-search behavior. The new resize command rejects cross-result states in the engine as well as the UI.

## Coordinate model

The existing `researchGeometry` supports an opt-in unwrapped column interval centered on the axis. `c0` may be negative or `c0+cw` may exceed S; the canonical identity formula remains `index = row*S + column`.

`matrixRC(index,S,c0)` is the shared inverse. Window scanning, worker crossing, mark projection, letter/source lenses, proximity, heat, local diagnostics and statistics consume the same interval. `searchSpace` remains the existing translation-invariant algorithm. Corpus-edge partial rows may have a negative row or an additional terminal row; out-of-corpus cells stay blank. Short skips through 8 retain their existing contiguous reading layout.

Exact occurrence identities and corpus indices never change. Verified-cache reuse uses the final identity after palindrome direction selection and retains only MATCH; failed candidates remain eligible for retry.

**Callable boundary limitation:** the existing SQL geometry RPC requires a nonwrapped column interval. This change does not pass wrapped geometry to that RPC or claim it accepts the new projection. The existing native candidate scanner and canonical occurrence/batch verifier are the execution path. Future server-side wrapped geometry must be handled under the same owner before such a consumer is enabled.

## Resize transaction

Reuse the existing native search request/operation channel, kind `window`, with exact `axisHitId` and request epoch. The last committed snapshot remains exposed while work is pending. The operation snapshots window and words, scans cloned words, retains selected hit keys, verifies new selected candidates, then commits. Cancel/error restores the original window and words; late results cannot overwrite a replacement operation. Geometry-dependent statistics are invalidated on commit. Presentation-only fit/zoom changes reuse the computed findings.

## Golden reproduction

Torah corpus `0b022e8eef6f9c16`, axis `תורתאמתמונתכר`, start 270574 (zero-based), skip 59, forward. Prior read-only server verification confirmed this axis and representative surrounding ELS hits.

Compact centered window: `c0=-20`, `cw=40`, rows 4569–4615. Finds `אנכיתתנ` at 271212/+59 and literal source `אשרנתנלכ` at 271503/+1, both omitted by the old compact columns 0–39. Medium centered window: `c0=-29`, `cw=59`, rows 4559–4625.

“אמת”, “תורת”, “תורתי”, “אנכיתתנ”, “אשר נתן לך”, and “לכם” are the bounded user-requested secondary terms. A source-text sequence remains distinct from verified ELS evidence. No significance conclusion is introduced.

## Verification

New executable tests cover both seams and directions, corpus edges, historical layout, the real-corpus example, exact palindrome verification identity, and short-skip compatibility. Browser tests use the actual React UI and generated canonical engine with isolated host/server verification fixtures; they do not certify production authentication or cloud saving.

Browser scenarios include desktop/mobile disclosure, no-I/O overview, compact findings, expansion with preserved selected hits, wrapped-cell source inspection, private save/reopen in the fixture, cancellation, verification failure/retry, and explicit historical recentering. Validation on 2026-10-11:

- Focused core/bridge suites: 63 passed, zero skipped.
- Full native browser suite: 32/33 passed initially; the shared keyboard icon animation assertion failed once. Its unchanged test passed on focused rerun across all three widths and presets. This is retained as timing-flake evidence, not a product fix claim.
- Final focused browser run: all four scenarios passed (design integration, truth reproduction at 390/1440, and failed/cancelled historical expansion). These include the final overview and MATCH-only cache behavior. The full suite preceded the last overview assertions and cache restriction; it was not rerun in full afterward.
- `npm run build`: legacy and 2029 passed; existing chunk-size/dynamic-import warnings remain.
- System Frame acceptance, canonical progress contract, hard isolation and `git diff --check`: passed.
- Visual review: mobile overview fits 59 columns; small text is intentional for the optional overview. Normal-size reading remains the default.

Local evidence: `/workspace/scratch/classic-final-unit.log`, `classic-browser-full.log`, `classic-final-browser.log`, `classic-final-build.log`, `classic-final-frame.log`, `classic-final-isolation.log`, and `classic-review/truth-classic-{390,1440}.png`.

## Release and next steps

BRANCH ONLY. No main push, merge, live product DB write/migration or production deploy. Release advice: `BUNDLE_WITH` the existing integrated-preview lineage and its unresolved release gates; do not release this patch as proof that the whole platform is public-ready.

Next product step is human review of the Classic example and presentation. Then extend the same workspace with Advanced manual controls; Raziel guidance is an optional consumer of those bounded actions. Entering any profile must not itself start heavy scans or paid model calls. The future modes are not implemented by this patch.

## Handoff status

Actor: GPT. Task: `ELS_CLASSIC_ON_DEMAND_TRUTH_MATRIX_V1`. Owner: ELS research/single-engine with Experience and Design V2. Scope: native Classic window geometry, progressive controls, existing generated engine artifact and regression tests.

PLANNED: complete. IMPLEMENTED: complete. TESTED: bounded checks above. PR_READY: branch prepared for draft review. MERGED: no. LIVE: no.

Branch: `codex/els-classic-on-demand`; review base: `gpt/2029-integrated-preview-20261010`. Commit and draft PR are recorded in the PR metadata/final handoff. Blockers to branch review: none. Public-release gates belong to the integration lineage and remain outside this patch. Open threads: product review of Classic; later Advanced and Raziel profiles; server geometry support if a wrapped-geometry RPC consumer is introduced. Handoff to: user for product review and integration owner for release coordination.
