# W1 Slice 1 — Adaptive Shell Context Spine V1

**Task key:** `W1_SLICE1_ADAPTIVE_SHELL_CONTEXT_SPINE_V1`
**Owner lineage:** `docs/sod1820-system-frame-contract-v1.md` + `docs/sod1820-system-frame-contract-v2-addendum.md`
**OWNER CHECK:** `EXTEND_EXISTING` — no new Contract/Law/System/Store/Engine/Registry/global UI owner.
**Baseline:** `origin/main = 631773aea32eaba5652d2aff587963ce524fee88`
**Release state:** BRANCH ONLY — NOT MERGED · NOT DEPLOYED · NOT LIVE.
**Date:** 2026-09-09

This file is an implementation record for one slice. It is **not** a second System Frame
contract; the governing presentation contract remains the v1 file plus its v2 addendum.

---

## 1. What this slice does

It establishes the **context spine** the Adaptive Shell needs, and ships the first
projection that consumes it — the Global Orientation Header (v2 addendum §3.1).

The route→orientation projection already existed on main, but it lived *privately inside*
`BottomBar.jsx`. Any second surface that answers "where am I" would have had to copy it.
That copy is precisely the parallel-system failure `canonical_ui_components_law` forbids.

So the derivation was extracted, unchanged, into one shared spine that every shell
projection reads. The Dock and the new Header now answer "where am I" and "how do I get
exactly back" from the **same** source.

## 2. What it deliberately does NOT do

- no W2 World composition;
- no new store — the spine holds **zero state**; the Research Context store on main is still the only one;
- no new graph, no new AI call, no second Raziel session (Raziel stays where it is on main);
- no Premium/access semantics;
- no broad visual redesign, no route changes, no SEO/deep-link changes;
- no desktop Sidebar and no Companion Rail — those slots are *declared*, not built.

## 3. Files

**Added**
| File | Role |
|---|---|
| `src/lib/shell/shellContext.js` | Pure, dependency-free derivation spine. Zero state. |
| `src/lib/shell/useShellContext.js` | Binds the spine to the existing router + `ResearchProvider`. |
| `src/lib/shell/slots.js` | Inert declaration of the semantic shell slots and their honest status. |
| `src/components/layout/OrientationHeader.jsx` | "WHERE AM I?" projection (v2 addendum §3.1). |
| `test/shell-context-spine.test.mjs` | Behavioral test of the spine, including exact-return. |
| `test/shell-one-owner-guard.test.mjs` | Guard against reintroducing a parallel store/nav/personal area/AI session. |

**Modified**
| File | Change |
|---|---|
| `src/components/layout/BottomBar.jsx` | Reads the shared spine; its three private helpers removed. Behavior unchanged. |
| `src/components/layout/LayoutCore.jsx` | Mounts the Orientation Header under the existing admin pilot gate. |

## 4. Rollout gate — public users see zero change

The Header ships behind **the same gate as the Dock** (`BOTTOM_DOCK_ADMIN_PILOT_V1`):
`showOrientation = showBottomBar && !isHome`, i.e. admin only, never on Home
(`research_workspace_law` stage 1 forbids touching the home page), and never on `/book`
(inherited from `isBottomBarRoute`).

No legacy entry point is hidden, moved or replaced. This satisfies the migration law in
system frame v1 ("never remove a legacy entry point for users who cannot yet access its
replacement") and §9 of the v2 addendum.

## 5. Overlay / clearance declaration

Required by the "Overlay and clearance law". The Orientation Header is **in-flow** beneath
the Navbar: no fixed/sticky positioning, no z-index layer, no viewport-bottom usage.
It therefore cannot collide with the Bottom Dock, the Number drawer, the live-updates
panel or the User Center, and it requires no clearance value of its own.
A guard test enforces this against the emitted CSS.

## 6. Exact return (v2 addendum §5)

`resolveReturnPatch` / `resolveRootPatch` restore subject, selection and lens — not a bare
history pop — and return `null` when there is no valid target, so callers render an honest
terminal state rather than silently redirecting to unrelated content. Both the Dock and the
Header route through these, so the two surfaces cannot drift into different "back" behaviors.

## 7. Verification performed

- `npm run build` — production build passes.
- `test/shell-context-spine.test.mjs`, `test/shell-one-owner-guard.test.mjs` — pass.
- **Equivalence proof vs `origin/main`:** the three original helpers were extracted verbatim
  from `origin/main:src/components/layout/BottomBar.jsx` and property-tested against the
  spine across 4920 route/search combinations, 14 lens values and 14 subject types —
  **zero drift**. The Dock's behavior is provably preserved.
- **Browser matrix** on the real component (Chromium, isolated harness, real
  `ResearchProvider` seeding a genuine context): 320 / 360 / 390 / 1440 × dark / light —
  8/8 pass. No document or intra-component horizontal overflow; focus-label contrast ≥ 4.5:1
  in both themes (measured against the composited translucent bar); the return chip is
  reachable by **real keyboard Tab** and reports `:focus-visible`; touch target ≥ 28px.
- Pre-existing suite state: 8 tests in `test/` fail identically on pristine `origin/main`
  (missing modules / stale source-text guards). They are unrelated to this slice and were
  not modified. Not fixed here — different task key.

## 8. Slot status (honest)

| Slot | Status |
|---|---|
| orientation | IMPLEMENTED, admin pilot gate |
| commands (Dock) | IMPLEMENTED (pre-existing), now spine-backed |
| globalNavigation | SLOT PREPARED — legacy Navbar still canonical |
| raziel | SLOT PREPARED — no new AI session |
| myWorkspace | SLOT PREPARED — existing User Center only |

`DOCUMENTED != IMPLEMENTED != COMMITTED != MERGED != DEPLOYED != LIVE != VERIFIED.`
