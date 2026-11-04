# Ahavat Torah letters — visual workspace checkpoint

## BEFORE · 29 October 2026 · GPT → ZURIEL

- Base: `c6ceb5edafaee3a349842851eea14462b51ef282`.
- Branch: `codex/ahavat-letters-visual-workspace-20261029`.
- ZURIEL explicitly answered “כן” to the scoped request for GPT to design and implement the Ahavat Torah letters cut instead of Claude, Preview only. This is a bounded writer exception, not a global writer-lane, DB-law or contract change.
- Live readonly coordination was checked: no overlapping runtime/visual claim; two historical contract-document claims exclude runtime/UI/data. Reporting remains passive to ZURIEL under coordination v17. This connector cannot create a live BEFORE/AFTER; this document is not a live journal entry.
- EXTEND_EXISTING: Experience Governance v10, user-binding Books spatial addendum 1.1 (branch artifact b352aa39, not imported), Design V2, existing source/unit identities and reader. No separate reader, route, palette, store or engine.
- Intended write scope: existing Ahavat page; one scoped letters presentation component and CSS; letter-mode projection in the existing lazy renderer if needed; dedicated acceptance tests; this receipt. Source datasets, numeric readings, PDF witnesses and prior companion units remain unchanged.
- Product story: choose one of 28 printed letter forms → inspect the five source-book counts → select a book/parasha → open its exact physical PDF page → return to the same reading unit. An optional focused letters view is a presentation state of the same reader. GPU starts only on explicit activation; tables stay useful without it.
- No Legacy, World, Post, SystemFrame, main, DB/RLS/permissions/publication or Production changes. Protected Preview only after gates; no custom-domain assignment.

## AFTER

IMPLEMENTED / LOCALLY TESTED / BRANCH-ONLY. All local acceptance gates have passed. A protected Preview of the exact pushed delivery commit may now be created and independently checked; its final receipt is supplied separately. No integration, Production release or full-book completion is asserted. ZURIEL's review/adoption of this specific visual composition remains the Human Gate.

## Implemented cut

- A focused `study=letters` presentation inside the existing Ahavat reader, with a direct route back to the full book. No new reading surface or reader store.
- Large live Hebrew letter, 28 source forms, five source-book checkpoints, relative-height DOM landscape, explicit source action, book/parasha detail, existing search and export. Finals and shin/sin stay separate.
- Desktop gives the study more room beside the existing PDF. Mobile leads with the study instead of putting the complete PDF panel before it. The PDF and its fullscreen action remain available.
- Exploring in the new landscape keeps the viewport in place. In focused study, letter/book selection updates the original PDF and reading identity without forcing a source scroll; an explicit PDF action still opens the exact page. Other readers retain their existing behavior.
- Rubik/display and Noto/body roles come from existing Design V2 variables; the letter is weight 500, heading 620, rather than heavy display weights. Numeric runs use the existing numeric font; unknown text does not inherit it.
- Royal-blue controls/quantitative marks and violet selected spatial depth consume existing semantic roles in all three presets. Gold remains existing source/brand ornament, not engine verification.
- The existing renderer remains lazy and explicit. Letter-mode materials/background/grid consume active theme roles; other model modes retain their previous materials. The letter scene has a definite responsive height so its legend cannot collapse the canvas to its browser default 150px.
- No automatic orbit or new ambient animation. Existing keyboard-equivalent component/source selection, reduced-motion, fallback, one-scene lifecycle and focus return are preserved.

## Preserved source / scope

Source `book:hebrewbooks:5635`, original 99-page PDF SHA-256 `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`. No changes to `src/data/` or `public/book-data/`: the 267 selected companion units, numeric readings, printed gaps, locators and nine editorial-note identities remain on the base lineage. This cut adds no quotation, calculation, engine result or publication.

The 28 forms × 54 parashot are 1,512 source rows, not 1,512 engine-verified findings. Unresolved source values stay unresolved. This is acceptance of the letters presentation slice, not a claim that the entire book, every sentence, every structure or all 3D models are complete.

The source still has 24 unresolved row values and two unresolved cumulative checkpoints. A missing landscape value is labelled “לא נקרא” and has no numeric column, including no max-height ghost column. It is not replaced by zero or a balancing inference.

## Reproducible acceptance

Runtime implementation checkpoint: `8db4ad619d5fea6b207ce2372ebf2ade9ea87439`. The final delivery commit adds the receipt/screenshots only; its exact SHA/range and protected deployment receipt are supplied to ZURIEL separately, avoiding a self-referential commit identifier or a share credential in this document.

- Full non-browser Books selection: **404/404**, no skips (all matching book/Bentov/Ahavat/Daat/Sefer/Yetzirah/Maamar tests in `test/` and `src/`).
- Language: **3/3**; Integrated Preview Auth Guard: **4/4**.
- Build 2029 normal and two-flag Preview, plus actual `preview-deploy` build: PASS. Each corresponding built graph/weight gate: PASS. No raised budget or relaxed existing assertion.
- Eager gzip bytes: normal **379,579**; actual integrated Preview **377,243**, eight eager / 151 reachable manifest records. Heavy models remain outside the initial graph.
- Legacy Production Lock, source isolation and cheap hardening: PASS.
- Browser preflight: **14/14**, no skips. Includes original letter scene nine-context selection/scale/switch/loss, both reduced-motion sources, no-WebGL fallback and real PDF; count models; other Ahavat source tables; spatial tables/desktop no-overlap; exact unit return and all eight unified readers.
- Final focused matrix: **320/390/1440 × light/parchment/dark** with the actual 99-page PDF; pages **35/36/37**, previous/next, fullscreen, exact row-source return, reload, stable book exploration viewport, glyph/name typography and visible control sizes. Model start/close/focus, live resize, focused GPU-loss fallback and a missing-checkpoint/no-column case are included. PASS in all nine contexts.
- Final fresh browser run: **9/9**, no skips: five count-model tests, the focused nine-context matrix, source-native unit return in nine contexts, the two-book nine-context width matrix and both actual native PDFs. The final source checkpoint is the runtime SHA above; no budgets/assertions were weakened.

## Files, delivery and release of scope

Ten changed paths relative to the base:

1. `src/pages/AhavatTorahSystem2029Page.jsx` — existing reader focus/selection projection.
2. `src/components/books2029/AhavatLetterStudy2029.jsx` — source-count overview.
3. `src/components/books2029/ahavatLetterStudy2029.css` — scoped Design V2 projection.
4. `src/components/books2029/AhavatTorahSpatialScene2029.jsx` — letter-only theme/material binding.
5. `test/ahavat-letter-visual-workspace-2029.test.mjs` — owner/source/style invariants.
6. `test/ahavat-letter-visual-workspace-2029.browser.test.mjs` — focused actual-PDF acceptance.
7. This BEFORE/AFTER receipt.
8–10. Three selected local screenshots under `docs/research-notes/ahavat-letters-visual-20261029/`.

Commit lineage: initial letters presentation; confinement of materials to letter mode; in-place exploration until an explicit source request; nonnumeric missing-value presentation and stronger source/fallback tests; final acceptance receipt/screenshots. No cherry-pick, base replacement or central/main merge.

The final commit/remote comparison, clean-worktree check and protected Preview receipt are reported to ZURIEL at delivery. Local ownership of these ten paths ends at that delivery; no continuing claim or delegated work is left active. The live journal is readonly: **no live AFTER or journal ownership release is claimed**. No GPT-directed report/ACK was sent or requested.

Remaining gaps: 24 source row readings and two cumulative checkpoints are not resolved by this visual cut; the 267 companion units are not a sentence-by-sentence commentary. Other Ahavat structures and other books do not inherit a claim of complete spatial compliance from these tests. Physical devices/Safari and universal model compliance remain untested. No canonical engine ran. No source publication, DB/RLS/permissions, shared frame, Legacy or Production changes were made.

Evidence directory outside Git: `/workspace/artifacts/ahavat-letters-visual-20261029/` (full logs and all 18 focused screenshots). Selected final local captures are committed beside this receipt:

- [Desktop study and native PDF](ahavat-letters-visual-20261029/desktop-source-and-study.png).
- [Mobile study](ahavat-letters-visual-20261029/mobile-study.png).
- [Explicit model and native source](ahavat-letters-visual-20261029/model-and-native-source.png).

## Verification boundaries

Local browser fixtures supply the actual hash-matched PDF bytes but stub authentication/data transport and block remote font requests. Chromium/SwiftShader, viewport sizes and pointer/keyboard events are not physical-device/Safari/touch-hardware acceptance. Hosted verification is separately recorded without request mocks and with TLS verification retained. A screenshot or iframe URL is not substituted for native PDF page geometry.

The canonical site main observed during this cut is `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; the continuation remains on its approved books lineage, with no main integration. Legacy Production was independently observed READY at `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq`, SHA `99249526e91f1d720fae1aa43e82bbbe51ee5c45`, with the three canonical production aliases unchanged.
