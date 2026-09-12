# G1 — REQUIRED DELTAS RECONCILIATION · 2026-09-12

Canonical Supabase: `linswmnnkjxvweumprav`  
Main baseline: `96c32dade94814a2ff079206cd606d0f16522bf3`  
PR: `#448` · branch `gpt/g1-agent-entry-reconcile-v1`  
Primary owner: `inter_agent_coordination_law`  
Foundation: `foundation_closure_protocol_law v4`  
Owner check: `EXTEND_EXISTING`  
Release authorization: **NONE**

## Input evidence

Claude independent challenge AFTER: `5fe5f970-d969-442b-9a70-a34d51acc5b3` → `PASS_WITH_REQUIRED_DELTA`.

Fresh-agent evidence already complete:
- GPT AFTER `27ae86b1-8dd4-4651-ad58-5464263d96b0` → PASS.
- Claude AFTER `ca4e9c0a-6059-42f7-a0f4-26f96b3378d1` → PASS.

Claude found eight material deltas against **current main**. Live reconciliation against PR448 showed D1–D7 were already covered by the branch candidate except for two decision-changing points that remained genuinely open: D8 numeric routing pointer coverage and §60 acceptance applicability.

## Delta A — numeric routing pointer

**Problem:** `project_codex.numeric_rule_family_index` was live and explicitly referenced by the inter-agent numeric calibration, but the Master Owner Index did not expose it. A fresh agent using the routing index alone could reach method owners without seeing the numeric-family pointer that separates deterministic engine methods from System/ZURIEL numeric research laws.

**Resolution:** `SOD1820_MASTER_OWNER_INDEX.md` on PR448 now contains a dedicated **Numeric / Gematria research routing and governed numeric-family expansion** row. It points to the existing composition only:
- `project_codex.numeric_rule_family_index`;
- current `canonical_methods_registry_law`;
- current `engine_governance_registry_authority_law`;
- active numeric-law owners;
- Research Intake provenance.

The row explicitly states that `numeric_rule_family_index` is a routing index, **not** a new owner, engine, store, registry, calculation authority, canonicalization authority, or publication authority.

## Delta B — §60 applicability

**Problem:** v9 §60 said every materially different active agent adapter/runtime must pass the fresh project-entry replay. Read literally, that could force product-facing runtimes such as Raziel/Metatron to perform unrelated project bootstrap, recreating the broad-startup behavior G1 is intended to remove.

**Resolution:** additive `inter_agent_coordination_law v10` is now DB-LIVE and supersedes v9 while preserving all prior text/history. v10 adds only the applicability clarification:
- project/governance task-start agents that resolve project owners/work_log/live/release scope (GPT, CLAUDE, future agents in that class) require full fresh-project-entry acceptance;
- bounded product/domain runtimes such as Raziel/Metatron are verified at their actual domain/runtime boundary and must not perform unrelated project bootstrap;
- if a product runtime later gains project-level routing/release responsibilities, it enters the §60 project-entry acceptance class;
- no acceptance theater and no new context system.

Live row: `inter_agent_coordination_law v10 ACTIVE`; v9 preserved inactive.

## Claude D1–D8 reconciliation

| Finding | Reconciliation |
|---|---|
| D1 broad mandatory startup chain | already fixed in PR448 `CLAUDE.md` + `AGENT_HANDOFF.md` |
| D2 mandatory handoff read | already fixed in PR448 |
| D3 contradictory bulk selects | removed with compact Claude adapter in PR448 |
| D4 inactive `agent_onboarding_law` startup authority | removed as active adapter authority in PR448; current inter-agent owner governs entry |
| D5 inactive method rule citation | removed with copied domain semantics in PR448 |
| D6 Roadmap/branch pins | removed in PR448 |
| D7 copied documented-state blocks | removed/demoted to owner pointers in PR448 |
| D8 missing numeric-family routing pointer | **fixed by this delta commit** |
| §60 product-runtime applicability | **fixed live by inter-agent v10** |

## Current state before release

- `project_codex._index`: DB LIVE / G1 pointer correction present.
- `inter_agent_coordination_law`: **v10 ACTIVE**, v9 inactive/preserved.
- `CLAUDE.md`: branch candidate compact runtime adapter.
- `AGENT_HANDOFF.md`: branch candidate on-demand provenance pointer.
- Owner Index: branch candidate now includes v10 state + numeric-family routing pointer.
- GPT fresh acceptance: PASS.
- Claude fresh acceptance: PASS.
- Claude independent challenge: consumed and reconciled.
- G2: NOT STARTED.

This file does **not** declare G1 closed. Exact-head CI and final main/DB/work_log reconciliation are still required. Merge/deploy requires explicit ZURIEL `תעלה`.
