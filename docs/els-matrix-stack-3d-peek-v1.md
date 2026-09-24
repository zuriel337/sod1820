# ELS Matrix Stack 3D Peek v1 — Roadmap Patch

Status: BUILT ON BRANCH · NOT MERGED · NOT DEPLOYED · Human-Gate ZURIEL required for merge/release.

## OBJECTIVE
Add a renderer-only 3D Matrix Stack preview inside `/lab/els`: transparent sequential matrix planes that can be stacked in depth or spread side-by-side, with user-controlled plane count, opacity, spacing, focus and plane height.

## LIVE FOUNDATION
- One canonical ELS engine. React does not search/calculate ELS; it projects `elsState().matrix`.
- Research Studio law: 2D / Layered / 3D are projections of the same Research/Finding State; no 3D engine, Matrix truth or Finding store may be created.
- Large-matrix direction is viewport virtualization/lazy rendering, not drawing the entire corpus at once.
- Existing `/lab/els` already owns shared 2D/Layered/3D renderers, `cellSize`, camera/depth/explode controls and Layer Controller extension slots.
- Claude's completed branch fix `1283e86` makes 3D perspective scale with matrix height; this work builds on top of it rather than reimplementing it.

## PEEK v1 — BUILT
`src/components/els/MatrixStack3D.jsx` + wiring in `src/pages/ElsWorkAreaPage.jsx`.

Behavior:
- `🪟 Matrix Stack · הצצה` toggle lives next to the existing 2D/Layered/3D modes.
- Default = 3 visible planes.
- Plane count controls: 1 / 2 / 3 / 5 / 10.
- Layouts: Stack (depth) and Spread (side-by-side).
- Opacity, depth gap, perspective tilt, spread distance and focus-plane are view-state only.
- Shared `cellSize` remains the same Work Area control used by normal renderers.
- `גובה מישור` controls how many sequential rows of the current canonical Matrix Snapshot are placed on each preview plane.
- Peek v1 never duplicates/fakes letters: until a corpus-window adapter exists, each plane is a different sequential row slice of the same current Matrix Snapshot.

## FOUNDATION CLASSIFICATION
### MUST FOUNDATION NOW
- Corpus Space ≠ Finding Layers.
- Renderer state ≠ Finding identity/truth.
- Stable corpus/matrix coordinates remain engine-owned.
- No parallel store/engine/tree.

### EXTENSION POINT NOW
`MatrixStack3D` accepts an optional future `planes[]` input:
`[{ id, rowStart, rows }]`.
A future virtualized corpus-window adapter can provide true adjacent corpus planes (including traversal across the Torah for a skip such as 1820) without changing the renderer contract.

### LATER
- Full corpus-window virtualization / chunk streaming.
- Arbitrary X/Y/Z corpus navigation.
- Cross/Heat/Number-DNA/Evidence/Research-Depth overlays.
- Saved plane comparisons and synchronized 2D↔3D navigation.
- Premium/experience design.

## ROADMAP INSERTION TARGET
Canonical home: `SOD1820_MASTER_ROADMAP.md` → `WS-ELS-WORKAREA` / Research Journey·Matrix·additional ELS layers.

Suggested additive status line (do not erase history):

> **🪟 Matrix Stack 3D Peek v1 (25.8.2026, ZURIEL-approved build):** renderer-only preview over the canonical ELS Matrix Snapshot. Transparent sequential planes; Stack/Spread; 1/2/3/5/10 visible-plane control; opacity/focus/gap; shared matrix cell sizing; per-plane row-window control. No ELS-engine/DB/Finding-identity/store changes. Current branch `gpt/els-matrix-stack-peek-v1`; build/release state must be updated separately after CI/Human-Gate. Future extension point: virtualized corpus-window `planes[]` for true whole-corpus depth navigation. **Foundation → Projection → Experience.**

## DO NOT CONFUSE
This is not the final “Layers of the Cipher” strategy. It is Projection infrastructure + a real visual peek. Future semantic overlays remain separate from corpus planes.

## RELEASE GATE
Before merge:
1. Rebase/reconcile against current `origin/main` (branch base includes Claude 3D fix and may trail unrelated main commits).
2. `npm run build` / CI green.
3. Browser check with a real ELS Finding in 2D, normal 3D and Matrix Stack.
4. Confirm no ELS engine files, DB schema, `els_records`, Finding identity or persistence changed.
5. Add the Roadmap line above canonically without removing/superseding unrelated history.
6. Merge/deploy only after explicit ZURIEL `תעלה` approval.
