# 3060 — multi-path convergence view (second pilot, branch-only)

Opens from the **existing** World spatial shelf card `3060 — קוביית ישר והתכנסות המחומש` by an explicit click ("פתח המחשת התכנסות"). No new route, model, store, engine or schema. No DB, contract, Edge, `main` or Production change.

## What already existed (and was reused)

| Need | Existing owner |
|---|---|
| The 3060 specimen: 5 operations, quantities with provenance, `independentPaths: 5` | `src/lib/spatialModels.js` (`yesharim-cube-3060`) |
| Renderer-independent derivation layer (no consumer since Legacy removal) | `src/lib/spatialRenderModel.js` — extended with `deriveConvergencePaths` / `evaluateConvergencePaths` |
| Card DTO + shelf | `zviSpatialWorldProjection.js` (+ additive `quantities` field), `WorldKnowledgeTypes2029.jsx` |
| Engine verification | `gematria_method_trace('רגיל', phrase)` + `isVerifiedMethodTrace` (same as the Number page) |
| Letter ledger of each phrase | `SpatialMethodStage2029` (RegularStage) opened inside the view |
| Spatial law | `docs/spatial-gematria-v2-contract.md` (multi-path convergence: each path reproducible before "N paths → V" is shown) |

New: `SpatialConvergenceStage2029` (one stage), `useStepPlayer` (shared motion rules, also used by the ריבוע view), 60 lines of CSS on the existing tokens.

## What the pilot found (this is the point)

- **4 of 5 paths are engine-verified** (ישר 510, ברית 612, טוב 17, השגחה פרטית 1020; all `parity=true`, read live 15.11.2026).
- **The fifth, `765 × 4`, has no phrase** in the model. The view shows it dashed, labelled "אין ביטוי מאומת למספר הזה", and does **not** count it. The headline says "4 מתוך 5 מסלולים אומתו במנוע". This matches the work-log finding that the "four verses = 765" claim only holds for 2 of 4 verses (777 and 771 in the engine) and is one of the open questions for Zvi.
- The multipliers (6, 5, 180, 4, 3) are shown with their declared provenance (cube geometry / source diagram / source claim / source semantic quantity) and labelled as **source quantities, not engine facts**. The multiplication is a declared mathematical operation; the view only checks that the declared result agrees.
- No interpretation appears in the view (the model's `midrash` stays in the card).

## Requirements → status

| | Result |
|---|---|
| Static default | Every path visible, no running animation at rest (`getAnimations()` = 0). |
| Keyboard | Roving tabindex, arrows (RTL), Home/End, prev/next buttons. |
| Reduced motion | Play control removed (OS setting and `data-frame-reduced-motion`). |
| Off-screen pause | Play is user-initiated; stops off-screen / hidden tab; one shared timer. |
| Mobile (320/390 px, 4× CPU) | 134 DOM nodes, ~12 MB heap, frame-gap p95 17 ms, ≤1 frame >50 ms in 3.5 s, all controls ≥44 px, min text 14 px, no overflow/clipping. |
| Layout shift | Inside the view: 0. Opening pushes the card's action row down: 0.034–0.036 (disclosure insertion, reported not hidden). |
| Fail-closed | Tests: missing/mismatched/unverified trace, wrong declared result, loading state, single path (renders nothing). |

## Not done / next gates

- No 3D yet. S4 (lazy, explicit action, S2 fallback) would be a separate step on the existing scene path; this view is S2 (2D).
- Vercel Preview of this commit needs your approval for the exact commit (the branch is already admitted).
- Spatial v3 appendix, `meta.ext.spatial_*` mapping and Zvi's four questions remain ZURIEL decisions.
