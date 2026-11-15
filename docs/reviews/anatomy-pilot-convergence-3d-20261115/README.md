# 3060 — S4 (3D) for the convergence view (third step, branch-only)

An explicit "תלת־ממד" action inside the existing convergence view (which itself opens from the World spatial card). No new route, scene contract, engine, model or DB. The Spatial v3 appendix (law v14, §14.5) is the rule it follows: 3D is a **derived display state** — it carries no semantics, upgrades no verification and counts nothing of its own.

## What it is

- `ConvergenceScene3D2029` — one lazy chunk (6.9 kB raw / 2.9 kB gz; it shares the existing `MistaterScene3D2029` + three/R3F chunks). Never in the default bundle; no request for any 3D module happens before the click (browser-verified).
- Every shown value (phrase, operand, quantity, result, status) arrives from the same `evaluateConvergencePaths` result the 2D view uses. The renderer fetches nothing and computes nothing (test-enforced).
- Placement is a pure module (`lib/spatial/convergenceLayout3D.js`): a shallow fan of path slabs (index 0 on the right, RTL reading order) whose tubes descend to ONE apex (the value). Camera distance is aspect-fitted (`fitCameraDistance`), so the whole fan fits a phone-portrait box and a wide desktop box.
- Letters are the same 27 path-only Hebrew glyph SVGs as M3, extruded. The unverified path (765 × 4) is dimmed, dash-marked "—", grey connector, and is **not** in the 4/5 count — the sr-only list carries its status text.
- Shared S4 toolkit reused, not copied: token colors, text texture, glyph geometry and orbit controls are exported from `MistaterScene3D2029`; the error boundary and fallback notes from `SpatialMethodStage2029`; capability gate `evaluateS4Capability`.

## Behaviour (browser-verified, software WebGL)

| Requirement | Result |
|---|---|
| Lazy / explicit action | 3D chunk requested only after the click; default view stays S2 (SSR test: no canvas). |
| Same data, same controls | Prev/next/play/ledger of the 2D view keep working over the canvas; clicking a slab in the canvas selects its path (5 clicks → 5 different paths). |
| Return | "חזרה לתצוגה דו־ממדית" restores the 2D funnel. |
| No WebGL | Truthful fallback note, stays S2, no canvas. |
| Context loss | Real `WEBGL_lose_context` → falls back to S2 with the note. |
| Reduced motion | OS setting → `data-reduced-motion="true"`, no inertia, play control removed. |
| Demand rendering | `frameloop="demand"`; no animation loop, no autorotate (test-enforced); DPR capped at 2; low-power GPU preference. |
| Mobile 320/390 px, 4× CPU, SwiftShader | one canvas, all controls ≥44 px, no horizontal overflow, ~18 MB heap; drag-orbit frame-gap p95 67–83 ms, ≤2 frames >100 ms. |

## Limits — read before trusting the numbers

- The mobile figures are **software WebGL (SwiftShader) with CPU throttling**, a deliberately harsh proxy. They are not a measurement on a real phone GPU. A real-device check is still open.
- Text in the canvas (the "510 × 6" labels, "3060") is a canvas texture and is small on a 320 px screen; the full readable details are in the DOM below the canvas.
- One guard test was extended on purpose: `spatial-scene-v1-m1` closed set of three-importing modules now lists `ConvergenceScene3D2029.jsx`, and 3D modules in the set may import each other's helpers. Non-3D files still must reach any 3D module only through `React.lazy`.

## Not done

- No Vercel Preview of this commit (needs your approval for the exact commit; the branch is already admitted).
- Nothing outside the branch: no merge, no PR, no Production, no DB change in this step.
