# SOD1820 — W0.5 Visual Foundation 2027 · FINAL CLOSURE

Date: 2026-09-09

Status: **CLOSED · MERGED · DEPLOYED · PRODUCTION LIVE · VERIFIED**

OWNER CHECK: `EXTEND_EXISTING` under `SOD1820_DESIGN_CONTRACT_V1.md` and the existing visual/spatial/accessibility owners. No parallel design system, palette owner, spatial system, accessibility registry, bidi engine or release system was created.

## Release lineage

- W0.5 primary implementation: PR #396 → merge `1860e9d264d2e69a5786cf08920e42ad2994b69c`
- closure reconciliation: PR #405 → merge `49fd3597b2e4dc55174b0be47123e16fb8cd250c`
- canonical spatial owner: `spatial_gematria_law v4`
- Production verified on `sod1820.co.il` / `www.sod1820.co.il`

## Closure evidence

The automated Release Visual Gate passed the final **11/11** browser acceptance set against the PR merge ref on current `main`:

1. 320px dark — no horizontal overflow, interactive/focusable
2. 360px dark — no horizontal overflow, interactive/focusable
3. 390px dark — no horizontal overflow, interactive/focusable
4. 1440px desktop — no horizontal overflow, interactive/focusable
5. light projection at 390px
6. research-lab projection at 390px
7. `prefers-reduced-motion`
8. Gallery `FIT_WHOLE_IMAGE` for landscape/portrait/legacy-gematria ratios across 320/360/390/1440
9. shared `focus-visible` baseline in dark/light/lab
10. 200% text sizing + long Hebrew label at 320px without horizontal overflow
11. mixed RTL Hebrew + LTR URL/code evidence at 320px without direction/overflow breakage

The Observability/SEO Build Gate also passed.

## Final reconciliation decisions

- New/redesigned surfaces use `TYPE_SCALE.body = 16px`; legacy `T` aliases in `src/theme.js` remain compatibility-only and are not destructively rewritten.
- `palette.js` remains the semantic color owner. Dark/light/lab primary text/control roles are retained; focus color is provided by the shared Visual Foundation baseline rather than a second palette.
- Shared `focus-visible` is mandatory and local CSS may enrich but may not remove it.
- `.sod-bidi-evidence` + explicit LTR islands provide the bounded bidi baseline for Hebrew research surfaces.
- Visual asset generation/upload remains owned by creation/publishing/media workflows. W0.5 owns only the presentation requirement, canonical fallback and truth boundary.
- Spatial rendering stays progressive under v4: lowest sufficient tier wins; Living Doorway is a bounded destination-owned preview projection; depth never implies truth.

## Closure verdict

All decision-changing W0.5 foundation gates are satisfied. Remaining future work is **projection/experience implementation**, not missing Visual Foundation law.

**W0.5 = CLOSED.**

## Handoff

**NEXT ACTIVE ROADMAP STAGE = W1 — Adaptive Shell + Research Context.**

W1 must consume this foundation and existing owners. It must not create parallel navigation/context/Raziel/workspace systems.

W1 target capabilities:

- persistent orientation header / current focus
- Research Context Spine and exact return/reopen continuity
- adaptive navigation / command surface
- Raziel companion slot
- My Workspace entry/state
- contextual inspector
- responsive + keyboard/list/mobile alternatives
- language/access-ready structure
- honest unknown/inaccessible/deprecated terminal states

Foundation → Projection → Experience.
