# ELS matrix reading card integration — 29 October 2026

Status: implemented on an isolated branch; local verification only. No deployment, live model request, live product-DB/RLS change, main change or credit charge.

## Lineage and ownership

- UI base: `gpt/els-unified-matrix-research-20261029` at `679e46c39819a99c7272ed50c58a983c3efb7f4e`.
- Imported reading layer: `claude/els-matrix-fable-reading-20261029` at `82491eb4acbcbec7b9c63b28aeb557ed594a54ed`; common ancestor `63e430113eb5edca7f2ae69eabc9e1c0eeeb70cd`.
- Delivery branch: `gpt/els-fable-card-integration-20261029`.
- The remote UI base and reading head were checked at entry and before delivery. The reading branch contains only its bounded reading layer, tests and ELS documentation; no older cumulative branch was imported. It was merged once, with no overlapping changed paths.
- `work_log_current` read through the dedicated read-only connector. Claude's handoff `5c002306-a1e2-4d43-b1d6-29a702aafff2` closes `ELS_MATRIX_FABLE_READING_RAZIEL_V2_20261029`; the prior preview and reading scopes are closed. Other current assignments are on different exact files.
- Actor: GPT; task: `ELS_MATRIX_FABLE_CARD_INTEGRATION_20261029`; handoff to ZURIEL. This document is the passive local handoff; no work_log write is claimed through a read-only connector.

## Behavior

The existing card below the matrix now calls `session.submitElsMatrixReading` through the existing global session. It displays progress, requests cancellation through `cancelActiveTurn`, and presents the structured reading result from the same session message. It has no model transport, polling loop, new session, storage or ELS search implementation.

The three existing profiles keep their search behavior and share this card. There is no change to the canonical tool, corpus, cross search, private save or zoom. No dictionary or experiment journal is loaded by the card. Entering Classic, Research or Guided does not trigger a model request or wide-lexicon download. Existing explicit Guided discovery retains its existing bounded, lazy lexical inspection.

The UI submits up to 33×41 cells and a cap of 25 proposals, with an explicit $2 acknowledgement. These are experimental limits, not complete coverage or a measured guarantee of recall. The ILS amount shown before a request uses a disclosed assumed 3.70 rate; returned cost uses the server's recorded estimate. Crossing/adjacency is information, not a filter. The card does not claim statistical significance from E or from engine verification.

Both request and result belong to the exact occurrence captured in the session continuation. Selecting another occurrence cannot inherit the old result. Navigating away from the ELS view while the global Provider remains mounted does not start another reading. Returning to the original occurrence displays its existing result.

Incomplete output never displays findings. Test fixtures are labelled as examples. `isLiveFableReading` additionally requires `provider.kind === "anthropic_live"`; a test-double route cannot qualify merely by asserting `live_model_call`.

## Reproduced and fixed defect

The delivered `running-start.json` contains an 886-character signed job token. `normalizeElsMatrixReadingResult` shortened it to the generic 700-character string limit. This invalidated the signature when a returned/interrupted job was later used for status/cancel.

The normalizer now preserves a validated opaque token exactly, up to the existing 6,000-character action limit, and retains `poll_interrupted`. Invalid tokens are dropped. `els-matrix-reading-resume-contract.test.mjs` exercises the actual fixture token. This permits explicit continuation after a polling interruption in the same in-memory session; it does **not** implement reload recovery.

## Activation boundary

`VITE_ELS_MATRIX_READING_MODE` is a build-time UI opt-in: unset/unknown = off, `preview` = coverage/cost only, `on` = explicit paid start. It is not an authorization check; server identity/admin/feature gates remain mandatory. The card is disabled by default so an older server cannot silently interpret the new action as an ordinary model request.

For a separately approved release, the compatible server must be deployed and gated first. Only then may a named Preview build enable the corresponding UI mode. No flags, Preview allow-list, secrets or server deployment were changed here. A build with the UI flag alone is not a valid live acceptance environment.

## Remaining limits before paid/public use

1. Reload/closing the app loses the in-memory job token while the provider batch can continue costing money. Durable recovery and eventual collection/accounting remain unresolved.
2. Global Raziel is busy for the full reading. This is visible in the card; parallel conversation has not been implemented.
3. Saved conversations preserve answer text, not the structured reading and job token. Exact structured-result restore is not implemented.
4. The server has no cross-browser start idempotency. Cost-log deduplication uses read-then-insert; this is not a demonstrated concurrent exactly-once guarantee.
5. Live Fable availability, latency, cancellation and full server deployment were not tested by this integration. Admin-only/no-credit behavior remains the current server design.
6. Restoring additional older advanced Research wizards remains a separate task. This slice integrates the matrix-reading card; it does not claim that every old advanced capability has been restored.

## Verification

- Reading/ELS/Raziel focused set: **107 passed**, no failures/skips (fakes, no live AI).
- Final card/action/presentation/resume/Preview-gate set: **21 passed**. Real React card, global Provider and request builder; explicitly marked fake transport. Checked no call at mount, one explicit turn, cancellation, same session across navigation, occurrence isolation, incomplete suppression, preview-only action, admin/off gates, and zero external requests.
- Card browser geometry: 320, 390 and 1440px in actual `light`, `parchment`, `dark` palettes; distinct palettes asserted; no horizontal document overflow. Local screenshots: `/workspace/els-fable-card-review/` (test examples, not live readings).
- Advanced page browser: **1 passed** (covers mode preservation, explicit Guided planning and cancellable Advanced searches).
- Full `els-native-ui-browser`: **47/47 passed**, no skips, in the final standalone run (382 seconds). The first run, concurrent with browser/build development, had a fixture-Golden-load timeout in the final design test (46/47); that test passed unchanged alone, then the entire file passed standalone. This is recorded as test-run variability, not proof of a particular timeout cause. Includes private/public save, exact no-hit/skip, cross results, optional third term, pinch zoom, all three themes and the added no-wide-lexicon-at-open assertions.
- Broad non-browser ELS plus `src/lib/research/els*.test.js`: **318 tests: 309 passed, 6 failed, 3 skipped**. The six failures reproduce unchanged on a clean worktree at `679e46c39819a99c7272ed50c58a983c3efb7f4e`: same 6 failed assertions across 25 tests (19 passed). They are older direct-Native-render/old-cross-signature assertions in `els-2029-classic-faithful-port`, `els-2029-research-bar`, `els-2029-semantic-surface`, `els-2029-visual-representation`. They were not relaxed or removed. The three skips require local PostgreSQL.
- Session-frame seam: passed.
- `npm run build:legacy` and `npm run build:2029`: passed with the actual installed `natalengine@1.6.0`, no stub.
- `scripts/test-2029-built-graph.mjs`: passed; 412,542 eager gzip bytes (46,200 below the test baseline); Raziel submission and plan remain lazy.
- `scripts/test-2029-isolation.mjs`, `scripts/test-legacy-production-lock.mjs`, `git diff --check`: passed.

Primary integration files: `ElsMatrixReadingCard2029.jsx`, `ElsNativeClassic2029.jsx`, `elsNativeClassic2029.css`, `Els2029Page.jsx`, `elsMatrixReadingPresentation.js`, shared `elsMatrixReadingAction.js` and focused tests. Claude's full imported file list and server contract remain in `els-matrix-fable-reading-raziel-20261029.md`.
