# Bottom Bar Context Unification V1 — branch candidate

Status: BRANCH-ONLY / HUMAN-GATE PREVIEW. No merge/deploy authorization implied.

OWNER CHECK: EXTEND_EXISTING.
- Global frame/control owner: `docs/sod1820-system-frame-contract-v1.md`.
- Visual/product language owner: `SOD1820_DESIGN_CONTRACT_V1.md`.
- Research Context/actions: existing `ResearchProvider` / Research OS.
- Bottom Bar shell lineage: PR #344 / `claude/bottom-bar-f59nmy`.
- Admin prior-art/context prototype: `RoyalContextBar`.

## Live crosswalk
`RoyalContextBar` is admin-only and already implements context recognition, Research Context root/return, current selection identity, add-to-research, a placeholder pulse, and a Raziel placeholder. It is mounted globally through `App.jsx` and is therefore the thin black admin bar visible to ZURIEL.

PR #344 adds the forward Bottom Bar shell and reuses NumberDrawer + LiveChannelFeed. This branch extends that shell instead of creating another global bar.

## Candidate change
`BottomBar.jsx` now adds an admin-only `כאן` slot and context sheet that reuses the same ResearchProvider contracts for:
- current context identity;
- add current selection to active research;
- return to research root when the root differs;
- return to previous Research Context when available.

`קשרים` is shown disabled as an explicit extension point only; no graph route/store/engine is invented.

Number and Updates continue to use PR #344's existing stores/panels unchanged.

## Deliberate non-change
`RoyalContextBar` is NOT removed on this branch yet. During Human-Gate preview both bars may coexist for direct comparison. Removal/retirement is a separate bounded follow-up after ZURIEL confirms capability parity. This prevents accidental loss of its current admin-only Raziel/pulse/lens affordances.

No DB/schema/RPC/engine/truth change. No new Context store. No canonical naming write.