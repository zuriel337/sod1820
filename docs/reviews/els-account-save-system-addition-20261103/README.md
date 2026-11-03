# Account-only ELS scans and separate system additions

GPT → ZURIEL · task `ELS_ACCOUNT_SCAN_SYSTEM_ADDITION_20261103` · branch review only.

## Scope and baseline

User authorized the first review priorities, emphasized Preview work and a careful future merge, then explicitly required account storage with no persistent computer/browser copy.

Exact accepted product base: `73dc7403670702a4296fbc68d64aaadf00d18c2c` on `gpt/2029-public-url-continuity-20261103`. Original review branch remains frozen at `c8e05790fe68c8f548e22a7c02e5094ddc5b8755`; remote main observed unchanged at `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

Isolated worktree/branch: `gpt/2029-els-scan-save-system-addition-20261103`. It includes the earlier numeric-notation patch `dc50f4164a19a269beb66e3cc754832386cc3ada`, cherry-picked as `d40bef2`. Do not apply PR #1188's patch a second time when assembling this branch. The original Igor branch remains at `35f634ad60d59bdd69dfa1989461d3298ee4db23`. Its two content-only commits are also included in this cumulative branch as `5319eab` and `3d26dab`, preserving all photographs, exact quotes, Rips credit and the requested interpretation. Do not merge the older Igor branch separately into this package.

Relevant active owner rules, canonical schema, `save_els_matrix`/`update_els_matrix`, RLS and recent work_log_current were inspected through the dedicated read-only connector. Existing ownership: ELS/single engine, contributor provenance, publishing conventions and Research OS. No new owner, store, engine, schema, RLS, credentials or model route. The concurrent account/Auth/UserCenter/Number work is not modified. Changes are capability wiring into existing ELS/Post presentation; no frame redesign or shared style change.

## Implemented

- **System addition:** Post2029 renders `posts.ai_addition` separately after the original content. Author label is the system; no verified flag/seal is inferred. Passive markup strips executable/form/embed content, event attributes and unsafe URLs, and hardens media against automatic playback. The original authored body and credit remain separate. The Igor 16/45–45 example is a declared test fixture, not a live published post.
- **Cloud-only scans:** a bounded result, its plan, partial/complete coverage and selected matrix return snapshot are attached to the existing owned private `els_records.positions.lexiconScans`, with a small index. This avoids ResearchProvider's existing local cache entirely. No localStorage/sessionStorage, offline journal or export fallback stores scan content. Account requests use `cache:no-store` and a timeout, retaining the existing SDK authentication and server RLS.
- **Save flow:** save the matrix privately using the existing Save action, run a bounded scan, then choose “שמור סריקה בחשבון”. Server acknowledgement is required before success. An uncertain write can be retried with the same snapshot identity; JSONB key-order differences are supported. Lists/loads are owner-scoped. A saved URL carries record/scan identifiers, never the private result body.
- **Restore:** opening a saved scan loads from the account, restores its plan and candidates, and sends the exact matrix through the existing canonical replay. Saved candidates do not become freshly verified hits; adding them remains disabled until the real current occurrence/window matches.
- **Integrity:** immutable previous snapshots are retained; compare-and-set checks the archive index and existing matrix fields. It avoids placing entire historical archives into a REST filter URL, refuses oversized guards and never silently falls back to an unguarded write. The updated private editor fetches fresh account data and uses the same preservation/CAS guard for an archived owned matrix. Existing unarchived/public workflows retain their RPCs and truth gates.

## Current admission and limits

The live existing `els_records` direct UPDATE policy is `admin_all_els`. This feature therefore admits **verified administrator accounts only in this Preview stage**, with additional owned/private/unpublished restrictions. It does not grant member writes or bypass the public-reading ceiling. A future member rollout needs its own governed existing-writer extension and acceptance; it is not silently enabled here.

A scan is limited to 750,000 bytes and the scanner's existing 300-result bound; a matrix archive is limited to 3,000,000 bytes. The UI describes the 100-record archive listing window. A large matrix guard is refused before writing. Saved results preserve the scanner's actual partial coverage; no exhaustive search or continuation cursor is invented.

**Account-only here applies to scan material in this change.** The wider existing ResearchProvider still has local caches/recovery journals for other features; that shared mechanism is under concurrent personal-continuity ownership. No claim is made that all historical client storage across the application has been removed. Existing unsynced material must be reconciled before any future cleanup. The product-wide account-only requirement remains an integration item for that owner.

## Verification

- 17 focused Node cases pass: exact snapshot/selection/coverage roundtrip, candidate admission, tampered coordinates/identity, bounds and secret-field exclusion; actual SDK request assembly, no-store, ownership/privacy, immutable history, JSONB-order idempotency, conflict/failed write, account change and bounded URLs; existing numeric scanner/corpus regressions.
- 25 existing compatibility cases pass: host bridge, Research return snapshots, language restore, source references and matrix profile switching.
- Controlled browser tests pass: actual React components + actual SDK with a declared test server, account save, opening from the server after a **full page reload**, canonical replay wait, failure without local fallback, passive system addition, unchanged original text. Browser local/session storage access is forbidden in this harness. 1440/390/320 widths have no horizontal overflow and no JS errors.
- `npm run build`: both Legacy and 2029 pass, including the existing one-tree acceptance and Legacy Production lock. Existing large-chunk advisory remains. `git diff --check` passes.
- React review: direct imports, account-scoped state, stale-account guards, bounded lazy loading, explicit operation controls/status, stable snapshot identity and memoized structural grouping. No automatic scan/model/publication.

Reproduce:

```sh
node --test test/els-account-scan.test.mjs test/els-numeric-lexicon.test.mjs
node --test test/els-host-bridge.test.mjs test/els-research-return-snapshot.test.mjs test/els-research-language-restore.test.mjs test/els-reference-presentation.test.mjs test/els-2029-matrix-profile-switch.test.mjs
# Requires Playwright and Chromium installed in the execution environment:
node test/els-account-scan.browser.mjs
npm run build
```

## Merge and activation handoff

1. Review this single cumulative branch against the exact 73dc product base. A real `git merge-tree --write-tree` dry run of implementation `425bac0` versus the older Igor branch found one content conflict in `ElsLexiconResearch2029.jsx` caused by the separately inherited numeric patch. The package resolves this by importing only the two Igor content commits: runtime is byte-identical to tested implementation `425bac0`, and all Igor files are retained. No branch merge or main update was performed. Combine only after resolving the current parallel personal-continuity work; do not replace its Auth/App/transport files with older copies.
2. Preserve the existing numeric patch once, the original Igor content/credit, canonical single engine, public-reading restrictions and Production lock. No new library/store or public-write permission is needed for this admin stage.
3. Build/test the **combined** tree. Test a real owned signed-in administrator account on an exact-SHA protected Preview: private matrix save → scan save → logout/login or second device → restore/add after replay → concurrent editor/archive conflict. Confirm member/public negatives and no persistent material in browser storage/network cache.
4. Old deployed clients that predate archive preservation must not edit the same new archived private matrices during acceptance. This branch cannot retrofit an already running older client. Recheck this at any rollback.
5. Real-account persistence and hosted activation remain **pending**, not passed by fixture tests. No live product data was written, no profile/post created, no deployment or alias changed, no main push or merge performed. This is review-ready implementation, not LIVE.

## Passive BEFORE / AFTER

Actor GPT; report recipient ZURIEL; no agent dispatch. BEFORE: isolated scope and live read-only coordination check; active shared account ownership preserved. AFTER: ELS account adapter/snapshot serialization, existing Research controls and save bridge wiring, separate Post system addition, focused tests and this receipt. Status `IMPLEMENTED / TESTED / DRAFT_PR_READY`; exact commit/PR delivered in the session receipt. Live work_log is not writable through the selected reader; this file is not a claim that a ledger row was inserted.
