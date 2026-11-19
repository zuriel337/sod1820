# Research window: first slice, ranking preparation

Owner: Codex → ZURIEL. Branch `ccr-06bc2910-pgarr4`, PR #1397.
Base: `244aa53c4d497f6748bbc73abd88c8417ab3f8a8`.
Scope: existing lazy ELS Research window; no frame/dock owner files changed.

## Capability placement

| Location | Retained capabilities |
| --- | --- |
| Common header | One explicit launch, words / language / both, manual word search, presets and bounds, source-direction filter, coverage and pause/continue |
| Findings | Existing joint engine/Fable list, exact occurrence identities, independent source/type filters, pagination, inspect/add through canonical verification, expandable last-scan report and explicit expansion |
| Structures and groups | Intersections, lines, repetitions, proximity groups, candidate admission, selected/verified structures, comparisons, pair preparation, relationship/split view |
| Depth | Optional Fable, raw language rays/boundary hypotheses, existing axis source/gematria tools |
| Matrix / search form | Row spacing, width/window/zoom, marks, navigation, regular/cross/advanced search and occurrence planner remain in their existing locations |

Opening a tab is not a scan. The same components are used in fullscreen. Classic does not acquire the Research tools. Background term research and session persistence are unchanged. No global toolbar or parallel operation store.

## Ranking foundation (implemented, no matrix score yet)

`elsResearchAssessment.js` is a pure projection loaded through the existing lazy tools. It uses existing occurrence IDs and the existing lexicon context key; it does not persist or start work. It reports unique collected/verified/awaiting-verification occurrences before display filters, verified ELS crossings, and per-run original plan, origin, window and actual ray coverage. Unknown coverage is null, not zero. Old-window runs are excluded. Sampled language coverage stays partial even when all sampled rays finish.

The UI reports collected/verified/awaiting/hidden counts and offers an explainable default investigation order: verified ELS crossings, other verified rows, then candidates; ties use distance, length and stable identity. All previous sort/filter choices remain. AI source does not add priority. This is neither significance nor semantic quality. E remains the existing model-specific expectation, not a probability that an interpretation is true.

`version: 1`, `score: null`, `comparable: false`, `scoreReason: ranking-policy-not-calibrated` explicitly reserve future matrix assessment without inventing weights. This projection is not a durable scan result or a matrix-return snapshot. Future comparison must attach it to the existing immutable operation/return context, align corpus/version, window/row spacing and scan budgets, calibrate the scoring policy and expose partial coverage. No batch scan or automated AI action is implemented here.

## Known boundaries

- Structural discovery groups still use the last completed scanner response. The UI now says so explicitly; the joint list includes both scanners. Combining groups across runs requires preserving each member's admission source/plan; it must not forge a merged response or bypass verification.
- The captured numeric engine skip and row spacing are separate displayed fields. Existing return/session contracts are unchanged.
- No new durable saving, calibrated matrix score or bulk result analysis. These are the next slice after review.
- The prior SHA's CI shell-budget discrepancy remains a separate review item; a local build pass must not be described as CI verification.
- No production change, merge, deployment, database write, feature enablement, paid AI call or engine-limit change.

## Review checks

Run the assessment/joint/structure/discovery/return unit tests; the native browser tests for the three-view window, responsive tools entry, explicit discovery, source filtering, language reader and joint Fable list; then `npm run build`. Browser AI responses are fixtures, not live model calls. Exact final outcomes are recorded in the PR handoff.

## Local final validation

- 23/23 unit tests PASS (assessment, joint discovery, structure inspection, discovery controls, return snapshot).
- 9/9 focused native browser tests PASS: window/header, responsive entry, plans/filtering, language, group admission/cancel, joint Fable, fullscreen, row-gap geometry, axis gematria.
- `npm run build` PASS, including shell budget (eager gzip 203,079 / 203,493 limit). No baseline change.
- `git diff --check` PASS. Mobile screenshot inspected locally.
- Intermediate checks exposed missing waits for the lazy UI to become visible; those waits were corrected. One combined-scan check also timed out during editing/hot reload (cause not isolated); it passed in the final stable-tree run. This does not establish all-suite or CI green status.

## CI isolation follow-up (base af26f802e)

The current PR's Isolation job reproduced locally with the exact repository lockfile and the CI-aligned installed dependencies (Vite 8.3.8, Rolldown 1.2.19): eager gzip **203,749**, limit **203,493**. The earlier local install used Vite 8.3.0 and did not reproduce that failure.

Moved the execution lifecycle from `useElsResearchOperation.js` into the existing dynamically imported `elsBackgroundResearch.js`. The principal-scoped hook still reserves the operation and captures its immutable return snapshot synchronously before import, and owns cancel/clear and principal cleanup. Validation, progress and terminal-state handling now load only on explicit research start. No frame, provider, thresholds, lockfile, engine budgets or features changed.

Same-toolchain build after the change: eager gzip **203,314** (435 bytes less; 179 bytes below the unchanged limit). The existing real-Provider test now delays module loading and switches from matrix A to B before releasing it: one operation starts, retaining A's occurrence and row-gap snapshot. It also checks principal isolation, late responses, cancellation and timeout. Unit checks cover terminal COMPLETE/FAILED and a lost principal before execution.

This is a branch-only correction. No Preview, merge, deployment or database write. CI on the new commit must be reported separately from this local reproduction.

Follow-up local validation: 12/12 background/snapshot unit tests; the real-Provider deferred-import browser test PASS; 3/3 full built-app browser cases PASS (light/parchment/dark, each at 320/390/1440px, including route unmount, return, context reset and cancellation); final `npm run build` and unchanged shell gate PASS. The built-app tests were rerun against a stable artifact after an intermediate run overlapped a rebuild. No server or model calls outside test fixtures.

## Manual word jump and folded-finding retention (base 750e0da8b)

ZURIEL reported two issues while using the protected Preview. “חפש מילה מסוימת” now opens the existing Findings inspector, scrolls the word form into view, and focuses its input. Search receives one 1.6-second outline/pulse; OS or frame reduced-motion uses a static outline. The draft is preserved. No search is submitted by navigation, and fullscreen uses the same form. No frame/dock files changed.

The Columbia regression was reproduced with axis `4545_1_248765`, row gap 2 (layout width 1515): after adding `חללנהל`, adding `להבהתמכ` discarded the first word's selected occurrence. Restoration had removed default-ranked keys from the existing `extra` set. On recomputation, that folded occurrence could not be rediscovered in the native-width window. Explicit saved/admitted keys now remain in `extra`, including those temporarily ranked first. Canonical verification, corpus coordinates, search budgets and explicit hide/count semantics are unchanged; no parallel identity or selection store was added. `public/tzofen.html` is regenerated from the canonical template.

Local checks: 33/33 identity/return/share/parity/core unit tests; 7/7 focused native browser cases (manual jump at 320/360/390/1440px, repeated jump/draft and reduced motion, fullscreen, Columbia exact occurrences through zoom/window/row-gap changes, folded scrolling/return, distant saved findings and 24-word retention); 5/5 engine browser cases (verified-only saving, radius, color/reorder, hide/count and literal-source restoration). The new retention case failed before the engine correction. Final build and current-head CI status are recorded in PR #1397; earlier SHA's green CI is not evidence for this change.

Branch only. Existing protected Preview remains on `750e0da8b`; no new deployment, merge, SQL write, secret/flag or engine-limit change. Coordination readback found the latest relevant Claude assignment `REVIEW_DELIVERED`; this lane's handoff is to ZURIEL in chat because the approved Supabase connection is read-only. Current `origin/main` readback was `42d7375f4` (one CI-installation change after `270bfab6a`); no main/branch merge was performed.

## ZURIEL's default-reader and Royal presentation refinement

The first explicit discovery now defaults to the existing language reader, with its existing 5–16-letter plan. Dictionary words and the combined run remain selectable; engine bounds are unchanged. One launch/settings/progress header precedes the result-view navigation, so the same controls no longer appear to belong to each tab. Findings, relationships/groups and Depth retain their capabilities and gain concise purpose text. Opening any view still starts no work. The existing axis shortcut retains keyboard focus after the lazy navigation mounts.

Research alone opts into `royal2029.css` and the personal area's canonical sapphire/gold roles: a centered Royal header, blue primary action and selected view, and restrained gold lines. Light, Parchment and Dark use existing palette tokens. Classic, matrix mark colors, global frame/dock and personal-area files are untouched. Mobile labels remain short enough to identify the language reader.

The default-reader browser case verifies the initial language selection and the actual language request; dictionary scenarios now explicitly select words. The static explicit-launch assertion was already stale on base `750e0da8b` (it expected `onClick={start}` although the approved combined launch had a ternary); it now checks that existing explicit handler, retaining the no-model/storage/Provider/network checks. Expanded unit set: 46/46 PASS. Responsive screenshots inspected at 320/390px and desktop across the three presets. Final targeted browser/build outcomes and new-SHA CI are recorded separately in PR #1397.
