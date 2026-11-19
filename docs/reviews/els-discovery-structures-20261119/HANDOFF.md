# Compatible discovery sources and cumulative structures

Branch `ccr-06bc2910-pgarr4`, PR #1397. Base `e9757a6835e158d511119b7235c07903c1d6c32b`.
Actor GPT; owner: existing ELS / Research Workspace contracts; task `ELS_DISCOVERY_STRUCTURE_SOURCES_20261119`; handoff to ZURIEL.
Branch-only scope. No merge, Preview, deployment, SQL writes, secret/flag changes, engine-limit changes or frame/dock edits.

## Ownership and baseline

Read `CLAUDE.md` §0, `AGENTS.md`, the relevant Owner Index entries and the prior [continuity/document-37 mapping](../els-research-continuity-20261119/HANDOFF.md).
Fresh fetch: branch base above; `origin/main` was `42d7375f4b01283ea1f09a79d15084d71c3b1237`.
The authorized SQL path reports `supabase_read_only_user` and `transaction_read_only=on`.
The relevant live journal's latest ELS claims are delivered reviews/AFTER/handoff records. The latest records for the earlier native-owner and words scopes supersede their BEFORE entries. No overlapping active writer was identified. No journal write or agent dispatch occurred.

## Implemented

- The existing in-page `runs` remains the source, with the last completed word run, last completed language run, and saved runs explicitly attached from the existing private library. Attaching a saved language run no longer replaces the live language run or another saved run.
- Eligibility requires the same current context key, canonical axis identity, scope/corpus version, width and exact row/column bounds. Merely sharing coordinates or a typed label is insufficient. Different row spacing/window/corpus cannot silently contribute.
- A saved copy and a later continuation of the **same operation id** count once; the latest completed segment is used. Distinct operations remain distinct sources even if their findings overlap.
- Deduplicate candidates by the existing corpus-aware occurrence id. Retain original per-source item/result references and proposed segmentation. Each group exposes contributing sources, and each member exposes source ids. Repeated occurrences are explicitly not independent confirmations.
- The geometric grouper is unchanged in its thresholds and budgets: at most 300 selected candidates and 240 displayed groups, using the existing member limits and presentation hierarchy. The UI reports unique/duplicate/invalid/filtered counts and how many candidates did not participate in the bounded structural analysis. The source runs and joint list retain those candidates.
- Users can include/exclude sources for structural analysis. This changes presentation only: no rescan, AI request, library write or deletion from the joint list. Coverage is shown for each source; overlapping percentages are not added and partial coverage remains partial. The group member threshold is the lowest declared threshold among selected sources, explicitly labelled.
- Group admission builds **one atomic existing findings update**, validating each member against its own original result. It preserves all explicit occurrence keys, combines repeated words, respects the existing 24-word limit and waits for the canonical engine before opening the relationship. No new verification authority.
- Provenance remains visible when a candidate group becomes a verified marked group. Existing manual/saved source marks, Classic, inspection/comparison, split views, gematria and Fable controls remain available.

## Persistence and connection boundary

No combined-result store was added. Individual explicit saves still use `ResearchProvider.saveItem`; attached runs and source-selection choices are temporary in the current research tools instance. After a reload, reopen the individual saved runs and explicitly attach those needed. There is no claim that a combined group/selection has itself been saved.

The current and saved run contracts from [saved discovery](../els-saved-discovery-20261119/HANDOFF.md) are unchanged. This slice consumes their source, timing, coverage and provenance. It does not save raw language experiments or resume engine cursors. Exact-return limitations remain as documented there.

The frame owner can continue using the existing `SystemToolDock2029` registration and research owners. No toolbar/provider/registry was added. A later authorized Raziel/Heichal connection should carry selected existing-library references and per-source context/coverage, never one invented merged coverage percentage or matrix-quality score.

Fable was not invoked or expanded. Its proposals may participate in existing marked-occurrence inspection after explicit canonical admission, as before. Sending deterministic seeds to Fable remains a separately authorized server/frontend step. Heichal embedding, calibrated scoring/batch research and the 3D product flow remain later slices.

## CI correction from the preceding slice

On `e9757a683`, eight workflows passed and Live Contracts failed. Its static ELS seed contract evaluates the page's actual seed expression using `new Function`; the test omitted the newly added `discoveryId` argument, causing `ReferenceError` before assertions. The app route was already covered by the built-app saved-discovery test.

The contract test now supplies that argument and exercises all **64** combinations of saved/shared/returned/discovery inputs (previously 32), keeping every previous assertion. Local Live Contracts: 6/6 passed. No product behavior, guard, budget or required-check setting was weakened to fix this failure.

## Acceptance evidence

- Pure projection tests: cross-run groups, canonical dedup/provenance, no summed coverage/score, explicit source selection, rejection of stale/mismatched contexts, saved copies/latest segment, additive same-mode saved sources, atomic admission, 24-word refusal, multiple occurrences per word, invalid positions, unchanged 300/240 budgets with visible exclusions and original candidates retained.
- Browser fixture: real research panel + existing library reducer; word/language union, source checkbox isolation from joint results, one group admission, wait for verification, retained provenance, save/attach same-id dedup, additive later run, repeated attach idempotence, corpus switch and mobile widths. All network/engine responses in this harness are fixtures.
- Native browser: actual engine/corpus discovery and existing host verification oracle, including combined word/language sources without a third scan, optional Fable joint list, Classic preservation and Columbia folded-window behavior.
- Final local results: **51/51** focused unit/static contracts, **6/6** native engine browser cases, and **3/3** final panel/built-app browser cases, all with zero skips. Browser harnesses ran serially; the final built-app checks used the new build. `npm run build` and `git diff --check` passed. Shell budget: **203,292 / 203,493** eager gzip bytes, **18** eager files; limits unchanged.
- The last admission recheck (rejecting a mutated receipt) and checkbox event/style adjustment were covered by the final unit, build and panel runs; the native engine suite passed before those small changes. New-head CI is recorded separately in PR #1397 and the delivery message; local success does not establish CI success.

Production was not changed. The existing protected Preview remains on `7e2d1b2e2`; these branch changes are not in that Preview.
