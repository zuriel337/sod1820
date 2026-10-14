# Frame demand boundary — CompanionPanel2029 lazy (BRANCH_ONLY)

Base: 5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75 (PR1100). Task key CLAUDE_2029_FRAME_DEMAND_BOUNDARY_20261014.

## Change
- `SystemFrame2029.jsx`: `CompanionPanel2029` static import -> `lazy()`; rendered only inside the existing `companionActive` boolean, wrapped in `CompanionBoundary2029` (error) + `Suspense` (placeholder). `companionPanel2029.css` imported statically in the shell so gutter/capsule CSS is unchanged.
- New `CompanionBoundary2029.jsx` (imports only react): placeholder reuses `sod29-companion is-<mode>` classes and hoverProps (same geometry); on fetch failure shows honest copy + explicit reload button, no auto-reload, main content unaffected.
- `SurfaceContextRail2029`, mobile locator, `EventSequencePanel2029`, Raziel, Number drawer: untouched.

## Measured (npm run build:2029, same toolchain, base vs head)
| file | base raw | head raw | base gz | head gz |
|---|---|---|---|---|
| Sod2029Shell JS | 234,403 | 205,975 (-28,428) | 69,533 | 60,357 (-9,176) |
| CompanionPanel2029 chunk (new, lazy) | - | 26,114 | - | 8,191 |
Shell CSS unchanged (195,938). WorldSourceStory chunk unchanged (52,725): no new common chunk. Shell hash changes -> 2029 entry hash changes. `build:legacy` passes.

## NOT_MEASURED
Seven-sample cold fixtures, real-Chromium load, failure-injection (blocked chunk) retry, three themes phone/desktop visual check. Bundle bytes are not a speed claim. Desktop (>=1560px) still fetches the chunk in parallel after first render; saving applies to phone/narrow paths.

## Not done / gaps
Workspace/account/attention/inspect projections were not moved (not attempted; would need dependency-closure proof).

## Rollback
Revert the single commit.

Tests: `node --test test/frame-demand-boundary-20261014.test.mjs` (static-structure checks, 4 pass).
