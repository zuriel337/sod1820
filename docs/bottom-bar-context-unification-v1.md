# Bottom Bar Context Unification V1 — branch candidate

Status: BRANCH-ONLY / HUMAN-GATE PREVIEW. No merge/deploy authorization implied.

OWNER CHECK: EXTEND_EXISTING.
- Global frame/control owner: `docs/sod1820-system-frame-contract-v1.md`.
- Visual/product language owner: `SOD1820_DESIGN_CONTRACT_V1.md`.
- Research Context/actions: existing `ResearchProvider` / Research OS.
- Bottom Bar shell lineage: PR #344 / `claude/bottom-bar-f59nmy`.
- Admin prior-art/context prototype: `RoyalContextBar`.

`RoyalContextBar` is admin-only and already implements context recognition, Research Context root/return, current selection identity, add-to-research, a placeholder pulse, and a Raziel placeholder. PR #344 adds the forward Bottom Bar shell and reuses NumberDrawer + LiveChannelFeed. Candidate direction: extend that shell, do not create another global bar. During preview keep the admin bar until capability parity is visually confirmed; retire it only in a bounded follow-up.

No DB/schema/RPC/engine/truth change. No new Context store. No canonical naming write.